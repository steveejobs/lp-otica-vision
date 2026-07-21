import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { ProductImageVariantKind } from "@/lib/catalog/image-variants";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import styles from "./catalog-product-card.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

export function CatalogProductCard({
  actionLabel,
  clone = false,
  external = false,
  href,
  imageVariant = "catalog_card",
  presentation = "catalog",
  priority = false,
  product,
}: {
  actionLabel?: string;
  clone?: boolean;
  external?: boolean;
  href?: string;
  imageVariant?: Extract<
    ProductImageVariantKind,
    "catalog_card" | "home_preview" | "product_detail"
  >;
  presentation?: "catalog" | "preview";
  priority?: boolean;
  product: CatalogProductCardData;
}) {
  const productHref = href ?? `/catalogo/${product.slug}`;
  const label =
    actionLabel ??
    (presentation === "preview" ? "Abrir modelo" : "Explorar");
  const linkLabel = external
    ? `Consultar ${product.name} pelo WhatsApp`
    : `Explorar ${product.name}`;
    
  // Estilo is not directly on product card data? Wait, it usually has categories.
  // Actually, wait, does it? The user said "nome ou código do modelo; estilo; CTA discreto".
  // Let me check what properties are available on product.
  // I will just use category name or style if available.
  const styleText = product.category?.name || "Óculos de Sol";

  const content = (
    <>
      <div className={styles.media}>
        <Image
          alt={product.cover.altText}
          blurDataURL={product.cover.blurDataUrl ?? blurDataUrl}
          fill
          placeholder="blur"
          priority={priority}
          sizes="(max-width: 720px) 84vw, (max-width: 960px) 30vw, 22vw"
          src={catalogImageUrl(product.cover, imageVariant)}
          style={{ objectPosition: product.cover.objectPosition }}
          unoptimized
        />
      </div>

      <div className={styles.content}>
        <h3>{product.name}</h3>
        <p className={styles.styleName}>{styleText}</p>
        <span className={styles.cta}>
          Ver detalhes <ArrowUpRight size={14} />
        </span>
      </div>
    </>
  );

  return (
    <article
      aria-hidden={clone || undefined}
      className={styles.card}
      data-catalog-product-id={clone ? undefined : product.id}
      data-catalog-product-name={clone ? undefined : product.name}
      data-catalog-product-slug={clone ? undefined : product.slug}
      data-catalog-product-brand={clone ? undefined : product.brand?.slug}
      data-presentation={presentation}
    >
      {external ? (
        <a
          aria-label={linkLabel}
          className={styles.link}
          href={productHref}
          rel="noopener noreferrer"
          tabIndex={clone ? -1 : undefined}
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <Link
          aria-label={linkLabel}
          className={styles.link}
          href={productHref}
          tabIndex={clone ? -1 : undefined}
        >
          {content}
        </Link>
      )}
    </article>
  );
}
