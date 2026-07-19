import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VisionCuration } from "@/components/curation/vision-curation";
import { fixtureCurationScenario } from "@/lib/curation/fixtures";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Preview de curadoria | Ótica Vision",
};

export default async function CurationPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ cenario?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { cenario } = await searchParams;

  return (
    <main id="main-content">
      <VisionCuration
        analytics={false}
        demoBasePath="/preview/curadoria"
        initialSelection={fixtureCurationScenario(cenario)}
        previewLabel="Preview isolado · dados visuais de QA"
      />
    </main>
  );
}
