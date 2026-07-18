"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { ImageAsset, VideoAsset } from "@/lib/assets";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard } from "@/lib/catalog/types";
import { LINKS } from "@/lib/links";

import styles from "./focus-chamber.module.css";

type SelectionItem = {
  alt: string;
  descriptor: string;
  href: string;
  imageHeight: number;
  imageWidth: number;
  label: string;
  objectPosition: string;
  src: string;
};

type FocusChamberProps = {
  catalogProducts: CatalogProductCard[];
  hero: ImageAsset;
  selectionFallback: readonly ImageAsset[];
  video: VideoAsset;
};

const phaseNames = [
  "Expectativa",
  "Revelação",
  "Profundidade",
  "Transformação",
] as const;

const segment = (value: number, start: number, end: number) =>
  Math.min(1, Math.max(0, (value - start) / (end - start)));

export function FocusChamber({
  catalogProducts,
  hero,
  selectionFallback,
  video,
}: FocusChamberProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const chamberRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const selection = useMemo<SelectionItem[]>(() => {
    if (catalogProducts.length) {
      return catalogProducts.map((product) => ({
        alt: product.cover.altText,
        descriptor: [product.brand?.name, product.model, product.color]
          .filter(Boolean)
          .join(" · "),
        href: `/catalogo/${product.slug}`,
        imageHeight: product.cover.height,
        imageWidth: product.cover.width,
        label: product.name,
        objectPosition: product.cover.objectPosition,
        src: catalogImageUrl(product.cover, "home_preview"),
      }));
    }

    return selectionFallback.map((media, index) => ({
      alt: media.alt,
      descriptor: "Mídia real · composição de prova",
      href: "/catalogo",
      imageHeight: media.height,
      imageWidth: media.width,
      label: `Plano experimental ${String(index + 1).padStart(2, "0")}`,
      objectPosition: media.objectPosition,
      src: media.src,
    }));
  }, [catalogProducts, selectionFallback]);

  useEffect(() => {
    const root = rootRef.current;
    const chamber = chamberRef.current;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || !chamber || motionQuery.matches) {
      root?.setAttribute("data-reduced", "true");
      return;
    }

    root.setAttribute("data-enhanced", "true");
    let frame = 0;
    let currentPhase = -1;
    let videoReady = false;
    const videoElement = videoRef.current;
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };

    const update = () => {
      frame = 0;
      const rect = chamber.getBoundingClientRect();
      const travel = Math.max(1, chamber.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const reveal = segment(progress, 0.12, 0.39);
      const depth = segment(progress, 0.34, 0.66);
      const transform = segment(progress, 0.62, 0.91);
      const phase =
        progress < 0.22 ? 0 : progress < 0.48 ? 1 : progress < 0.72 ? 2 : 3;

      root.style.setProperty("--fc-progress", progress.toFixed(4));
      root.style.setProperty("--fc-reveal", reveal.toFixed(4));
      root.style.setProperty("--fc-depth", depth.toFixed(4));
      root.style.setProperty("--fc-transform", transform.toFixed(4));

      if (phase !== currentPhase) {
        currentPhase = phase;
        root.setAttribute("data-phase", String(phase + 1));
        const liveRegion = root.querySelector<HTMLElement>("[data-phase-live]");
        if (liveRegion) liveRegion.textContent = phaseNames[phase];
      }

      if (
        videoElement &&
        !videoReady &&
        progress > 0.2 &&
        !connection.connection?.saveData
      ) {
        videoReady = true;
        videoElement.src = videoElement.dataset.src ?? "";
        videoElement.load();
      }

      if (videoElement && videoReady) {
        const shouldPlay =
          progress > 0.22 && progress < 0.76 && !document.hidden;
        if (shouldPlay && videoElement.paused)
          void videoElement.play().catch(() => undefined);
        if (!shouldPlay && !videoElement.paused) videoElement.pause();
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onVisibility = () => schedule();

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
  }, []);

  return (
    <div className={styles.root} ref={rootRef} data-focus-root>
      <noscript>
        <style>{`
          [data-focus-chamber] { height: auto !important; min-height: 100svh; }
          [data-focus-scene] { position: relative !important; top: auto !important; height: auto !important; min-height: 100svh; }
          [data-static-selection] { display: grid !important; }
          [data-selection-stage] { display: none !important; }
        `}</style>
      </noscript>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          href="/"
          prefetch={false}
          aria-label="Ótica Vision - voltar ao site"
        >
          <Image
            alt="Ótica Vision"
            height={116}
            priority
            src="/media/identity/logo%20sem%20fundo.png"
            width={383}
          />
          <span>Araguaína · TO</span>
        </Link>
        <nav className={styles.actions} aria-label="Ações principais">
          <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">
            <MessageCircle aria-hidden="true" size={17} strokeWidth={1.8} />
            WhatsApp
          </a>
          <Link href="/catalogo" prefetch={false}>
            Catálogo
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section
          className={styles.chamber}
          ref={chamberRef}
          aria-labelledby="focus-chamber-title"
          data-focus-chamber
        >
          <div className={styles.scene} data-focus-scene>
            <div className={styles.field} aria-hidden="true" />

            <div className={styles.titleBack} aria-hidden="true">
              <span>O foco</span>
              <span>ganha</span>
              <span>matéria.</span>
            </div>

            <div className={styles.portraitAssembly} aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div
                  className={styles.portraitSlice}
                  data-slice={index + 1}
                  key={index}
                >
                  <Image
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 760px) 82vw, 40vw"
                    src={hero.src}
                    style={{ objectPosition: hero.objectPosition }}
                  />
                </div>
              ))}
            </div>

            <div className={styles.focusRail} aria-hidden="true">
              <div className={styles.focusImage} />
              <div className={styles.focusCalibration}>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className={styles.videoPlane} aria-hidden="true">
              <video
                data-src={video.src}
                loop
                muted
                playsInline
                poster={video.poster}
                preload="none"
                ref={videoRef}
              />
            </div>

            <div className={styles.glassPlane} aria-hidden="true" />

            <h1
              aria-label="O foco ganha matéria."
              className={styles.titleFront}
              id="focus-chamber-title"
            >
              <span>O foco</span>
              <span>ganha</span>
              <span>matéria.</span>
            </h1>

            <p className={styles.proposition}>
              Armações e lentes · Ótica Vision
            </p>

            <div className={styles.selectionStage} data-selection-stage>
              <div className={styles.selectionHeading}>
                <p>
                  {catalogProducts.length
                    ? "Seleção publicada"
                    : "Seleção experimental"}
                </p>
                <h2>Da imagem para a escolha.</h2>
              </div>
              <div className={styles.selectionTrack}>
                {selection.map((item, index) => (
                  <Link
                    className={styles.selectionItem}
                    href={item.href}
                    key={`${item.src}-${index}`}
                    prefetch={false}
                  >
                    <span className={styles.selectionMedia}>
                      <Image
                        alt={item.alt}
                        fill
                        sizes="(max-width: 760px) 74vw, 32vw"
                        src={item.src}
                        style={{ objectPosition: item.objectPosition }}
                        unoptimized={item.src.startsWith("/api/")}
                      />
                    </span>
                    <span className={styles.selectionCopy}>
                      <span>{item.label}</span>
                      <small>{item.descriptor}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.phaseIndex} aria-hidden="true">
              {phaseNames.map((name, index) => (
                <span data-index={index + 1} key={name}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
            <p className={styles.phaseLive} aria-live="polite" data-phase-live>
              Expectativa
            </p>

            <div className={styles.scrollCue} aria-hidden="true">
              <ArrowDown size={16} strokeWidth={1.6} />
              <span>Atravessar</span>
            </div>
          </div>
        </section>

        <section
          className={styles.staticSelection}
          aria-labelledby="static-selection-title"
          data-static-selection
        >
          <div>
            <p>
              {catalogProducts.length
                ? "Seleção publicada"
                : "Seleção experimental"}
            </p>
            <h2 id="static-selection-title">Da imagem para a escolha.</h2>
          </div>
          <div className={styles.staticTrack}>
            {selection.map((item, index) => (
              <Link
                href={item.href}
                key={`static-${item.src}-${index}`}
                prefetch={false}
              >
                <span
                  aria-label={item.alt}
                  className={styles.staticMedia}
                  role="img"
                  style={{
                    backgroundImage: `url("${item.src}")`,
                    backgroundPosition: item.objectPosition,
                  }}
                />
                <strong>{item.label}</strong>
                <small>{item.descriptor}</small>
              </Link>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <p>Ótica Vision · Araguaína - TO</p>
          <div>
            <Link href="/catalogo" prefetch={false}>
              Abrir catálogo
            </Link>
            <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">
              Falar no WhatsApp
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
