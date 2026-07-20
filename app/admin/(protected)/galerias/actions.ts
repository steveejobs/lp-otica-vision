"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError, appendFeedback, booleanValue, enumValue, integerValue,
  mutationErrorCode, objectPositionValue, optionalIntegerValue, optionalTextValue,
  orderedUuidList, slugValue, textValue, uuidValue,
} from "@/lib/admin/validation";
import { getGalleryLocation, getGalleryLocationByKey } from "@/lib/admin/gallery-locations";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { galleryPlacementCacheTag, HERO_CACHE_TAG, HOME_ROUTE_CACHE_TAG } from "@/lib/gallery/cache";
import { removeManagedImages, uploadGalleryImageSet } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const editorialRoles = ["primary", "secondary", "detail"] as const;

function decimalValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^\d(?:\.\d{1,2})?$/.test(raw)) throw new AdminValidationError("number");
  const value = Number(raw);
  if (value < 0.8 || value > 1.4) throw new AdminValidationError("number");
  return value;
}

function optionalColor(formData: FormData, key: string) {
  const value = optionalTextValue(formData, key, { max: 7 });
  if (value && !/^#[0-9a-f]{6}$/i.test(value)) throw new AdminValidationError("invalid");
  return value;
}

function galleryPayload(formData: FormData) {
  const location = getGalleryLocationByKey(textValue(formData, "location_key", { max: 120 }));
  if (!location) throw new AdminValidationError("route");
  return {
    autoplay: booleanValue(formData, "autoplay"),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    name: textValue(formData, "name", { max: 160 }),
    placement_key: location.placementKey,
    route_key: location.routeKey,
    slug: slugValue(formData),
  };
}

function destination(id: string) { return `/admin/galerias/${id}`; }

function allManifestPaths(manifest: unknown, storagePath: string) {
  if (!manifest || typeof manifest !== "object") return [storagePath];
  const values = Object.values(manifest as Record<string, unknown>);
  const paths = values.flatMap((value) => value && typeof value === "object" && "path" in value && typeof value.path === "string" ? [value.path] : []);
  return [...new Set(paths.length ? paths : [storagePath])];
}

export async function createGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("galleries").insert({ ...galleryPayload(formData), published: false }).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode || !id) redirect(appendFeedback("/admin/galerias", "error", errorCode ?? "failed"));
  revalidatePath("/admin/galerias");
  redirect(appendFeedback(destination(id), "status", "created"));
}

export async function updateGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const target = destination(id);
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const payload = galleryPayload(formData);
    const { data: current, error: currentError } = await supabase.from("galleries").select("published, route_key, placement_key").eq("id", id).single();
    if (currentError) throw currentError;
    if (current.published && (current.route_key !== payload.route_key || current.placement_key !== payload.placement_key)) {
      throw new AdminValidationError("constraint");
    }
    const { error } = await supabase.from("galleries").update(payload).eq("id", id);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(target, "error", errorCode));
  revalidatePath("/admin/galerias"); revalidatePath(target);
  redirect(appendFeedback(target, "status", "saved"));
}

