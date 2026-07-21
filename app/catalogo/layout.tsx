import { type ReactNode } from "react";
import { CatalogMediaTransitionProvider } from "@/components/catalog/catalog-transition-provider";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  // Ler a flag do ambiente seguro de server-side. Não é NEXT_PUBLIC, então não vaza.
  const isTransitionEnabled = process.env.CATALOG_SHARED_MEDIA_TRANSITION === "true";

  return (
    <CatalogMediaTransitionProvider enabled={isTransitionEnabled}>
      {children}
    </CatalogMediaTransitionProvider>
  );
}
