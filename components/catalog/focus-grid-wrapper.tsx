"use client";

import { useCatalogFocus } from "./catalog-focus-manager";
import { CatalogProductCard } from "./catalog-product-card";
import { catalogProductHref, type CatalogQuery } from "@/lib/catalog/query";
import type { CatalogPageResult } from "@/lib/catalog/types";
import styles from "./catalog.module.css";

export function FocusGridWrapper({ catalog, query }: { catalog: CatalogPageResult, query: CatalogQuery }) {
  const focusManager = useCatalogFocus();
  const hasFocus = !!focusManager?.focusedSlug;
  
  return (
    <div 
      className={styles.grid} 
      data-catalog-results-grid 
      data-count={Math.min(catalog.products.length, 9)}
      data-catalog-focus-active={hasFocus}
    >
      {catalog.products.map((product, index) => (
        <CatalogProductCard
          href={catalogProductHref(product.slug, query)}
          key={product.id}
          priority={index === 0}
          product={product}
          presentation="preview"
        />
      ))}
    </div>
  );
}
