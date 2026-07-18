"use client";

import Image from "next/image";
import { BookOpenText, MessageCircle } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { ImageAsset } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./vision-edit.module.css";

type VisionEditProps = {
  assets: readonly ImageAsset[];
  brandNames: readonly string[];
};

type SceneStyle = CSSProperties & {
  "--edit-image-position": string;
  "--edit-placeholder": string;
};

const CHAPTER_HOLD_MS = [4_100, 3_450, 3_650] as const;
const PREPARE_SECOND_MS = 420;
const PREPARE_THIRD_MS = 1_450;
const MANUAL_HOLD_MS = 5_600;

const chapterLabels = [
  "01 · Contraste",
  "02 · Matéria",
  "03 · Presença",
  "The Vision Edit · Fim",
] as const;

const clampChapter = (value: number) => Math.max(0, Math.min(3, value));

export function VisionEdit({ assets, brandNames }: VisionEditProps) {
  const rootRef = useRef<HTMLElement>(null);
  const loadedRef = useRef<boolean[]>(assets.map((_, index) => index === 0));
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const [chapter, setChapter] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [isPlayable, setIsPlayable] = useState(true);
  const [manualHold, setManualHold] = useState(false);
  const [preparedCount, setPreparedCount] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const activeImage = Math.min(chapter, assets.length - 1);
  const sequencePaused = userPaused || manualHold || !isPlayable;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(reducedQuery.matches);
    let documentVisible = document.visibilityState === "visible";
    let intersects = true;

    const syncPlayable = () => setIsPlayable(documentVisible && intersects);
    const handleVisibility = () => {
      documentVisible = document.visibilityState === "visible";
      syncPlayable();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersects = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.14);
        syncPlayable();
      },
      { threshold: [0, 0.14, 0.42] },
    );

    setEnhanced(true);
    syncReducedMotion();
    observer.observe(root);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedQuery.addEventListener("change", syncReducedMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedQuery.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (!enhanced || reducedMotion) return;

    const secondTimer = window.setTimeout(
      () => setPreparedCount((count) => Math.max(count, 2)),
      PREPARE_SECOND_MS,
    );
    const thirdTimer = window.setTimeout(
      () => setPreparedCount((count) => Math.max(count, 3)),
      PREPARE_THIRD_MS,
    );

    return () => {
      window.clearTimeout(secondTimer);
      window.clearTimeout(thirdTimer);
    };
  }, [enhanced, reducedMotion]);

  useEffect(() => {
    if (!manualHold) return;
    const timer = window.setTimeout(() => setManualHold(false), MANUAL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [manualHold, chapter]);

  useEffect(() => {
    if (!enhanced || reducedMotion || sequencePaused || chapter >= 3) return;

    let timer = 0;
    const advanceWhenReady = () => {
      const nextChapter = chapter + 1;
      if (nextChapter < assets.length && !loadedRef.current[nextChapter]) {
        timer = window.setTimeout(advanceWhenReady, 240);
        return;
      }
      setChapter(nextChapter);
    };

    timer = window.setTimeout(advanceWhenReady, CHAPTER_HOLD_MS[chapter]);
    return () => window.clearTimeout(timer);
  }, [assets.length, chapter, enhanced, reducedMotion, sequencePaused]);

  const moveChapter = (direction: 1 | -1) => {
    if (reducedMotion) return;
    setManualHold(true);
    setChapter((current) => clampChapter(current + direction));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    gestureStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (!start || event.pointerType === "mouse") return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
    moveChapter(deltaX < 0 ? 1 : -1);
  };

  return (
    <section
      ref={rootRef}
      aria-labelledby="hero-title"
      className={styles.edit}
      data-chapter={reducedMotion ? 0 : chapter}
      data-enhanced={enhanced ? "true" : "false"}
      data-motion-state={
        reducedMotion ? "reduced" : chapter === 3 ? "rest" : sequencePaused ? "paused" : "playing"
      }
      id="hero"
      onPointerCancel={() => {
        gestureStartRef.current = null;
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className={styles.scenes} aria-live="off">
        {assets.slice(0, preparedCount).map((asset, index) => (
          <figure
            aria-hidden={index !== activeImage}
            className={`${styles.scene} ${styles[`scene${index + 1}`]}`}
            key={asset.src}
            style={
              {
                "--edit-image-position": asset.objectPosition,
                "--edit-placeholder": asset.placeholderColor,
              } as SceneStyle
            }
          >
            <Image
              alt={index === activeImage ? asset.alt : ""}
              blurDataURL={asset.blurDataURL}
              className={styles.image}
              fill
              fetchPriority={index === 0 ? "high" : "low"}
              loading={index === 0 ? "eager" : "lazy"}
              onLoad={() => {
                loadedRef.current[index] = true;
              }}
              placeholder={asset.blurDataURL ? "blur" : "empty"}
              priority={index === 0}
              sizes="100vw"
              src={asset.src}
            />
          </figure>
        ))}
      </div>

      <div className={styles.metalEdge} aria-hidden="true" />
      <div className={styles.paperPlane} aria-hidden="true" />

      <div className={styles.folioBar}>
        <p className={styles.folio} aria-live="polite">
          {chapterLabels[chapter]}
        </p>
        <button
          aria-label={userPaused ? "Continuar a sequência editorial" : "Pausar a sequência editorial"}
          className={styles.pause}
          disabled={!enhanced || reducedMotion}
          onClick={() => setUserPaused((paused) => !paused)}
          type="button"
        >
          <span aria-hidden="true" className={styles.pauseMark} data-paused={userPaused} />
          {userPaused ? "Continuar" : "Pausar"}
        </button>
      </div>

      <div className={styles.copyPlane}>
        <p className={styles.kicker}>The Vision Edit · Araguaína — TO</p>
        <h1 className={styles.title} id="hero-title">
          A Vision assina a seleção.
        </h1>
        <p className={styles.support}>
          Armações nacionais e importadas, reunidas em uma curadoria de marcas e acabamentos.
        </p>
        <div className={styles.actions}>
          <VisionButton
            ariaLabel="Ver catálogo da Ótica Vision"
            href={LINKS.catalog}
            icon={BookOpenText}
          >
            Ver catálogo
          </VisionButton>
          <VisionButton
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
            external
            href={LINKS.whatsapp}
            icon={MessageCircle}
            variant="secondary"
          >
            WhatsApp
          </VisionButton>
        </div>
      </div>

      <div className={styles.credits}>
        <span className={styles.creditsLabel}>Créditos da seleção</span>
        <div
          aria-label={`Marcas da seleção Vision: ${brandNames.join(", ")}`}
          className={styles.creditsScroll}
          role="group"
          tabIndex={0}
        >
          <div className={styles.creditsTrack}>
            {brandNames.map((name) => (
              <span className={styles.brandName} key={name}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
