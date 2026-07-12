import type { Metadata, Viewport } from "next";

import { heroMedia, identityAssets } from "@/lib/assets";
import { getMetadataBase } from "@/lib/metadata";

import "@/styles/globals.css";

const metadataBase = getMetadataBase();
const title = "Ótica Vision em Araguaína | Armações e LAB. DIGITAL";
const description =
  "Armações nacionais e importadas, lentes feitas pela Vision e atendimento em Araguaína - TO.";

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title,
  description,
  icons: {
    icon: identityAssets.favicon,
    shortcut: identityAssets.favicon,
    apple: identityAssets.favicon,
  },
  openGraph: {
    title,
    description,
    siteName: "Ótica Vision",
    locale: "pt_BR",
    type: "website",
    ...(metadataBase
      ? {
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
  themeColor: "#fbf8f3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
