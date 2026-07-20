"use client";

import { ArrowRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import styles from "../vision-editorial-takeover.module.css";
import { HeroMedia } from "./hero-media";
import type { HeroWallMedia } from "./hero-types";

const AUTOPLAY_HOLD_MS = 5_600;
const MANUAL_HOLD_MS = 7_200;

function nextIndex(index: number, length: number) {
  return (index + 1) % length;
}

export function HeroGallery({ media }: { media: readonly HeroWallMedia[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const manualPauseUntilRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [inViewport, setInViewport] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const total = media.length;
  const followingIndex =
    total > 1 ? nextIndex(activeIndex, total) : activeIndex;
  const following = media[followingIndex];
  const followingReady = Boolean(following && readyIds.has(following.id));
  const transitioning = incomingIndex !== null;

  const markReady = useCallback((id: string) => {
    setReadyIds((current) => {
      if (current.has(id)) return current;
      return new Set(current).add(id);
    });
  }, []);

  const advance = useCallback(
    (manual = false) => {
      if (total < 2 || transitioning || !followingReady) return;
      if (manual) manualPauseUntilRef.current = Date.now() + MANUAL_HOLD_MS;

      if (reducedMotion) {
        setActiveIndex(followingIndex);
        return;
      }

      setIncomingIndex(followingIndex);
    },
    [followingIndex, followingReady, reducedMotion, total, transitioning],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 },
    );
    const syncVisibility = () =>
      setPageVisible(document.visibilityState === "visible");
    const syncMotion = () => setReducedMotion(motionQuery.matches);

    observer.observe(root);
    syncVisibility();
    syncMotion();
    document.addEventListener("visibilitychange", syncVisibility);
    motionQuery.addEventListener("change", syncMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      motionQuery.removeEventListener("change", syncMotion);
    };
  }, []);

  useEffect(() => {
    if (
      total < 2 ||
      reducedMotion ||
      !inViewport ||
      !pageVisible ||
      transitioning ||
      !followingReady
    )
      return;

    const remainingManualHold = Math.max(
      0,
      manualPauseUntilRef.current - Date.now(),
    );
    const timer = window.setTimeout(
      () => advance(),
      Math.max(AUTOPLAY_HOLD_MS, remainingManualHold),
    );
    return () => window.clearTimeout(timer);
  }, [
    advance,
    followingReady,
    inViewport,
    pageVisible,
    reducedMotion,
    total,
    transitioning,
  ]);

  const visibleIndices =
    total > 1 ? [activeIndex, followingIndex] : [activeIndex];

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (deltaX < -52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        advance(true);
      }
    },
    [advance],
  );

  if (!media[activeIndex]) return null;

  return (
    <div
      aria-label="Coleção de imagens da hero da Ótica Vision"
      aria-roledescription="carrossel"
      className={styles.visual}
      ref={rootRef}
      role="group"
    >
      <div
        className={styles.mediaField}
        data-transitioning={transitioning || undefined}
        data-vision-media-field
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {visibleIndices.map((index) => {
          const item = media[index];
          const active = index === activeIndex;
          const incoming = index === incomingIndex;

          return (
            <div
              aria-hidden={!active || undefined}
              className={
                active
                  ? styles.activeSlide
                  : incoming
                    ? styles.incomingSlide
                    : styles.stagedSlide
              }
              data-hero-slide={
                active ? "active" : incoming ? "incoming" : "staged"
              }
              key={item.id}
              onAnimationEnd={(event) => {
                if (!incoming || event.currentTarget !== event.target) return;
                setActiveIndex(index);
                setIncomingIndex(null);
              }}
            >
              <HeroMedia
                item={item}
                onReady={markReady}
                priority={active || index === followingIndex}
              />
            </div>
          );
        })}

        <span className={styles.entryCurtain} aria-hidden="true" />
        <span className={styles.entryLine} aria-hidden="true" />
        {transitioning ? (
          <span className={styles.transitionLine} aria-hidden="true" />
        ) : null}
      </div>

      {total > 1 ? (
        <div className={styles.galleryControls}>
          <p aria-live="polite" className={styles.galleryStatus}>
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span aria-hidden="true"> / </span>
            <span>{String(total).padStart(2, "0")}</span>
          </p>
          <p className={styles.swipeHint}>Deslize para revelar</p>
          <button
            aria-label="Revelar próxima imagem da hero"
            className={styles.nextButton}
            disabled={transitioning || !followingReady}
            onClick={() => advance(true)}
            type="button"
          >
            <span>Próxima</span>
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
