import "server-only";

import { getMetadataBase } from "@/lib/metadata";

export function getCatalogSiteBase() {
  const metadataBase = getMetadataBase();
  if (metadataBase) return metadataBase;

  const previewHost = process.env.VERCEL_URL?.trim();
  if (previewHost) return new URL(`https://${previewHost}`);

  return new URL("http://localhost:3000");
}

export function getCatalogProductUrl(slug: string) {
  return new URL(`/catalogo/${encodeURIComponent(slug)}`, getCatalogSiteBase()).toString();
}
