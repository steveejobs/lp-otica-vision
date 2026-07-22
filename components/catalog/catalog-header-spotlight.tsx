"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

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

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayProducts.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length);
  };

  return (
    <div
      className={styles.spotlightWrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.spotlightHeader}>
        <span className={styles.spotlightBadge}>
          <Sparkles size={13} className={styles.sparkleIcon} />
          Destaque da Vitrine
        </span>
        {displayProducts.length > 1 && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handlePrev}
              aria-label="Destaque anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.counter}>
              {currentIndex + 1} / {displayProducts.length}
            </span>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleNext}
              aria-label="Próximo destaque"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.spotlightCard}
        onClick={handleSpotlightClick}
        aria-label={`Visualizar destaque ${product.name}`}
      >
        <div data-flip-frame className={styles.flipFrame} ref={flipFrameRef}>
          <div className={styles.mediaShell}>
            <Image
              key={product.id}
              alt={product.cover.altText}
              fill
              priority
              sizes="(max-width: 960px) 90vw, 420px"
              src={catalogImageUrl(product.cover, "home_preview")}
              style={{ objectPosition: product.cover.objectPosition }}
              className={styles.image}
              unoptimized
            />
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.titleRow}>
            {product.brand && <span className={styles.brand}>{product.brand.name}</span>}
            <h3>{product.name}</h3>
            <p className={styles.styleName}>{styleText}</p>
          </div>
          <span className={styles.cta}>Visualizar no showroom ↗</span>
        </div>
      </button>

      {displayProducts.length > 1 && (
        <div className={styles.dots}>
          {displayProducts.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              className={styles.dot}
              aria-pressed={idx === currentIndex}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`Ver destaque ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
