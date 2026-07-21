import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpticalBenchPrototype } from "@/components/curation/optical-bench-prototype";

import { opticalBenchProducts } from "./prototype-data";

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
  const requestedSize = Number(cenario ?? 4);
  const size = Number.isFinite(requestedSize) ? Math.min(Math.max(requestedSize, 0), 4) : 4;

  return (
    <main id="main-content">
      <OpticalBenchPrototype products={opticalBenchProducts.slice(0, size)} />
    </main>
  );
}
