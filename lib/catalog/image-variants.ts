export const PRODUCT_IMAGE_VARIANT_KINDS = [
  "admin_thumbnail",
  "catalog_card",
  "home_preview",
  "product_detail",
  "open_graph",
] as const;

export type ProductImageVariantKind = (typeof PRODUCT_IMAGE_VARIANT_KINDS)[number];

const publicVariantKinds = new Set<ProductImageVariantKind>([
  "catalog_card",
  "home_preview",
  "product_detail",
  "open_graph",
]);

export function isPublicProductImageVariant(value: string): value is ProductImageVariantKind {
  return publicVariantKinds.has(value as ProductImageVariantKind);
}