export async function uploadGalleryItemsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const target = destination(galleryId);
  const supabase = await createSupabaseServerClient();
  const createdIds: string[] = [];
  const uploadedPaths: string[] = [];
  let errorCode: string | null = null;
  try {
    const { data: gallery, error: galleryError } = await supabase.from("galleries").select("name, route_key, placement_key").eq("id", galleryId).single();
    if (galleryError) throw galleryError;
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const placement = getGalleryLocation(gallery.route_key, gallery.placement_key);
    if (!placement) throw new AdminValidationError("route");
    const { count, error: countError } = await supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", galleryId);
    if (countError) throw countError;
    if (!files.length || files.length + (count ?? 0) > (placement.maxItems ?? 10)) throw new AdminValidationError("image");

    const mobilePosition = objectPositionValue(formData, "mobile_object_position");
    const desktopPosition = objectPositionValue(formData, "desktop_object_position");
    const role = enumValue(formData, "editorial_role", editorialRoles);
    const visualSeries = optionalTextValue(formData, "visual_series", { max: 80 });
    const startSeriesOrder = optionalIntegerValue(formData, "series_order", { max: 100_000 }) ?? 0;
    for (const [index, file] of files.entries()) {
      const uploaded = await uploadGalleryImageSet({ file, parentId: galleryId });
      uploadedPaths.push(...allManifestPaths(uploaded.manifest, uploaded.storagePath));
      const itemId = randomUUID();
      const { error } = await supabase.from("gallery_items").insert({
        alt_text: `Imagem ${(count ?? 0) + index + 1} da galeria ${gallery.name}`,
        asset_version: uploaded.assetVersion,
        background_color: optionalColor(formData, "background_color"),
        blur_data_url: uploaded.blurDataUrl,
        desktop_object_position: desktopPosition,
        desktop_scale: decimalValue(formData, "desktop_scale"),
        display_order: (count ?? 0) + index,
        editorial_role: role === "primary" && index > 0 ? "secondary" : role,
        gallery_id: galleryId,
        height: uploaded.height,
        id: itemId,
        media_manifest: uploaded.manifest,
        mobile_object_position: mobilePosition,
        mobile_scale: decimalValue(formData, "mobile_scale"),
        published: booleanValue(formData, "published"),
        series_order: visualSeries ? startSeriesOrder + index : null,
        storage_path: uploaded.storagePath,
        visual_series: visualSeries,
        width: uploaded.width,
      });
      if (error) throw error;
      createdIds.push(itemId);
    }
  } catch (error) {
    if (createdIds.length) await supabase.from("gallery_items").delete().in("id", createdIds);
    if (uploadedPaths.length) try { await removeManagedImages("site-galleries", uploadedPaths); } catch { /* Audited by orphan QA. */ }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(target, "error", errorCode));
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "uploaded"));
}

export async function updateGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const target = destination(galleryId);
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const visualSeries = optionalTextValue(formData, "visual_series", { max: 80 });
    const seriesOrder = optionalIntegerValue(formData, "series_order", { max: 100_000 });
    if (Boolean(visualSeries) !== (seriesOrder !== null)) throw new AdminValidationError("constraint");
    const { error } = await supabase.from("gallery_items").update({
      alt_text: textValue(formData, "alt_text", { max: 220 }),
      background_color: optionalColor(formData, "background_color"),
      desktop_object_position: objectPositionValue(formData, "desktop_object_position"),
      desktop_scale: decimalValue(formData, "desktop_scale"),
      editorial_role: enumValue(formData, "editorial_role", editorialRoles),
      mobile_object_position: objectPositionValue(formData, "mobile_object_position"),
      mobile_scale: decimalValue(formData, "mobile_scale"),
      published: booleanValue(formData, "published"),
      series_order: seriesOrder,
      visual_series: visualSeries,
    }).eq("id", itemId).eq("gallery_id", galleryId);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(target, "error", errorCode));
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "saved"));
}

export async function reorderGalleryItemsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const target = destination(galleryId);
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_gallery_items", { ordered_ids: orderedIds, target_gallery_id: galleryId });
  if (error) redirect(appendFeedback(target, "error", mutationErrorCode(error)));
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "reordered"));
}

