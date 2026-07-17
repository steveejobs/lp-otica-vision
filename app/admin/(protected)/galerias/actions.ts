"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  integerValue,
  mutationErrorCode,
  objectPositionValue,
  optionalIntegerValue,
  optionalTextValue,
  orderedUuidList,
  routeKeyValue,
  slugValue,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { removeManagedImage, uploadManagedImage } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function galleryPayload(formData: FormData) {
  return {
    autoplay: booleanValue(formData, "autoplay"),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    name: textValue(formData, "name", { max: 160 }),
    published: booleanValue(formData, "published"),
    route_key: routeKeyValue(formData),
    slug: slugValue(formData),
  };
}

export async function createGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const payload = galleryPayload(formData);
    const { data, error } = await supabase.from("galleries").insert({ ...payload, published: false }).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode || !id) redirect(appendFeedback("/admin/galerias", "error", errorCode ?? "failed"));
  revalidatePath("/admin/galerias");
  redirect(appendFeedback(`/admin/galerias/${id}`, "status", "created"));
}

export async function updateGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/galerias/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("galleries").update(galleryPayload(formData)).eq("id", id);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/galerias"); revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function uploadGalleryItemsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const destination = `/admin/galerias/${galleryId}`;
  const supabase = await createSupabaseServerClient();
  const createdIds: string[] = [];
  const uploadedPaths: string[] = [];
  let errorCode: string | null = null;
  try {
    const altBase = textValue(formData, "alt_base", { max: 170 });
    const mobilePosition = objectPositionValue(formData, "mobile_object_position");
    const desktopPosition = objectPositionValue(formData, "desktop_object_position");
    const visualSeries = optionalTextValue(formData, "visual_series", { max: 80 });
    const startSeriesOrder = optionalIntegerValue(formData, "series_order", { max: 100_000 }) ?? 0;
    const published = booleanValue(formData, "published");
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length || files.length > 10) throw new AdminValidationError("image");
    const { count, error: countError } = await supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", galleryId);
    if (countError) throw countError;
    for (const [index, file] of files.entries()) {
      const uploaded = await uploadManagedImage({ bucket: "site-galleries", file, parentId: galleryId });
      uploadedPaths.push(uploaded.path);
      const itemId = randomUUID();
      const { error } = await supabase.from("gallery_items").insert({
        alt_text: files.length > 1 ? `${altBase} — imagem ${index + 1}` : altBase,
        desktop_object_position: desktopPosition,
        display_order: (count ?? 0) + index,
        gallery_id: galleryId,
        height: uploaded.height,
        id: itemId,
        mobile_object_position: mobilePosition,
        published,
        series_order: visualSeries ? startSeriesOrder + index : null,
        storage_path: uploaded.path,
        visual_series: visualSeries,
        width: uploaded.width,
      });
      if (error) throw error;
      createdIds.push(itemId);
    }
  } catch (error) {
    if (createdIds.length) await supabase.from("gallery_items").delete().in("id", createdIds);
    for (const path of uploadedPaths) {
      try { await removeManagedImage("site-galleries", path); } catch { /* Covered by storage QA. */ }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function updateGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const destination = `/admin/galerias/${galleryId}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const visualSeries = optionalTextValue(formData, "visual_series", { max: 80 });
    const seriesOrder = optionalIntegerValue(formData, "series_order", { max: 100_000 });
    if (visualSeries && seriesOrder === null) throw new AdminValidationError("number");
    if (!visualSeries && seriesOrder !== null) throw new AdminValidationError("constraint");
    const { error } = await supabase
      .from("gallery_items")
      .update({
        alt_text: textValue(formData, "alt_text", { max: 220 }),
        desktop_object_position: objectPositionValue(formData, "desktop_object_position"),
        mobile_object_position: objectPositionValue(formData, "mobile_object_position"),
        published: booleanValue(formData, "published"),
        series_order: seriesOrder,
        visual_series: visualSeries,
      })
      .eq("id", itemId)
      .eq("gallery_id", galleryId);
    if (error) throw error;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function reorderGalleryItemsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const destination = `/admin/galerias/${galleryId}`;
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_gallery_items", { ordered_ids: orderedIds, target_gallery_id: galleryId });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function replaceGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const destination = `/admin/galerias/${galleryId}`;
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const { data: existing, error } = await supabase.from("gallery_items").select("*").eq("id", itemId).eq("gallery_id", galleryId).single();
    if (error) throw error;
    const uploaded = await uploadManagedImage({ bucket: "site-galleries", file, parentId: galleryId });
    uploadedPath = uploaded.path;
    const { error: updateError } = await supabase.from("gallery_items").update({ height: uploaded.height, storage_path: uploaded.path, width: uploaded.width }).eq("id", itemId);
    if (updateError) throw updateError;
    try { await removeManagedImage("site-galleries", existing.storage_path); }
    catch (storageError) {
      const { error: rollbackError } = await supabase.from("gallery_items").update(existing).eq("id", itemId);
      try { await removeManagedImage("site-galleries", uploaded.path); } catch { /* Covered by storage QA. */ }
      if (rollbackError) throw rollbackError;
      throw storageError;
    }
  } catch (error) {
    if (uploadedPath) {
      const { data } = await supabase.from("gallery_items").select("storage_path").eq("id", itemId).maybeSingle();
      if (data?.storage_path !== uploadedPath) {
        try { await removeManagedImage("site-galleries", uploadedPath); } catch { /* Covered by storage QA. */ }
      }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function removeGalleryItemAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const galleryId = uuidValue(formData, "gallery_id");
  const itemId = uuidValue(formData, "item_id");
  const destination = `/admin/galerias/${galleryId}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: existing, error } = await supabase.from("gallery_items").select("*").eq("id", itemId).eq("gallery_id", galleryId).single();
    if (error) throw error;
    const { error: deleteError } = await supabase.from("gallery_items").delete().eq("id", itemId).eq("gallery_id", galleryId);
    if (deleteError) throw deleteError;
    try { await removeManagedImage("site-galleries", existing.storage_path); }
    catch (storageError) {
      const { error: restoreError } = await supabase.from("gallery_items").insert(existing);
      if (restoreError) throw restoreError;
      throw storageError;
    }
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "removed"));
}

export async function deleteGalleryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/galerias/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { count, error } = await supabase.from("gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", id);
    if (error) throw error;
    if ((count ?? 0) > 0) throw new AdminValidationError("linked");
    const { error: deleteError } = await supabase.from("galleries").delete().eq("id", id);
    if (deleteError) throw deleteError;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/galerias");
  redirect(appendFeedback("/admin/galerias", "status", "deleted"));
}

