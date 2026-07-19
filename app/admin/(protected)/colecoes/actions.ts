"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
import { getCollectionPreset } from "@/lib/admin/collection-presets";
import { COLLECTION_HOME_VARIANT_VALUES, getCollectionPlacement } from "@/lib/content-placements";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { uploadGalleryImageSet } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const homeCtaTargets = ["collection", "catalog", "instagram", "whatsapp"] as const;

function decimalValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^\d(?:\.\d{1,2})?$/.test(raw)) throw new AdminValidationError("number");
  const value = Number(raw);
  if (value < 0.8 || value > 1.4) throw new AdminValidationError("number");
  return value;
}

function revalidateHomeCollection() {
  revalidateTag("collection:home:featured_collection", "max");
  revalidatePath("/");
}

function collectionPayload(formData: FormData) {
  const startsAt = dateTimeValue(formData, "starts_at", true);
  const endsAt = dateTimeValue(formData, "ends_at", true);
  ensureDateWindow(startsAt, endsAt);
  const published = booleanValue(formData, "published");
  const featured = booleanValue(formData, "featured");
  const homeEnabled = booleanValue(formData, "home_enabled");
  if (featured && !published) throw new AdminValidationError("constraint");

  if (!homeEnabled) {
    return {
      description: optionalTextValue(formData, "description", { max: 1000 }),
      display_order: integerValue(formData, "display_order", { max: 100_000 }),
      ends_at: endsAt,
      featured,
      home_cta_label: null,
      home_cta_target: null,
      home_description: null,
      home_enabled: false,
      home_gallery_id: null,
      home_placement_key: null,
      home_title: null,
      home_variant: null,
      name: textValue(formData, "name", { max: 160 }),
      published,
      slug: slugValue(formData),
      starts_at: startsAt,
    };
  }

  const placementKey = textValue(formData, "home_placement_key", { max: 80 });
  const placement = getCollectionPlacement(placementKey);
  if (!placement) throw new AdminValidationError("route");
  const variant = enumValue(formData, "home_variant", COLLECTION_HOME_VARIANT_VALUES);
  if (!new Set<string>(placement.variants).has(variant)) throw new AdminValidationError("constraint");
  const galleryId = uuidValue(formData, "home_gallery_id", true);
  if (variant === "editorial-protagonist" && !galleryId) throw new AdminValidationError("constraint");

  return {
    description: optionalTextValue(formData, "description", { max: 1000 }),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    ends_at: endsAt,
    featured,
    home_cta_label: textValue(formData, "home_cta_label", { max: 80 }),
    home_cta_target: enumValue(formData, "home_cta_target", homeCtaTargets),
    home_description: textValue(formData, "home_description", { max: 340 }),
    home_enabled: true,
    home_gallery_id: galleryId,
    home_placement_key: placement.placementKey,
    home_title: textValue(formData, "home_title", { max: 160 }),
    home_variant: variant,
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
    const { data, error } = await supabase.from("collections").insert({ ...payload, featured: false, published: false }).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode || !id) redirect(appendFeedback("/admin/colecoes", "error", errorCode ?? "failed"));
  revalidatePath("/admin/colecoes");
  redirect(appendFeedback(`/admin/colecoes/${id}`, "status", "created"));
}

export async function createPresetCollectionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const preset = getCollectionPreset(formData.get("preset_id"));
  if (!preset) redirect(appendFeedback("/admin/colecoes", "error", "invalid"));
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase.from("collections").select("id").eq("slug", preset.slug).maybeSingle();
  if (lookupError) redirect(appendFeedback("/admin/colecoes", "error", mutationErrorCode(lookupError)));
  if (existing) redirect(appendFeedback(`/admin/colecoes/${existing.id}`, "status", "existing"));
  const { data, error } = await supabase.from("collections").insert({
    description: preset.description,
    display_order: preset.displayOrder,
    featured: false,
    name: preset.name,
    published: false,
    slug: preset.slug,
  }).select("id").single();
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
  } catch (error) { errorCode = mutationErrorCode(error); }
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
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const uploaded = await uploadGalleryImageSet({ file, parentId: id });
    const mobilePosition = objectPositionValue(formData, "cover_mobile_object_position");
    const desktopPosition = objectPositionValue(formData, "cover_desktop_object_position");
    const { error } = await supabase.from("collections").update({
      cover_alt_text: textValue(formData, "cover_alt_text", { max: 220 }),
      cover_asset_version: uploaded.assetVersion,
      cover_blur_data_url: uploaded.blurDataUrl,
      cover_desktop_object_position: desktopPosition,
      cover_desktop_scale: decimalValue(formData, "cover_desktop_scale"),
      cover_height: uploaded.height,
      cover_media_manifest: uploaded.manifest,
      cover_mobile_object_position: mobilePosition,
      cover_mobile_scale: decimalValue(formData, "cover_mobile_scale"),
      cover_object_position: desktopPosition,
      cover_path: uploaded.storagePath,
      cover_width: uploaded.width,
    }).eq("id", id);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function removeCollectionCoverAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "collection_id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("collections").update({
      cover_alt_text: null, cover_asset_version: null, cover_blur_data_url: null,
      cover_height: null, cover_media_manifest: null, cover_path: null, cover_width: null,
      featured: false, published: false,
    }).eq("id", id);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
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
  const { error } = await supabase.rpc("sync_collection_products", { ordered_product_ids: orderedIds, target_collection_id: id });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function publishCollectionRevisionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "collection_id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("publish_collection_revision", { target_collection_id: id });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidateHomeCollection();
  revalidatePublicCatalog();
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "published"));
}

export async function rollbackCollectionRevisionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const collectionId = uuidValue(formData, "collection_id");
  const publicationId = uuidValue(formData, "publication_id");
  const destination = `/admin/colecoes/${collectionId}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("rollback_collection_revision", {
    target_collection_id: collectionId,
    target_publication_id: publicationId,
  });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidateHomeCollection();
  revalidatePublicCatalog();
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "rolledback"));
}

export async function unpublishCollectionHomeAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "collection_id");
  const destination = `/admin/colecoes/${id}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("collection_publications").update({ active: false }).eq("collection_id", id).eq("active", true);
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidateHomeCollection();
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "unpublished"));
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
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/colecoes");
  revalidateHomeCollection();
  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/colecoes", "status", "deleted"));
}
