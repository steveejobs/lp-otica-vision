import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { availabilityLabels, formatCatalogPrice } from "@/lib/catalog/format";
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
  imageVariant?: Extract<ProductImageVariantKind, "catalog_card" | "home_preview">;
  presentation?: "catalog" | "preview";
  priority?: boolean;
  product: CatalogProductCardData;
}) {
  const descriptor = [product.model, product.color].filter(Boolean).join(" · ");
  const price = formatCatalogPrice(product.price, product.priceVisibility);
  const productHref = href ?? `/catalogo/${product.slug}`;
  const label = actionLabel ?? (presentation === "preview" ? "Abrir modelo" : "Ver produto");
  const linkLabel = external
    ? `Consultar ${product.name}, código ${product.sku}, pelo WhatsApp`
    : `Ver ${product.name}, código ${product.sku}`;
  const content = (
    <>
      <div className={styles.media} data-catalog-transition-media>
        <Image
          alt={product.cover.altText}
          blurDataURL={product.cover.blurDataUrl ?? blurDataUrl}
          fill
          placeholder="blur"
          priority={priority}
          sizes="(max-width: 380px) 92vw, (max-width: 720px) 45vw, (max-width: 1100px) 30vw, 22vw"
          src={catalogImageUrl(product.cover, imageVariant)}
          style={{ objectPosition: product.cover.objectPosition }}
          unoptimized
        />
      </div>

      <div className={styles.content}>
        <p className={styles.brand}>{product.brand?.name ?? "Seleção Vision"}</p>
        <h3>{product.name}</h3>
        {descriptor ? <p className={styles.descriptor}>{descriptor}</p> : null}
        {presentation === "catalog" ? (
          <div className={styles.commercialLine}>
            <span className={styles.availability}>{availabilityLabels[product.availability]}</span>
            {price ? <strong>{price}</strong> : null}
          </div>
        ) : null}
        <span className={styles.action}>
          {label}
          <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
        </span>
      </div>
    </>
  );

  return (
    <article
      aria-hidden={clone || undefined}
      className={styles.card}
      data-catalog-product-id={clone ? undefined : product.id}
      data-availability={product.availability}
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
          data-catalog-product-id={product.id}
          data-catalog-transition-link
          href={productHref}
          tabIndex={clone ? -1 : undefined}
        >
          {content}
        </Link>
      )}
    </article>
  );
}
