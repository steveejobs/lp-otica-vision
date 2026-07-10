import type { Metadata, Viewport } from "next";

import { MotionController } from "@/components/motion-controller";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Ótica Vision | Araguaína - TO",
  description:
    "Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.",
  icons: {
    icon: "/media/identity/favicon.png",
    apple: "/media/identity/favicon.png",
  },
  openGraph: {
    title: "Ótica Vision | Araguaína - TO",
    description:
      "Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b19475",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <MotionController />
        {children}
      </body>
    </html>
  );
}
