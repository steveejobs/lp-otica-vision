"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import type { ImageAsset } from "@/lib/assets";

import { SectionShell } from "./section-shell";
import styles from "./editorial-gallery.module.css";

type EditorialGalleryProps = {
  images: readonly ImageAsset[];
};

type DragStart = {
  pointerId: number;
  x: number;
  y: number;
};

type GalleryStyle = CSSProperties & {
  "--drag-offset": string;
};

type CardStyle = CSSProperties & {
  "--placeholder-color": string;
};

const AUTOPLAY_DELAY = 5_100;
const INTERACTION_PAUSE = 6_500;

function FocusSequence({ images }: EditorialGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set());
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const pauseUntil = useRef(0);

  const previousIndex = (activeIndex - 1 + images.length) % images.length;
  const nextIndex = (activeIndex + 1) % images.length;
  const nextReady = loadedIndexes.has(nextIndex);

  const markLoaded = useCallback((index: number) => {
    setLoadedIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  const pauseAfterInteraction = useCallback(() => {
    pauseUntil.current = Date.now() + INTERACTION_PAUSE;
    setResumeVersion((current) => current + 1);
  }, []);

  const showIndex = useCallback(
    (index: number, manual = true) => {
      if (manual) pauseAfterInteraction();
      setActiveIndex(index);
    },
    [pauseAfterInteraction],
  );

  const showPrevious = useCallback(() => {
    if (!loadedIndexes.has(previousIndex)) return;
    showIndex(previousIndex);
  }, [loadedIndexes, previousIndex, showIndex]);

  const showNext = useCallback(
    (manual = true) => {
      if (!loadedIndexes.has(nextIndex)) return;
      showIndex(nextIndex, manual);
    },
    [loadedIndexes, nextIndex, showIndex],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.24),
      { threshold: [0, 0.24, 0.56], rootMargin: "0px 0px -5%" },
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionPreference.matches);
    const updateVisibility = () => setIsPageVisible(document.visibilityState === "visible");

    updateMotion();
    updateVisibility();
    motionPreference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      motionPreference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (
      reducedMotion ||
      !isInView ||
      !isPageVisible ||
      isDragging ||
      !nextReady
    ) {
      return;
    }

    const remainingPause = Math.max(0, pauseUntil.current - Date.now());
    const timer = window.setTimeout(
      () => showNext(false),
      remainingPause + AUTOPLAY_DELAY,
    );
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    isDragging,
    isInView,
    isPageVisible,
    nextReady,
    reducedMotion,
    resumeVersion,
    showNext,
  ]);

  const getDistance = useCallback(
    (index: number) => {
      let distance = index - activeIndex;
      if (distance > images.length / 2) distance -= images.length;
      if (distance < -images.length / 2) distance += images.length;
      return distance;
    },
    [activeIndex, images.length],
  );

  const getPosition = useCallback(
    (index: number) => {
      const distance = getDistance(index);
      if (distance === -1) return "past";
      if (distance === 0) return "active";
      if (distance === 1) return "near";
      if (distance === 2) return "far";
      return "resting";
    },
    [getDistance],
  );

  const renderedIndexes = useMemo(
    () =>
      new Set(
        images
          .map((_, index) => index)
          .filter((index) => {
            const distance = getDistance(index);
            return distance >= -1 && distance <= 2;
          }),
      ),
    [getDistance, images],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pauseAfterInteraction();
    setIsDragging(true);
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 12) return;
    setDragOffset(Math.max(-82, Math.min(82, distanceX * 0.48)));
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = dragStart.current;
    dragStart.current = null;
    setIsDragging(false);
    setDragOffset(0);
    pauseAfterInteraction();
    if (cancelled || !start || start.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceX) < 42 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
    if (distanceX > 0) showPrevious();
    else showNext();
  };

  const viewportStyle: GalleryStyle = { "--drag-offset": `${dragOffset}px` };

  return (
    <div className={styles.sequence}>
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${isDragging ? styles.dragging : ""}`}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Sequência editorial de óculos com avanço automático"
        tabIndex={0}
        style={viewportStyle}
        onBlur={pauseAfterInteraction}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointer(event)}
        onPointerCancel={(event) => finishPointer(event, true)}
      >
        {images.map((asset, index) => {
          const position = getPosition(index);
          const cardStyle: CardStyle = { "--placeholder-color": asset.placeholderColor };

          return (
            <figure
              className={`${styles.card} ${styles[position]}`}
              aria-hidden={position !== "active"}
              style={cardStyle}
              key={asset.src}
            >
              {renderedIndexes.has(index) ? (
                <Image
                  src={asset.src}
                  width={asset.width}
                  height={asset.height}
                  sizes="(max-width: 720px) 72vw, (max-width: 1100px) 38vw, 410px"
                  alt={asset.alt}
                  draggable={false}
                  loading={index === 0 ? "eager" : "lazy"}
                  placeholder="blur"
                  blurDataURL={asset.blurDataURL}
                  onLoad={() => markLoaded(index)}
                  style={{ objectPosition: asset.objectPosition }}
                />
              ) : null}
            </figure>
          );
        })}
        <span className={styles.orbit} aria-hidden="true" />
      </div>

      <div className={styles.navigation}>
        <p className={styles.counter} aria-live="polite" aria-atomic="true">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <span aria-hidden="true">/</span>
          <span>{String(images.length).padStart(2, "0")}</span>
        </p>
        <div className={styles.progress} aria-label="Navegar pela seleção">
          {images.map((asset, index) => (
            <button
              type="button"
              className={index === activeIndex ? styles.current : ""}
              onClick={() => showIndex(index)}
              aria-label={`Mostrar imagem ${index + 1}: ${asset.alt}`}
              aria-current={index === activeIndex ? "true" : undefined}
              key={asset.src}
            />
          ))}
        </div>
        <p className={styles.hint} aria-hidden="true">
          arraste para mudar o foco
        </p>
      </div>
    </div>
  );
}

export function EditorialGallery({ images }: EditorialGalleryProps) {
  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      aria-labelledby="editorial-gallery-title"
    >
      <header className={styles.intro}>
        <h2 id="editorial-gallery-title">Escolhas que mudam o olhar.</h2>
        <p>Presença, formato e acabamento em uma seleção real da Vision.</p>
        <span aria-hidden="true">seleção 01 — 08</span>
      </header>

      <FocusSequence images={images} />
    </SectionShell>
  );
}
