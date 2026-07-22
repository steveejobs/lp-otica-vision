"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard } from "@/lib/catalog/types";
import { useCatalogFocus } from "./catalog-focus-manager";
import styles from "./catalog-header-spotlight.module.css";

export function CatalogHeaderSpotlight({ products }: { products: CatalogProductCard[] }) {
  const focusContext = useCatalogFocus();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const flipFrameRef = useRef<HTMLDivElement>(null);

  const displayProducts = products && products.length > 0 ? products : [];

  // Cycle automatically every 5 seconds unless paused
  useEffect(() => {
    if (displayProducts.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayProducts.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [displayProducts.length, isPaused]);

  if (displayProducts.length === 0) return null;

  const product = displayProducts[currentIndex] || displayProducts[0];
  const styleText = product.category?.name || "Óculos de Sol";

  const handleSpotlightClick = () => {
    if (focusContext) {
      focusContext.focusProduct({
        slug: product.slug,
        flipFrame: flipFrameRef.current,
      });
    } else {
      if (typeof window !== "undefined") {
        window.location.href = `/catalogo?produto=${product.slug}`;
      }
    }
  };

  return (
    <div
      className={styles.spotlightWrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button
        type="button"
        className={styles.spotlightCard}
        data-catalog-product-slug={product.slug}
        onClick={handleSpotlightClick}
        aria-label={`Visualizar armação ${product.name}`}
      >
        {/* Large Product Image Container with key for smooth transition */}
        <div data-flip-frame className={styles.flipFrame} ref={flipFrameRef}>
          <div key={product.id} className={styles.largeMediaShell}>
            <Image
              alt={product.cover.altText}
              fill
              priority
              sizes="(max-width: 960px) 90vw, 520px"
              src={catalogImageUrl(product.cover, "home_preview")}
              style={{ objectPosition: product.cover.objectPosition }}
              className={styles.largeImage}
              unoptimized
            />
          </div>
        </div>

        {/* Information BELOW the image with key for smooth text transition */}
        <div key={product.id} className={styles.infoBelow}>
          {product.brand && <span className={styles.brand}>{product.brand.name}</span>}
          <h3 className={styles.title}>{product.name}</h3>
          <p className={styles.styleName}>{styleText}</p>
          <span className={styles.cta}>Visualizar modelo</span>
        </div>
      </button>
    </div>
  );
}
