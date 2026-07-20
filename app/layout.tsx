import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { AnalyticsRuntime } from "@/components/analytics/analytics-runtime";
import { CatalogTransitionManager } from "@/components/catalog/catalog-transition-manager";
import { VisionMotion } from "@/components/motion";
import { heroMedia, identityAssets } from "@/lib/assets";
import { getMetadataBase } from "@/lib/metadata";

import "@/styles/globals.css";

const metadataBase = getMetadataBase();
const title = "Ótica Vision | Armações e lentes em Araguaína";
const description =
  "Seleção de armações nacionais e importadas, LAB. DIGITAL e confecção própria de lentes em Araguaína - TO.";

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  ...(metadataBase ? { alternates: { canonical: "/" } } : {}),
  title,
  description,
  icons: {
    icon: identityAssets.favicon,
  },
  openGraph: {
    title,
    description,
    siteName: "Ótica Vision",
    locale: "pt_BR",
    type: "website",
    ...(metadataBase
      ? {
          url: "/",
          images: [
            {
              url: heroMedia.src,
              width: 1440,
              height: 1919,
              alt: heroMedia.alt,
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    ...(metadataBase ? { images: [heroMedia.src] } : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F0E9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <VisionMotion />
        <Suspense fallback={null}>
          <AnalyticsRuntime measurementId={measurementId} />
        </Suspense>
        <Suspense fallback={null}>
          <CatalogTransitionManager />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
