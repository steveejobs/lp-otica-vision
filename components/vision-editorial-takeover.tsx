"use client";

/* eslint-disable @next/next/no-img-element -- temporary direct local art-direction study; source dimensions are explicit. */

import { BookOpenText, MessageCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type WallMedia = {
  alt: string;
  height: number;
  id: string;
  objectPosition: string;
  src: string;
  width: number;
};

type Props = { media: readonly WallMedia[] };

const HOLD_MS = 2_650;
const TRANSITION_MS = 1_080;

function atIndex(index: number, length: number) {
  return (index + length) % length;
}

export function VisionEditorialTakeover({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inViewport, setInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const count = media.length;
  const active = media[activeIndex];
  const previous = media[atIndex(activeIndex - 1, count)];
  const next = media[atIndex(activeIndex + 1, count)];
  const motionEnabled = count > 1 && inViewport && isVisible && !reducedMotion;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    );
    const syncVisibility = () => setIsVisible(document.visibilityState === "visible");
    const syncMotion = () => setReducedMotion(motionQuery.matches);

    observer.observe(root);
    syncVisibility();
    syncMotion();
    document.addEventListener("visibilitychange", syncVisibility);
    motionQuery.addEventListener("change", syncMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      motionQuery.removeEventListener("change", syncMotion);
    };
  }, []);

  const advance = useCallback(() => {
    if (!motionEnabled || transitioning) return;
    setTransitioning(true);
  }, [motionEnabled, transitioning]);

  useEffect(() => {
    if (!motionEnabled || transitioning) return;
    const timer = window.setTimeout(advance, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [advance, motionEnabled, transitioning]);

  useEffect(() => {
    if (!transitioning) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => atIndex(index + 1, count));
      setTransitioning(false);
    }, TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [count, transitioning]);

  const requestNext = useCallback(() => {
    if (transitioning || count < 2) return;
    setTransitioning(true);
  }, [count, transitioning]);

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
    if (x < -54 && Math.abs(x) > Math.abs(y) * 1.45) requestNext();
  }, [requestNext]);

  if (!active || !previous || !next) return null;

  return (
    <section className={styles.stage} id="hero" ref={rootRef} aria-labelledby="hero-title">
      <div className={styles.copyField}>
        <div className={styles.copy}>
          <h1 id="hero-title">Armações que dão forma à sua presença.</h1>
          <p>Armações nacionais e importadas, com lentes confeccionadas pela Vision em Araguaína.</p>
          <div className={styles.actions}>
            <VisionButton ariaLabel="Ver catálogo da Ótica Vision" href={LINKS.catalog} icon={BookOpenText}>Catálogo</VisionButton>
            <VisionButton ariaLabel="Falar com a Ótica Vision pelo WhatsApp" external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
          </div>
        </div>
      </div>

      <div
        aria-label="Sequência editorial da Ótica Vision"
        className={styles.wall}
        data-transitioning={transitioning || undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="group"
      >
        <WallImage className={styles.active} item={active} priority />
        <WallImage ariaHidden className={`${styles.blade} ${styles.previousBlade}`} item={previous} />
        <WallImage ariaHidden className={`${styles.blade} ${styles.nextBlade}`} item={next} />
        <WallImage ariaHidden className={styles.incoming} item={next} />
      </div>
    </section>
  );
}

function WallImage({
  ariaHidden = false,
  className,
  item,
  priority = false,
}: {
  ariaHidden?: boolean;
  className: string;
  item: WallMedia;
  priority?: boolean;
}) {
  return (
    <figure aria-hidden={ariaHidden || undefined} className={className}>
      <img
        alt={ariaHidden ? "" : item.alt}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        height={item.height}
        loading={priority ? "eager" : "lazy"}
        src={item.src}
        style={{ objectPosition: item.objectPosition }}
        width={item.width}
      />
    </figure>
  );
}
