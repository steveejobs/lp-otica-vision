"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import type { ExameNewsItem } from "@/lib/exame-news";

import { NewsImage } from "./news-image";
import styles from "./news-carousel.module.css";

type NewsCarouselProps = {
  items: readonly ExameNewsItem[];
};

type CarouselPosition = "active" | "previous" | "next" | "nextFar" | "resting";

type CarouselStyle = CSSProperties & {
  "--drag-offset": string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
};

const AUTOPLAY_DELAY = 6_400;
const INTERACTION_PAUSE = 8_200;

export function NewsCarousel({ items }: NewsCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pauseUntil = useRef(0);
  const dragState = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [readyIndexes, setReadyIndexes] = useState<Set<number>>(
    () => new Set(items.flatMap((item, index) => (item.imageUrl ? [] : [index]))),
  );
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(() => new Set());
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);
  const [announceChanges, setAnnounceChanges] = useState(false);

  const itemCount = items.length;
  const previousIndex = itemCount > 0 ? (activeIndex - 1 + itemCount) % itemCount : 0;
  const nextIndex = itemCount > 0 ? (activeIndex + 1) % itemCount : 0;

  const markReady = useCallback((index: number) => {
    setReadyIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  const markFailed = useCallback(
    (index: number) => {
      setFailedIndexes((current) => {
        if (current.has(index)) return current;
        const next = new Set(current);
        next.add(index);
        return next;
      });
      markReady(index);
    },
    [markReady],
  );

  const pauseAfterInteraction = useCallback(() => {
    pauseUntil.current = Date.now() + INTERACTION_PAUSE;
    setInteractionPaused(true);
    setResumeVersion((current) => current + 1);
  }, []);

  const showIndex = useCallback(
    (index: number, manual = true) => {
      if (!readyIndexes.has(index)) return false;
      if (manual) pauseAfterInteraction();
      setAnnounceChanges(manual);
      setActiveIndex(index);
      return true;
    },
    [pauseAfterInteraction, readyIndexes],
  );

  const showPrevious = useCallback(
    () => showIndex(previousIndex),
    [previousIndex, showIndex],
  );
  const showNext = useCallback(
    (manual = true) => showIndex(nextIndex, manual),
    [nextIndex, showIndex],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.24),
      { threshold: [0, 0.24, 0.58], rootMargin: "0px 0px -4%" },
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
    const canAdvance = readyIndexes.has(activeIndex) && readyIndexes.has(nextIndex);
    if (
      itemCount < 2 ||
      reducedMotion ||
      !isInView ||
      !isPageVisible ||
      isDragging ||
      !canAdvance
    ) {
      return;
    }

    const remainingPause = Math.max(0, pauseUntil.current - Date.now());
    const timer = window.setTimeout(
      () => {
        setInteractionPaused(false);
        showNext(false);
      },
      Math.max(remainingPause, AUTOPLAY_DELAY),
    );
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    isDragging,
    isInView,
    isPageVisible,
    itemCount,
    nextIndex,
    readyIndexes,
    reducedMotion,
    resumeVersion,
    showNext,
  ]);

  const getPosition = (index: number): CarouselPosition => {
    if (index === activeIndex) return "active";
    const forwardDistance = (index - activeIndex + itemCount) % itemCount;
    if (forwardDistance === 1) return "next";
    if (forwardDistance === 2) return "nextFar";
    if (forwardDistance === itemCount - 1) return "previous";
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
    if (!event.isPrimary || itemCount < 2) return;
    pauseAfterInteraction();
    suppressClick.current = false;
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
    setDragOffset(Math.max(-76, Math.min(76, distanceX * 0.5)));
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
    const isSwipe =
      (Math.abs(distanceX) >= 40 || velocity >= 0.42) &&
      Math.abs(distanceX) > Math.abs(distanceY);

    if (!isSwipe) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 280);
    if (distanceX > 0) showPrevious();
    else showNext();
  };

  const canAdvance = readyIndexes.has(activeIndex) && readyIndexes.has(nextIndex);
  const autoplayRunning =
    itemCount > 1 &&
    !reducedMotion &&
    isInView &&
    isPageVisible &&
    !isDragging &&
    !interactionPaused &&
    canAdvance;
  const viewportStyle: CarouselStyle = { "--drag-offset": `${dragOffset}px` };

  return (
    <div className={styles.root} onFocusCapture={pauseAfterInteraction}>
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${isDragging ? styles.dragging : ""}`}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Matérias recentes da Exame"
        tabIndex={0}
        data-news-carousel
        data-active-index={activeIndex}
        data-item-count={itemCount}
        data-autoplay-state={autoplayRunning ? "running" : "paused"}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        style={viewportStyle}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event, true)}
      >
        {items.map((item, index) => {
          const position = getPosition(index);
          const imageFailed = failedIndexes.has(index);
          const hasImage = Boolean(item.imageUrl) && !imageFailed;
          const isActive = position === "active";

          return (
            <article
              id={`home-news-card-${index}`}
              className={`${styles.card} ${styles[position]} ${hasImage ? "" : styles.textOnly}`}
              aria-hidden={!isActive}
              key={item.url}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isActive ? 0 : -1}
                aria-label={`${item.title} — ler na Exame`}
                onDragStart={(event) => event.preventDefault()}
              >
                {hasImage && item.imageUrl ? (
                  <NewsImage
                    className={styles.media}
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.title}
                    sizes="(max-width: 899px) 82vw, (max-width: 1200px) 26vw, 300px"
                    onLoad={() => markReady(index)}
                    onError={() => markFailed(index)}
                  />
                ) : null}

                <div className={styles.body}>
                  {imageFailed ? (
                    <span className={styles.imageFallback}>Imagem indisponível</span>
                  ) : null}
                  <p className={styles.meta}>
                    <span>{item.category}</span>
                    {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                    <span>{item.source}</span>
                  </p>
                  <h3>{item.title}</h3>
                  <span className={styles.readLink}>
                    Ler na Exame
                    <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
                  </span>
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {itemCount > 1 ? (
        <div className={styles.navigation}>
          <div className={styles.progress} aria-hidden="true">
            {items.map((item, index) => (
              <span className={index === activeIndex ? styles.current : ""} key={item.url} />
            ))}
          </div>
          <span
            className={styles.counter}
            aria-live={announceChanges ? "polite" : "off"}
            aria-atomic="true"
          >
            {String(activeIndex + 1).padStart(2, "0")} / {String(itemCount).padStart(2, "0")}
          </span>
          <div className={styles.controls} aria-label="Navegar pelas notícias">
            <button
              type="button"
              onClick={showPrevious}
              disabled={!readyIndexes.has(previousIndex)}
              aria-label="Mostrar notícia anterior"
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => showNext()}
              disabled={!readyIndexes.has(nextIndex)}
              aria-label="Mostrar próxima notícia"
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
