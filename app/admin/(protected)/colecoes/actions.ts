"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  dateTimeValue,
  ensureDateWindow,
  integerValue,
  mutationErrorCode,
  objectPositionValue,
  optionalTextValue,
  orderedUuidList,
  slugValue,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { getCollectionPreset } from "@/lib/admin/collection-presets";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { removeManagedImage, uploadManagedImage } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function collectionPayload(formData: FormData) {
  const startsAt = dateTimeValue(formData, "starts_at", true);
  const endsAt = dateTimeValue(formData, "ends_at", true);
  ensureDateWindow(startsAt, endsAt);
  const published = booleanValue(formData, "published");
  const featured = booleanValue(formData, "featured");
  if (featured && !published) throw new AdminValidationError("constraint");
  return {
    description: optionalTextValue(formData, "description", { max: 1000 }),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    ends_at: endsAt,
    featured,
    name: textValue(formData, "name", { max: 160 }),
    published,
    slug: slugValue(formData),
    starts_at: startsAt,
  };
}

export async function createCollectionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const payload = collectionPayload(formData);
    const { data, error } = await supabase
      .from("collections")
      .insert({ ...payload, featured: false, published: false })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode || !id) redirect(appendFeedback("/admin/colecoes", "error", errorCode ?? "failed"));
  revalidatePath("/admin/colecoes");
  redirect(appendFeedback(`/admin/colecoes/${id}`, "status", "created"));
}

export async function createPresetCollectionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const preset = getCollectionPreset(formData.get("preset_id"));
  if (!preset) redirect(appendFeedback("/admin/colecoes", "error", "invalid"));

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", preset.slug)
    .maybeSingle();

  if (lookupError) redirect(appendFeedback("/admin/colecoes", "error", mutationErrorCode(lookupError)));
  if (existing) redirect(appendFeedback(`/admin/colecoes/${existing.id}`, "status", "existing"));

  const { data, error } = await supabase
    .from("collections")
    .insert({
      description: preset.description,
      display_order: preset.displayOrder,
      featured: false,
      name: preset.name,
      published: false,
      slug: preset.slug,
    })
    .select("id")
    .single();

  if (error || !data) redirect(appendFeedback("/admin/colecoes", "error", mutationErrorCode(error)));
  revalidatePath("/admin/colecoes");
  redirect(appendFeedback(`/admin/colecoes/${data.id}`, "status", "created"));
}

export async function updateCollectionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("collections").update(collectionPayload(formData)).eq("id", id);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/colecoes");
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function uploadCollectionCoverAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "collection_id");
  const destination = `/admin/colecoes/${id}`;
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const altText = textValue(formData, "cover_alt_text", { max: 220 });
    const position = objectPositionValue(formData, "cover_object_position");
    const { data: existing, error } = await supabase
      .from("collections")
      .select("cover_path, cover_alt_text, cover_object_position, cover_width, cover_height")
      .eq("id", id)
      .single();
    if (error) throw error;
    const uploaded = await uploadManagedImage({ bucket: "site-galleries", file, parentId: id });
    uploadedPath = uploaded.path;
    const { error: updateError } = await supabase
      .from("collections")
      .update({
        cover_alt_text: altText,
        cover_height: uploaded.height,
        cover_object_position: position,
        cover_path: uploaded.path,
        cover_width: uploaded.width,
      })
      .eq("id", id);
    if (updateError) throw updateError;
    if (existing.cover_path) {
      try {
        await removeManagedImage("site-galleries", existing.cover_path);
      } catch (storageError) {
        const { error: rollbackError } = await supabase.from("collections").update(existing).eq("id", id);
        try { await removeManagedImage("site-galleries", uploaded.path); } catch { /* Covered by storage QA. */ }
        if (rollbackError) throw rollbackError;
        throw storageError;
      }
    }
  } catch (error) {
    if (uploadedPath) {
      const { data } = await supabase.from("collections").select("cover_path").eq("id", id).maybeSingle();
      if (data?.cover_path !== uploadedPath) {
        try { await removeManagedImage("site-galleries", uploadedPath); } catch { /* Covered by storage QA. */ }
      }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function removeCollectionCoverAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "collection_id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: existing, error } = await supabase.from("collections").select("*").eq("id", id).single();
    if (error) throw error;
    if (!existing.cover_path) throw new AdminValidationError("invalid");
    const { error: updateError } = await supabase
      .from("collections")
      .update({
        cover_alt_text: null,
        cover_height: null,
        cover_path: null,
        cover_width: null,
        featured: false,
        published: false,
      })
      .eq("id", id);
    if (updateError) throw updateError;
    try {
      await removeManagedImage("site-galleries", existing.cover_path);
    } catch (storageError) {
      const { error: restoreError } = await supabase.from("collections").update(existing).eq("id", id);
      if (restoreError) throw restoreError;
      throw storageError;
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "removed"));
}

export async function syncCollectionProductsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "entity_id");
  const destination = `/admin/colecoes/${id}`;
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("sync_collection_products", {
    ordered_product_ids: orderedIds,
    target_collection_id: id,
  });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function deleteCollectionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("collections").select("cover_path").eq("id", id).single();
    if (error) throw error;
    if (data.cover_path) throw new AdminValidationError("constraint");
    const { error: deleteError } = await supabase.from("collections").delete().eq("id", id);
    if (deleteError) throw deleteError;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/colecoes");
  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/colecoes", "status", "deleted"));
}
