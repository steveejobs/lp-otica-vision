"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";

import type { BrandAsset } from "@/lib/assets";

import styles from "./brand-rail.module.css";

type BrandRailProps = {
  brands: readonly BrandAsset[];
  variant?: "home" | "compact";
  ariaLabel?: string;
  className?: string;
};

type BrandLogoStyle = CSSProperties & {
  "--brand-scale": number;
  "--brand-max-width": string;
  "--brand-max-height": string;
};

type NetworkInformation = EventTarget & {
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
};

function BrandSequence({
  brands,
  duplicate = false,
  variant,
}: {
  brands: readonly BrandAsset[];
  duplicate?: boolean;
  variant: "home" | "compact";
}) {
  return (
    <ul className={styles.group} aria-hidden={duplicate || undefined}>
      {brands.map((brandItem) => {
        const logoStyle: BrandLogoStyle = {
          "--brand-scale": brandItem.scale,
          "--brand-max-width": `${brandItem.maxWidth}px`,
          "--brand-max-height": `${brandItem.maxHeight}px`,
        };

        return (
          <li className={styles.slot} key={`${duplicate ? "duplicate" : "primary"}-${brandItem.name}`}>
            <span className={styles.logoShell}>
              <Image
                className={styles.logo}
                src={brandItem.src}
                width={brandItem.width}
                height={brandItem.height}
                sizes={
                  variant === "compact"
                    ? "(max-width: 720px) 150px, 136px"
                    : "(max-width: 720px) 164px, 184px"
                }
                alt={duplicate ? "" : brandItem.alt}
                loading="lazy"
                decoding="async"
                style={logoStyle}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function BrandRail({
  brands,
  variant = "home",
  ariaLabel = "Marcas presentes na seleção da Ótica Vision",
  className = "",
}: BrandRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithConnection).connection;
    let isInView = false;

    const update = () => {
      const staticMode = motionPreference.matches || Boolean(connection?.saveData);
      viewport.dataset.static = String(staticMode);
      viewport.dataset.running = String(
        isInView && document.visibilityState === "visible" && !staticMode,
      );
    };

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            isInView = entry.isIntersecting && entry.intersectionRatio >= 0.08;
            update();
          },
          { threshold: [0, 0.08, 0.35], rootMargin: "8% 0px" },
        )
      : null;

    if (observer) observer.observe(viewport);
    else isInView = true;

    motionPreference.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${styles[variant]} ${className}`}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      data-brand-rail
      data-running="false"
      data-static="false"
    >
      <div className={styles.track} data-brand-track>
        <BrandSequence brands={brands} variant={variant} />
        <BrandSequence brands={brands} variant={variant} duplicate />
      </div>
    </div>
  );
}
