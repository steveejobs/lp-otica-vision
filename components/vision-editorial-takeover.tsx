"use client";

import { BookOpenText, MessageCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
  type TransitionEvent,
} from "react";

import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type WallMedia = {
  alt: string;
  desktopScale: number;
  desktopObjectPosition: string;
  height: number;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  mobileSrc?: string;
  src: string;
  width: number;
};

type Props = { media: readonly WallMedia[] };
type TransitionPhase = "idle" | "preparing" | "transitioning" | "committing";
type FieldLayout = "open" | "offset" | "narrow";

const HOLD_MS = 3_400;
const layouts: readonly FieldLayout[] = ["offset", "narrow", "open"];

function atIndex(index: number, length: number) {
  return (index + length) % length;
}

function loadAndDecode(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Falha ao carregar a pr\u00f3xima imagem da hero: ${src}`));
    image.src = src;
  });
}

/**
 * The paper plane owns the line. Media only ever lives inside the one clipped field:
 * one image at rest, then outgoing plus a decoded incoming image during the transition.
 */
export function VisionEditorialTakeover({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const preparationFrame = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [nextReadySrc, setNextReadySrc] = useState<string | null>(null);
  const [inViewport, setInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches,
  );
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const count = media.length;
  const active = media[activeIndex];
  const nextIndex = count > 1 ? atIndex(activeIndex + 1, count) : null;
  const next = nextIndex === null ? null : media[nextIndex];
  const nextSource = next ? (compactViewport && next.mobileSrc ? next.mobileSrc : next.src) : null;
  const incoming = incomingIndex === null ? null : media[incomingIndex];
  const motionEnabled = count > 1 && inViewport && isVisible && !reducedMotion;
  const layout = layouts[activeIndex % layouts.length];
  const nextLayout = nextIndex === null ? layout : layouts[nextIndex % layouts.length];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia("(max-width: 720px)");
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    );
    const syncVisibility = () => setIsVisible(document.visibilityState === "visible");
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    const syncCompactViewport = () => setCompactViewport(compactQuery.matches);

    observer.observe(root);
    syncVisibility();
    syncMotion();
    syncCompactViewport();
    document.addEventListener("visibilitychange", syncVisibility);
    motionQuery.addEventListener("change", syncMotion);
    compactQuery.addEventListener("change", syncCompactViewport);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      motionQuery.removeEventListener("change", syncMotion);
      compactQuery.removeEventListener("change", syncCompactViewport);
    };
  }, []);

  useEffect(() => {
    if (!nextSource) return;

    let cancelled = false;
    void loadAndDecode(nextSource)
      .then(() => {
        if (!cancelled) setNextReadySrc(nextSource);
      })
      .catch(() => {
        if (!cancelled) setNextReadySrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [nextSource]);

  const requestAdvance = useCallback(() => {
    if (!next || nextIndex === null || phase !== "idle" || nextReadySrc !== nextSource) return;

    if (reducedMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    setIncomingIndex(nextIndex);
    setPhase("preparing");
  }, [next, nextIndex, nextReadySrc, nextSource, phase, reducedMotion]);

  useEffect(() => {
    if (!motionEnabled || phase !== "idle" || !next || nextReadySrc !== nextSource) return;
    const timer = window.setTimeout(requestAdvance, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, next, nextReadySrc, nextSource, phase, requestAdvance]);

  useEffect(() => {
    if (phase !== "preparing") return;
    preparationFrame.current = window.requestAnimationFrame(() => setPhase("transitioning"));
    return () => {
      if (preparationFrame.current !== null) window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [phase]);

  const commitTransition = useCallback(() => {
    if (phase !== "transitioning" || incomingIndex === null) return;
    setPhase("committing");
    setActiveIndex(incomingIndex);
    setIncomingIndex(null);
  }, [incomingIndex, phase]);

  useEffect(() => {
    if (phase !== "committing") return;
    preparationFrame.current = window.requestAnimationFrame(() => setPhase("idle"));
    return () => {
      if (preparationFrame.current !== null) window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [phase]);

  const onOutgoingTransitionEnd = useCallback((event: TransitionEvent<HTMLElement>) => {
    if (event.currentTarget !== event.target || event.propertyName !== "top") return;
    commitTransition();
  }, [commitTransition]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (x < -54 && Math.abs(x) > Math.abs(y) * 1.45) requestAdvance();
  }, [requestAdvance]);

  if (!active) return null;

  return (
    <section className={styles.stage} id="hero" ref={rootRef} aria-labelledby="hero-title">
      <div className={styles.copyField}>
        <div className={styles.copy}>
          <h1 id="hero-title">{"Arma\u00e7\u00f5es que d\u00e3o forma \u00e0 sua presen\u00e7a."}</h1>
          <p>{"Arma\u00e7\u00f5es nacionais e importadas, com lentes confeccionadas pela Vision em Aragua\u00edna."}</p>
          <div className={styles.actions}>
            <VisionButton ariaLabel={"Ver cat\u00e1logo da \u00d3tica Vision"} href={LINKS.catalog} icon={BookOpenText}>{"Cat\u00e1logo"}</VisionButton>
            <VisionButton ariaLabel={"Falar com a \u00d3tica Vision pelo WhatsApp"} external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
          </div>
        </div>
      </div>

      <div
        aria-label={"Sequ\u00eancia editorial da \u00d3tica Vision"}
        className={styles.visual}
        data-layout={layout}
        data-next-layout={nextLayout}
        data-state={phase}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="group"
      >
        <div className={styles.mediaField} data-vision-media-field>
          {incoming ? <HeroMedia ariaHidden className={styles.incoming} item={incoming} /> : null}
          <HeroMedia className={styles.active} item={active} key={`active-${active.id}`} onTransitionEnd={onOutgoingTransitionEnd} priority />
          <span className={styles.paperPlane} aria-hidden="true"><span className={styles.line} /></span>
        </div>
        <span className={styles.continuation} aria-hidden="true" />
      </div>
    </section>
  );
}

function HeroMedia({
  ariaHidden = false,
  className,
  item,
  onTransitionEnd,
  priority = false,
}: {
  ariaHidden?: boolean;
  className: string;
  item: WallMedia;
  onTransitionEnd?: (event: TransitionEvent<HTMLElement>) => void;
  priority?: boolean;
}) {
  return (
    <figure
      aria-hidden={ariaHidden || undefined}
      className={className}
      data-vision-media
      onTransitionEnd={onTransitionEnd}
      style={{
        "--desktop-object-position": item.desktopObjectPosition,
        "--desktop-media-scale": item.desktopScale,
        "--mobile-object-position": item.mobileObjectPosition,
        "--mobile-media-scale": item.mobileScale,
      } as CSSProperties}
    >
      <picture>
        {item.mobileSrc ? <source media="(max-width: 720px)" srcSet={item.mobileSrc} /> : null}
        <img
          alt={ariaHidden ? "" : item.alt}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          height={item.height}
          loading={priority ? "eager" : "lazy"}
          src={item.src}
          width={item.width}
        />
      </picture>
    </figure>
  );
}
