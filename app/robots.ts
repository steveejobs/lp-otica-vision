import type { MetadataRoute } from "next";

import { getCatalogSiteBase } from "@/lib/catalog/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getCatalogSiteBase();
  return {
    rules: {
      allow: "/",
      disallow: ["/admin/", "/api/", "/experiments/"],
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
