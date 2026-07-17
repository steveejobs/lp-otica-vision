import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { availabilityLabels, formatCatalogPrice } from "@/lib/catalog/format";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import styles from "./catalog-product-card.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

export function CatalogProductCard({
  clone = false,
  priority = false,
  product,
}: {
  clone?: boolean;
  priority?: boolean;
  product: CatalogProductCardData;
}) {
  const descriptor = [product.model, product.color].filter(Boolean).join(" · ");
  const price = formatCatalogPrice(product.price, product.priceVisibility);

  return (
    <article aria-hidden={clone || undefined} className={styles.card} data-availability={product.availability}>
      <Link
        aria-label={`Ver ${product.name}, código ${product.sku}`}
        className={styles.link}
        href={`/catalogo/${product.slug}`}
        tabIndex={clone ? -1 : undefined}
      >
        <div className={styles.media} {...(!clone ? { "data-focus-reveal": true } : {})}>
          <Image
            alt={product.cover.altText}
            blurDataURL={blurDataUrl}
            fill
            placeholder="blur"
            priority={priority}
            sizes="(max-width: 380px) 92vw, (max-width: 720px) 45vw, (max-width: 1100px) 30vw, 22vw"
            src={catalogImageUrl(product.cover)}
            style={{ objectPosition: product.cover.objectPosition }}
          />
        </div>

        <div className={styles.content}>
          <p className={styles.brand}>{product.brand?.name ?? "Seleção Vision"}</p>
          <h3>{product.name}</h3>
          {descriptor ? <p className={styles.descriptor}>{descriptor}</p> : null}
          <div className={styles.commercialLine}>
            <span className={styles.availability}>{availabilityLabels[product.availability]}</span>
            {price ? <strong>{price}</strong> : null}
          </div>
          <span className={styles.action}>
            Ver produto
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
          </span>
        </div>
      </Link>
    </article>
  );
}
