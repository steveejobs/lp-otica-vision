import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PassePartoutVivo } from "@/components/experiments/passe-partout-vivo";
import { editorialGalleryImages, instagramImages } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Passe-partout Vivo | Experimento Ótica Vision",
  description: "Protótipo isolado de direção de arte para a abertura da Ótica Vision.",
  robots: { follow: false, index: false, nocache: true },
};

type PageProps = {
  searchParams: Promise<{ serie?: string }>;
};

export default async function PassePartoutVivoPage({ searchParams }: PageProps) {
  if (process.env.VERCEL_ENV === "production") notFound();

  const { serie } = await searchParams;
  const media = serie === "1"
    ? editorialGalleryImages.slice(0, 3)
    : instagramImages.slice(3, 6);

  return <PassePartoutVivo media={media} />;
}
