import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCatalogFilterOptions, getCatalogPage, getHeroEditorialProducts } from "@/lib/catalog/data";
import { CatalogView } from "@/components/catalog/catalog-view";
import { LabSection } from "@/components/lab-section";
import { VisionEditorialTakeover } from "@/components/vision-editorial-takeover";
import { parseCatalogQuery } from "@/lib/catalog/query";

import { labMedia } from "@/lib/assets";
import { displayMediaFromLocalList } from "@/lib/gallery/display-media";

export const dynamic = "force-dynamic";

export default async function V4RefinementPreviewPage() {
  // 1. Guard: Return 404 in production environment
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const query = parseCatalogQuery({ pagina: "1" });
  const labMediaDisplay = displayMediaFromLocalList(labMedia) as unknown as [any, any];

  // 2. Fetch staging preview data
  const [catalog, filters, heroProducts] = await Promise.all([
    getCatalogPage(query),
    getCatalogFilterOptions(),
    getHeroEditorialProducts({ limit: 3 }),
  ]);

  return (
    <div style={{ background: "var(--vision-paper, #fbf8f3)", minHeight: "100vh" }}>
      {/* Search Engine Robots Noindex Tag */}
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Preview V4 Refinement — Ótica Vision</title>
      </head>

      <header style={{ padding: "1rem 2rem", background: "#191614", color: "#fbf8f3", textAlign: "center" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          AMBIENTE ISOLADO DE PREVIEW — V4 REFINEMENT (NÃO PROMOVIDO)
        </span>
      </header>

      {/* Hero Section Preview */}
      <section style={{ position: "relative", marginBottom: "4rem" }}>
        <VisionEditorialTakeover media={[]} heroProducts={heroProducts} />
      </section>

      {/* Lab Section Preview */}
      <section style={{ marginBottom: "4rem" }}>
        <LabSection media={labMediaDisplay} />
      </section>

      {/* Catalog & Search Preview */}
      <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center" }}>Carregando preview do catálogo...</div>}>
        <CatalogView
          catalog={catalog}
          collectionId={null}
          featuredProducts={heroProducts}
          filters={filters}
          query={query}
          styleOptions={[]}
          initialFocusedProduct={null}
        />
      </Suspense>
    </div>
  );
}
