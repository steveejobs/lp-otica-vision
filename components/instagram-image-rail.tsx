"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import type { ImageAsset } from "@/lib/assets";

import styles from "./instagram-image-rail.module.css";

type InstagramImageRailProps = {
  images: readonly ImageAsset[];
};

type CardStyle = CSSProperties & {
  "--placeholder-color": string;
};

const AUTOPLAY_DELAY = 3_200;
const INTERACTION_PAUSE = 5_500;

export function InstagramImageRail({ images }: InstagramImageRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntil = useRef(0);
  const interactingRef = useRef(false);
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
      rail.scrollTo({
        left: card.offsetLeft,
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
          const distance = Math.abs(card.offsetLeft - rail.scrollLeft);
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

  const beginInteraction = () => {
    interactingRef.current = true;
    pauseAfterInteraction();
  };

  const endInteraction = () => {
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
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onWheel={pauseAfterInteraction}
        onScroll={handleScroll}
      >
        {images.map((asset, index) => {
          const cardStyle: CardStyle = { "--placeholder-color": asset.placeholderColor };
          const eager = index <= Math.min(images.length - 1, activeIndex + 2);

          return (
            <figure
              className={styles.card}
              data-rail-index={index}
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
