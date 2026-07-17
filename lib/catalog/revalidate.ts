import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAG } from "./cache";

export function revalidatePublicCatalog(productSlug?: string) {
  updateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/catalogo");
  if (productSlug) revalidatePath(`/catalogo/${productSlug}`);
  else revalidatePath("/catalogo/[slug]", "page");
  revalidatePath("/sitemap.xml");
}
