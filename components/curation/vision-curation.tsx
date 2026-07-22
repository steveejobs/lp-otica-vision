"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CurationSelection } from "@/lib/curation/types";

import styles from "./vision-curation.module.css";

type Props = {
  analytics?: boolean;
  demoBasePath?: string;
  initialSelection: CurationSelection;
  previewLabel?: string;
  productWhatsappUrls?: Readonly<Record<string, string>>;
};

export function VisionCuration({
  analytics = true,
  demoBasePath,
  initialSelection,
  previewLabel = "Vitrine Vision",
  productWhatsappUrls = {},
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const products = initialSelection.products.slice(0, 4);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInViewport(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const catalogHref = `${demoBasePath ? `${demoBasePath}/catalogo` : "/catalogo"}`;

  return (
    <section
      aria-labelledby="curation-title"
      className={styles.section}
      data-analytics-section={analytics ? "curation_viewed" : undefined}
      data-motion-reveal
      data-motion-variant="section"
      id="curadoria"
      ref={rootRef}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.intro}>
            <span className={styles.previewLabel}>{previewLabel}</span>
            <h2 id="curation-title">Modelos em Destaque</h2>
          </div>
          <div className={styles.headerAside}>
            <p className={styles.support}>
              Selecione um modelo para visualizar no catálogo ou consultar disponibilidade direta via WhatsApp em Araguaína - TO.
            </p>
            <Link
              className={styles.ctaHeader}
              data-catalog-collection-link
              data-catalog-transition-link
              href={catalogHref}
              onClick={() => {
                if (analytics) {
                  void trackCatalogEvent({
                    eventName: "catalog_opened",
                    metadata: { source_route: "/", style_slug: initialSelection.styleSlug },
                  });
                }
              }}
            >
              Ver catálogo completo
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </header>

        {/* COMPACT & UNIFORM 4-COLUMN DESKTOP / 2-COLUMN MOBILE GRID */}
        <div className={styles.grid} data-in-viewport={inViewport}>
          {products.map((product, index) => {
            const brandName = product.brand?.name ?? "Ótica Vision";
            const defaultWhatsappText = `Olá! Gostaria de consultar disponibilidade e detalhes do modelo ${product.name} (Ótica Vision Araguaína).`;
            const whatsappUrl =
              productWhatsappUrls[product.id] ??
              `https://api.whatsapp.com/send/?phone=5563992231522&text=${encodeURIComponent(
                defaultWhatsappText
              )}&type=phone_number&app_absent=0&utm_source=ig`;

            const productLink = demoBasePath
              ? `${demoBasePath}/produto/${product.slug}`
              : `/catalogo?produto=${product.slug}`;

            const imageSrc =
              product.fixture && product.fixtureImageSrc
                ? product.fixtureImageSrc
                : catalogImageUrl(product.cover, "home_preview");

            return (
              <article
                key={product.id}
                className={styles.card}
                style={{ "--card-index": index } as React.CSSProperties}
              >
                {/* Image shell with quick action overlay */}
                <div className={styles.mediaContainer}>
                  <Link
                    href={productLink}
                    className={styles.imageLink}
                    aria-label={`Ver ${product.name} no catálogo`}
                  >
                    <Image
                      alt={product.cover.altText || product.name}
                      fill
                      sizes="(max-width: 600px) 45vw, (max-width: 1024px) 45vw, 280px"
                      src={imageSrc}
                      style={{ objectPosition: product.cover.objectPosition }}
                      className={styles.productImage}
                      unoptimized
                    />
                  </Link>

                  {/* Quick Action Overlay inside image frame */}
                  <div className={styles.mediaActions}>
                    <Link href={productLink} className={styles.quickViewBtn} title="Ver no catálogo">
                      <Eye size={14} />
                      <span>Detalhes</span>
                    </Link>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.quickWhatsappBtn}
                      title="Consultar no WhatsApp"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Card Info & Immediate WhatsApp Button physically attached right underneath */}
                <div className={styles.cardBody}>
                  <div className={styles.metaGroup}>
                    <span className={styles.brandTag}>{brandName}</span>
                    <h3 className={styles.productTitle}>
                      <Link href={productLink}>{product.name}</Link>
                    </h3>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cardWhatsappCta}
                    aria-label={`Consultar ${product.name} no WhatsApp`}
                  >
                    <MessageCircle size={14} className={styles.waIcon} />
                    <span>Consultar no WhatsApp</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
