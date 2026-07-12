"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { ImageAsset } from "@/lib/assets";

import { SectionShell } from "./section-shell";
import styles from "./editorial-gallery.module.css";

type EditorialGalleryProps = {
  images: readonly ImageAsset[];
};

type DragStart = {
  pointerId: number;
  x: number;
  y: number;
};

function LensFocusGallery({ images }: EditorialGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStart = useRef<DragStart | null>(null);

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  const getPosition = (index: number) => {
    let distance = index - activeIndex;

    if (distance > images.length / 2) distance -= images.length;
    if (distance < -images.length / 2) distance += images.length;

    if (distance === -1) return "previous";
    if (distance === 0) return "active";
    if (distance === 1) return "next";
    return "resting";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;

    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;

    if (!start || start.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;

    if (Math.abs(distanceX) < 42 || Math.abs(distanceX) <= Math.abs(distanceY)) {
      return;
    }

    if (distanceX > 0) showPrevious();
    else showNext();
  };

  return (
    <div className={styles.gallery}>
      <div
        className={styles.viewport}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria editorial de óculos"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        {images.map((asset, index) => {
          const position = getPosition(index);

          return (
            <figure
              className={`${styles.card} ${styles[position]}`}
              aria-hidden={position !== "active"}
              key={asset.src}
            >
              {position !== "resting" ? (
                <Image
                  src={asset.src}
                  width={asset.width}
                  height={asset.height}
                  sizes="(max-width: 720px) 80vw, 430px"
                  alt={asset.alt}
                  draggable={false}
                  loading="lazy"
                  style={{ objectPosition: asset.objectPosition }}
                />
              ) : null}
            </figure>
          );
        })}
      </div>

      <div className={styles.controls} aria-label="Controles da galeria">
        <button type="button" onClick={showPrevious} aria-label="Imagem anterior">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.7} />
        </button>
        <p className={styles.counter} aria-live="polite" aria-atomic="true">
          {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </p>
        <button type="button" onClick={showNext} aria-label="Próxima imagem">
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

export function EditorialGallery({ images }: EditorialGalleryProps) {
  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      aria-labelledby="editorial-gallery-title"
    >
      <header className={styles.intro}>
        <h2 id="editorial-gallery-title">Escolhas que mudam o olhar.</h2>
        <p>Presença, formato e acabamento em uma seleção real da Vision.</p>
      </header>

      <LensFocusGallery images={images} />
    </SectionShell>
  );
}
