"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  enumValue,
  isUuidString,
  mutationErrorCode,
  objectPositionValue,
  optionalPositiveMoneyCentsValue,
  optionalTextValue,
  orderedUuidList,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { nextAvailableProductSlug, productSlugFromName } from "@/lib/admin/product-identity";
import { requireAdminRole } from "@/lib/auth/admin-access";
import {
  isProductImageUploadMime,
  productImageUploadExtension,
  PRODUCT_IMAGE_UPLOAD_MAX_BYTES,
  PRODUCT_IMAGE_UPLOAD_MAX_FILES,
  type ProductImageUploadMime,
} from "@/lib/catalog/image-upload";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  removeManagedImages,
  uploadProductImageSet,
  type UploadedProductImageSet,
} from "@/lib/storage/images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const availabilityValues = ["available", "last_unit", "unavailable"] as const;
const priceModeValues = ["defined", "consult"] as const;
const generatedProductSkuPattern = /^OV-\d{8,}$/;

type ProductImageUploadDescriptor = {
  mimeType: string;
  sizeBytes: number;
};

type ProductImageUploadToken = {
  id: string;
  path: string;
  token: string;
};

type ProductImageActionResult =
  | { ok: true; cleanupPending?: boolean; uploads?: ProductImageUploadToken[] }
  | { ok: false; error: string };

type StagedProductImage = Database["public"]["Tables"]["product_image_uploads"]["Row"];

function imageActionError(error: unknown) {
  const code = mutationErrorCode(error);
  return code === "failed" ? "image" : code;
}

function parseUploadDescriptors(input: {
  files: ProductImageUploadDescriptor[];
  productId: string;
}) {
  if (!isUuidString(input.productId) || !Array.isArray(input.files)) {
    throw new AdminValidationError("invalid");
  }
  if (!input.files.length || input.files.length > PRODUCT_IMAGE_UPLOAD_MAX_FILES) {
    throw new AdminValidationError("image");
  }
  return input.files.map((file) => {
    if (
      !file ||
      !isProductImageUploadMime(file.mimeType) ||
      !Number.isSafeInteger(file.sizeBytes) ||
      file.sizeBytes < 1 ||
      file.sizeBytes > PRODUCT_IMAGE_UPLOAD_MAX_BYTES
    ) {
      throw new AdminValidationError("image");
    }
    return { mimeType: file.mimeType, sizeBytes: file.sizeBytes };
  });
}

function parseUploadIds(uploadIds: string[], expectedMaximum = PRODUCT_IMAGE_UPLOAD_MAX_FILES) {
  if (
    !Array.isArray(uploadIds) ||
    !uploadIds.length ||
    uploadIds.length > expectedMaximum ||
    uploadIds.some((id) => !isUuidString(id)) ||
    new Set(uploadIds).size !== uploadIds.length
  ) {
    throw new AdminValidationError("image");
  }
  return uploadIds;
}

function normalizedObjectPosition(value: string) {
  const formData = new FormData();
  formData.set("object_position", value);
  return objectPositionValue(formData, "object_position");
}

async function cleanupExpiredProductImageUploads() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("product_image_uploads")
    .select("id, storage_path")
    .lt("expires_at", new Date().toISOString())
    .limit(100);
  if (error || !data?.length) return;
  const { error: storageError } = await admin.storage
    .from("catalog-products")
    .remove(data.map((upload) => upload.storage_path));
  if (storageError) return;
  await admin.from("product_image_uploads").delete().in("id", data.map((upload) => upload.id));
}

async function removeStagedProductImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  uploads: StagedProductImage[],
) {
  if (!uploads.length) return true;
  const { error: storageError } = await supabase.storage
    .from("catalog-products")
    .remove(uploads.map((upload) => upload.storage_path));
  if (storageError) return false;
  const { error: deleteError } = await supabase
    .from("product_image_uploads")
    .delete()
    .in("id", uploads.map((upload) => upload.id));
  return !deleteError;
}

async function stagedProductImageFile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  upload: StagedProductImage,
) {
  if (new Date(upload.expires_at).getTime() <= Date.now() || !isProductImageUploadMime(upload.mime_type)) {
    throw new AdminValidationError("image");
  }
  const { data, error } = await supabase.storage
    .from("catalog-products")
    .download(upload.storage_path);
  if (error || !data || data.size !== upload.size_bytes) {
    throw new AdminValidationError("image");
  }
  return new File(
    [data],
    `upload.${productImageUploadExtension(upload.mime_type as ProductImageUploadMime)}`,
    { type: upload.mime_type },
  );
}

