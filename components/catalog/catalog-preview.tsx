import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard } from "@/lib/catalog/types";

import { CatalogPreviewRail } from "./catalog-preview-rail";
import styles from "./catalog-preview.module.css";

export function CatalogPreview({ products }: { products: CatalogProductCard[] }) {
  const [featuredProduct, ...supportingProducts] = products;
  const descriptor = featuredProduct
    ? [
        featuredProduct.brand?.name ?? "Seleção Vision",
        featuredProduct.model,
        featuredProduct.color,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <section
      id="preview-catalogo"
      className={styles.section}
      aria-labelledby="catalog-preview-title"
      data-product-count={products.length}
      data-motion-reveal
      data-motion-variant="section"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Vitrine Vision</p>
            <h2 id="catalog-preview-title">A vitrine passa diante dos olhos.</h2>
          </div>
          <div className={styles.headerAside}>
            <p>Modelos publicados no catálogo, com caminho direto para consultar pelo WhatsApp.</p>
            <Link
              className={styles.cta}
              data-catalog-collection-link
              data-catalog-transition-link
              href="/catalogo"
            >
              Ver catálogo geral
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </header>

        {featuredProduct ? (
          <div className={styles.showcase} data-layout={products.length === 1 ? "protagonist" : products.length === 2 ? "diptych" : products.length === 3 ? "editorial" : "rail"}>
            <Link
              aria-label={`Ver ${featuredProduct.name}, código ${featuredProduct.sku}`}
              className={styles.feature}
              data-catalog-product-id={featuredProduct.id}
              data-catalog-transition-link
              href={`/catalogo/${featuredProduct.slug}`}
            >
              <span className={styles.featureMedia} data-catalog-feature-media data-catalog-transition-media>
                <Image
                  alt={featuredProduct.cover.altText}
                  blurDataURL={featuredProduct.cover.blurDataUrl ?? undefined}
                  fill
                  placeholder={featuredProduct.cover.blurDataUrl ? "blur" : "empty"}
                  sizes="(max-width: 720px) 92vw, (max-width: 1100px) 44vw, 520px"
                  src={catalogImageUrl(featuredProduct.cover, "home_preview")}
                  style={{ objectPosition: featuredProduct.cover.objectPosition }}
                  unoptimized
                />
              </span>
              <span className={styles.featureContent}>
                <span className={styles.featureMeta}>Destaque da vitrine</span>
                <span className={styles.featureTitle}>{featuredProduct.name}</span>
                {descriptor ? <span className={styles.featureDescriptor}>{descriptor}</span> : null}
                <span className={styles.featureAction}>
                  Abrir modelo
                  <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
                </span>
              </span>
            </Link>

            {supportingProducts.length ? (
              <div className={styles.railColumn}>
                <div className={styles.railHeader}>
                  <p>Em movimento</p>
                </div>
                <CatalogPreviewRail products={supportingProducts} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
