import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getCatalogFilterOptions,
  getCatalogPage,
  getFeaturedCatalogProducts,
} from "@/lib/catalog/data";
import { generateMockProducts } from "@/lib/catalog/fixtures";
import { parseCatalogQuery, type CatalogSearchParams } from "@/lib/catalog/query";
import { getCurationStyleOptions } from "@/lib/curation/data";

import { ExperienceView } from "@/components/preview-experience/experience-view";

export const metadata: Metadata = {
  title: "[EXPERIENCE] Vitrine Vision",
  robots: "noindex, nofollow",
};

export default async function CatalogExperiencePage(props: {
  searchParams: Promise<CatalogSearchParams & { scale?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const rawParams = await props.searchParams;
  const scale = rawParams.scale || "4"; // "4" | "24" | "100"
  
  const query = parseCatalogQuery(rawParams);
  
  // Real data
  const [realCatalog, filters, styleOptions, featuredProducts] = await Promise.all([
    getCatalogPage(query),
    getCatalogFilterOptions(),
    getCurationStyleOptions(query.category),
    getFeaturedCatalogProducts(),
  ]);

  let catalog = realCatalog;

  if (scale === "4") {
    const products = realCatalog.products.slice(0, 4);
    catalog = {
      ...realCatalog,
      products,
      total: products.length,
      totalPages: 1,
    };
  } else if (scale === "24") {
    const products = generateMockProducts(24, 4);
    catalog = {
      ...catalog,
      products,
      total: 24,
      totalPages: 1,
    };
  } else if (scale === "100") {
    const products = generateMockProducts(100, 6);
    catalog = {
      ...catalog,
      products,
      total: 100,
      totalPages: 5,
    };
  }

  return (
    <ExperienceView
      catalog={catalog}
      featuredProducts={featuredProducts}
      filters={filters}
      query={query}
      styleOptions={styleOptions}
      scale={scale}
    />
  );
}
