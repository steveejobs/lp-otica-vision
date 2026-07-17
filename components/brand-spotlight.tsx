"use client";

import Image from "next/image";
import {
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import type { BrandAsset } from "@/lib/assets";

import styles from "./brand-spotlight.module.css";

type BrandSpotlightProps = {
  brands: readonly BrandAsset[];
  initialBrandName: string;
};

type BrandLogoStyle = CSSProperties & {
  "--brand-scale": number;
  "--brand-max-width": string;
  "--brand-max-height": string;
};

function logoStyle(brand: BrandAsset, sizeFactor = 1): BrandLogoStyle {
  return {
    "--brand-scale": brand.scale,
    "--brand-max-width": `${brand.maxWidth * sizeFactor}px`,
    "--brand-max-height": `${brand.maxHeight * sizeFactor}px`,
  };
}

export function BrandSpotlight({ brands, initialBrandName }: BrandSpotlightProps) {
  const initialIndex = Math.max(
    0,
    brands.findIndex(brand => brand.name === initialBrandName),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeBrand = brands[activeIndex] ?? brands[0];
  const panelId = "brand-spotlight-panel";
  const activeStyle = useMemo(
    () => (activeBrand ? logoStyle(activeBrand, 2.1) : undefined),
    [activeBrand],
  );

  const handleSelectorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % brands.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (activeIndex - 1 + brands.length) % brands.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = brands.length - 1;
    else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    buttons[nextIndex]?.focus();
  };

  if (!activeBrand || !activeStyle) return null;

  return (
    <div
      className={styles.spotlight}
      data-active-brand={activeBrand.name}
      data-active-index={activeIndex}
    >
      <div
        className={styles.stage}
        id={panelId}
        role="tabpanel"
        aria-label={`Marca em destaque: ${activeBrand.name}`}
        aria-live="polite"
        data-focus-reveal
      >
        <span className={styles.stageLabel}>Em foco</span>
        <div className={styles.activeLogo} key={activeBrand.name}>
          <Image
            src={activeBrand.src}
            width={activeBrand.width}
            height={activeBrand.height}
            sizes="(max-width: 720px) 54vw, 280px"
            alt={activeBrand.alt}
            loading="lazy"
            style={activeStyle}
          />
        </div>
        <span className={styles.activeName} aria-hidden="true">
          {activeBrand.name}
        </span>
      </div>

      <div className={styles.selectorViewport}>
        <div
          className={styles.selector}
          role="tablist"
          aria-label="Escolher marca em destaque"
          onKeyDown={handleSelectorKeyDown}
        >
          {brands.map((brand, index) => {
            const active = index === activeIndex;
            return (
              <button
                className={active ? styles.activeButton : ""}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId}
                aria-label={`Destacar ${brand.name}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                key={brand.name}
              >
                <Image
                  src={brand.src}
                  width={brand.width}
                  height={brand.height}
                  sizes="(max-width: 720px) 116px, 112px"
                  alt=""
                  loading="lazy"
                  style={logoStyle(brand)}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
