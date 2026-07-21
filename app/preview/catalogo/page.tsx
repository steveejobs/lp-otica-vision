import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/catalog-view";
import { generateMockFilterOptions, generateMockProducts } from "@/lib/catalog/fixtures";
import { parseCatalogQuery, type CatalogSearchParams } from "@/lib/catalog/query";

export const metadata: Metadata = {
  title: "[PREVIEW] Vitrine Vision",
  robots: "noindex, nofollow",
};

export default async function CatalogPreviewPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  
  // Extract mock query params
  const rawParams = await searchParams;
  const mockCount = rawParams.mock ? parseInt(String(rawParams.mock), 10) : 12;
  const mockHighlights = rawParams.highlights ? parseInt(String(rawParams.highlights), 10) : 4;
  
  const products = generateMockProducts(mockCount, mockHighlights);
  const filters = generateMockFilterOptions();

  const catalog = {
    page: query.page,
    pageSize: 24,
    products,
    total: products.length,
    totalPages: Math.max(1, Math.ceil(products.length / 24)),
  };

  return (
    <CatalogView
      catalog={catalog}
      collectionId={null}
      featuredProducts={[]}
      filters={filters}
      query={query}
      styleOptions={[]}
    />
  );
}

