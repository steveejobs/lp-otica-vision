"use client";

import { BookOpenText, MessageCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";

import type { HeroMedia } from "@/lib/gallery/hero";
import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type Props = { media: HeroMedia[] };
type StageStyle = CSSProperties & Record<`--${string}`, string | number>;
type Direction = "next" | "previous";
type TransitionIntent = { direction: Direction; targetIndex: number };

const HOLD_MS = 5_200;
const MANUAL_RESUME_MS = 6_500;
const TRANSITION_MS = 1_080;

function atIndex(index: number, length: number) {
  return (index + length) % length;
}

function imageUrl(item: HeroMedia, variant: "desktop" | "mobile") {
  if (item.localSrc) return item.localSrc;
  return `/api/galerias/imagem/${item.id}?variant=${variant}&v=${item.assetVersion}`;
}

function imageKey(item: HeroMedia) {
  return `${item.id}:${item.assetVersion}`;
}

export function VisionEditorialTakeover({ media }: Props) {
  const mediaSignature = media.map((item) => `${item.id}:${item.assetVersion}`).join("|");
  return <HeroStage key={mediaSignature} media={media} />;
}

function HeroStage({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const activeImageRef = useRef<HTMLImageElement>(null);
  const targetImageRef = useRef<HTMLImageElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const manualResumeTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [inViewport, setInViewport] = useState(true);
  const [intent, setIntent] = useState<TransitionIntent | null>(null);
  const [manualPause, setManualPause] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(() => new Set());
  const [reduced, setReduced] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(true);

  const count = media.length;
  const currentIndex = count ? atIndex(activeIndex, count) : 0;
  const current = media[currentIndex];
  const defaultTargetIndex = count > 1 ? atIndex(currentIndex + 1, count) : null;
  const targetIndex = intent?.targetIndex ?? defaultTargetIndex;
  const target = targetIndex === null ? null : media[targetIndex];
  const firstReady = current ? readyIds.has(imageKey(current)) : false;
  const targetReady = target ? readyIds.has(imageKey(target)) : false;

  const markReady = useCallback((item: HeroMedia) => {
    const key = imageKey(item);
    setReadyIds((currentIds) => {
      if (currentIds.has(key)) return currentIds;
      const nextIds = new Set(currentIds);
      nextIds.add(key);
      return nextIds;
    });
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    const onMotion = () => setReduced(query.matches);
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.08 },
    );

    observer.observe(root);
    onVisibility();
    onMotion();
    setEnhanced(true);
    document.addEventListener("visibilitychange", onVisibility);
    query.addEventListener("change", onMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      query.removeEventListener("change", onMotion);
    };
  }, []);

  useEffect(() => () => {
    if (manualResumeTimerRef.current !== null) window.clearTimeout(manualResumeTimerRef.current);
  }, []);

  useEffect(() => {
    const image = activeImageRef.current;
    if (!image || !current) return;
    const onImageReady = () => {
      if (!image.complete || image.naturalWidth < 1) return;
      void image.decode?.().catch(() => undefined).finally(() => markReady(current));
    };
    onImageReady();
    image.addEventListener("load", onImageReady);
    return () => image.removeEventListener("load", onImageReady);
  }, [current, markReady]);

  useEffect(() => {
    const image = targetImageRef.current;
    if (!image || !target) return;
    const onImageReady = () => {
      if (!image.complete || image.naturalWidth < 1) return;
      void image.decode?.().catch(() => undefined).finally(() => markReady(target));
    };
    onImageReady();
    image.addEventListener("load", onImageReady);
    return () => image.removeEventListener("load", onImageReady);
  }, [markReady, target]);

  const finishTransition = useCallback(() => {
    if (!transitioning || !intent) return;
    setActiveIndex(intent.targetIndex);
    setIntent(null);
    setTransitioning(false);
  }, [intent, transitioning]);

  useEffect(() => {
    if (!transitioning) return;
    const timer = window.setTimeout(finishTransition, TRANSITION_MS + 180);
    return () => window.clearTimeout(timer);
  }, [finishTransition, transitioning]);

  useEffect(() => {
    if (!intent || transitioning || !targetReady || !firstReady) return;
    const timer = window.setTimeout(() => setTransitioning(true), 0);
    return () => window.clearTimeout(timer);
  }, [firstReady, intent, targetReady, transitioning]);

  useEffect(() => {
    if (
      !enhanced || !firstReady || !targetReady || !visible || !inViewport || reduced
      || manualPause || count < 2 || transitioning || intent || defaultTargetIndex === null
    ) return;
    const timer = window.setTimeout(() => {
      setIntent({ direction: "next", targetIndex: defaultTargetIndex });
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [count, defaultTargetIndex, enhanced, firstReady, inViewport, intent, manualPause, reduced, targetReady, transitioning, visible]);

  const pauseAutoplay = useCallback(() => {
    setManualPause(true);
    if (manualResumeTimerRef.current !== null) window.clearTimeout(manualResumeTimerRef.current);
    manualResumeTimerRef.current = window.setTimeout(() => {
      manualResumeTimerRef.current = null;
      setManualPause(false);
    }, MANUAL_RESUME_MS);
  }, []);

  const requestTransition = useCallback((direction: Direction) => {
    if (count < 2 || transitioning || intent) return;
    pauseAutoplay();
    setIntent({
      direction,
      targetIndex: atIndex(currentIndex + (direction === "next" ? 1 : -1), count),
    });
  }, [count, currentIndex, intent, pauseAutoplay, transitioning]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;
    requestTransition(deltaX < 0 ? "next" : "previous");
  }, [requestTransition]);

  const stageStyle: StageStyle = {
    "--visual-background": current?.backgroundColor ?? "#d7c3ad",
  };
  const motionState = reduced ? "reduced" : visible && inViewport && !manualPause ? "playing" : "paused";

  return (
    <section
      aria-labelledby="hero-title"
      className={styles.stage}
      data-count={count}
      data-motion={motionState}
      id="hero"
      ref={rootRef}
    >
      <div className={styles.inner}>
        <div className={styles.copyField}>
          <div className={styles.identity}><BrandLogo priority size="hero" /></div>
          <div className={styles.copy}>
            <h1 className={styles.title} id="hero-title">Armações que dão forma à sua presença.</h1>
            <p>Armações nacionais e importadas, com lentes confeccionadas pela Vision em Araguaína.</p>
            <div className={styles.actions}>
              <VisionButton ariaLabel="Ver catálogo da Ótica Vision" href={LINKS.catalog} icon={BookOpenText}>Catálogo</VisionButton>
              <VisionButton ariaLabel="Falar com a Ótica Vision pelo WhatsApp" external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
            </div>
          </div>
        </div>

        <div
          aria-label="Imagens da Ótica Vision"
          className={styles.visualField}
          data-direction={intent?.direction ?? "next"}
          data-transitioning={transitioning}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") requestTransition("previous");
            if (event.key === "ArrowRight") requestTransition("next");
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          role="group"
          style={stageStyle}
          tabIndex={count > 1 ? 0 : -1}
        >
          <div className={styles.photoStage}>
            {current ? [current, ...(target && target.id !== current.id ? [target] : [])].map((item) => {
              const isCurrent = item.id === current.id;
              return (
                <figure
                  aria-hidden={isCurrent || !target ? undefined : "true"}
                  className={`${styles.page} ${isCurrent ? styles.current : styles.incoming}`}
                  key={`${item.id}-${item.assetVersion}`}
                  onTransitionEnd={isCurrent ? undefined : (event) => {
                    if (event.propertyName === "clip-path") finishTransition();
                  }}
                >
                  <HeroImage
                    alt={isCurrent ? item.altText : ""}
                    imageRef={isCurrent ? activeImageRef : targetImageRef}
                    item={item}
                    onLoad={() => markReady(item)}
                    priority={isCurrent && currentIndex === 0 && !readyIds.size}
                  />
                </figure>
              );
            }) : <div className={styles.emptyVisual} aria-hidden="true" />}
          </div>
          {count > 1 ? (
            <div className={styles.manualControls}>
              <button aria-label="Imagem anterior" onClick={() => requestTransition("previous")} type="button">Anterior</button>
              <button aria-label="Próxima imagem" onClick={() => requestTransition("next")} type="button">Próxima</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroImage({
  alt,
  imageRef,
  item,
  onLoad,
  priority,
}: {
  alt: string;
  imageRef?: RefObject<HTMLImageElement | null>;
  item: HeroMedia;
  onLoad?: () => void;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const style = {
    "--desktop-focus": item.desktopObjectPosition,
    "--desktop-scale": item.desktopScale,
    "--mobile-focus": item.mobileObjectPosition,
    "--mobile-scale": item.mobileScale,
  } as StageStyle;
  const source = failed && item.fallbackSrc ? item.fallbackSrc : imageUrl(item, "desktop");
  const mobileSource = failed && item.fallbackSrc ? item.fallbackSrc : imageUrl(item, "mobile");
  return (
    <picture style={style}>
      <source media="(max-width: 720px)" sizes="(max-width: 720px) 96vw" srcSet={`${mobileSource} 800w`} />
      <img
        alt={alt}
        className={styles.photo}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        height={item.height}
        loading="eager"
        onError={() => {
          if (!failed && item.fallbackSrc) setFailed(true);
        }}
        onLoad={onLoad}
        ref={imageRef}
        sizes="(max-width: 720px) 96vw, (max-width: 1100px) 58vw, 66vw"
        src={source}
        srcSet={`${source} 1200w`}
        width={item.width}
      />
    </picture>
  );
}
