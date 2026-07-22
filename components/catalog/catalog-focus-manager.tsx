"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogProduct, CatalogProductCard, CatalogQuery } from "@/lib/catalog/types";
import { catalogHref } from "@/lib/catalog/query";

type FocusMode = "grid" | "focused" | "rail";

interface FocusProductInput {
  slug: string;
  flipFrame: HTMLElement | null;
}

interface CatalogFocusContextValue {
  focusedSlug: string | null;
  focusedProductData: CatalogProduct | null;
  focusProduct: (input: FocusProductInput) => void;
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
  catalogProducts?: CatalogProductCard[];
}

type FlipGeometry = {
  rect: DOMRect;
};

// Simple Deduplicated Cache
const detailCache = new Map<string, CatalogProduct>();
const fetchPromises = new Map<string, Promise<CatalogProduct>>();

export function getCachedProductData(slug: string): CatalogProduct | null {
  return detailCache.get(slug) ?? null;
}

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

export function CatalogFocusManager({ children, initialSlug, initialProduct, query, catalogProducts = [] }: CatalogFocusManagerProps) {
  const [focusedSlug, setFocusedSlug] = useState<string | null>(initialSlug);
  const [focusedProductData, setFocusedProductData] = useState<CatalogProduct | null>(initialProduct);
  const flipOrigins = useRef<Map<string, FlipGeometry>>(new Map());
  const didInitRef = useRef(false);

  // Only use initialSlug/initialProduct on first mount, not on re-renders
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    // Already set via useState initial values
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const slug = url.searchParams.get("produto");
      setFocusedSlug(slug);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedSlug) return;
      // Don't intercept if user is typing in an input/textarea
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeFocus();
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const productEls = Array.from(document.querySelectorAll<HTMLElement>("[data-catalog-product-slug]"));
        const slugs = Array.from(new Set(productEls.map(el => el.getAttribute("data-catalog-product-slug")).filter(Boolean))) as string[];
        if (slugs.length <= 1) return;

        const currentIndex = slugs.indexOf(focusedSlug);
        if (currentIndex === -1) return;

        e.preventDefault();
        const nextIndex = e.key === "ArrowRight"
          ? (currentIndex + 1) % slugs.length
          : (currentIndex - 1 + slugs.length) % slugs.length;
        
        const nextSlug = slugs[nextIndex];
        const nextEl = document.querySelector<HTMLElement>(`[data-catalog-product-slug="${nextSlug}"] [data-flip-frame]`);
        
        focusProduct({ slug: nextSlug, flipFrame: nextEl });
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusedSlug]);

  // Fetch logic when focusedSlug changes with instant 0ms data seeding
  useEffect(() => {
    if (!focusedSlug) {
      setFocusedProductData(null);
      return;
    }
    
    let isMounted = true;
    
    if (detailCache.has(focusedSlug)) {
      setFocusedProductData(detailCache.get(focusedSlug)!);
    } else {
      // Find basic product data in initialProduct or catalog list for 0ms instant rendering
      const catalogItem = catalogProducts.find(p => p.slug === focusedSlug) || (initialProduct?.slug === focusedSlug ? initialProduct : null);
      if (catalogItem) {
        const instantData: CatalogProduct = {
          ...catalogItem,
          images: [catalogItem.cover],
        };
        detailCache.set(focusedSlug, instantData);
        setFocusedProductData(instantData);
      }
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
  }, [focusedSlug, catalogProducts, initialProduct]);

  const focusProduct = ({ slug, flipFrame }: FocusProductInput) => {
    if (slug === focusedSlug) return;

    // 1. FIRST — capture geometry before setState
    flipOrigins.current.clear();
    
    if (flipFrame) {
      flipOrigins.current.set(slug, { rect: flipFrame.getBoundingClientRect() });
    }
    
    // Also capture other visible flip frames for rail animation
    const allFrames = document.querySelectorAll<HTMLElement>("[data-flip-frame]");
    allFrames.forEach(frame => {
      const productEl = frame.closest("[data-catalog-product-slug]");
      const frameSlug = productEl?.getAttribute("data-catalog-product-slug");
      if (frameSlug && !flipOrigins.current.has(frameSlug)) {
        const rect = frame.getBoundingClientRect();
        // Only capture visible frames
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          flipOrigins.current.set(frameSlug, { rect });
        }
      }
    });
    
    const isFromRail = focusedSlug !== null;
    const catalogScrollY = isFromRail ? undefined : window.scrollY;
    
    setFocusedSlug(slug);
    
    const newUrl = catalogHref(query, { product: slug });
    const statePayload = {
      ...window.history.state,
      showroomFocus: true,
      focusedSlug: slug,
      catalogScrollY,
    };
    
    if (isFromRail) {
      window.history.replaceState(statePayload, "", newUrl);
    } else {
      window.history.pushState(statePayload, "", newUrl);
    }
  };

  const closeFocus = () => {
    // 1. FIRST (Closing) — capture geometry
    flipOrigins.current.clear();
    const allFrames = document.querySelectorAll<HTMLElement>("[data-flip-frame]");
    allFrames.forEach(frame => {
      const productEl = frame.closest("[data-catalog-product-slug]");
      const frameSlug = productEl?.getAttribute("data-catalog-product-slug");
      if (frameSlug) {
        flipOrigins.current.set(frameSlug, { rect: frame.getBoundingClientRect() });
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
    
    // 2. LAST — measure new positions
    const frames = Array.from(document.querySelectorAll<HTMLElement>("[data-flip-frame]"));
    const inverts: { frame: HTMLElement; invertTransform: string }[] = [];
    
    for (const frame of frames) {
      const productSlug = frame.closest("[data-catalog-product-slug]")?.getAttribute("data-catalog-product-slug");
      if (!productSlug) continue;
      
      const first = flipOrigins.current.get(productSlug);
      if (!first) continue;
      
      const lastRect = frame.getBoundingClientRect();
      const firstRect = first.rect;
      
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const scaleX = firstRect.width / lastRect.width;
      const scaleY = firstRect.height / lastRect.height;
      
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) {
        continue;
      }
      
      // 3. INVERT
      frame.style.transformOrigin = "top left";
      const invertTransform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
      frame.style.transform = invertTransform;
      
      inverts.push({ frame, invertTransform });
    }
    
    flipOrigins.current.clear();
    if (inverts.length === 0) return;
    
    // 4. PLAY
    requestAnimationFrame(() => {
      for (const { frame, invertTransform } of inverts) {
        // Cancel any existing animations on this frame
        frame.getAnimations().forEach(a => a.cancel());
        
        frame.style.transform = "";
        
        frame.animate([
          { transform: invertTransform },
          { transform: "translate(0, 0) scale(1)" }
        ], {
          duration: 520,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "both"
        });
      }
    });

    if (focusedSlug) {
      requestAnimationFrame(() => {
        const focusedCard = document.querySelector<HTMLElement>('[data-mode="focused"]');
        if (focusedCard) {
          const cardTop = focusedCard.getBoundingClientRect().top + window.scrollY;
          const targetY = Math.max(0, cardTop - 16);
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      });
    }
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
