import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/catalog-view";
import {
  getCatalogFilterOptions,
  getCatalogPage,
  getFeaturedCatalogProducts,
  getPublishedCollectionId,
  getPublishedCatalogProduct,
} from "@/lib/catalog/data";
import { parseCatalogQuery, type CatalogSearchParams } from "@/lib/catalog/query";
import { getCurationStyleOptions } from "@/lib/curation/data";

const title = "Vitrine Vision | Ótica Vision";
const description =
  "Explore armações nacionais e importadas da Ótica Vision e consulte cada modelo pelo WhatsApp.";

export const metadata: Metadata = {
  alternates: { canonical: "/catalogo" },
  description,
  openGraph: {
    description,
    title,
    type: "website",
    url: "/catalogo",
  },
  title,
  twitter: {
    card: "summary",
    description,
    title,
  },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [catalog, filters, collectionId, styleOptions, featuredProducts, initialFocusedProduct] = await Promise.all([
    getCatalogPage(query),
    getCatalogFilterOptions(),
    query.collection
      ? getPublishedCollectionId(query.collection)
      : Promise.resolve(null),
    getCurationStyleOptions(query.category),
    getFeaturedCatalogProducts(),
    query.product ? getPublishedCatalogProduct(query.product) : Promise.resolve(null),
  ]);

  return (
    <CatalogView
      catalog={catalog}
      collectionId={collectionId}
      featuredProducts={featuredProducts}
      filters={filters}
      query={query}
      styleOptions={styleOptions}
      initialFocusedProduct={initialFocusedProduct}
    />
  );
}
