"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

import type { ImageAsset } from "@/lib/assets";

import styles from "./focus-portrait.module.css";

type FocusPortraitProps = {
  asset: ImageAsset;
  className?: string;
  priority?: boolean;
};

type PortraitStyle = CSSProperties & {
  "--portrait-shift-x": string;
  "--portrait-shift-y": string;
};

const OPENING_DELAY_MS = 140;
const OPENING_DURATION_MS = 2_300;
const POINTER_SHIFT_PX = 2.2;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function FocusPortrait({
  asset,
  className = "",
  priority = false,
}: FocusPortraitProps) {
  const portraitRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const portrait = portraitRef.current;
    const frame = frameRef.current;
    const hero = portrait?.closest<HTMLElement>("#hero");
    if (!portrait || !frame || !hero) return;

    const mobileViewport = window.matchMedia("(max-width: 720px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let documentVisible = document.visibilityState === "visible";
    let exitProgress = 0;
    let geometry = { height: hero.offsetHeight, top: hero.getBoundingClientRect().top + window.scrollY };
    let inView = true;
    let openingAnimation: Animation | null = null;
    let pendingFrame = 0;
    let phase: "opening" | "reduced" | "rest" = "rest";
    let pointerBounds: DOMRect | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const setPhase = (nextPhase: typeof phase) => {
      phase = nextPhase;
      portrait.dataset.motionPhase = nextPhase;
      hero.dataset.heroMotionPhase = nextPhase;
    };

    const setPlaybackState = (state: "opening" | "paused" | "reduced" | "rest") => {
      portrait.dataset.motionState = state;
      hero.dataset.heroMotionState = state;
    };

    const cacheGeometry = () => {
      geometry = {
        height: hero.offsetHeight,
        top: hero.getBoundingClientRect().top + window.scrollY,
      };
      pointerBounds = null;
    };

    const updateExitProgress = () => {
      const start = geometry.top + geometry.height * 0.14;
      const distance = Math.max(1, geometry.height * 0.64);
      exitProgress = clamp((window.scrollY - start) / distance, 0, 1);
    };

    const commitFrame = () => {
      pendingFrame = 0;
      if (disposed || reducedMotion.matches || !inView || !documentVisible) return;

      const inset = exitProgress * (mobileViewport.matches ? 32 : 21);
      frame.style.clipPath = mobileViewport.matches
        ? `inset(${inset.toFixed(2)}% 0 ${inset.toFixed(2)}% 0)`
        : `inset(0 ${inset.toFixed(2)}% 0 ${inset.toFixed(2)}%)`;

      const pointerIsAvailable = phase === "rest" && exitProgress < 0.035;
      portrait.style.setProperty(
        "--portrait-shift-x",
        `${(pointerIsAvailable ? pointerX : 0).toFixed(2)}px`,
      );
      portrait.style.setProperty(
        "--portrait-shift-y",
        `${(pointerIsAvailable ? pointerY : 0).toFixed(2)}px`,
      );
    };

    const scheduleFrame = () => {
      if (pendingFrame || !inView || !documentVisible || reducedMotion.matches) return;
      pendingFrame = window.requestAnimationFrame(commitFrame);
    };

    const finishOpening = () => {
      if (disposed) return;
      frame.style.clipPath = "inset(0)";
      openingAnimation?.cancel();
      openingAnimation = null;
      setPhase("rest");
      setPlaybackState(inView && documentVisible ? "rest" : "paused");
      updateExitProgress();
      scheduleFrame();
    };

    const cancelOpeningForScroll = () => {
      if (!openingAnimation) return;
      openingAnimation.cancel();
      openingAnimation = null;
      frame.style.clipPath = "inset(0)";
      setPhase("rest");
    };

    const startOpening = () => {
      if (disposed) return;
      if (reducedMotion.matches) {
        setPhase("reduced");
        setPlaybackState("reduced");
        frame.style.clipPath = "inset(0)";
        return;
      }

      const initialClip = mobileViewport.matches
        ? "inset(36% 0 36% 0)"
        : "inset(0 45% 0 45%)";
      const developmentClip = mobileViewport.matches
        ? "inset(15% 0 15% 0)"
        : "inset(0 18% 0 18%)";
      setPhase("opening");
      setPlaybackState(inView && documentVisible ? "opening" : "paused");
      openingAnimation = frame.animate(
        [
          { clipPath: initialClip, easing: "linear", offset: 0 },
          {
            clipPath: initialClip,
            easing: "cubic-bezier(0.22, 0.78, 0.22, 1)",
            offset: 0.17,
          },
          {
            clipPath: developmentClip,
            easing: "cubic-bezier(0.3, 0.72, 0.2, 1)",
            offset: 0.64,
          },
          { clipPath: "inset(0)", offset: 1 },
        ],
        {
          delay: OPENING_DELAY_MS,
          duration: OPENING_DURATION_MS,
          fill: "both",
        },
      );
      openingAnimation.onfinish = finishOpening;
      if (!inView || !documentVisible) openingAnimation.pause();
    };

    const syncPlayback = () => {
      window.cancelAnimationFrame(pendingFrame);
      pendingFrame = 0;

      if (reducedMotion.matches) {
        openingAnimation?.cancel();
        openingAnimation = null;
        frame.style.clipPath = "inset(0)";
        portrait.style.setProperty("--portrait-shift-x", "0px");
        portrait.style.setProperty("--portrait-shift-y", "0px");
        setPhase("reduced");
        setPlaybackState("reduced");
        return;
      }

      if (!inView || !documentVisible) {
        openingAnimation?.pause();
        setPlaybackState("paused");
        return;
      }

      if (openingAnimation) {
        openingAnimation.play();
        setPlaybackState("opening");
        return;
      }

      setPlaybackState("rest");
      scheduleFrame();
    };

    const handleScroll = () => {
      updateExitProgress();
      if (exitProgress > 0.015) {
        cancelOpeningForScroll();
        pointerX = 0;
        pointerY = 0;
      }
      scheduleFrame();
    };

    const handlePointerEnter = () => {
      pointerBounds = portrait.getBoundingClientRect();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        reducedMotion.matches ||
        phase !== "rest" ||
        exitProgress >= 0.035
      ) {
        return;
      }

      const bounds = pointerBounds ?? portrait.getBoundingClientRect();
      pointerBounds = bounds;
      const normalizedX = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5);
      const normalizedY = clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5);
      pointerX = normalizedX * POINTER_SHIFT_PX * 2;
      pointerY = normalizedY * POINTER_SHIFT_PX * 1.45;
      scheduleFrame();
    };

    const handlePointerLeave = () => {
      pointerBounds = null;
      pointerX = 0;
      pointerY = 0;
      scheduleFrame();
    };

    const handleResize = () => {
      cacheGeometry();
      updateExitProgress();
      scheduleFrame();
    };

    const handleVisibility = () => {
      documentVisible = document.visibilityState === "visible";
      syncPlayback();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.04);
        syncPlayback();
      },
      { threshold: [0, 0.04, 0.3, 0.7] },
    );

    observer.observe(hero);
    document.addEventListener("visibilitychange", handleVisibility);
    portrait.addEventListener("pointerenter", handlePointerEnter);
    portrait.addEventListener("pointerleave", handlePointerLeave);
    portrait.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    mobileViewport.addEventListener("change", handleResize);
    reducedMotion.addEventListener("change", syncPlayback);
    cacheGeometry();
    updateExitProgress();
    startOpening();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(pendingFrame);
      openingAnimation?.cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      portrait.removeEventListener("pointerenter", handlePointerEnter);
      portrait.removeEventListener("pointerleave", handlePointerLeave);
      portrait.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      mobileViewport.removeEventListener("change", handleResize);
      reducedMotion.removeEventListener("change", syncPlayback);
      delete hero.dataset.heroMotionPhase;
      delete hero.dataset.heroMotionState;
    };
  }, []);

  const portraitStyle: PortraitStyle = {
    "--portrait-shift-x": "0px",
    "--portrait-shift-y": "0px",
  };

  return (
    <figure
      ref={portraitRef}
      className={`${styles.portrait} ${className}`}
      style={portraitStyle}
      data-focus-portrait
    >
      <div
        ref={frameRef}
        className={styles.frame}
        style={{ backgroundColor: asset.placeholderColor }}
      >
        <Image
          className={styles.baseImage}
          src={asset.src}
          alt={asset.alt}
          fill
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          placeholder="blur"
          blurDataURL={asset.blurDataURL}
          sizes="(max-width: 720px) 78vw, (max-width: 1040px) 43vw, 430px"
          style={{ objectPosition: asset.objectPosition }}
        />
      </div>
    </figure>
  );
}
