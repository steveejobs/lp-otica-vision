import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração | Ótica Vision",
  description: "Área administrativa protegida da Ótica Vision.",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
