export const PRODUCT_IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const PRODUCT_IMAGE_UPLOAD_MAX_FILES = 10;

export const PRODUCT_IMAGE_UPLOAD_MIME_TYPES = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductImageUploadMime = (typeof PRODUCT_IMAGE_UPLOAD_MIME_TYPES)[number];

export function isProductImageUploadMime(value: string): value is ProductImageUploadMime {
  return PRODUCT_IMAGE_UPLOAD_MIME_TYPES.includes(value as ProductImageUploadMime);
}

export function productImageUploadExtension(mime: ProductImageUploadMime) {
  if (mime === "image/avif") return "avif";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}
