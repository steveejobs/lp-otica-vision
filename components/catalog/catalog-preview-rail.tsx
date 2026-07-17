"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import { CatalogProductCard } from "./catalog-product-card";
import styles from "./catalog-preview.module.css";

const RESUME_DELAY_MS = 4200;
const SPEED_PX_PER_SECOND = 22;

export function CatalogPreviewRail({ products }: { products: CatalogProductCardData[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstSequenceRef = useRef<HTMLDivElement>(null);
  const secondSequenceRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const visibleRef = useRef(false);
  const documentVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; startScroll: number; startX: number } | null>(null);
  const [manualPaused, setManualPaused] = useState(false);

  const pauseTemporarily = useCallback(() => {
    pauseUntilRef.current = performance.now() + RESUME_DELAY_MS;
  }, []);

  const normalizeLoop = useCallback(() => {
    const viewport = viewportRef.current;
    const first = firstSequenceRef.current;
    const second = secondSequenceRef.current;
    if (!viewport || !first || !second) return;
    const loopWidth = second.offsetLeft - first.offsetLeft;
    if (loopWidth <= 0) return;
    while (viewport.scrollLeft >= loopWidth) viewport.scrollLeft -= loopWidth;
    while (viewport.scrollLeft < 0) viewport.scrollLeft += loopWidth;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || products.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotion.matches;
    documentVisibleRef.current = document.visibilityState === "visible";

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
    };
    const onVisibilityChange = () => {
      documentVisibleRef.current = document.visibilityState === "visible";
      previousTimeRef.current = null;
    };
    reducedMotion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        previousTimeRef.current = null;
      },
      { threshold: 0.18 },
    );
    observer.observe(viewport);

    const tick = (time: number) => {
      const previousTime = previousTimeRef.current ?? time;
      const delta = Math.min(64, time - previousTime);
      previousTimeRef.current = time;
      const canMove =
        visibleRef.current &&
        documentVisibleRef.current &&
        !reducedMotionRef.current &&
        !manualPaused &&
        !hoveredRef.current &&
        !focusedRef.current &&
        time >= pauseUntilRef.current;
      if (canMove) {
        viewport.scrollLeft += (SPEED_PX_PER_SECOND * delta) / 1000;
        normalizeLoop();
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [manualPaused, normalizeLoop, products.length]);

  const keyboardStep = () => {
    const firstItem = firstSequenceRef.current?.firstElementChild as HTMLElement | null;
    return firstItem ? firstItem.offsetWidth + 16 : 280;
  };

  return (
    <div className={styles.railRegion}>
      <div
        aria-label="Prévia automática do catálogo. Use as setas para navegar."
        className={styles.viewport}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            focusedRef.current = false;
            pauseTemporarily();
          }
        }}
        onFocus={() => { focusedRef.current = true; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          viewportRef.current?.scrollBy({
            behavior: "smooth",
            left: keyboardStep() * (event.key === "ArrowRight" ? 1 : -1),
          });
          pauseTemporarily();
        }}
        onMouseEnter={() => { hoveredRef.current = true; }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          pauseTemporarily();
        }}
        onPointerDown={(event) => {
          pauseTemporarily();
          if (event.pointerType === "mouse" && viewportRef.current) {
            dragRef.current = {
              pointerId: event.pointerId,
              startScroll: viewportRef.current.scrollLeft,
              startX: event.clientX,
            };
            viewportRef.current.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const viewport = viewportRef.current;
          if (!drag || !viewport || drag.pointerId !== event.pointerId) return;
          viewport.scrollLeft = drag.startScroll - (event.clientX - drag.startX);
          normalizeLoop();
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
          pauseTemporarily();
        }}
        ref={viewportRef}
        role="region"
        tabIndex={0}
      >
        <div className={styles.track}>
          <div className={styles.sequence} ref={firstSequenceRef}>
            {products.map((product) => (
              <div className={styles.item} key={product.id}>
                <CatalogProductCard product={product} />
              </div>
            ))}
          </div>
          {products.length > 1 ? (
            <div aria-hidden="true" className={styles.sequence} ref={secondSequenceRef}>
              {products.map((product) => (
                <div className={styles.item} key={`clone-${product.id}`}>
                  <CatalogProductCard clone product={product} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {products.length > 1 ? (
        <button
          aria-pressed={manualPaused}
          className={styles.pauseButton}
          onClick={() => setManualPaused((value) => !value)}
          type="button"
        >
          {manualPaused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
          {manualPaused ? "Retomar movimento" : "Pausar movimento"}
        </button>
      ) : null}
    </div>
  );
}
