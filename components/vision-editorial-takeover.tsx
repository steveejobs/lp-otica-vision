"use client";

import { BookOpenText, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import type { HeroMedia } from "@/lib/gallery/hero";
import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type Props = { media: HeroMedia[] };
type StageStyle = CSSProperties & Record<`--${string}`, string | number>;

const HOLD_MS = 2_550;
const SETTLE_MS = 2_150;

export function VisionEditorialTakeover({ media }: Props) {
  const items = media.slice(0, 3);
  const rootRef = useRef<HTMLElement>(null);
  const firstImageRef = useRef<HTMLImageElement>(null);
  const [act, setAct] = useState(0);
  const [prepared, setPrepared] = useState(1);
  const [visible, setVisible] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [firstReady, setFirstReady] = useState(false);

  const markFirstReady = useCallback(() => setFirstReady(true), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    const onMotion = () => setReduced(query.matches);
    const observer = new IntersectionObserver(([entry]) => setInViewport(Boolean(entry?.isIntersecting)), { threshold: 0.08 });
    observer.observe(root);
    onVisibility(); onMotion(); setEnhanced(true);
    document.addEventListener("visibilitychange", onVisibility);
    query.addEventListener("change", onMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      query.removeEventListener("change", onMotion);
    };
  }, []);

  useEffect(() => {
    const image = firstImageRef.current;
    if (!image) return;
    const ready = () => {
      if (!image.complete || image.naturalWidth < 1) return;
      void image.decode?.().catch(() => undefined).finally(markFirstReady);
    };
    ready();
    image.addEventListener("load", ready);
    image.addEventListener("error", markFirstReady);
    return () => {
      image.removeEventListener("load", ready);
      image.removeEventListener("error", markFirstReady);
    };
  }, [markFirstReady]);

  useEffect(() => {
    if (!enhanced || !firstReady || reduced || items.length < 2) return;
    const second = window.setTimeout(() => setPrepared(2), 260);
    const third = window.setTimeout(() => setPrepared(3), 1_450);
    return () => { window.clearTimeout(second); window.clearTimeout(third); };
  }, [enhanced, firstReady, items.length, reduced]);

  useEffect(() => {
    if (!enhanced || !firstReady || reduced || !visible || !inViewport || items.length < 2 || act >= items.length) return;
    const delay = act === items.length - 1 ? SETTLE_MS : HOLD_MS;
    const timer = window.setTimeout(() => setAct((current) => Math.min(current + 1, items.length)), delay);
    return () => window.clearTimeout(timer);
  }, [act, enhanced, firstReady, inViewport, items.length, reduced, visible]);

  const style = items.reduce<StageStyle>((values, item, index) => {
    values[`--stage-bg-${index}`] = item.backgroundColor;
    return values;
  }, {});

  return (
    <section
      aria-labelledby="hero-title"
      className={styles.stage}
      data-act={reduced ? 0 : act}
      data-count={items.length}
      data-enhanced={enhanced}
      data-ready={firstReady}
      data-motion={reduced ? "reduced" : visible && inViewport ? "playing" : "paused"}
      id="hero"
      ref={rootRef}
      style={style}
    >
      <div className={styles.identity}><BrandLogo size="hero" /></div>
      <div aria-hidden="true" className={styles.folio}>VISION / CURADORIA / 01—03</div>

      <div aria-hidden="true" className={styles.photoField}>
        <span className={styles.registration}>01 / PROVA EDITORIAL</span>
        <div className={styles.photoStage}>
        {items.slice(0, prepared).map((item, index) => (
          <figure
            className={styles.page}
            data-index={index}
            key={item.id}
            style={{
              "--desktop-focus": item.desktopObjectPosition,
              "--desktop-scale": item.desktopScale,
              "--mobile-focus": item.mobileObjectPosition,
              "--mobile-scale": item.mobileScale,
              "--placeholder": item.backgroundColor,
            } as StageStyle}
          >
            <picture>
              <source media="(max-width: 720px)" sizes="78vw" srcSet={`/api/galerias/imagem/${item.id}?variant=mobile&v=${item.assetVersion} 800w`} />
              <img
                alt=""
                className={styles.photo}
                decoding={index === 0 ? "sync" : "async"}
                fetchPriority={index === 0 ? "high" : "auto"}
                height={item.height}
                loading={index === 0 ? "eager" : "lazy"}
                onError={index === 0 ? markFirstReady : undefined}
                onLoad={index === 0 ? markFirstReady : undefined}
                ref={index === 0 ? firstImageRef : undefined}
                sizes="(max-width: 720px) 78vw, (max-width: 1100px) 44vw, 31rem"
                src={`/api/galerias/imagem/${item.id}?variant=desktop&v=${item.assetVersion}`}
                srcSet={`/api/galerias/imagem/${item.id}?variant=desktop&v=${item.assetVersion} 1200w`}
                width={item.width}
              />
            </picture>
          </figure>
        ))}
        <span className={styles.pageEdge} />
        </div>
      </div>

      <div className={styles.copy}>
        <h1 className={styles.title} id="hero-title">
          <span>Seleção Vision.</span><span>Marcas com presença.</span>
        </h1>
        <div className={styles.actions}>
          <VisionButton ariaLabel="Ver catálogo da Ótica Vision" href={LINKS.catalog} icon={BookOpenText}>Catálogo</VisionButton>
          <VisionButton ariaLabel="Falar com a Ótica Vision pelo WhatsApp" external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
        </div>
      </div>

      <span aria-hidden="true" className={styles.transitionRail} />
      <p className={styles.visualDescription}>{items.map((item) => item.altText).join(". ") || "Curadoria Ótica Vision."}</p>
    </section>
  );
}
