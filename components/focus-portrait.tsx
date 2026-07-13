"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
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
};

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

const DEFAULT_X = 58;
const DEFAULT_Y = 36;

export function FocusPortrait({
  asset,
  className = "",
  priority = false,
}: FocusPortraitProps) {
  const frameRef = useRef<HTMLElement>(null);
  const targetRef = useRef({ x: DEFAULT_X, y: DEFAULT_Y });
  const currentRef = useRef({ x: DEFAULT_X, y: DEFAULT_Y });
  const pointerDownRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const lastFrameRef = useRef(0);

  const setTargetFromPointer = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" && !pointerDownRef.current) return;

    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    targetRef.current = {
      x: Math.max(18, Math.min(82, x)),
      y: Math.max(18, Math.min(76, y)),
    };
    lastInteractionRef.current = performance.now();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const memory = (navigator as NavigatorWithMemory).deviceMemory;
    const modestDevice =
      navigator.hardwareConcurrency <= 2 || (typeof memory === "number" && memory <= 2);

    let frameId: number | null = null;
    let inView = true;
    let pageVisible = document.visibilityState === "visible";
    let reducedMotion = motionPreference.matches;

    const render = (now: number) => {
      frameId = null;
      if (!inView || !pageVisible || reducedMotion) return;

      if (modestDevice && now - lastFrameRef.current < 32) {
        frameId = window.requestAnimationFrame(render);
        return;
      }
      lastFrameRef.current = now;

      const recentlyTouched = now - lastInteractionRef.current < 2_600;
      if (!pointerInsideRef.current && !recentlyTouched) {
        const mobileAmplitude = coarsePointer.matches ? 0.68 : 1;
        targetRef.current = {
          x: 55 + Math.sin(now / 2_650) * 17 * mobileAmplitude,
          y: 37 + Math.cos(now / 3_150) * 9 * mobileAmplitude,
        };
      }

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.055;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.055;
      frame.style.setProperty("--focus-x", `${currentRef.current.x.toFixed(2)}%`);
      frame.style.setProperty("--focus-y", `${currentRef.current.y.toFixed(2)}%`);

      frameId = window.requestAnimationFrame(render);
    };

    const stop = () => {
      if (frameId === null) return;
      window.cancelAnimationFrame(frameId);
      frameId = null;
    };
    const start = () => {
      if (frameId !== null || !inView || !pageVisible || reducedMotion) return;
      frameId = window.requestAnimationFrame(render);
    };
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting;
            if (inView) start();
            else stop();
          },
          { threshold: 0.08 },
        )
      : null;
    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (pageVisible) start();
      else stop();
    };
    const handleMotionPreference = () => {
      reducedMotion = motionPreference.matches;
      if (reducedMotion) {
        frame.dataset.focusStatic = "true";
        stop();
      } else {
        delete frame.dataset.focusStatic;
        start();
      }
    };

    observer?.observe(frame);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    handleMotionPreference();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
      stop();
    };
  }, []);

  const focusStyle: FocusStyle = {
    "--focus-x": `${DEFAULT_X}%`,
    "--focus-y": `${DEFAULT_Y}%`,
  };

  return (
    <figure
      ref={frameRef}
      className={`${styles.portrait} ${className}`}
      style={focusStyle}
      data-focus-portrait
      onPointerDown={(event) => {
        pointerDownRef.current = true;
        if (event.pointerType !== "mouse") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setTargetFromPointer(event);
      }}
      onPointerEnter={() => {
        pointerInsideRef.current = true;
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        pointerDownRef.current = false;
      }}
      onPointerMove={setTargetFromPointer}
      onPointerUp={() => {
        pointerDownRef.current = false;
        pointerInsideRef.current = false;
      }}
      onPointerCancel={() => {
        pointerDownRef.current = false;
        pointerInsideRef.current = false;
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
          placeholder="blur"
          blurDataURL={asset.blurDataURL}
          sizes="(max-width: 720px) 78vw, (max-width: 1040px) 43vw, 430px"
          style={{ objectPosition: asset.objectPosition }}
        />
        <Image
          className={styles.focusImage}
          src={asset.src}
          alt=""
          aria-hidden="true"
          fill
          loading="eager"
          placeholder="blur"
          blurDataURL={asset.blurDataURL}
          sizes="(max-width: 720px) 78vw, (max-width: 1040px) 43vw, 430px"
          style={{ objectPosition: asset.objectPosition }}
        />
        <span className={styles.lens} aria-hidden="true" />
        <span className={styles.glint} aria-hidden="true" />
      </div>
      <figcaption className={styles.caption} aria-hidden="true">
        <span>foco</span>
        <span>acompanha o gesto</span>
      </figcaption>
    </figure>
  );
}
