import Image from "next/image";
import Link from "next/link";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import styles from "./cinematic-card.module.css";

const blurDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=";

export function CinematicCard({
  product,
  role,
  phase,
  index,
}: {
  product: CatalogProductCardData;
  role: "protagonist" | "support-vertical" | "support-horizontal" | "accent" | "standard";
  phase: "preparing" | "intro" | "settling" | "catalog";
  index: number;
}) {
  const isIntro = phase === "intro" || phase === "preparing";
  
  // Format price if visible
  const showPrice = !isIntro && product.priceVisibility === "visible" && product.price !== null;
  const formattedPrice = showPrice
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price! / 100)
    : "Sob consulta";

  return (
    <Link
      href={`/catalogo/${product.slug}`}
      className={styles.card}
      data-role={isIntro ? role : "standard"}
      data-phase={phase}
      data-id={product.id} // Used for FLIP
      draggable={false}
      aria-label={`${product.name} da marca ${product.brand?.name ?? "Vision"}`}
    >
      <div className={styles.imageStage} data-id={`img-${product.id}`}>
        <Image
          alt={product.cover.altText}
          blurDataURL={product.cover.blurDataUrl ?? blurDataUrl}
          fill
          placeholder="blur"
          priority={role === "protagonist" || index < 4}
          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
          src={catalogImageUrl(product.cover, "catalog_card")}
          style={{ objectPosition: product.cover.objectPosition }}
          className={styles.image}
          unoptimized
        />
      </div>

      <div className={styles.details} data-id={`details-${product.id}`}>
        <div className={styles.brandTitle}>
          <span className={styles.brand}>{product.brand?.name ?? "Vision"}</span>
          {isIntro && role === "protagonist" ? null : (
            <span className={styles.name}>{product.name}</span>
          )}
        </div>

        {/* Hide technical info during intro */}
        <div className={styles.technical}>
          <span className={styles.price}>{formattedPrice}</span>
          {product.availability !== "available" && (
            <span className={styles.availability}>Esgotado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
