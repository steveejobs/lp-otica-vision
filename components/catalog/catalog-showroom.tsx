"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import { availabilityLabels, formatCatalogPrice } from "@/lib/catalog/format";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import styles from "./catalog-showroom.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

const ACTIVE_PRODUCT_KEY = "vision:catalog-showroom-active";

type ShowroomItem = {
  href: string;
  product: CatalogProductCardData;
};

function descriptor(product: CatalogProductCardData) {
  return [product.model, product.color].filter(Boolean).join(" · ");
}

export function CatalogShowroom({
  items,
}: {
  items: ShowroomItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageVisible, setStageVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<number | null>(null);
  const focusedProductsRef = useRef(new Set<string>());
  const active = items[activeIndex] ?? items[0];

  const selectProduct = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    setActiveIndex(nextIndex);
    try {
      const nextProduct = items[nextIndex]?.product;
      if (nextProduct) window.sessionStorage.setItem(ACTIVE_PRODUCT_KEY, nextProduct.id);
    } catch {}
  }, [items]);

  useEffect(() => {
    let timer = 0;
    try {
      const storedId = window.sessionStorage.getItem(ACTIVE_PRODUCT_KEY);
      const storedIndex = items.findIndex((item) => item.product.id === storedId);
      if (storedIndex > 0) {
        timer = window.setTimeout(() => setActiveIndex(storedIndex), 0);
      }
    } catch {}
    return () => window.clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = [...root.querySelectorAll<HTMLElement>("[data-showroom-enter]")];
    let animations: Animation[] = [];
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      animations = targets.map((target, index) => target.animate(
        [
          { clipPath: "inset(7% 0 0 0)", opacity: 0, transform: "translate3d(0, 26px, 0) scale(.992)" },
          { clipPath: "inset(0)", opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          delay: Math.min(index, 7) * 72,
          duration: 680,
          easing: "cubic-bezier(.22,.72,.18,1)",
          fill: "both",
        },
      ));
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: .12 });
    observer.observe(root);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      setStageVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= .6));
    }, { threshold: [.6] });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stageVisible || !active) return;
    const id = active.product.id;
    if (focusedProductsRef.current.has(id)) return;
    const timer = window.setTimeout(() => {
      focusedProductsRef.current.add(id);
      void trackCatalogEvent({
        eventName: "product_focused",
        metadata: {
          brand_slug: active.product.brand?.slug,
          product_name: active.product.name,
          product_slug: active.product.slug,
          source_route: "/catalogo",
        },
        productId: id,
      });
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [active, stageVisible]);

  useEffect(() => {
    const caption = captionRef.current;
    if (!caption || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = caption.animate(
      [
        { opacity: .35, transform: "translate3d(0, 10px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 460, easing: "cubic-bezier(.22,.72,.18,1)" },
    );
    return () => animation.cancel();
  }, [activeIndex]);

  if (!active) return null;

  const price = formatCatalogPrice(active.product.price, active.product.priceVisibility);
  const activeDescriptor = descriptor(active.product);

  return (
    <div className={styles.showroom} data-catalog-results-grid ref={rootRef}>
      <div
        className={styles.stage}
        data-catalog-product-brand={active.product.brand?.slug}
        data-catalog-product-id={active.product.id}
        data-catalog-product-name={active.product.name}
        data-catalog-product-slug={active.product.slug}
        data-showroom-enter
      >
        <div className={styles.stageTopline}>
          <span>Seleção atual</span>
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        </div>
        <div
          className={styles.media}
          data-catalog-transition-media
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              selectProduct(activeIndex - 1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              selectProduct(activeIndex + 1);
            }
          }}
          onPointerCancel={() => { pointerStartRef.current = null; }}
          onPointerDown={(event) => { pointerStartRef.current = event.clientX; }}
          onPointerUp={(event) => {
            const start = pointerStartRef.current;
            pointerStartRef.current = null;
            if (start === null || Math.abs(event.clientX - start) < 48) return;
            selectProduct(activeIndex + (event.clientX < start ? 1 : -1));
          }}
          ref={stageRef}
          role="region"
          tabIndex={0}
          aria-label={`Modelo em destaque: ${active.product.name}`}
        >
          {items.map((item, index) => (
            <Image
              alt={item.product.cover.altText}
              aria-hidden={index !== activeIndex}
              blurDataURL={item.product.cover.blurDataUrl ?? blurDataUrl}
              className={styles.productImage}
              data-active={index === activeIndex || undefined}
              fill
              key={item.product.id}
              loading={index === 0 ? "eager" : "lazy"}
              placeholder="blur"
              priority={index === 0}
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 60vw, 66vw"
              src={catalogImageUrl(item.product.cover, "catalog_card")}
              style={{ objectPosition: item.product.cover.objectPosition }}
              unoptimized
            />
          ))}
        </div>

        <div className={styles.caption} ref={captionRef}>
          <div>
            <p className={styles.brand}>{active.product.brand?.name ?? "Seleção Vision"}</p>
            <h3>{active.product.name}</h3>
            {activeDescriptor ? <p className={styles.descriptor}>{activeDescriptor}</p> : null}
          </div>
          <div className={styles.commercial} data-availability={active.product.availability}>
            <strong>{price ?? "Sob consulta"}</strong>
            <span><i aria-hidden="true" />{availabilityLabels[active.product.availability]}</span>
          </div>
          <Link
            aria-label={`Ver detalhes de ${active.product.name}`}
            className={styles.detailLink}
            data-catalog-transition-link
            href={active.href}
          >
            Ver detalhes
            <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.6} />
          </Link>
        </div>
      </div>

      <div className={styles.index} data-showroom-enter>
        <div className={styles.indexHeading}>
          <p>Modelos nesta edição</p>
          <div className={styles.controls}>
            <button
              aria-label="Modelo anterior"
              disabled={activeIndex === 0}
              onClick={() => selectProduct(activeIndex - 1)}
              type="button"
            ><ArrowLeft aria-hidden="true" size={16} /></button>
            <button
              aria-label="Próximo modelo"
              disabled={activeIndex === items.length - 1}
              onClick={() => selectProduct(activeIndex + 1)}
              type="button"
            ><ArrowRight aria-hidden="true" size={16} /></button>
          </div>
        </div>
        <ol>
          {items.map((item, index) => (
            <li data-showroom-enter key={item.product.id}>
              <button
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => selectProduct(index)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.product.name}</strong>
                <small>{descriptor(item.product) || item.product.brand?.name || "Seleção Vision"}</small>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.note}>Catálogo para consulta. Fale com a Vision para confirmar os detalhes.</p>
      </div>
    </div>
  );
}
