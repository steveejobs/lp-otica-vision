import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import type { CatalogProductCard } from "@/lib/catalog/types";
import { catalogImageUrl } from "@/lib/catalog/image-url";

import { CatalogPreviewRail } from "./catalog-preview-rail";
import styles from "./catalog-preview.module.css";

export function CatalogPreview({ products }: { products: CatalogProductCard[] }) {
  if (!products.length) return null;
  const [featuredProduct, ...supportingProducts] = products;
  const descriptor = [
    featuredProduct.brand?.name ?? "Seleção Vision",
    featuredProduct.model,
    featuredProduct.color,
  ].filter(Boolean).join(" · ");

  return (
    <section className={styles.section} aria-labelledby="catalog-preview-title">
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Catálogo Vision</p>
            <h2 id="catalog-preview-title">Óculos em foco.</h2>
          </div>
          <div className={styles.headerAside}>
            <p>Uma prévia dos modelos publicados no catálogo Vision.</p>
            <Link className={styles.cta} href="/catalogo">
              Ver catálogo
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </header>

        <div className={styles.showcase}>
          <Link
            aria-label={`Ver ${featuredProduct.name}, código ${featuredProduct.sku}`}
            className={styles.feature}
            href={`/catalogo/${featuredProduct.slug}`}
          >
            <span className={styles.featureMedia}>
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
              <span className={styles.featureMeta}>No catálogo</span>
              <span className={styles.featureTitle}>{featuredProduct.name}</span>
              {descriptor ? <span className={styles.featureDescriptor}>{descriptor}</span> : null}
              <span className={styles.featureAction}>
                Ver modelo
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
              </span>
            </span>
          </Link>

          {supportingProducts.length ? (
            <div className={styles.railColumn}>
              <div className={styles.railHeader}>
                <p>Mais modelos</p>
              </div>
              <CatalogPreviewRail products={supportingProducts} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
