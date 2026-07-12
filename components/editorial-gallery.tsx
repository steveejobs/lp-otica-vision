"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

const AUTOPLAY_DELAY = 4_600;
const INTERACTION_PAUSE = 6_000;

function LensFocusGallery({ images }: EditorialGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set());
  const [dragOffset, setDragOffset] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const pauseUntil = useRef(0);

  const previousIndex = (activeIndex - 1 + images.length) % images.length;
  const nextIndex = (activeIndex + 1) % images.length;
  const previousReady = loadedIndexes.has(previousIndex);
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

  const showPrevious = useCallback(
    (manual = true) => {
      if (!loadedIndexes.has(previousIndex)) return;
      if (manual) pauseAfterInteraction();
      setActiveIndex(previousIndex);
    },
    [loadedIndexes, pauseAfterInteraction, previousIndex],
  );

  const showNext = useCallback(
    (manual = true) => {
      if (!loadedIndexes.has(nextIndex)) return;
      if (manual) pauseAfterInteraction();
      setActiveIndex(nextIndex);
    },
    [loadedIndexes, nextIndex, pauseAfterInteraction],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.28),
      { threshold: [0, 0.28, 0.6], rootMargin: "0px 0px -5%" },
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
      dragStart.current ||
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
      if (distance === -1) return "previous";
      if (distance === 0) return "active";
      if (distance === 1) return "next";
      return "resting";
    },
    [getDistance],
  );

  const renderedIndexes = useMemo(
    () =>
      new Set(
        images
          .map((_, index) => index)
          .filter((index) => Math.abs(getDistance(index)) <= 1),
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
    setDragOffset(Math.max(-64, Math.min(64, distanceX * 0.42)));
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = dragStart.current;
    dragStart.current = null;
    setDragOffset(0);
    pauseAfterInteraction();
    if (cancelled || !start || start.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceX) < 38 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
    if (distanceX > 0) showPrevious();
    else showNext();
  };

  const viewportStyle: GalleryStyle = { "--drag-offset": `${dragOffset}px` };

  return (
    <div className={styles.gallery}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria editorial de óculos com reprodução automática"
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
                  sizes="(max-width: 720px) 74vw, 410px"
                  alt={asset.alt}
                  draggable={false}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={asset.blurDataURL}
                  onLoad={() => markLoaded(index)}
                  style={{ objectPosition: asset.objectPosition }}
                />
              ) : null}
            </figure>
          );
        })}
      </div>

      <div className={styles.controls} aria-label="Controles da galeria">
        <button
          type="button"
          onClick={() => showPrevious()}
          aria-label="Imagem anterior"
          disabled={!previousReady}
        >
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.6} />
        </button>
        <p className={styles.counter} aria-live="polite" aria-atomic="true">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <span aria-hidden="true">—</span>
          <span>{String(images.length).padStart(2, "0")}</span>
        </p>
        <button
          type="button"
          onClick={() => showNext()}
          aria-label="Próxima imagem"
          disabled={!nextReady}
        >
          <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
        </button>
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
      </header>

      <LensFocusGallery images={images} />
    </SectionShell>
  );
}
