import { ArrowRight } from "lucide-react";
import type { CSSProperties, Ref } from "react";

import styles from "../vision-editorial-takeover.module.css";
import type { HeroWallMedia } from "./hero-types";

export function HeroMedia({
  ariaHidden = false,
  className,
  elementRef,
  enabled = true,
  item,
  onUseFallback,
  priority = false,
  tracked = true,
  useFallback = false,
}: {
  ariaHidden?: boolean;
  className: string;
  elementRef?: Ref<HTMLElement>;
  enabled?: boolean;
  item: HeroWallMedia;
  onUseFallback: () => void;
  priority?: boolean;
  tracked?: boolean;
  useFallback?: boolean;
}) {
  const src = useFallback && item.fallbackSrc ? item.fallbackSrc : item.src;

  return (
    <figure
      aria-hidden={ariaHidden || undefined}
      className={className}
      data-vision-media={tracked ? "" : undefined}
      ref={elementRef}
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
      {enabled ? (
        <picture>
          {!useFallback && item.mobileSrc ? (
            <source media="(max-width: 720px)" srcSet={item.mobileSrc} />
          ) : null}
          <img
            alt={ariaHidden ? "" : item.alt}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            height={item.height}
            loading={priority ? "eager" : "lazy"}
            onError={() => {
              if (!useFallback && item.fallbackSrc) onUseFallback();
            }}
            src={src}
            width={item.width}
          />
        </picture>
      ) : null}
    </figure>
  );
}

export function HeroGalleryControls({
  activeIndex,
  disabled,
  onAdvance,
  total,
}: {
  activeIndex: number;
  disabled: boolean;
  onAdvance: () => void;
  total: number;
}) {
  if (total < 2) return null;

  return (
    <div className={styles.galleryControls}>
      <p aria-live="polite" className={styles.galleryStatus}>
        <span>{String(activeIndex + 1).padStart(2, "0")}</span>
        <span aria-hidden="true"> / </span>
        <span>{String(total).padStart(2, "0")}</span>
      </p>
      <p className={styles.swipeHint}>Deslize para descobrir</p>
      <button
        aria-label="Ver próxima imagem da hero"
        className={styles.nextButton}
        disabled={disabled}
        onClick={onAdvance}
        type="button"
      >
        <span>Próxima</span>
        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
      </button>
    </div>
  );
}
