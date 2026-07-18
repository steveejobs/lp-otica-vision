import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FocusChamber } from "@/components/experiments/focus-chamber";
import {
  editorialGalleryImages,
  heroMedia,
  homeVideos,
  labMedia,
} from "@/lib/assets";
import { getFeaturedCatalogProducts } from "@/lib/catalog/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Câmara de Foco | Experimento Ótica Vision",
  description: "Prova experimental de abertura digital da Ótica Vision.",
  robots: {
    follow: false,
    index: false,
    nocache: true,
    googleBot: {
      follow: false,
      index: false,
      noarchive: true,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

export default async function FocusChamberPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const publishedProducts = (await getFeaturedCatalogProducts()).slice(0, 3);

  return (
    <FocusChamber
      catalogProducts={publishedProducts}
      hero={heroMedia}
      selectionFallback={[
        labMedia[0],
        editorialGalleryImages[1],
        editorialGalleryImages[4],
      ]}
      video={homeVideos[0]}
    />
  );
}
