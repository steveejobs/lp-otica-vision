"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { ImageAsset } from "@/lib/assets";

import styles from "./focus-portrait.module.css";

type FocusPortraitProps = {
  asset: ImageAsset;
  className?: string;
  priority?: boolean;
};

type FocusStyle = CSSProperties & {
  "--focus-x": string;
  "--focus-y": string;
  "--portrait-pan-x": string;
  "--portrait-pan-y": string;
  "--portrait-tilt-x": string;
  "--portrait-tilt-y": string;
};

const DEFAULT_X = 58;
const DEFAULT_Y = 36;
const DEFAULT_INTERACTION = {
  panX: "0px",
  panY: "0px",
  tiltX: "0deg",
  tiltY: "0deg",
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function FocusPortrait({
  asset,
  className = "",
  priority = false,
}: FocusPortraitProps) {
  const frameRef = useRef<HTMLElement>(null);
  const pointerDownRef = useRef(false);
  const pointerTargetRef = useRef({ active: false, holdUntil: 0, x: 0, y: 0 });
  const scrollImpulseRef = useRef(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsed = 0;
    let inView = true;
    let lastFrameTime = performance.now();
    let lastScrollY = window.scrollY;
    let pageVisible = document.visibilityState === "visible";
    let pointerX = 0;
    let pointerY = 0;

    const setStaticFrame = () => {
      frame.style.setProperty("--focus-x", `${DEFAULT_X}%`);
      frame.style.setProperty("--focus-y", `${DEFAULT_Y}%`);
      frame.style.setProperty("--portrait-pan-x", DEFAULT_INTERACTION.panX);
      frame.style.setProperty("--portrait-pan-y", DEFAULT_INTERACTION.panY);
      frame.style.setProperty("--portrait-tilt-x", DEFAULT_INTERACTION.tiltX);
      frame.style.setProperty("--portrait-tilt-y", DEFAULT_INTERACTION.tiltY);
    };

    const renderFrame = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      elapsed += delta;

      const pointer = pointerTargetRef.current;
      const pointerIsEngaged = pointer.active || now < pointer.holdUntil;
      const targetX = pointerIsEngaged ? pointer.x : 0;
      const targetY = pointerIsEngaged ? pointer.y : 0;
      const follow = 1 - Math.exp(-delta * (pointerIsEngaged ? 7.5 : 3.2));
      pointerX += (targetX - pointerX) * follow;
      pointerY += (targetY - pointerY) * follow;

      const scrollImpulse = scrollImpulseRef.current;
      scrollImpulseRef.current *= Math.exp(-delta * 3.8);

      const idleX = Math.sin(elapsed * 0.72) * 3.5 + Math.sin(elapsed * 0.27) * 1.15;
      const idleY = Math.cos(elapsed * 0.58) * 2.15;
      const panX = idleX + pointerX * 6.5;
      const panY = idleY + pointerY * 4.6 + scrollImpulse * 3.8;
      const tiltX = Math.sin(elapsed * 0.43) * 0.62 - pointerY * 2.1 - scrollImpulse * 0.85;
      const tiltY = Math.cos(elapsed * 0.37) * 0.76 + pointerX * 2.4;
      const focusX = clamp(DEFAULT_X + Math.sin(elapsed * 0.34) * 4.2 + pointerX * 9, 28, 78);
      const focusY = clamp(DEFAULT_Y + Math.cos(elapsed * 0.29) * 2.8 + pointerY * 7, 22, 68);

      frame.style.setProperty("--focus-x", `${focusX.toFixed(2)}%`);
      frame.style.setProperty("--focus-y", `${focusY.toFixed(2)}%`);
      frame.style.setProperty("--portrait-pan-x", `${panX.toFixed(2)}px`);
      frame.style.setProperty("--portrait-pan-y", `${panY.toFixed(2)}px`);
      frame.style.setProperty("--portrait-tilt-x", `${tiltX.toFixed(2)}deg`);
      frame.style.setProperty("--portrait-tilt-y", `${tiltY.toFixed(2)}deg`);

      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    const syncPlayback = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;

      if (reducedMotion.matches) {
        frame.dataset.motionEnabled = "false";
        frame.dataset.motionState = "reduced";
        setStaticFrame();
        return;
      }

      frame.dataset.motionEnabled = "true";
      if (!inView || !pageVisible) {
        frame.dataset.motionState = "paused";
        return;
      }

      frame.dataset.motionState = "running";
      lastFrameTime = performance.now();
      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.02);
        syncPlayback();
      },
      { threshold: [0, 0.02, 0.2, 0.6] },
    );

    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      syncPlayback();
    };

    const handleScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      if (!inView || reducedMotion.matches || Math.abs(delta) < 0.5) return;

      scrollImpulseRef.current = clamp(scrollImpulseRef.current + delta / 72, -1, 1);
    };

    observer.observe(frame);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("scroll", handleScroll, { passive: true });
    reducedMotion.addEventListener("change", syncPlayback);
    syncPlayback();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", handleScroll);
      reducedMotion.removeEventListener("change", syncPlayback);
    };
  }, []);

  const setTargetFromPointer = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" && !pointerDownRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const normalizedX = Math.max(0, Math.min(1, x / 100));
    const normalizedY = Math.max(0, Math.min(1, y / 100));

    pointerTargetRef.current = {
      active: true,
      holdUntil: event.pointerType === "mouse" ? 0 : performance.now() + 1100,
      x: normalizedX - 0.5,
      y: normalizedY - 0.5,
    };
  }, []);

  const resetInteraction = useCallback(() => {
    pointerTargetRef.current.active = false;
  }, []);

  const focusStyle: FocusStyle = {
    "--focus-x": `${DEFAULT_X}%`,
    "--focus-y": `${DEFAULT_Y}%`,
    "--portrait-pan-x": DEFAULT_INTERACTION.panX,
    "--portrait-pan-y": DEFAULT_INTERACTION.panY,
    "--portrait-tilt-x": DEFAULT_INTERACTION.tiltX,
    "--portrait-tilt-y": DEFAULT_INTERACTION.tiltY,
  };

  return (
    <figure
      ref={frameRef}
      className={`${styles.portrait} ${className}`}
      style={focusStyle}
      data-focus-portrait
      onPointerDown={(event) => {
        pointerDownRef.current = true;
        setTargetFromPointer(event);
      }}
      onPointerEnter={() => {
        pointerDownRef.current = false;
      }}
      onPointerLeave={() => {
        pointerDownRef.current = false;
        resetInteraction();
      }}
      onPointerMove={setTargetFromPointer}
      onPointerUp={() => {
        pointerDownRef.current = false;
        pointerTargetRef.current.active = false;
      }}
      onPointerCancel={() => {
        pointerDownRef.current = false;
        pointerTargetRef.current.active = false;
      }}
    >
      <div
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
        <span className={styles.lens} aria-hidden="true" />
        <span className={styles.glint} aria-hidden="true" />
      </div>
    </figure>
  );
}
