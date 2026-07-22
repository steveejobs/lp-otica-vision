"use client";

import { useCatalogFocus } from "./catalog-focus-manager";
import { CatalogProductCard } from "./catalog-product-card";
import type { CatalogQuery } from "@/lib/catalog/query";
import type { CatalogPageResult } from "@/lib/catalog/types";
import styles from "./catalog.module.css";

export function FocusGridWrapper({ catalog, query }: { catalog: CatalogPageResult; query: CatalogQuery }) {
  const focusManager = useCatalogFocus();
  const focusedSlug = focusManager?.focusedSlug;
  const hasFocus = !!focusedSlug;

  if (hasFocus) {
    const focusedProduct = catalog.products.find((p) => p.slug === focusedSlug) ?? catalog.products[0];
    const railProducts = catalog.products.filter((p) => p.slug !== focusedSlug);

    return (
      <div
        className={styles.grid}
        data-catalog-results-grid
        data-count={Math.min(catalog.products.length, 9)}
        data-catalog-focus-active={true}
      >
        {/* Left / Top Focused Stage */}
        {focusedProduct && (
          <CatalogProductCard
            key={focusedProduct.id}
            priority
            product={focusedProduct}
            presentation="preview"
          />
        )}

        {/* Right / Bottom Rail Container for non-focused products */}
        <div className={styles.railContainer}>
          {railProducts.map((product) => (
            <CatalogProductCard
              key={product.id}
              priority={false}
              product={product}
              presentation="preview"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.grid}
      data-catalog-results-grid
      data-count={Math.min(catalog.products.length, 9)}
      data-catalog-focus-active={false}
    >
      {catalog.products.map((product, index) => (
        <CatalogProductCard
          key={product.id}
          priority={index === 0}
          product={product}
          presentation="preview"
        />
      ))}
    </div>
  );
}
