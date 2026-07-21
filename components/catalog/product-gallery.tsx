"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogImage } from "@/lib/catalog/types";

import { useCatalogMediaTransition } from "./catalog-transition-provider";
import { ProductMediaShell } from "./product-media-shell";
import styles from "./product-gallery.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

export function ProductGallery({ images, productId, productName }: { images: CatalogImage[]; productId: string; productName: string }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(0, images.findIndex((image) => image.isCover));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  
  // To handle smooth crossfade between main images:
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);

  const { state, enabled, registerTarget, markTargetReady } = useCatalogMediaTransition();

  const goTo = useCallback((index: number) => {
    if (index === activeIndex) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    setPrevIndex(activeIndex);
    setIsFading(true);
    setActiveIndex(safeIndex);
  }, [activeIndex, images.length]);

  // Register target when mounted
  useLayoutEffect(() => {
    if (!enabled || !targetRef.current || !state.transitionId || state.productId !== productId) return;
    const targetEl = targetRef.current;
    const rect = targetEl.getBoundingClientRect();
    registerTarget(productId, state.transitionId, rect);
  }, [enabled, state.transitionId, state.productId, productId, registerTarget]);

  const isTransitioningCurrentProduct = 
    enabled && 
    state.productId === productId && 
    (state.status === "animating" || state.status === "settling");

  const activeImage = images[activeIndex];
  const isCoverActive = activeIndex === initialIndex;
  const imgOpacity = isCoverActive && isTransitioningCurrentProduct ? 0 : 1;

  // Single Image Layout
  if (images.length === 1) {
    return (
      <div className={styles.gallery} data-count="1">
        <ProductMediaShell presentation="gallery" ref={targetRef} className={styles.mainShell}>
          <Image
            alt={activeImage.altText}
            blurDataURL={activeImage.blurDataUrl ?? blurDataUrl}
            fetchPriority="high"
            fill
            loading="eager"
            placeholder="blur"
            sizes="(max-width: 900px) 92vw, 58vw"
            src={catalogImageUrl(activeImage, "product_detail")}
            style={{ objectPosition: activeImage.objectPosition, opacity: imgOpacity, transition: "opacity 0.15s ease-in-out" }}
            unoptimized
            onLoad={() => {
              if (isTransitioningCurrentProduct && state.transitionId) {
                markTargetReady(state.transitionId);
              }
            }}
          />
        </ProductMediaShell>
      </div>
    );
  }

  // Multi Image Layout (2 or 3+)
  return (
    <div className={styles.gallery} data-count={images.length >= 3 ? "many" : "2"}>
      <div className={styles.mainView}>
        <ProductMediaShell presentation="gallery" ref={isCoverActive ? targetRef : undefined} className={styles.mainShell}>
          {prevIndex !== null && isFading && (
            <Image
              alt={images[prevIndex].altText}
              blurDataURL={images[prevIndex].blurDataUrl ?? blurDataUrl}
              fill
              src={catalogImageUrl(images[prevIndex], "product_detail")}
              style={{ objectPosition: images[prevIndex].objectPosition, opacity: 1, zIndex: 1 }}
              unoptimized
              className={styles.fadeOutImage}
            />
          )}
          <Image
            key={activeImage.id}
            alt={activeImage.altText}
            blurDataURL={activeImage.blurDataUrl ?? blurDataUrl}
            fetchPriority={isCoverActive ? "high" : "auto"}
            fill
            loading={isCoverActive ? "eager" : "lazy"}
            placeholder="blur"
            sizes="(max-width: 900px) 92vw, 58vw"
            src={catalogImageUrl(activeImage, "product_detail")}
            style={{ 
              objectPosition: activeImage.objectPosition, 
              opacity: isFading ? 0 : imgOpacity, 
              transition: isFading ? "none" : "opacity 0.15s ease-in-out",
              zIndex: 2
            }}
            unoptimized
            onLoad={() => {
              if (isFading) {
                // When new image loads, fade it in over 180ms
                requestAnimationFrame(() => setIsFading(false));
              }
              if (isCoverActive && isTransitioningCurrentProduct && state.transitionId) {
                markTargetReady(state.transitionId);
              }
            }}
          />
        </ProductMediaShell>
      </div>

      <div className={styles.thumbnailRail} style={{ opacity: isTransitioningCurrentProduct ? 0 : 1, transition: "opacity 0.2s ease" }}>
        {images.map((img, idx) => (
          <button 
            key={img.id} 
            type="button" 
            className={styles.thumbnailBtn} 
            aria-pressed={activeIndex === idx}
            onClick={() => goTo(idx)}
            aria-label={`Ver imagem ${idx + 1} de ${images.length}`}
          >
            <ProductMediaShell presentation="gallery" className={styles.thumbnailShell}>
              <Image
                alt={img.altText}
                fill
                sizes="120px"
                src={catalogImageUrl(img, "product_detail")} // Or a smaller variant if we want
                style={{ objectPosition: img.objectPosition }}
                unoptimized
              />
            </ProductMediaShell>
          </button>
        ))}
      </div>
    </div>
  );
}
