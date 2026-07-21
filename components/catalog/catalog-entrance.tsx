import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import styles from "./catalog-entrance.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

const INTRO_PLAYED_KEY = "vision:catalog-intro-played";

export function CatalogEntrance({
  products,
}: {
  products: CatalogProductCardData[];
}) {
  const [introPlayed, setIntroPlayed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion || window.sessionStorage.getItem(INTRO_PLAYED_KEY) === "true") {
        setIntroPlayed(true);
        return;
      }
      
      setIntroPlayed(false);
      
      const timer = window.setTimeout(() => {
        window.sessionStorage.setItem(INTRO_PLAYED_KEY, "true");
        setIntroPlayed(true);
      }, 3500); // Intro animation duration

      return () => window.clearTimeout(timer);
    } catch {
      setIntroPlayed(true);
    }
  }, []);

  if (products.length === 0) return null;

  return (
    <section 
      aria-label="Modelos em Destaque"
      className={styles.entrance} 
      data-intro-played={introPlayed ? "true" : "false"}
      ref={containerRef}
    >
      <div className={styles.introOverlay} aria-hidden="true">
        <div className={styles.introLine} />
        <span className={styles.introTitle}>Vitrine Vision</span>
      </div>

      <div className={styles.heroContainer}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">Catálogo Vision</p>
          <h1 id="catalog-title">Uma seleção para olhar de perto.</h1>
          <p className={styles.intro}>
            Explore a seleção Vision e consulte os detalhes pelo WhatsApp.
          </p>
        </div>
        
        <div className={styles.grid} data-count={Math.min(products.length, 6)}>
          {products.map((product, index) => (
            <Link 
              key={product.id} 
              href={`/catalogo/${product.slug}`} 
              className={styles.card}
              data-index={index}
              style={{ "--index": index } as React.CSSProperties}
            >
              <div className={styles.imageWrapper}>
                <Image
                  alt={product.cover.altText}
                  blurDataURL={product.cover.blurDataUrl ?? blurDataUrl}
                  fill
                  placeholder="blur"
                  priority={index === 0}
                  sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  src={catalogImageUrl(product.cover, "catalog_card")}
                  style={{ objectPosition: product.cover.objectPosition }}
                  unoptimized
                />
              </div>
              <div className={styles.caption}>
                <span className={styles.brand}>{product.brand?.name ?? "Seleção Vision"}</span>
                <strong className={styles.name}>{product.name}</strong>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