export async function replaceGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const target = destination(galleryId);
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPaths: string[] = [];
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const { data: existing, error } = await supabase.from("gallery_items").select("*").eq("id", itemId).eq("gallery_id", galleryId).single();
    if (error) throw error;
    const uploaded = await uploadGalleryImageSet({ file, parentId: galleryId });
    uploadedPaths = allManifestPaths(uploaded.manifest, uploaded.storagePath);
    const { error: updateError } = await supabase.from("gallery_items").update({
      asset_version: uploaded.assetVersion, blur_data_url: uploaded.blurDataUrl,
      height: uploaded.height, media_manifest: uploaded.manifest,
      storage_path: uploaded.storagePath, width: uploaded.width,
    }).eq("id", itemId);
    if (updateError) throw updateError;

    const { data: activeReference } = await supabase.from("gallery_publication_items").select("id, publication:gallery_publications!inner(active)").eq("source_item_id", itemId).eq("publication.active", true).limit(1).maybeSingle();
    if (!activeReference) await removeManagedImages("site-galleries", allManifestPaths(existing.media_manifest, existing.storage_path));
  } catch (error) {
    if (uploadedPaths.length) try { await removeManagedImages("site-galleries", uploadedPaths); } catch { /* Audited by orphan QA. */ }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(target, "error", errorCode));
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "uploaded"));
}

export async function removeGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const target = destination(galleryId);
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: existing, error } = await supabase.from("gallery_items").select("*").eq("id", itemId).eq("gallery_id", galleryId).single();
    if (error) throw error;
    const { data: activeReference } = await supabase.from("gallery_publication_items").select("id, publication:gallery_publications!inner(active)").eq("source_item_id", itemId).eq("publication.active", true).limit(1).maybeSingle();
    const { error: deleteError } = await supabase.from("gallery_items").delete().eq("id", itemId).eq("gallery_id", galleryId);
    if (deleteError) throw deleteError;
    if (!activeReference) await removeManagedImages("site-galleries", allManifestPaths(existing.media_manifest, existing.storage_path));
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(target, "error", errorCode));
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "removed"));
}

export async function publishGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const target = destination(galleryId);
  const supabase = await createSupabaseServerClient();
  const { data: gallery } = await supabase.from("galleries").select("route_key, placement_key").eq("id", galleryId).maybeSingle();
  const { error } = await supabase.rpc("publish_gallery_revision", { target_gallery_id: galleryId });
  if (error) redirect(appendFeedback(target, "error", mutationErrorCode(error)));
  if (gallery) revalidateTag(galleryPlacementCacheTag(gallery.route_key, gallery.placement_key), "max");
  if (gallery?.route_key === "home") {
    revalidateTag(HOME_ROUTE_CACHE_TAG, "max");
    revalidatePath("/");
  }
  const location = gallery ? getGalleryLocation(gallery.route_key, gallery.placement_key) : null;
  if (location && location.route !== "/") revalidatePath(location.route);
  if (gallery?.route_key === "home" && gallery.placement_key === "hero") revalidateTag(HERO_CACHE_TAG, "max");
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "published"));
}

export async function rollbackGalleryRevisionAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const publicationId = uuidValue(formData, "publication_id");
  const target = destination(galleryId);
  const supabase = await createSupabaseServerClient();
  const { data: gallery } = await supabase.from("galleries").select("route_key, placement_key").eq("id", galleryId).maybeSingle();
  const { error } = await supabase.rpc("rollback_gallery_revision", {
    target_gallery_id: galleryId,
    target_publication_id: publicationId,
  });
  if (error) redirect(appendFeedback(target, "error", mutationErrorCode(error)));
  if (gallery) {
    revalidateTag(galleryPlacementCacheTag(gallery.route_key, gallery.placement_key), "max");
    const location = getGalleryLocation(gallery.route_key, gallery.placement_key);
    if (location) revalidatePath(location.route);
    if (gallery.route_key === "home") revalidateTag(HOME_ROUTE_CACHE_TAG, "max");
  }
  revalidatePath(target);
  redirect(appendFeedback(target, "status", "rolledback"));
}

export async function deleteGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const target = destination(id);
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", id);
  if (error || (count ?? 0) > 0) redirect(appendFeedback(target, "error", error ? mutationErrorCode(error) : "linked"));
  const { error: deleteError } = await supabase.from("galleries").delete().eq("id", id);
  if (deleteError) redirect(appendFeedback(target, "error", mutationErrorCode(deleteError)));
  revalidatePath("/admin/galerias");
  redirect(appendFeedback("/admin/galerias", "status", "deleted"));
}
