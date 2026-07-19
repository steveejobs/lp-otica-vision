import type { MetadataRoute } from "next";

import { getCatalogSitemapProducts } from "@/lib/catalog/data";
import { getCatalogSiteBase } from "@/lib/catalog/site-url";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getCatalogSiteBase();
  const products = await getCatalogSitemapProducts();
  const staticRoutes: MetadataRoute.Sitemap = [
    { changeFrequency: "weekly", priority: 1, url: new URL("/", base).toString() },
    { changeFrequency: "weekly", priority: 0.9, url: new URL("/catalogo", base).toString() },
    { changeFrequency: "monthly", priority: 0.65, url: new URL("/bio", base).toString() },
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      changeFrequency: "weekly" as const,
      lastModified: new Date(product.updated_at),
      priority: 0.75,
      url: new URL(`/catalogo/${encodeURIComponent(product.slug)}`, base).toString(),
    })),
  ];
}
