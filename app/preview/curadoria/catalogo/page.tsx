import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { VisionCuration } from "@/components/curation/vision-curation";
import { fixtureCurationSelection } from "@/lib/curation/fixtures";

import styles from "../preview.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Catálogo de demonstração | Ótica Vision",
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CurationCatalogPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const params = await searchParams;
  const styleSlug = scalar(params.estilo) ?? "classica";
  const categorySlug = scalar(params.categoria) ?? null;

  return (
    <main className={styles.page} id="main-content">
      <header className={styles.bar}>
        <Link href="/preview/curadoria">
          <ArrowLeft aria-hidden="true" size={17} />
          Voltar à curadoria
        </Link>
        <p>Catálogo de demonstração · sem dados comerciais</p>
      </header>
      <VisionCuration
        analytics={false}
        demoBasePath="/preview/curadoria"
        initialSelection={fixtureCurationSelection(styleSlug, categorySlug)}
        previewLabel="Continuidade no catálogo · QA"
      />
    </main>
  );
}
