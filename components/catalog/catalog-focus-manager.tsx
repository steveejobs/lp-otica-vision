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
  preloadProduct: (slug: string) => void;
}

const CatalogFocusContext = createContext<CatalogFocusContextValue | null>(null);

export function useCatalogFocus() {
  const ctx = useContext(CatalogFocusContext);
  if (!ctx) return null;
  return ctx;
}

interface CatalogFocusManagerProps {
  children: ReactNode;
  initialSlug: string | null;
  initialProduct: CatalogProduct | null;
  query: CatalogQuery;
}

type FlipGeometry = {
  rect: DOMRect;
};

// Simple Deduplicated Cache
const detailCache = new Map<string, CatalogProduct>();
const fetchPromises = new Map<string, Promise<CatalogProduct>>();

export function preloadProductData(slug: string) {
  if (detailCache.has(slug) || fetchPromises.has(slug)) return;
  
  const promise = fetch(`/api/catalog/products/${slug}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
       if (data) detailCache.set(slug, data);
       fetchPromises.delete(slug);
       return data;
    })
    .catch(() => {
       fetchPromises.delete(slug);
       return null;
    });
    
  fetchPromises.set(slug, promise);
}

export function CatalogFocusManager({ children, initialSlug, initialProduct, query }: CatalogFocusManagerProps) {
  const [focusedSlug, setFocusedSlug] = useState<string | null>(initialSlug);
  const [focusedProductData, setFocusedProductData] = useState<CatalogProduct | null>(initialProduct);
  const flipOrigins = useRef<Map<string, FlipGeometry>>(new Map());
  
  useEffect(() => {
    setFocusedSlug(initialSlug);
    setFocusedProductData(initialProduct);
  }, [initialSlug, initialProduct]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const url = new URL(window.location.href);
      const slug = url.searchParams.get("produto");
      setFocusedSlug(slug);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch logic when focusedSlug changes
  useEffect(() => {
    if (!focusedSlug) {
      setFocusedProductData(null);
      return;
    }
    
    let isMounted = true;
    
    if (detailCache.has(focusedSlug)) {
      setFocusedProductData(detailCache.get(focusedSlug)!);
      return;
    }
    
    const promise = fetchPromises.get(focusedSlug) || (
      fetch(`/api/catalog/products/${focusedSlug}`)
        .then(r => r.ok ? r.json() : null)
    );
    
    promise.then(data => {
      if (isMounted && data) {
        detailCache.set(focusedSlug, data);
        setFocusedProductData(data);
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, [focusedSlug]);

  const focusProduct = (slug: string, originElement: HTMLElement) => {
    if (slug === focusedSlug) return;

    // 1. FIRST - Ler dimensões antes do setState
    const frames = document.querySelectorAll<HTMLElement>("[data-flip-frame]");
    flipOrigins.current.clear();
    frames.forEach(frame => {
      const productEl = frame.closest("[data-catalog-product-slug]");
      const productSlug = productEl?.getAttribute("data-catalog-product-slug");
      if (productSlug) {
        flipOrigins.current.set(productSlug, { rect: frame.getBoundingClientRect() });
      }
    });
    
    const isFromRail = focusedSlug !== null;
    setFocusedSlug(slug);
    
    const newUrl = catalogHref(query, { product: slug });
    if (isFromRail) {
      window.history.replaceState({ showroomFocus: true }, "", newUrl);
    } else {
      window.history.pushState({ showroomFocus: true }, "", newUrl);
    }
  };

  const closeFocus = () => {
    // 1. FIRST (Closing)
    const frames = document.querySelectorAll<HTMLElement>("[data-flip-frame]");
    flipOrigins.current.clear();
    frames.forEach(frame => {
      const productEl = frame.closest("[data-catalog-product-slug]");
      const productSlug = productEl?.getAttribute("data-catalog-product-slug");
      if (productSlug) {
        flipOrigins.current.set(productSlug, { rect: frame.getBoundingClientRect() });
      }
    });

    setFocusedSlug(null);
    const newUrl = catalogHref(query, { product: null });
    
    if (window.history.state?.showroomFocus) {
      window.history.back();
    } else {
      window.history.replaceState(null, "", newUrl);
    }
  };

  useLayoutEffect(() => {
    if (flipOrigins.current.size === 0) return;
    
    // 2. LAST
    const frames = Array.from(document.querySelectorAll<HTMLElement>("[data-flip-frame]"));
    const inverts = frames.map(frame => {
      const productSlug = frame.closest("[data-catalog-product-slug]")?.getAttribute("data-catalog-product-slug");
      if (!productSlug) return null;
      
      const first = flipOrigins.current.get(productSlug);
      if (!first) return null;
      
      const lastRect = frame.getBoundingClientRect();
      const firstRect = first.rect;
      
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const scaleX = firstRect.width / lastRect.width;
      const scaleY = firstRect.height / lastRect.height;
      
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) {
        return null;
      }
      
      // 3. INVERT
      frame.style.transformOrigin = "top left";
      const invertTransform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
      frame.style.transform = invertTransform;
      
      return { frame, invertTransform };
    }).filter(Boolean) as { frame: HTMLElement, invertTransform: string }[];
    
    flipOrigins.current.clear();
    if (inverts.length === 0) return;
    
    // 4. PLAY (Request Animation Frame)
    requestAnimationFrame(() => {
      inverts.forEach(({ frame, invertTransform }) => {
        frame.style.transform = "";
        
        frame.animate([
          { transform: invertTransform },
          { transform: "translate(0, 0) scale(1)" }
        ], {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both"
        });
      });
    });
  }, [focusedSlug]);

  const getMode = (slug: string): FocusMode => {
    if (!focusedSlug) return "grid";
    if (slug === focusedSlug) return "focused";
    return "rail";
  };

  return (
    <CatalogFocusContext.Provider value={{ 
      focusedSlug, 
      focusedProductData, 
      focusProduct, 
      closeFocus, 
      getMode,
      preloadProduct: preloadProductData
    }}>
      {children}
    </CatalogFocusContext.Provider>
  );
}
