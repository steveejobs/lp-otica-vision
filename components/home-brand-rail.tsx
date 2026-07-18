"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type Ref } from "react";

import type { BrandAsset } from "@/lib/assets";

import styles from "./home-brand-rail.module.css";

type HomeBrandRailProps = {
  brands: readonly BrandAsset[];
  ariaLabel: string;
};

type BrandLogoStyle = CSSProperties & {
  "--brand-scale": number;
  "--brand-max-width": string;
  "--brand-max-height": string;
};

type NavigatorWithConnection = Navigator & {
  connection?: EventTarget & { saveData?: boolean };
};

function BrandGroup({
  brands,
  duplicate,
  groupRef,
}: {
  brands: readonly BrandAsset[];
  duplicate?: boolean;
  groupRef?: Ref<HTMLUListElement>;
}) {
  return (
    <ul
      aria-hidden={duplicate ? "true" : undefined}
      className={styles.group}
      ref={groupRef}
    >
      {brands.map((brand) => {
        const logoStyle: BrandLogoStyle = {
          "--brand-scale": brand.scale,
          "--brand-max-width": `${brand.maxWidth}px`,
          "--brand-max-height": `${brand.maxHeight}px`,
        };

        return (
          <li
            className={styles.slot}
            key={`${duplicate ? "clone" : "brand"}-${brand.name}`}
          >
            <span className={styles.logoShell}>
              <Image
                alt={duplicate ? "" : brand.alt}
                className={styles.logo}
                decoding="async"
                height={brand.height}
                loading="lazy"
                sizes="(max-width: 720px) 84px, 146px"
                src={brand.src}
                style={logoStyle}
                width={brand.width}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function HomeBrandRail({ brands, ariaLabel }: HomeBrandRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLUListElement>(null);
  const secondGroupRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const firstGroup = firstGroupRef.current;
    const secondGroup = secondGroupRef.current;
    if (!viewport || !track || !firstGroup || !secondGroup) return;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const connection = (navigator as NavigatorWithConnection).connection;
    let isInView = true;
    let animationFrame = 0;
    let disposed = false;

    const measure = () => {
      animationFrame = 0;
      const distance = secondGroup.offsetLeft - firstGroup.offsetLeft;
      if (distance > 0)
        track.style.setProperty("--rail-shift", `-${distance}px`);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    const syncPlayback = () => {
      const staticMode =
        motionPreference.matches || Boolean(connection?.saveData);
      viewport.dataset.static = String(staticMode);
      viewport.dataset.paused = String(
        staticMode || !isInView || document.visibilityState !== "visible",
      );
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              isInView = entry.isIntersecting;
              syncPlayback();
            },
            { rootMargin: "10% 0px", threshold: 0 },
          )
        : null;

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(scheduleMeasure) : null;

    observer?.observe(viewport);
    resizeObserver?.observe(viewport);
    resizeObserver?.observe(firstGroup);
    resizeObserver?.observe(secondGroup);
    motionPreference.addEventListener("change", syncPlayback);
    connection?.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    syncPlayback();
    measure();

    const images = Array.from(track.querySelectorAll("img"));
    void Promise.all(
      images.map((image) => image.decode().catch(() => undefined)),
    ).then(() => {
      if (!disposed) scheduleMeasure();
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      motionPreference.removeEventListener("change", syncPlayback);
      connection?.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("resize", scheduleMeasure);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      aria-label={ariaLabel}
      className={styles.viewport}
      data-home-brand-rail
      data-paused="false"
      data-static="false"
      ref={viewportRef}
      role="region"
      tabIndex={0}
    >
      <div className={styles.track} ref={trackRef}>
        <BrandGroup brands={brands} groupRef={firstGroupRef} />
        <BrandGroup brands={brands} duplicate groupRef={secondGroupRef} />
      </div>
    </div>
  );
}
