"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  enumValue,
  integerValue,
  mutationErrorCode,
  objectPositionValue,
  optionalMoneyValue,
  optionalTextValue,
  orderedUuidList,
  slugValue,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { removeManagedImage, uploadManagedImage } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const availabilityValues = ["available", "last_unit", "consultation", "unavailable"] as const;
const priceVisibilityValues = ["visible", "consult", "hidden"] as const;

function safeReturnPath(formData: FormData, fallback: string) {
  const value = formData.get("return_to");
  if (
    typeof value === "string" &&
    (value.startsWith("/admin/produtos") || value.startsWith("/admin/disponibilidade")) &&
    !value.startsWith("//")
  ) return value;
  return fallback;
}

function productPayload(formData: FormData) {
  return {
    availability_status: enumValue(formData, "availability_status", availabilityValues),
    brand_id: uuidValue(formData, "brand_id", true),
    category_id: uuidValue(formData, "category_id", true),
    color: optionalTextValue(formData, "color", { max: 120 }),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    featured: booleanValue(formData, "featured"),
    model: optionalTextValue(formData, "model", { max: 120 }),
    name: textValue(formData, "name", { max: 160 }),
    price: optionalMoneyValue(formData, "price"),
    price_visibility: enumValue(formData, "price_visibility", priceVisibilityValues),
    published: booleanValue(formData, "published"),
    short_description: optionalTextValue(formData, "short_description", { max: 600 }),
    sku: textValue(formData, "sku", { max: 80 }).toUpperCase(),
    slug: slugValue(formData),
    whatsapp_message_override: optionalTextValue(formData, "whatsapp_message_override", { max: 1200 }),
  } satisfies Database["public"]["Tables"]["products"]["Update"];
}

export async function createProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const payload = productPayload(formData);
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, featured: false, published: false })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode || !id) redirect(appendFeedback("/admin/produtos/novo", "error", errorCode ?? "failed"));
  revalidatePath("/admin/produtos");
  redirect(appendFeedback(`/admin/produtos/${id}`, "status", "created"));
}

export async function updateProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/produtos/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: product, error: readError } = await supabase.from("products").select("archived_at").eq("id", id).single();
    if (readError) throw readError;
    if (product.archived_at) throw new AdminValidationError("constraint");
    const payload = productPayload(formData);
    if (payload.featured && !payload.published) throw new AdminValidationError("constraint");
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/produtos");
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function duplicateProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  let duplicatedId: string | null = null;
  let errorCode: string | null = null;
  try {
    const { data: source, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) throw error;
    duplicatedId = randomUUID();
    const suffix = duplicatedId.slice(0, 8);
    const { error: insertError } = await supabase.from("products").insert({
      availability_status: "consultation",
      brand_id: source.brand_id,
      category_id: source.category_id,
      color: source.color,
      display_order: source.display_order,
      featured: false,
      id: duplicatedId,
      model: source.model,
      name: `${source.name.slice(0, 150)} (cópia)`,
      price: source.price,
      price_visibility: source.price_visibility,
      published: false,
      short_description: source.short_description,
      sku: `${source.sku.slice(0, 65)}-COPY-${suffix}`.toUpperCase(),
      slug: `${source.slug.slice(0, 100)}-copia-${suffix}`,
      whatsapp_message_override: source.whatsapp_message_override,
    });
    if (insertError) throw insertError;
  } catch (error) {
    duplicatedId = null;
    errorCode = mutationErrorCode(error);
  }
  if (errorCode || !duplicatedId) redirect(appendFeedback("/admin/produtos", "error", errorCode ?? "failed"));
  revalidatePath("/admin/produtos");
  redirect(appendFeedback(`/admin/produtos/${duplicatedId}`, "status", "created"));
}

export async function archiveProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = safeReturnPath(formData, "/admin/produtos");
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase
      .from("products")
      .update({ archived_at: new Date().toISOString(), featured: false, published: false })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/produtos");
  redirect(appendFeedback(destination, "status", "archived"));
}

