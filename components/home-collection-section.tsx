import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";

import type { PublishedHomeCollection } from "@/lib/collections/home";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import { LINKS } from "@/lib/links";

import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./home-collection-section.module.css";

function destination(collection: PublishedHomeCollection) {
  if (collection.cta.target === "catalog") return { external: false, href: "/catalogo" };
  if (collection.cta.target === "instagram") return { external: true, href: LINKS.instagram };
  if (collection.cta.target === "whatsapp") return { external: true, href: LINKS.whatsapp };
  return { external: false, href: `/catalogo?colecao=${encodeURIComponent(collection.slug)}` };
}

function coverUrl(publicationId: string, assetVersion: string, variant: "desktop" | "mobile") {
  return `/api/colecoes/imagem/${publicationId}?variant=${variant}&v=${assetVersion}`;
}

export function HomeCollectionSection({ collection, previewCoverUrl }: { collection: PublishedHomeCollection; previewCoverUrl?: string | null }) {
  const target = destination(collection);
  const primary = collection.products[0];
  const cover = collection.cover;
  const titleId = "colecao-em-destaque-title";

  return (
    <SectionShell id="colecao-em-destaque" className={styles.section} innerClassName={styles.inner} aria-labelledby={titleId}>
      <header className={styles.copy}>
        <p className="eyebrow">Seleção Vision</p>
        <h2 id={titleId}>{collection.title}</h2>
        <p>{collection.description}</p>
        <VisionButton href={target.href} external={target.external} icon={collection.cta.target === "whatsapp" ? MessageCircle : ArrowUpRight}>
          {collection.cta.label}
        </VisionButton>
      </header>

      <div className={`${styles.stage} ${styles[collection.variant]}`} data-motion-reveal data-motion-variant="section">
        {cover ? (
          <figure
            className={styles.cover}
            style={{
              "--cover-desktop-focus": cover.desktopObjectPosition,
              "--cover-desktop-scale": cover.desktopScale,
              "--cover-mobile-focus": cover.mobileObjectPosition,
              "--cover-mobile-scale": cover.mobileScale,
            } as CSSProperties}
          >
            <picture>
              <source media="(max-width: 720px)" srcSet={previewCoverUrl ?? coverUrl(cover.publicationId, cover.assetVersion, "mobile")} />
              <img
                alt={cover.altText}
                height={cover.height}
                loading="lazy"
                src={previewCoverUrl ?? coverUrl(cover.publicationId, cover.assetVersion, "desktop")}
                width={cover.width}
              />
            </picture>
          </figure>
        ) : null}
        {primary ? (
          <Link className={styles.product} href={`/catalogo/${primary.slug}`} data-catalog-product-id={primary.id} data-catalog-transition-link>
            <span className={styles.productMedia} data-catalog-transition-media>
              <Image
                alt={primary.cover.altText}
                blurDataURL={primary.cover.blurDataUrl ?? undefined}
                fill
                placeholder={primary.cover.blurDataUrl ? "blur" : "empty"}
                sizes="(max-width: 720px) 70vw, 360px"
                src={catalogImageUrl(primary.cover, "home_preview")}
                style={{ objectPosition: primary.cover.objectPosition }}
                unoptimized
              />
            </span>
            <span>{primary.name}</span>
          </Link>
        ) : null}
        {collection.variant === "product-rail" && collection.products.length > 1 ? (
          <div className={styles.rail} aria-label="Produtos da coleção">
            {collection.products.slice(1, 6).map((product) => (
              <Link href={`/catalogo/${product.slug}`} key={product.id}>{product.name}</Link>
            ))}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
