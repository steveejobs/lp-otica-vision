"use client";

/* eslint-disable @next/next/no-img-element -- isolated, removable visual prototype. */

import { BookOpenText, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ImageAsset } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { VisionButton } from "../vision-button";
import styles from "./passe-partout-vivo.module.css";

type Props = { media: readonly ImageAsset[] };

const HOLD_MS = 2_250;
const TRANSITION_MS = 1_260;
const layouts = ["centered", "right", "left"] as const;

const nextIndex = (index: number, length: number) => (index + 1) % length;

export function PassePartoutVivo({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeReady, setActiveReady] = useState(false);
  const [nextReady, setNextReady] = useState(media.length < 2);
  const [inViewport, setInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const active = media[activeIndex];
  const next = media[nextIndex(activeIndex, media.length)];
  const layout = layouts[activeIndex % layouts.length];
  const nextLayout = layouts[nextIndex(activeIndex, media.length) % layouts.length];
  const motionEnabled = media.length > 1 && activeReady && nextReady && inViewport && isVisible && !reducedMotion;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 },
    );
    const syncVisibility = () => setIsVisible(document.visibilityState === "visible");
    const syncReducedMotion = () => setReducedMotion(query.matches);

    observer.observe(root);
    syncVisibility();
    syncReducedMotion();
    document.addEventListener("visibilitychange", syncVisibility);
    query.addEventListener("change", syncReducedMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      query.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (!next || media.length < 2) return;

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) setNextReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setNextReady(false);
    };
    image.src = next.src;
    if (image.complete && image.naturalWidth > 0) window.setTimeout(() => {
      if (!cancelled) setNextReady(true);
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [media.length, next]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const image = new Image();
    const markReady = () => {
      if (!cancelled) setActiveReady(true);
    };

    image.addEventListener("load", markReady, { once: true });
    image.src = active.src;
    if (image.complete && image.naturalWidth > 0) window.setTimeout(markReady, 0);

    return () => {
      cancelled = true;
      image.removeEventListener("load", markReady);
    };
  }, [active]);

  useEffect(() => {
    if (!motionEnabled || transitioning) return;

    const timer = window.setTimeout(() => setTransitioning(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, transitioning]);

  useEffect(() => {
    if (!transitioning) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((index) => nextIndex(index, media.length));
      setActiveReady(false);
      setNextReady(false);
      setTransitioning(false);
    }, TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [media.length, transitioning]);

  const mediaLabel = useMemo(
    () => "Sequência visual editorial da Ótica Vision",
    [],
  );

  if (!active || !next) return null;

  return (
    <main className={styles.prototype} id="main-content">
      <section className={styles.stage} aria-labelledby="passe-partout-title" ref={rootRef}>
        <header className={styles.copyField}>
          <div className={styles.titleBlock}>
            <p>Armações e lentes · Araguaína - TO</p>
            <h1 id="passe-partout-title">Armações que dão forma à sua presença.</h1>
          </div>
          <div className={styles.actionBlock}>
            <p>Armações nacionais e importadas, com lentes confeccionadas pela Vision em Araguaína.</p>
            <div className={styles.actions}>
              <VisionButton ariaLabel="Ver catálogo da Ótica Vision" href={LINKS.catalog} icon={BookOpenText}>Catálogo</VisionButton>
              <VisionButton ariaLabel="Falar com a Ótica Vision pelo WhatsApp" external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
            </div>
          </div>
        </header>

        <div
          aria-label={mediaLabel}
          className={styles.mediaField}
          data-layout={layout}
          data-next-layout={nextLayout}
          data-transitioning={transitioning || undefined}
          role="group"
        >
          <span aria-hidden="true" className={styles.paperPlane} />
          <span aria-hidden="true" className={styles.metalPlane} />
          <span aria-hidden="true" className={styles.rule} />
          <MediaFrame className={styles.activeFrame} item={active} onLoad={() => setActiveReady(true)} priority />
          <MediaFrame ariaHidden className={styles.incomingFrame} item={next} />
        </div>
      </section>
    </main>
  );
}

function MediaFrame({
  ariaHidden = false,
  className,
  item,
  onLoad,
  priority = false,
}: {
  ariaHidden?: boolean;
  className: string;
  item: ImageAsset;
  onLoad?: () => void;
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
        onLoad={onLoad}
        src={item.src}
        style={{ objectPosition: item.objectPosition }}
        width={item.width}
      />
    </figure>
  );
}
