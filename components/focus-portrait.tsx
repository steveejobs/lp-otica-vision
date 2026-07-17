"use client";

import Image from "next/image";
import {
  useCallback,
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

export function FocusPortrait({
  asset,
  className = "",
  priority = false,
}: FocusPortraitProps) {
  const frameRef = useRef<HTMLElement>(null);
  const pointerDownRef = useRef(false);

  const setTargetFromPointer = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" && !pointerDownRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const normalizedX = Math.max(0, Math.min(1, x / 100));
    const normalizedY = Math.max(0, Math.min(1, y / 100));

    frame.style.setProperty("--focus-x", `${Math.max(18, Math.min(82, x)).toFixed(2)}%`);
    frame.style.setProperty("--focus-y", `${Math.max(18, Math.min(76, y)).toFixed(2)}%`);
    frame.style.setProperty("--portrait-pan-x", `${((0.5 - normalizedX) * 12).toFixed(2)}px`);
    frame.style.setProperty("--portrait-pan-y", `${((0.5 - normalizedY) * 10).toFixed(2)}px`);
    frame.style.setProperty("--portrait-tilt-x", `${((0.5 - normalizedY) * 4.6).toFixed(2)}deg`);
    frame.style.setProperty("--portrait-tilt-y", `${((normalizedX - 0.5) * 5.2).toFixed(2)}deg`);
  }, []);

  const resetInteraction = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;

    frame.style.setProperty("--focus-x", `${DEFAULT_X}%`);
    frame.style.setProperty("--focus-y", `${DEFAULT_Y}%`);
    frame.style.setProperty("--portrait-pan-x", DEFAULT_INTERACTION.panX);
    frame.style.setProperty("--portrait-pan-y", DEFAULT_INTERACTION.panY);
    frame.style.setProperty("--portrait-tilt-x", DEFAULT_INTERACTION.tiltX);
    frame.style.setProperty("--portrait-tilt-y", DEFAULT_INTERACTION.tiltY);
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
        if (event.pointerType !== "mouse") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
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
      }}
      onPointerCancel={() => {
        pointerDownRef.current = false;
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
