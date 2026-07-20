"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  dateTimeValue,
  ensureDateWindow,
  enumValue,
  integerValue,
  mutationErrorCode,
  objectPositionValue,
  optionalTextValue,
  orderedUuidList,
  slugValue,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { removeManagedImage, uploadManagedImage } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const promotionTypes = ["promotion", "highlight", "launch", "collection"] as const;
const ctaTargets = ["whatsapp", "instagram", "maps"] as const;

function promotionPayload(formData: FormData) {
  const startsAt = dateTimeValue(formData, "starts_at");
  const endsAt = dateTimeValue(formData, "ends_at");
  const title = textValue(formData, "title", { max: 160 });
  ensureDateWindow(startsAt, endsAt);
  const active = booleanValue(formData, "active");
  const featured = booleanValue(formData, "featured");
  if (featured && !active) throw new AdminValidationError("constraint");
  return {
    active,
    cta_label: textValue(formData, "cta_label", { max: 80 }),
    cta_target: enumValue(formData, "cta_target", ctaTargets),
    ends_at: endsAt,
    featured,
    image_alt_text: `Imagem do destaque ${title}`,
    image_object_position: objectPositionValue(formData, "image_object_position"),
    priority: integerValue(formData, "priority", { max: 100_000 }),
    short_description: optionalTextValue(formData, "short_description", { max: 600 }),
    slug: slugValue(formData),
    starts_at: startsAt,
    title,
    type: enumValue(formData, "type", promotionTypes),
  };
}

export async function createPromotionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = randomUUID();
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const payload = promotionPayload(formData);
    const uploaded = await uploadManagedImage({ bucket: "promotions", file, parentId: id });
    uploadedPath = uploaded.path;
    const { error } = await supabase.from("promotions").insert({
      ...payload,
      id,
      image_height: uploaded.height,
      image_path: uploaded.path,
      image_width: uploaded.width,
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      try { await removeManagedImage("promotions", uploadedPath); } catch { /* Covered by storage QA. */ }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback("/admin/promocoes", "error", errorCode));
  revalidatePath("/admin/promocoes");
  redirect(appendFeedback(`/admin/promocoes/${id}`, "status", "created"));
}

export async function updatePromotionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/promocoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("promotions").update(promotionPayload(formData)).eq("id", id);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/promocoes"); revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function replacePromotionImageAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "promotion_id");
  const destination = `/admin/promocoes/${id}`;
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const { data: existing, error } = await supabase.from("promotions").select("image_path, image_width, image_height").eq("id", id).single();
    if (error) throw error;
    const uploaded = await uploadManagedImage({ bucket: "promotions", file, parentId: id });
    uploadedPath = uploaded.path;
    const { error: updateError } = await supabase.from("promotions").update({ image_height: uploaded.height, image_path: uploaded.path, image_width: uploaded.width }).eq("id", id);
    if (updateError) throw updateError;
    try { await removeManagedImage("promotions", existing.image_path); }
    catch (storageError) {
      const { error: rollbackError } = await supabase.from("promotions").update(existing).eq("id", id);
      try { await removeManagedImage("promotions", uploaded.path); } catch { /* Covered by storage QA. */ }
      if (rollbackError) throw rollbackError;
      throw storageError;
    }
  } catch (error) {
    if (uploadedPath) {
      const { data } = await supabase.from("promotions").select("image_path").eq("id", id).maybeSingle();
      if (data?.image_path !== uploadedPath) {
        try { await removeManagedImage("promotions", uploadedPath); } catch { /* Covered by storage QA. */ }
      }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function syncPromotionProductsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "entity_id");
  const destination = `/admin/promocoes/${id}`;
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("sync_promotion_products", { ordered_product_ids: orderedIds, target_promotion_id: id });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function savePromotionProductOrderAction(input: {
  entityId: string;
  orderedIds: string[];
}) {
  await requireAdminRole(["admin", "editor"]);
  const formData = new FormData();
  formData.set("entity_id", input.entityId);
  formData.set("ordered_ids", JSON.stringify(input.orderedIds));
  const id = uuidValue(formData, "entity_id");
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("sync_promotion_products", {
    ordered_product_ids: orderedIds,
    target_promotion_id: id,
  });
  if (error) return { error: mutationErrorCode(error), ok: false } as const;
  revalidatePath(`/admin/promocoes/${id}`);
  return { ok: true } as const;
}

export async function deletePromotionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/promocoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const [{ data: existing, error }, { data: relations, error: relationError }] = await Promise.all([
      supabase.from("promotions").select("*").eq("id", id).single(),
      supabase.from("promotion_products").select("*").eq("promotion_id", id),
    ]);
    if (error || relationError || !relations) throw error ?? relationError;
    const { error: deleteError } = await supabase.from("promotions").delete().eq("id", id);
    if (deleteError) throw deleteError;
    try { await removeManagedImage("promotions", existing.image_path); }
    catch (storageError) {
      const { error: restoreError } = await supabase.from("promotions").insert(existing);
      if (restoreError) throw restoreError;
      if (relations.length) {
        const { error: restoreRelationsError } = await supabase.from("promotion_products").insert(relations);
        if (restoreRelationsError) throw restoreRelationsError;
      }
      throw storageError;
    }
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/promocoes");
  redirect(appendFeedback("/admin/promocoes", "status", "deleted"));
}
