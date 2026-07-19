"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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

import type { DisplayGalleryMedia } from "@/lib/gallery/display-media";

import { GalleryMediaImage } from "./gallery-media-image";
import styles from "./instagram-image-rail.module.css";

type InstagramImageRailProps = {
  images: readonly DisplayGalleryMedia[];
};

type CardStyle = CSSProperties & {
  "--desktop-focus": string;
  "--desktop-scale": number;
  "--mobile-focus": string;
  "--mobile-scale": number;
  "--placeholder-color": string;
};

type ViewportStyle = CSSProperties & {
  "--drag-offset": string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
};

const AUTOPLAY_DELAY = 3_900;
const INTERACTION_PAUSE = 6_500;

export function InstagramImageRail({ images }: InstagramImageRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pauseUntil = useRef(0);
  const dragState = useRef<DragState | null>(null);
  const chapterTimer = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set());
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announceChanges, setAnnounceChanges] = useState(false);
  const [chapterTransition, setChapterTransition] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);

  const previousIndex = (activeIndex - 1 + images.length) % images.length;
  const nextIndex = (activeIndex + 1) % images.length;

  const renderedIndexes = useMemo(
    () => new Set([previousIndex, activeIndex, nextIndex]),
    [activeIndex, nextIndex, previousIndex],
  );

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

  const markChapterTransition = useCallback(
    (index: number) => {
      const crossing = images[activeIndex]?.seriesId !== images[index]?.seriesId;
      if (chapterTimer.current !== null) window.clearTimeout(chapterTimer.current);
      setChapterTransition(crossing);
      if (crossing) {
        chapterTimer.current = window.setTimeout(() => {
          setChapterTransition(false);
          chapterTimer.current = null;
        }, 900);
      }
    },
    [activeIndex, images],
  );

  const showIndex = useCallback(
    (index: number, manual = true) => {
      if (!loadedIndexes.has(index)) return false;
      if (manual) pauseAfterInteraction();
      setAnnounceChanges(manual);
      markChapterTransition(index);
      setActiveIndex(index);
      return true;
    },
    [loadedIndexes, markChapterTransition, pauseAfterInteraction],
  );

  const showPrevious = useCallback(
    () => showIndex(previousIndex),
    [previousIndex, showIndex],
  );
  const showNext = useCallback(
    (manual = true) => showIndex(nextIndex, manual),
    [nextIndex, showIndex],
  );

  useEffect(
    () => () => {
      if (chapterTimer.current !== null) window.clearTimeout(chapterTimer.current);
    },
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.34),
      { threshold: [0, 0.34, 0.62], rootMargin: "0px 0px -4%" },
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
      !loadedIndexes.has(nextIndex)
    ) {
      return;
    }

    const remainingPause = Math.max(0, pauseUntil.current - Date.now());
    const timer = window.setTimeout(
      () => showNext(false),
      Math.max(remainingPause, AUTOPLAY_DELAY),
    );
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    isDragging,
    isInView,
    isPageVisible,
    loadedIndexes,
    nextIndex,
    reducedMotion,
    resumeVersion,
    showNext,
  ]);

  const getPosition = (index: number) => {
    if (index === activeIndex) return "active";
    if (index === previousIndex) return "previous";
    if (index === nextIndex) return "next";
    return "resting";
  };

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

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pauseAfterInteraction();
    setIsDragging(true);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distanceX = event.clientX - drag.startX;
    const distanceY = event.clientY - drag.startY;
    if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 12) return;
    setDragOffset(Math.max(-78, Math.min(78, distanceX * 0.5)));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = dragState.current;
    dragState.current = null;
    setIsDragging(false);
    setDragOffset(0);
    pauseAfterInteraction();
    if (cancelled || !drag || drag.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - drag.startX;
    const distanceY = event.clientY - drag.startY;
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = Math.abs(distanceX) / elapsed;
    if (
      (Math.abs(distanceX) < 38 && velocity < 0.4) ||
      Math.abs(distanceX) <= Math.abs(distanceY)
    ) {
      return;
    }
    if (distanceX > 0) showPrevious();
    else showNext();
  };

  const viewportStyle: ViewportStyle = { "--drag-offset": `${dragOffset}px` };
  const autoplayRunning =
    !reducedMotion &&
    isInView &&
    isPageVisible &&
    !isDragging &&
    loadedIndexes.has(nextIndex);

  return (
    <section
      id="selecao-editorial"
      className={`${styles.section} ${chapterTransition ? styles.chapterTransition : ""}`}
      aria-labelledby="instagram-images-title"
    >
      <div className={styles.headingRow}>
        <h2 className={styles.srOnly} id="instagram-images-title">
          Seleção de armações da Ótica Vision
        </h2>
        <p aria-hidden="true">Seleção Vision</p>
        <span aria-live={announceChanges ? "polite" : "off"} aria-atomic="true">
          {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </span>
      </div>

      <div
        ref={viewportRef}
        className={`${styles.viewport} ${isDragging ? styles.dragging : ""}`}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria de seis imagens da Ótica Vision"
        tabIndex={0}
        data-series={images[activeIndex]?.seriesId}
        data-active-index={activeIndex}
        data-autoplay-state={autoplayRunning ? "running" : "paused"}
        style={viewportStyle}
        onBlur={pauseAfterInteraction}
        onKeyDown={handleKeyDown}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event, true)}
      >
        {images.map((asset, index) => {
          const position = getPosition(index);
          const cardStyle: CardStyle = {
            "--desktop-focus": asset.desktopObjectPosition,
            "--desktop-scale": asset.desktopScale,
            "--mobile-focus": asset.mobileObjectPosition,
            "--mobile-scale": asset.mobileScale,
            "--placeholder-color": asset.placeholderColor,
          };
          return (
            <figure
              className={`${styles.card} ${styles[position]} ${asset.seriesId !== images[activeIndex]?.seriesId ? styles.otherChapter : ""}`}
              aria-hidden={position !== "active"}
              data-active={position === "active" || undefined}
              data-asset={asset.src}
              data-series={asset.seriesId}
              style={cardStyle}
              key={asset.id}
            >
              {renderedIndexes.has(index) ? (
                <GalleryMediaImage
                  media={asset}
                  width={asset.width}
                  height={asset.height}
                  sizes="(max-width: 720px) 64vw, 290px"
                  alt={asset.alt}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={asset.blurDataURL}
                  draggable={false}
                  onLoad={() => markLoaded(index)}
                />
              ) : null}
            </figure>
          );
        })}
        <span className={styles.orbit} aria-hidden="true" />
      </div>

      <div className={styles.navigation}>
        <div className={styles.progress} aria-hidden="true">
          {images.map((asset, index) => (
            <span className={index === activeIndex ? styles.current : ""} key={asset.id} />
          ))}
        </div>
        <div className={styles.controls} aria-label="Navegar pela seleção">
          <button
            type="button"
            onClick={showPrevious}
            disabled={!loadedIndexes.has(previousIndex)}
            aria-label="Mostrar imagem anterior"
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => showNext()}
            disabled={!loadedIndexes.has(nextIndex)}
            aria-label="Mostrar próxima imagem"
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </section>
  );
}
