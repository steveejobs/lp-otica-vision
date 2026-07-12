"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import type { ImageAsset } from "@/lib/assets";

import styles from "./instagram-image-rail.module.css";

type InstagramImageRailProps = {
  images: readonly ImageAsset[];
};

type CardStyle = CSSProperties & {
  "--placeholder-color": string;
};

type DragState = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
};

const AUTOPLAY_DELAY = 3_200;
const INTERACTION_PAUSE = 5_500;

export function InstagramImageRail({ images }: InstagramImageRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntil = useRef(0);
  const interactingRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set());
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);

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

  const scrollToIndex = useCallback(
    (index: number, manual = false) => {
      const rail = railRef.current;
      const card = rail?.querySelector<HTMLElement>(`[data-rail-index="${index}"]`);
      if (!rail || !card || (!manual && !loadedIndexes.has(index))) return false;
      if (manual) pauseAfterInteraction();
      setActiveIndex(index);
      const targetLeft = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
      rail.scrollTo({
        left: targetLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return true;
    },
    [loadedIndexes, pauseAfterInteraction, reducedMotion],
  );

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.22),
      { threshold: [0, 0.22, 0.55], rootMargin: "0px 0px -4%" },
    );
    observer.observe(rail);
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
    if (reducedMotion || !isInView || !isPageVisible || interactingRef.current) return;

    let direction = directionRef.current;
    if (activeIndex === images.length - 1) direction = -1;
    if (activeIndex === 0) direction = 1;
    directionRef.current = direction;
    const target = activeIndex + direction;
    if (!loadedIndexes.has(target)) return;

    const remainingPause = Math.max(0, pauseUntil.current - Date.now());
    const timer = window.setTimeout(
      () => scrollToIndex(target),
      remainingPause + AUTOPLAY_DELAY,
    );
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    images.length,
    isInView,
    isPageVisible,
    loadedIndexes,
    reducedMotion,
    resumeVersion,
    scrollToIndex,
  ]);

  const handleScroll = () => {
    if (scrollFrame.current !== null) return;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = null;
      const rail = railRef.current;
      if (!rail) return;
      const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-index]"));
      const nearest = cards.reduce(
        (best, card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const railCenter = rail.scrollLeft + rail.clientWidth / 2;
          const distance = Math.abs(cardCenter - railCenter);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: activeIndex, distance: Number.POSITIVE_INFINITY },
      );
      setActiveIndex(nearest.index);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const target = Math.max(0, Math.min(images.length - 1, activeIndex + direction));
    directionRef.current = direction as 1 | -1;
    scrollToIndex(target, true);
  };

  const beginInteraction = (event: PointerEvent<HTMLDivElement>) => {
    interactingRef.current = true;
    dragStateRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
    if (event.pointerType === "mouse") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pauseAfterInteraction();
  };

  const moveInteraction = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 6) drag.moved = true;
    if (drag.pointerType === "mouse") {
      event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
    }
  };

  const endInteraction = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag && drag.pointerId === event.pointerId && !drag.moved) {
      const target = (event.target as Element).closest<HTMLElement>("[data-rail-index]");
      const index = Number(target?.dataset.railIndex);
      if (Number.isInteger(index)) scrollToIndex(index, true);
    }
    dragStateRef.current = null;
    interactingRef.current = false;
    pauseAfterInteraction();
  };

  return (
    <section className={styles.section} aria-labelledby="instagram-images-title">
      <div className={styles.headingRow}>
        <h2 className={styles.srOnly} id="instagram-images-title">
          Seleção editorial da Ótica Vision
        </h2>
        <p aria-hidden="true">Seleção Vision</p>
        <span aria-hidden="true">
          {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </span>
      </div>

      <div
        ref={railRef}
        className={styles.rail}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Seis imagens da Ótica Vision com reprodução automática"
        tabIndex={0}
        onBlur={pauseAfterInteraction}
        onKeyDown={handleKeyDown}
        onPointerDown={beginInteraction}
        onPointerMove={moveInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onWheel={pauseAfterInteraction}
        onScroll={handleScroll}
      >
        {images.map((asset, index) => {
          const cardStyle: CardStyle = { "--placeholder-color": asset.placeholderColor };
          const eager =
            index === activeIndex || index === Math.min(images.length - 1, activeIndex + 1);

          return (
            <figure
              className={`${styles.card} ${index === activeIndex ? styles.active : ""}`}
              data-rail-index={index}
              data-active={index === activeIndex || undefined}
              style={cardStyle}
              key={asset.src}
            >
              <Image
                src={asset.src}
                width={asset.width}
                height={asset.height}
                sizes="(max-width: 720px) 40vw, 190px"
                alt={asset.alt}
                loading={eager ? "eager" : "lazy"}
                placeholder="blur"
                blurDataURL={asset.blurDataURL}
                draggable={false}
                onLoad={() => markLoaded(index)}
                style={{ objectPosition: asset.objectPosition }}
              />
            </figure>
          );
        })}
      </div>
    </section>
  );
}
