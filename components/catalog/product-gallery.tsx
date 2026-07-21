"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogImage } from "@/lib/catalog/types";

import styles from "./product-gallery.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

export function ProductGallery({ images, productId, productName }: { images: CatalogImage[]; productId: string; productName: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const initialIndex = Math.max(0, images.findIndex((image) => image.isCover));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [loadedIndexes, setLoadedIndexes] = useState(() => new Set([initialIndex]));

  const ensureLoaded = useCallback((index: number) => {
    setLoadedIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const rail = railRef.current;
    if (!rail) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    const item = rail.children.item(safeIndex) as HTMLElement | null;
    ensureLoaded(safeIndex);
    item?.scrollIntoView({ behavior, block: "nearest", inline: "start" });
    setActiveIndex(safeIndex);
  }, [ensureLoaded, images.length]);

  useEffect(() => {
    goTo(initialIndex, "auto");
  }, [goTo, initialIndex]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  function updateFromScroll() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rail = railRef.current;
      if (!rail || !rail.clientWidth) return;
      const nextIndex = Math.max(0, Math.min(Math.round(rail.scrollLeft / rail.clientWidth), images.length - 1));
      ensureLoaded(nextIndex);
      setActiveIndex(nextIndex);
    });
  }

  return (
    <div className={styles.gallery}>
      <div
        aria-label={`Galeria de ${productName}`}
        className={styles.rail}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(activeIndex - 1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(activeIndex + 1);
          }
          if (event.key === "Home") {
            event.preventDefault();
            goTo(0);
          }
          if (event.key === "End") {
            event.preventDefault();
            goTo(images.length - 1);
          }
        }}
        onScroll={updateFromScroll}
        ref={railRef}
        role="region"
        tabIndex={0}
      >
        {images.map((image, index) => (
          <figure
            className={styles.slide}
            data-catalog-product-hero={index === initialIndex ? productId : undefined}
            data-catalog-transition-media={index === initialIndex ? "" : undefined}
            key={image.id}
          >
            {loadedIndexes.has(index) ? (
              <Image
                alt={image.altText}
                blurDataURL={image.blurDataUrl ?? blurDataUrl}
                fetchPriority={index === initialIndex ? "high" : "auto"}
                fill
                loading={index === initialIndex ? "eager" : "lazy"}
                placeholder="blur"
                sizes="(max-width: 900px) 92vw, 58vw"
                src={catalogImageUrl(image, "product_detail")}
                style={{ objectPosition: image.objectPosition }}
                unoptimized
              />
            ) : (
              <span
                aria-hidden="true"
                className={styles.lazyPlaceholder}
                style={{
                  backgroundImage: `url(${image.blurDataUrl ?? blurDataUrl})`,
                  backgroundPosition: image.objectPosition,
                }}
              />
            )}
          </figure>
        ))}
      </div>

      {images.length > 1 ? (
        <div className={styles.controls}>
          <button
            aria-label="Imagem anterior"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={19} />
          </button>
          <div className={styles.indicators} aria-label="Selecionar imagem">
            {images.map((image, index) => (
              <button
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-pressed={activeIndex === index}
                key={image.id}
                onClick={() => goTo(index)}
                type="button"
              />
            ))}
          </div>
          <span aria-live="polite" className={styles.counter}>
            {activeIndex + 1} / {images.length}
          </span>
          <button
            aria-label="Próxima imagem"
            disabled={activeIndex === images.length - 1}
            onClick={() => goTo(activeIndex + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={19} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
