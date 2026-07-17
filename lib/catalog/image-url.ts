import type { CatalogImage } from "./types";

export function catalogImageUrl(
  image: Pick<CatalogImage, "id" | "updatedAt">,
) {
  return `/api/catalogo/imagem/${encodeURIComponent(image.id)}?v=${encodeURIComponent(image.updatedAt)}`;
}