export async function restoreProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/produtos/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("products").update({ archived_at: null }).eq("id", id);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/produtos");
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function updateAvailabilityAction(formData: FormData) {
  await requireAdminRole(["admin", "editor", "attendant"]);
  const id = uuidValue(formData, "id");
  const availability = enumValue(formData, "availability_status", availabilityValues);
  const destination = safeReturnPath(formData, "/admin/disponibilidade");
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("products").update({ availability_status: availability }).eq("id", id).is("archived_at", null);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/disponibilidade");
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function uploadProductImagesAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const supabase = await createSupabaseServerClient();
  const createdIds: string[] = [];
  const uploadedPaths: string[] = [];
  let errorCode: string | null = null;
  try {
    const altBase = textValue(formData, "alt_base", { max: 170 });
    const position = objectPositionValue(formData, "object_position");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length || files.length > 10) throw new AdminValidationError("image");
    const [{ count, error: countError }, { count: coverCount, error: coverError }] = await Promise.all([
      supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId).eq("is_cover", true),
    ]);
    if (countError || coverError) throw countError ?? coverError;
    for (const [index, file] of files.entries()) {
      const uploaded = await uploadManagedImage({ bucket: "catalog-products", file, parentId: productId });
      uploadedPaths.push(uploaded.path);
      const imageId = randomUUID();
      const { error } = await supabase.from("product_images").insert({
        alt_text: files.length > 1 ? `${altBase} — imagem ${index + 1}` : altBase,
        display_order: (count ?? 0) + index,
        height: uploaded.height,
        id: imageId,
        is_cover: (coverCount ?? 0) === 0 && index === 0,
        object_position: position,
        product_id: productId,
        storage_path: uploaded.path,
        width: uploaded.width,
      });
      if (error) throw error;
      createdIds.push(imageId);
    }
  } catch (error) {
    if (createdIds.length) await supabase.from("product_images").delete().in("id", createdIds);
    for (const path of uploadedPaths) {
      try { await removeManagedImage("catalog-products", path); } catch { /* Report the sanitized primary failure. */ }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function updateProductImageAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const imageId = uuidValue(formData, "image_id");
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const altText = textValue(formData, "alt_text", { max: 220 });
    const objectPosition = objectPositionValue(formData, "object_position");
    const { error } = await supabase
      .from("product_images")
      .update({ alt_text: altText, object_position: objectPosition })
      .eq("id", imageId)
      .eq("product_id", productId);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function setProductCoverAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const productId = uuidValue(formData, "product_id");
  const imageId = uuidValue(formData, "image_id");
  const destination = `/admin/produtos/${productId}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_product_cover", { target_image_id: imageId, target_product_id: productId });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function reorderProductImagesAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_product_images", { ordered_ids: orderedIds, target_product_id: productId });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function replaceProductImageAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const imageId = uuidValue(formData, "image_id");
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const file = formData.get("file");
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!(file instanceof File) || !file.size) throw new AdminValidationError("image");
    const { data: existing, error } = await supabase.from("product_images").select("*").eq("id", imageId).eq("product_id", productId).single();
    if (error) throw error;
    const uploaded = await uploadManagedImage({ bucket: "catalog-products", file, parentId: productId });
    uploadedPath = uploaded.path;
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ height: uploaded.height, storage_path: uploaded.path, width: uploaded.width })
      .eq("id", imageId)
      .eq("product_id", productId);
    if (updateError) throw updateError;
    try {
      await removeManagedImage("catalog-products", existing.storage_path);
    } catch (storageError) {
      const { error: rollbackError } = await supabase.from("product_images").update(existing).eq("id", imageId);
      try { await removeManagedImage("catalog-products", uploaded.path); } catch { /* QA catches cleanup failures. */ }
      if (rollbackError) throw rollbackError;
      throw storageError;
    }
  } catch (error) {
    if (uploadedPath) {
      const { data } = await supabase.from("product_images").select("storage_path").eq("id", imageId).maybeSingle();
      if (data?.storage_path !== uploadedPath) {
        try { await removeManagedImage("catalog-products", uploadedPath); } catch { /* QA catches cleanup failures. */ }
      }
    }
    errorCode = mutationErrorCode(error) === "failed" ? "image" : mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "uploaded"));
}

export async function removeProductImageAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const imageId = uuidValue(formData, "image_id");
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: existing, error } = await supabase.from("product_images").select("*").eq("id", imageId).eq("product_id", productId).single();
    if (error) throw error;
    const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
    if (deleteError) throw deleteError;
    try {
      await removeManagedImage("catalog-products", existing.storage_path);
    } catch (storageError) {
      const { error: restoreError } = await supabase.from("product_images").insert(existing);
      if (restoreError) throw restoreError;
      throw storageError;
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "removed"));
}

