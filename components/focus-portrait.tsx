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
};

const DEFAULT_X = 58;
const DEFAULT_Y = 36;

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

    frame.style.setProperty("--focus-x", `${Math.max(18, Math.min(82, x)).toFixed(2)}%`);
    frame.style.setProperty("--focus-y", `${Math.max(18, Math.min(76, y)).toFixed(2)}%`);
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
        pointerDownRef.current = false;
      }}
      onPointerLeave={() => {
        pointerDownRef.current = false;
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
