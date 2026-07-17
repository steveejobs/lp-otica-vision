import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAG } from "./cache";

export function revalidatePublicCatalog() {
  updateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo/[slug]", "page");
  revalidatePath("/sitemap.xml");
}
