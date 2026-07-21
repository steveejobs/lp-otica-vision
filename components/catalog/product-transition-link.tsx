"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef } from "react";
import { useCatalogMediaTransition } from "./catalog-transition-provider";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";
import styles from "./catalog-product-card.module.css";

type ProductTransitionLinkProps = {
  children: ReactNode;
  product: CatalogProductCardData;
  href: string;
  external?: boolean;
  linkLabel: string;
  clone?: boolean;
};

export function ProductTransitionLink({ children, product, href, external, linkLabel, clone }: ProductTransitionLinkProps) {
  const { state, enabled, registerOrigin, markNavigating } = useCatalogMediaTransition();
  const linkRef = useRef<HTMLAnchorElement>(null);
  
  const preloadHighRes = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    const url = catalogImageUrl(product.cover, "product_detail");
    const img = new window.Image();
    // Image.decode is async, we do not await it here for UI blocking, it just preloads.
    img.src = url;
    img.decode().catch(() => {
      // Silently ignore decode errors for preloading
    });
  }, [enabled, product.cover]);

  const captureGeometry = useCallback(() => {
    if (!enabled || !linkRef.current) return;
    const linkEl = linkRef.current;
    
    // Find the mediaSurface
    const mediaEl = linkEl.querySelector<HTMLElement>('[data-media-shell="catalog"]');
    if (!mediaEl) return;
    
    const rect = mediaEl.getBoundingClientRect();
    const url = catalogImageUrl(product.cover, "product_detail");
    registerOrigin(product.id, url, rect, product.cover.objectPosition);
  }, [enabled, product.id, product.cover, registerOrigin]);

  const handlePointerEnter = () => {
    preloadHighRes();
  };

  const handleFocus = () => {
    preloadHighRes();
    captureGeometry();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore modifiers (ctrl, cmd, shift, alt) and non-primary buttons (e.g. middle click)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    captureGeometry();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      captureGeometry();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0 || external) return;
    markNavigating();
  };

  const isActiveTransition = state.status === "navigating" || state.status === "animating" || state.status === "settling" || state.status === "awaiting-target";
  const isThisProductNavigating = state.productId === product.id;
  const opacity = isActiveTransition && !isThisProductNavigating ? 0.72 : 1;

  if (external) {
    return (
      <a
        aria-label={linkLabel}
        className={styles.link}
        href={href}
        rel="noopener noreferrer"
        tabIndex={clone ? -1 : undefined}
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      ref={linkRef}
      aria-label={linkLabel}
      className={styles.link}
      href={href}
      tabIndex={clone ? -1 : undefined}
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      style={{ opacity, transition: "opacity 200ms ease" }}
    >
      {children}
    </Link>
  );
}
