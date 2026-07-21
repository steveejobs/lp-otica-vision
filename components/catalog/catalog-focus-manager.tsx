"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogProduct, CatalogQuery } from "@/lib/catalog/types";
import { catalogHref } from "@/lib/catalog/query";

type FocusMode = "grid" | "focused" | "rail";

interface CatalogFocusContextValue {
  focusedSlug: string | null;
  focusedProductData: CatalogProduct | null;
  focusProduct: (slug: string, originElement: HTMLElement) => void;
  closeFocus: () => void;
  getMode: (slug: string) => FocusMode;
}

const CatalogFocusContext = createContext<CatalogFocusContextValue | null>(null);

export function useCatalogFocus() {
  const ctx = useContext(CatalogFocusContext);
  if (!ctx) return null; // Retorna null silenciosamente se não estiver no contexto, permitindo uso genérico.
  return ctx;
}

interface CatalogFocusManagerProps {
  children: ReactNode;
  initialSlug: string | null;
  initialProduct: CatalogProduct | null;
  query: CatalogQuery;
}

export function CatalogFocusManager({ children, initialSlug, initialProduct, query }: CatalogFocusManagerProps) {
  const [focusedSlug, setFocusedSlug] = useState<string | null>(initialSlug);
  const [focusedProductData, setFocusedProductData] = useState<CatalogProduct | null>(initialProduct);
  
  // Sincronizar quando a prop do server mudar (ex: navegação via filtros)
  useEffect(() => {
    setFocusedSlug(initialSlug);
    setFocusedProductData(initialProduct);
  }, [initialSlug, initialProduct]);

  // Handle popstate for back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const url = new URL(window.location.href);
      const slug = url.searchParams.get("produto");
      
      // If we go back, we don't need FLIP if we just restore the grid.
      // But we will let the normal state update handle it.
      setFocusedSlug(slug);
      
      // We don't have the full data anymore unless we cached it, but that's fine, 
      // the card uses standard cover image.
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const focusProduct = (slug: string, originElement: HTMLElement) => {
    // 6. Fazer todas as leituras First antes do setState.
    // Lógica do FLIP começará aqui depois
    
    const isFromRail = focusedSlug !== null;
    
    setFocusedSlug(slug);
    
    // 3. Atualizar URL com pushState (se vindo do grid) ou replaceState (se trocando no rail)
    const newUrl = catalogHref(query, { product: slug });
    
    if (isFromRail) {
      window.history.replaceState({ showroomFocus: true }, "", newUrl);
    } else {
      window.history.pushState({ showroomFocus: true }, "", newUrl);
    }
    
    // TODO: Disparar preload/fetch do data da API
  };

  const closeFocus = () => {
    setFocusedSlug(null);
    const newUrl = catalogHref(query, { product: null });
    
    if (window.history.state?.showroomFocus) {
      // 3. Fechar com history.back somente quando essa entrada tiver sido criada pelo Showroom Focus.
      window.history.back();
    } else {
      window.history.replaceState(null, "", newUrl);
    }
  };

  const getMode = (slug: string): FocusMode => {
    if (!focusedSlug) return "grid";
    if (slug === focusedSlug) return "focused";
    return "rail";
  };

  return (
    <CatalogFocusContext.Provider value={{ focusedSlug, focusedProductData, focusProduct, closeFocus, getMode }}>
      {children}
    </CatalogFocusContext.Provider>
  );
}