function variantRows(imageId: string, imageSet: UploadedProductImageSet) {
  return imageSet.variants.map((variant) => ({
    asset_version: imageSet.assetVersion,
    etag: variant.etag,
    height: variant.height,
    kind: variant.kind,
    mime_type: variant.mime,
    product_image_id: imageId,
    size_bytes: variant.sizeBytes,
    storage_path: variant.path,
    width: variant.width,
  }));
}

function storedPaths(imageSet: UploadedProductImageSet) {
  return [imageSet.master.path, ...imageSet.variants.map((variant) => variant.path)];
}

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
  const priceMode = enumValue(formData, "price_mode", priceModeValues);
  const priceCents = priceMode === "defined"
    ? optionalPositiveMoneyCentsValue(formData, "price_cents")
    : null;
  if (priceMode === "defined" && priceCents === null) throw new AdminValidationError("price");

  return {
    availability_status: enumValue(formData, "availability_status", availabilityValues),
    brand_id: uuidValue(formData, "brand_id", true),
    category_id: uuidValue(formData, "category_id", true),
    color: optionalTextValue(formData, "color", { max: 120 }),
    featured: booleanValue(formData, "featured"),
    model: optionalTextValue(formData, "model", { max: 120 }),
    name: textValue(formData, "name", { max: 160 }),
    price: priceCents === null ? null : priceCents / 100,
    price_visibility: priceMode === "defined" ? "visible" as const : "consult" as const,
    published: booleanValue(formData, "published"),
    short_description: optionalTextValue(formData, "short_description", { max: 600 }),
  };
}

async function allocateProductSku() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("allocate_product_sku");
  if (error || typeof data !== "string" || !generatedProductSkuPattern.test(data)) {
    throw error ?? new AdminValidationError("failed");
  }
  return data;
}

async function allocateProductSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  name: string,
) {
  const base = productSlugFromName(name);
  if (!base) throw new AdminValidationError("slug");
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .like("slug", `${base}%`)
    .limit(5_000);
  if (error || !data) throw error ?? new AdminValidationError("failed");
  const slug = nextAvailableProductSlug(name, data.map((product) => product.slug));
  if (!slug) throw new AdminValidationError("slug");
  return slug;
}

async function nextProductDisplayOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data, error } = await supabase
    .from("products")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.display_order ?? -1) + 1;
}

function productStyleAssignments(formData: FormData) {
  if (formData.get("styles_contract") !== "1") return null;
  const styleIds = formData.getAll("style_ids").filter((value): value is string => typeof value === "string");
  if (styleIds.length > 3 || new Set(styleIds).size !== styleIds.length || styleIds.some((id) => !isUuidString(id))) {
    throw new AdminValidationError("constraint");
  }
  const primary = formData.get("style_primary");
  if (styleIds.length && (typeof primary !== "string" || !styleIds.includes(primary))) {
    throw new AdminValidationError("constraint");
  }
  const featured = new Set(formData.getAll("style_featured_ids").filter((value): value is string => typeof value === "string"));
  if ([...featured].some((id) => !styleIds.includes(id))) throw new AdminValidationError("constraint");

  return styleIds.map((styleId) => {
    const value = Number.parseInt(String(formData.get(`style_order_${styleId}`) ?? "0"), 10);
    if (!Number.isSafeInteger(value) || value < 0 || value > 100_000) throw new AdminValidationError("constraint");
    return {
      display_order: value,
      is_featured: featured.has(styleId),
      is_primary: styleId === primary,
      style_id: styleId,
    };
  });
}

export async function generateProductSkuAction(): Promise<
  { ok: true; sku: string } | { ok: false; error: string }
> {
  await requireAdminRole(["admin", "editor"]);
  try {
    return { ok: true, sku: await allocateProductSku() };
  } catch {
    return { ok: false, error: "Não foi possível gerar o SKU. Tente novamente." };
  }
}

export async function createProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const payload = productPayload(formData);
    const [displayOrder, sku, slug] = await Promise.all([
      nextProductDisplayOrder(supabase),
      allocateProductSku(),
      allocateProductSlug(supabase, payload.name),
    ]);
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, display_order: displayOrder, featured: false, published: false, sku, slug })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    const assignments = productStyleAssignments(formData);
    if (assignments) {
      const { error: styleError } = await supabase.rpc("sync_product_styles", {
        assignments,
        target_product_id: id,
      });
      if (styleError) {
        await supabase.from("products").delete().eq("id", id);
        throw styleError;
      }
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode || !id) redirect(appendFeedback("/admin/produtos/novo-produto", "error", errorCode ?? "failed"));
  revalidatePath("/admin/produtos");
  redirect(appendFeedback(`/admin/produtos/${id}`, "status", "created"));
}

