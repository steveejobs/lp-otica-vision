import type { CatalogImage } from "./types";
import type { ProductImageVariantKind } from "./image-variants";

export function catalogImageUrl(
  image: Pick<CatalogImage, "id" | "updatedAt">,
  variant: Exclude<ProductImageVariantKind, "admin_thumbnail"> = "product_detail",
) {
  const params = new URLSearchParams({
    v: image.updatedAt,
    variant,
  });
  return `/api/catalogo/imagem/${encodeURIComponent(image.id)}?${params.toString()}`;
}
