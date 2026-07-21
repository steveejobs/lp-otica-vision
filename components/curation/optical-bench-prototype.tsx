"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useEffect, useId, useState } from "react";

import {
  type OpticalBenchProduct,
  opticalBenchWhatsapp,
} from "@/app/preview/curadoria/prototype-data";

import styles from "./optical-bench-prototype.module.css";

type BenchStyle = CSSProperties & { "--bench-count": number; "--bench-index": number };
type ImageStyle = CSSProperties & { "--native-width": string };

export function OpticalPreviewMotionScope() {
  useEffect(() => {
    document.documentElement.dataset.opticalPreview = "true";
    return () => { delete document.documentElement.dataset.opticalPreview; };
  }, []);

  return null;
}

export function OpticalBenchPrototype({ products }: { products: readonly OpticalBenchProduct[] }) {
  const titleId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionKey, setMotionKey] = useState(0);
  const activeProduct = products[activeIndex] ?? null;

  function focusProduct(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setMotionKey((current) => current + 1);
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!products.length || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? products.length - 1
        : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + products.length) % products.length;
    focusProduct(nextIndex);
    document.getElementById(`bench-choice-${products[nextIndex].id}`)?.focus();
  }

  return (
    <section aria-labelledby={titleId} className={styles.section} data-optical-bench-prototype>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <p>Preview isolado · bancada de prova</p>
            <h1 id={titleId}>A escolha ganha contorno.</h1>
            <span>Linhas, proporções e acabamentos reunidos pela Vision.</span>
          </div>
          <div className={styles.brandSignature}>
            <span>Marca em observação</span>
            <Image alt="Versace" height={659} priority src="/media/brands/versace-logo.png" width={1280} />
            <small>{String(products.length).padStart(2, "0")} modelos publicados</small>
          </div>
        </header>

        {activeProduct ? (
          <div
            className={styles.bench}
            data-catalog-product-id={activeProduct.id}
            style={{ "--bench-count": products.length, "--bench-index": activeIndex } as BenchStyle}
          >
            <div className={styles.observationField} data-catalog-transition-media>
              <span aria-hidden="true" className={styles.fieldNumber}>
                {String(activeIndex + 1).padStart(2, "0")}<i />{String(products.length).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className={styles.fieldCorners} />
              {products.map((product, index) => (
                <span
                  aria-hidden={index !== activeIndex}
                  className={styles.productLayer}
                  data-active={index === activeIndex || undefined}
                  key={product.id}
                >
                  <Image
                    alt={index === activeIndex ? product.alt : ""}
                    height={product.height}
                    priority
                    sizes="(max-width: 720px) 88vw, 62vw"
                    src={product.imageSrc}
                    style={{ "--native-width": `${product.width}px` } as ImageStyle}
                    unoptimized
                    width={product.width}
                  />
                </span>
              ))}
              <span aria-hidden="true" className={styles.calibrationSweep} key={`${activeProduct.id}-${motionKey}`} />
            </div>

            <div className={styles.readout}>
              <p>Versace · Clássica</p>
              <div className={styles.readoutTitle}>
                <h2>{activeProduct.name}</h2>
                <span>{activeProduct.sku}</span>
              </div>
              <div className={styles.actions} data-bench-actions>
                <Link
                  data-catalog-product-id={activeProduct.id}
                  data-catalog-transition-link
                  href={`/preview/curadoria/produto/${activeProduct.slug}`}
                  scroll={false}
                >
                  Observar em detalhe
                  <ArrowUpRight aria-hidden="true" size={17} />
                </Link>
                <a href={opticalBenchWhatsapp(activeProduct)} rel="noreferrer" target="_blank">
                  <MessageCircle aria-hidden="true" size={17} />
                  Consultar pelo WhatsApp
                </a>
              </div>
            </div>

            <div aria-label="Selecionar armação" className={styles.selectorRail} data-bench-selector role="group">
              <span aria-hidden="true" className={styles.focusCarriage} />
              {products.map((product, index) => (
                <button
                  aria-pressed={index === activeIndex}
                  id={`bench-choice-${product.id}`}
                  key={product.id}
                  onClick={() => focusProduct(index)}
                  onKeyDown={(event) => moveFocus(event, index)}
                  type="button"
                >
                  <span className={styles.choiceIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.choiceMedia}>
                    <Image alt="" height={product.height} sizes="(max-width: 720px) 80vw, 20vw" src={product.imageSrc} unoptimized width={product.width} />
                  </span>
                  <span className={styles.choiceName}>{product.name}</span>
                  <span aria-hidden="true" className={styles.choiceMark} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">00</span>
            <div>
              <p>Versace · seleção atual</p>
              <h2>Nenhum modelo publicado nesta seleção.</h2>
            </div>
          </div>
        )}

        <footer className={styles.statusLine}>
          <span>Clássica {String(products.length).padStart(2, "0")}</span>
          <span aria-disabled="true">Marcante 00</span>
          <span aria-disabled="true">Contemporânea 00</span>
          <span aria-disabled="true">Esportiva 00</span>
        </footer>
      </div>
    </section>
  );
}