export async function updateProductAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/produtos/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  let productSlug: string | null = null;
  try {
    const { data: product, error: readError } = await supabase.from("products").select("archived_at, slug").eq("id", id).single();
    if (readError) throw readError;
    if (product.archived_at) throw new AdminValidationError("constraint");
    const payload = productPayload(formData);
    const assignments = productStyleAssignments(formData);
    productSlug = product.slug;
    if (payload.featured && !payload.published) throw new AdminValidationError("constraint");
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw error;
    if (assignments) {
      const { error: styleError } = await supabase.rpc("sync_product_styles", {
        assignments,
        target_product_id: id,
      });
      if (styleError) throw styleError;
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/produtos");
  revalidatePath(destination);
  revalidatePublicCatalog(productSlug ?? undefined);
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
    const duplicatedName = `${source.name.slice(0, 150)} (cópia)`;
    const [displayOrder, sku, slug] = await Promise.all([
      nextProductDisplayOrder(supabase),
      allocateProductSku(),
      allocateProductSlug(supabase, duplicatedName),
    ]);
    const { error: insertError } = await supabase.from("products").insert({
      availability_status: "available",
      brand_id: source.brand_id,
      category_id: source.category_id,
      color: source.color,
      display_order: displayOrder,
      featured: false,
      id: duplicatedId,
      model: source.model,
      name: duplicatedName,
      price: source.price,
      price_visibility: source.price_visibility,
      published: false,
      short_description: source.short_description,
      sku,
      slug,
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
  revalidatePublicCatalog();
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
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function createProductImageUploadTokensAction(input: {
  files: ProductImageUploadDescriptor[];
  productId: string;
}): Promise<ProductImageActionResult> {
  const session = await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const createdIds: string[] = [];
  try {
    const files = parseUploadDescriptors(input);
    await cleanupExpiredProductImageUploads();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", input.productId)
      .is("archived_at", null)
      .maybeSingle();
    if (productError || !product) throw productError ?? new AdminValidationError("invalid");

    const expiresAt = new Date(Date.now() + 130 * 60 * 1_000).toISOString();
    const rows = files.map((file) => {
      const id = randomUUID();
      createdIds.push(id);
      return {
        created_by: session.profile.id,
        expires_at: expiresAt,
        id,
        mime_type: file.mimeType,
        product_id: input.productId,
        size_bytes: file.sizeBytes,
        storage_path: `${input.productId}/${randomUUID()}.${productImageUploadExtension(file.mimeType)}`,
      } satisfies Database["public"]["Tables"]["product_image_uploads"]["Insert"];
    });
    const { error: insertError } = await supabase.from("product_image_uploads").insert(rows);
    if (insertError) throw insertError;

    const uploads: ProductImageUploadToken[] = [];
    for (const row of rows) {
      const { data, error } = await supabase.storage
        .from("catalog-products")
        .createSignedUploadUrl(row.storage_path, { upsert: false });
      if (error || !data?.token) throw error ?? new AdminValidationError("image");
      uploads.push({ id: row.id, path: row.storage_path, token: data.token });
    }
    return { ok: true, uploads };
  } catch (error) {
    if (createdIds.length) {
      await supabase.from("product_image_uploads").delete().in("id", createdIds);
    }
    return { error: imageActionError(error), ok: false };
  }
}

export async function discardProductImageUploadsAction(input: {
  uploadIds: string[];
}): Promise<ProductImageActionResult> {
  const session = await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  try {
    const uploadIds = parseUploadIds(input.uploadIds);
    const { data, error } = await supabase
      .from("product_image_uploads")
      .select("*")
      .eq("created_by", session.profile.id)
      .in("id", uploadIds);
    if (error) throw error;
    if (!data.length) return { ok: true };
    if (!(await removeStagedProductImages(supabase, data))) {
      throw new AdminValidationError("image");
    }
    return { ok: true };
  } catch (error) {
    return { error: imageActionError(error), ok: false };
  }
}

export async function finalizeProductImageUploadsAction(input: {
  objectPosition: string;
  productId: string;
  uploadIds: string[];
}): Promise<ProductImageActionResult> {
  const session = await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const createdIds: string[] = [];
  const generatedSets: UploadedProductImageSet[] = [];
  let stagedUploads: StagedProductImage[] = [];
  try {
    if (!isUuidString(input.productId)) throw new AdminValidationError("invalid");
    const uploadIds = parseUploadIds(input.uploadIds);
    const objectPosition = normalizedObjectPosition(input.objectPosition);

    const [productResult, uploadResult, countResult, coverResult] = await Promise.all([
      supabase.from("products").select("id, name").eq("id", input.productId).is("archived_at", null).maybeSingle(),
      supabase
        .from("product_image_uploads")
        .select("*")
        .eq("product_id", input.productId)
        .eq("created_by", session.profile.id)
        .in("id", uploadIds),
      supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", input.productId),
      supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", input.productId).eq("is_cover", true),
    ]);
    if (productResult.error || !productResult.data) {
      throw productResult.error ?? new AdminValidationError("invalid");
    }
    if (uploadResult.error || countResult.error || coverResult.error) {
      throw uploadResult.error ?? countResult.error ?? coverResult.error;
    }
    if (uploadResult.data.length !== uploadIds.length) throw new AdminValidationError("image");
    const stagedById = new Map(uploadResult.data.map((upload) => [upload.id, upload]));
    stagedUploads = uploadIds
      .map((id) => stagedById.get(id))
      .filter((upload): upload is StagedProductImage => Boolean(upload));
    if (stagedUploads.length !== uploadIds.length) throw new AdminValidationError("image");

    for (const [index, staged] of stagedUploads.entries()) {
      const file = await stagedProductImageFile(supabase, staged);
      const uploaded = await uploadProductImageSet({ file, parentId: input.productId });
      generatedSets.push(uploaded);
      const imageId = randomUUID();
      const { error: imageError } = await supabase.from("product_images").insert({
        alt_text: `Imagem ${(countResult.count ?? 0) + index + 1} do produto ${productResult.data.name}`,
        asset_version: uploaded.assetVersion,
        blur_data_url: uploaded.blurDataUrl,
        display_order: (countResult.count ?? 0) + index,
        height: uploaded.master.height,
        id: imageId,
        is_cover: (coverResult.count ?? 0) === 0 && index === 0,
        mime_type: uploaded.master.mime,
        object_position: objectPosition,
        product_id: input.productId,
        size_bytes: uploaded.master.sizeBytes,
        storage_path: uploaded.master.path,
        width: uploaded.master.width,
      });
      if (imageError) throw imageError;
      createdIds.push(imageId);
      const { error: variantError } = await supabase
        .from("product_image_variants")
        .insert(variantRows(imageId, uploaded));
      if (variantError) throw variantError;
    }

    const cleanupComplete = await removeStagedProductImages(supabase, stagedUploads);
    revalidatePath(`/admin/produtos/${input.productId}`);
    revalidatePublicCatalog();
    return { cleanupPending: !cleanupComplete || undefined, ok: true };
  } catch (error) {
    let databaseRollbackComplete = true;
    if (createdIds.length) {
      const { error: rollbackError } = await supabase.from("product_images").delete().in("id", createdIds);
      databaseRollbackComplete = !rollbackError;
    }
    if (databaseRollbackComplete && generatedSets.length) {
      try {
        await removeManagedImages("catalog-products", generatedSets.flatMap(storedPaths));
      } catch {
        // The database no longer references these paths; the failure remains visible to the QA orphan audit.
      }
    }
    if (stagedUploads.length) await removeStagedProductImages(supabase, stagedUploads);
    return { error: imageActionError(error), ok: false };
  }
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
  revalidatePublicCatalog();
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
  revalidatePublicCatalog();
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
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "reordered"));
}

export async function finalizeProductImageReplacementAction(input: {
  imageId: string;
  productId: string;
  uploadId: string;
}): Promise<ProductImageActionResult> {
  const session = await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let stagedUploads: StagedProductImage[] = [];
  let uploaded: UploadedProductImageSet | null = null;
  try {
    if (!isUuidString(input.imageId) || !isUuidString(input.productId)) {
      throw new AdminValidationError("invalid");
    }
    parseUploadIds([input.uploadId], 1);
    const [productResult, uploadResult, existingResult, existingVariantsResult] = await Promise.all([
      supabase.from("products").select("id").eq("id", input.productId).is("archived_at", null).maybeSingle(),
      supabase
        .from("product_image_uploads")
        .select("*")
        .eq("id", input.uploadId)
        .eq("product_id", input.productId)
        .eq("created_by", session.profile.id)
        .maybeSingle(),
      supabase.from("product_images").select("*").eq("id", input.imageId).eq("product_id", input.productId).single(),
      supabase.from("product_image_variants").select("*").eq("product_image_id", input.imageId),
    ]);
    if (productResult.error || !productResult.data || uploadResult.error || !uploadResult.data) {
      throw productResult.error ?? uploadResult.error ?? new AdminValidationError("image");
    }
    if (existingResult.error || existingVariantsResult.error) {
      throw existingResult.error ?? existingVariantsResult.error;
    }
    stagedUploads = [uploadResult.data];
    const existing = existingResult.data;
    const existingVariants = existingVariantsResult.data;
    const file = await stagedProductImageFile(supabase, uploadResult.data);
    uploaded = await uploadProductImageSet({ file, parentId: input.productId });
    const { error: variantInsertError } = await supabase
      .from("product_image_variants")
      .insert(variantRows(input.imageId, uploaded));
    if (variantInsertError) throw variantInsertError;

    const { error: updateError } = await supabase
      .from("product_images")
      .update({
        asset_version: uploaded.assetVersion,
        blur_data_url: uploaded.blurDataUrl,
        height: uploaded.master.height,
        mime_type: uploaded.master.mime,
        size_bytes: uploaded.master.sizeBytes,
        storage_path: uploaded.master.path,
        width: uploaded.master.width,
      })
      .eq("id", input.imageId)
      .eq("product_id", input.productId)
      .eq("asset_version", existing.asset_version)
      .select("id")
      .single();
    if (updateError) throw updateError;

    const { error: oldVariantDeleteError } = await supabase
      .from("product_image_variants")
      .delete()
      .eq("product_image_id", input.imageId)
      .eq("asset_version", existing.asset_version);
    if (oldVariantDeleteError) {
      await supabase.from("product_images").update(existing).eq("id", input.imageId);
      throw oldVariantDeleteError;
    }

    try {
      await removeManagedImages("catalog-products", [
        existing.storage_path,
        ...existingVariants.map((variant) => variant.storage_path),
      ]);
    } catch (storageError) {
      const { error: rollbackError } = await supabase.from("product_images").update(existing).eq("id", input.imageId);
      const { error: restoreVariantsError } = existingVariants.length
        ? await supabase.from("product_image_variants").insert(existingVariants)
        : { error: null };
      if (rollbackError || restoreVariantsError) throw rollbackError ?? restoreVariantsError;
      throw storageError;
    }

    const cleanupComplete = await removeStagedProductImages(supabase, stagedUploads);
    revalidatePath(`/admin/produtos/${input.productId}`);
    revalidatePublicCatalog();
    return { cleanupPending: !cleanupComplete || undefined, ok: true };
  } catch (error) {
    if (uploaded) {
      const { data } = await supabase
        .from("product_images")
        .select("asset_version")
        .eq("id", input.imageId)
        .maybeSingle();
      if (data?.asset_version !== uploaded.assetVersion) {
        await supabase
          .from("product_image_variants")
          .delete()
          .eq("product_image_id", input.imageId)
          .eq("asset_version", uploaded.assetVersion);
        try {
          await removeManagedImages("catalog-products", storedPaths(uploaded));
        } catch {
          // The orphan audit reports a failed compensating Storage cleanup.
        }
      }
    }
    if (stagedUploads.length) await removeStagedProductImages(supabase, stagedUploads);
    return { error: imageActionError(error), ok: false };
  }
}

export async function removeProductImageAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const imageId = uuidValue(formData, "image_id");
  const productId = uuidValue(formData, "product_id");
  const destination = `/admin/produtos/${productId}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const [existingResult, existingVariantsResult] = await Promise.all([
      supabase.from("product_images").select("*").eq("id", imageId).eq("product_id", productId).single(),
      supabase.from("product_image_variants").select("*").eq("product_image_id", imageId),
    ]);
    if (existingResult.error || existingVariantsResult.error) {
      throw existingResult.error ?? existingVariantsResult.error;
    }
    const existing = existingResult.data;
    const existingVariants = existingVariantsResult.data;
    const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
    if (deleteError) throw deleteError;
    try {
      await removeManagedImages("catalog-products", [
        existing.storage_path,
        ...existingVariants.map((variant) => variant.storage_path),
      ]);
    } catch (storageError) {
      const { error: restoreError } = await supabase.from("product_images").insert(existing);
      const { error: restoreVariantsError } = !restoreError && existingVariants.length
        ? await supabase.from("product_image_variants").insert(existingVariants)
        : { error: null };
      if (restoreError || restoreVariantsError) throw restoreError ?? restoreVariantsError;
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
