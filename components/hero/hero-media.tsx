"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import styles from "../vision-editorial-takeover.module.css";
import type { HeroWallMedia } from "./hero-types";

/** Keeps loading recovery local to the image so the hero composition stays static. */
export function HeroMedia({
  item,
  onReady,
  priority = false,
}: {
  item: HeroWallMedia;
  onReady?: (id: string) => void;
  priority?: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const src = useFallback && item.fallbackSrc ? item.fallbackSrc : item.src;

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;

    const frame = window.requestAnimationFrame(() => {
      if (image.naturalWidth) {
        setReady(true);
        return;
      }

      if (!useFallback && item.fallbackSrc) setUseFallback(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [item.fallbackSrc, src, useFallback]);

  useEffect(() => {
    if (ready) onReady?.(item.id);
  }, [item.id, onReady, ready]);

  return (
    <figure
      className={styles.media}
      data-vision-media
      style={
        {
          "--desktop-object-position": item.desktopObjectPosition,
          "--desktop-media-scale": Math.max(1, item.desktopScale),
          "--hero-fallback-image": item.fallbackSrc
            ? `url("${item.fallbackSrc}")`
            : "none",
          "--mobile-object-position": item.mobileObjectPosition,
          "--mobile-media-scale": Math.max(1, item.mobileScale),
        } as CSSProperties
      }
    >
      <picture data-ready={ready || undefined}>
        {!useFallback && item.mobileSrc ? (
          <source media="(max-width: 720px)" srcSet={item.mobileSrc} />
        ) : null}
        <img
          alt={item.alt}
          decoding={priority ? "sync" : "async"}
          draggable={false}
          fetchPriority={priority ? "high" : "auto"}
          height={item.height}
          loading={priority ? "eager" : "lazy"}
          onError={() => {
            setReady(false);
            if (!useFallback && item.fallbackSrc) setUseFallback(true);
          }}
          onLoad={() => setReady(true)}
          ref={imageRef}
          src={src}
          width={item.width}
        />
      </picture>
    </figure>
  );
}
