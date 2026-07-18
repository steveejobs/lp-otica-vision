"use client";

import Image from "next/image";
import { BookOpenText, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { ImageAsset } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type VisionEditorialTakeoverProps = {
  assets: readonly ImageAsset[];
};

type SceneStyle = CSSProperties & {
  "--takeover-placeholder": string;
  "--takeover-position": string;
};

const ACT_HOLDS_MS = [2_900, 2_800, 2_700] as const;
const PREPARE_SECOND_MS = 320;
const PREPARE_THIRD_MS = 1_900;

export function VisionEditorialTakeover({ assets }: VisionEditorialTakeoverProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [act, setAct] = useState(0);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [enhanced, setEnhanced] = useState(false);
  const [intersects, setIntersects] = useState(true);
  const [preparedCount, setPreparedCount] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(reducedQuery.matches);
    const syncVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => setIntersects(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.12)),
          { threshold: [0, 0.12, 0.5] },
        )
      : null;

    setEnhanced(true);
    syncReducedMotion();
    syncVisibility();
    observer?.observe(root);
    document.addEventListener("visibilitychange", syncVisibility);
    reducedQuery.addEventListener("change", syncReducedMotion);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      reducedQuery.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (!enhanced || reducedMotion) return;

    const secondTimer = window.setTimeout(() => setPreparedCount(2), PREPARE_SECOND_MS);
    const thirdTimer = window.setTimeout(() => setPreparedCount(3), PREPARE_THIRD_MS);

    return () => {
      window.clearTimeout(secondTimer);
      window.clearTimeout(thirdTimer);
    };
  }, [enhanced, reducedMotion]);

  useEffect(() => {
    if (!enhanced || reducedMotion || !documentVisible || !intersects || act >= 3) return;

    const timer = window.setTimeout(() => {
      setAct((current) => Math.min(current + 1, 3));
    }, ACT_HOLDS_MS[act]);

    return () => window.clearTimeout(timer);
  }, [act, documentVisible, enhanced, intersects, reducedMotion]);

  return (
    <section
      ref={rootRef}
      aria-labelledby="hero-title"
      className={styles.takeover}
      data-act={reducedMotion ? 0 : act}
      data-enhanced={enhanced ? "true" : "false"}
      data-motion={reducedMotion ? "reduced" : documentVisible && intersects ? "playing" : "paused"}
      id="hero"
    >
      <div aria-hidden="true" className={styles.scenes}>
        {assets.slice(0, preparedCount).map((asset, index) => (
          <figure
            className={`${styles.scene} ${styles[`scene${index + 1}`]}`}
            key={asset.src}
            style={
              {
                "--takeover-placeholder": asset.placeholderColor,
                "--takeover-position": asset.objectPosition,
              } as SceneStyle
            }
          >
            <Image
              alt=""
              blurDataURL={asset.blurDataURL}
              className={styles.photo}
              fill
              fetchPriority={index === 0 ? "high" : index === 1 ? "auto" : "low"}
              loading={index === 0 ? "eager" : "lazy"}
              placeholder={asset.blurDataURL ? "blur" : "empty"}
              priority={index === 0}
              sizes="100vw"
              src={asset.src}
            />
          </figure>
        ))}
      </div>

      <div aria-hidden="true" className={`${styles.blade} ${styles.bladeTwo}`} />
      <div aria-hidden="true" className={`${styles.blade} ${styles.bladeThree}`} />

      <div className={styles.signature}>
        <BrandLogo size="hero" />
      </div>

      <div aria-hidden="true" className={styles.copyPlane} />
      <div className={styles.copy}>
        <h1 className={styles.title} id="hero-title">
          <span>Seleção Vision.</span>
          <span>Marcas com presença.</span>
        </h1>
        <div className={styles.actions}>
          <VisionButton
            ariaLabel="Ver catálogo da Ótica Vision"
            className={styles.primaryAction}
            href={LINKS.catalog}
            icon={BookOpenText}
          >
            Catálogo
          </VisionButton>
          <VisionButton
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
            className={styles.secondaryAction}
            external
            href={LINKS.whatsapp}
            icon={MessageCircle}
            variant="secondary"
          >
            WhatsApp
          </VisionButton>
        </div>
      </div>

      <p className={styles.visualDescription}>
        Retratos editoriais da seleção de armações da Ótica Vision.
      </p>
    </section>
  );
}
