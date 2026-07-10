"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ImageAsset } from "@/lib/assets";

import { VisionButton } from "./vision-button";
import styles from "./editorial-gallery.module.css";

type Position = "active" | "previous" | "next" | "hidden";

type EditorialGalleryProps = {
  images: readonly ImageAsset[];
};

export function EditorialGallery({ images }: EditorialGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);

  const previous = () => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const next = () => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.12 },
    );
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || !inView || reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [images.length, inView, paused]);

  const positionFor = (index: number): Position => {
    if (index === activeIndex) return "active";
    if (index === (activeIndex - 1 + images.length) % images.length) return "previous";
    if (index === (activeIndex + 1) % images.length) return "next";
    return "hidden";
  };

  return (
    <section className={styles.section} aria-labelledby="gallery-title" data-reveal>
      <div className="vision-container">
        <header className={styles.intro}>
          <p className="eyebrow">Ótica Vision</p>
          <h2 id="gallery-title">Escolhas que mudam o olhar.</h2>
          <p>Presença, formato e acabamento em uma seleção real da Vision.</p>
        </header>

        <div
          ref={galleryRef}
          className={styles.gallery}
          role="region"
          aria-roledescription="carrossel"
          aria-label="Seleção editorial de armações"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          onPointerDown={(event) => {
            pointerStart.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return;
            const distance = event.clientX - pointerStart.current;
            pointerStart.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            if (Math.abs(distance) < 42) return;
            if (distance > 0) previous();
            else next();
          }}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          {images.map((image, index) => {
            const position = positionFor(index);
            const isInteractive = position === "previous" || position === "next";

            return (
              <button
                className={styles.slide}
                data-position={position}
                type="button"
                key={image.src}
                onClick={() => {
                  if (isInteractive) setActiveIndex(index);
                }}
                tabIndex={isInteractive ? 0 : -1}
                aria-label={isInteractive ? `Mostrar imagem ${index + 1}` : undefined}
                aria-hidden={position === "hidden"}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 720px) 78vw, 410px"
                  loading={index === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              </button>
            );
          })}
        </div>

        <div className={styles.controls}>
          <VisionButton
            icon={ChevronLeft}
            variant="icon"
            ariaLabel="Imagem anterior"
            onClick={previous}
          />
          <p aria-live={paused ? "polite" : "off"} aria-atomic="true">
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span aria-hidden="true"> / </span>
            <span>{String(images.length).padStart(2, "0")}</span>
          </p>
          <VisionButton
            icon={ChevronRight}
            variant="icon"
            ariaLabel="Próxima imagem"
            onClick={next}
          />
        </div>
      </div>
    </section>
  );
}
