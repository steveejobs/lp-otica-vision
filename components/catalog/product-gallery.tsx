"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogImage } from "@/lib/catalog/types";

import type { CatalogImage as CatalogImageData } from "@/lib/catalog/types";
import { ProductMediaShell } from "./product-media-shell";
import styles from "./product-gallery.module.css";

export function ProductGallery({ images, productId, productName }: { images: CatalogImage[]; productId: string; productName: string }) {
  const initialIndex = Math.max(0, images.findIndex((image) => image.isCover));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  
  // To handle smooth crossfade between main images:
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    if (index === activeIndex) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    setPrevIndex(activeIndex);
    setIsFading(true);
    setActiveIndex(safeIndex);
  }, [activeIndex, images.length]);

  const activeImage = images[activeIndex];
  const isCoverActive = activeIndex === initialIndex;
  const imgOpacity = 1;

  // Single Image Layout
  if (images.length === 1) {
    return (
      <div className={styles.gallery} data-count="1">
        <div data-flip-frame className={styles.flipFrame}>
          <ProductMediaShell presentation="gallery" ref={targetRef} className={styles.mainShell}>
            <Image
              alt={activeImage.altText}
            fetchPriority="high"
            fill
            loading="eager"
            sizes="(max-width: 900px) 92vw, 58vw"
            src={catalogImageUrl(activeImage, "product_detail")}
            style={{ objectPosition: activeImage.objectPosition, opacity: imgOpacity, transition: "opacity 0.15s ease-in-out" }}
            unoptimized
          />
        </ProductMediaShell>
        </div>
      </div>
    );
  }

  // Multi Image Layout (2 or 3+)
  return (
    <div className={styles.gallery} data-count={images.length >= 3 ? "many" : "2"}>
      <div data-flip-frame className={styles.mainView}>
        <ProductMediaShell presentation="gallery" ref={isCoverActive ? targetRef : undefined} className={styles.mainShell}>
          {prevIndex !== null && isFading && (
            <Image
              alt={images[prevIndex].altText}
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
            fetchPriority={isCoverActive ? "high" : "auto"}
            fill
            loading={isCoverActive ? "eager" : "lazy"}
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
                requestAnimationFrame(() => setIsFading(false));
              }
            }}
          />
        </ProductMediaShell>
      </div>

      <div className={styles.thumbnailRail}>
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
