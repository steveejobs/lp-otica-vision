import "server-only";

import type { CuratedProduct } from "@/lib/curation/types";
import { buildProductWhatsappUrl } from "@/lib/whatsapp/product-link";

type ProductUrlInput = Pick<CuratedProduct, "id" | "model" | "name" | "slug">;

/** Creates the contextual WhatsApp CTA used by the curated product preview. */
export async function getCurationProductWhatsappUrls(
  products: ProductUrlInput[],
  siteUrl: URL,
) {
  return Object.fromEntries(await Promise.all(
    products.map(async (product) => [
      product.id,
      await buildProductWhatsappUrl({
        productName: product.name,
        model: product.model,
        productUrl: new URL(`/catalogo/${product.slug}`, siteUrl).toString(),
      }),
    ] as const),
  ));
}
