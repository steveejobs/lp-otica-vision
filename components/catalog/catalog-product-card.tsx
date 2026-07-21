"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { ProductImageVariantKind } from "@/lib/catalog/image-variants";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import { ProductMediaShell } from "./product-media-shell";
import { useCatalogFocus } from "./catalog-focus-manager";
import { FocusedProductDetails } from "./focused-product-details";
import styles from "./catalog-product-card.module.css";

export function CatalogProductCard({
  actionLabel,
  clone = false,
  external = false,
  imageVariant = "catalog_card",
  presentation = "catalog",
  priority = false,
  product,
}: {
  actionLabel?: string;
  clone?: boolean;
  external?: boolean;
  imageVariant?: Extract<
    ProductImageVariantKind,
    "catalog_card" | "home_preview" | "product_detail"
  >;
  presentation?: "catalog" | "preview";
  priority?: boolean;
  product: CatalogProductCardData;
}) {
  const focusContext = useCatalogFocus();
  const mode = focusContext?.getMode(product.slug) ?? "grid";
  const flipFrameRef = useRef<HTMLDivElement>(null);

  const productHref = `/catalogo/${product.slug}`;
  const linkLabel = external
    ? `Consultar ${product.name} pelo WhatsApp`
    : `Explorar ${product.name}`;
    
  const styleText = product.category?.name || "Óculos de Sol";

  // --- External cards (WhatsApp links on home preview, etc.) ---
  if (external) {
    const externalHref = `https://api.whatsapp.com/send/?phone=5563992231522&text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+o+modelo+${encodeURIComponent(product.name)}&type=phone_number&app_absent=0&utm_source=ig`;
    return (
      <article
        aria-hidden={clone || undefined}
        className={styles.card}
        data-mode="grid"
        data-catalog-product-id={clone ? undefined : product.id}
        data-catalog-product-name={clone ? undefined : product.name}
        data-catalog-product-slug={clone ? undefined : product.slug}
        data-catalog-product-brand={clone ? undefined : product.brand?.slug}
        data-presentation={presentation}
      >
        <a
          aria-label={linkLabel}
          className={styles.externalLink}
          href={externalHref}
          rel="noopener noreferrer"
          tabIndex={clone ? -1 : undefined}
          target="_blank"
        >
          <div data-flip-frame className={styles.flipFrame}>
            <ProductMediaShell presentation="catalog" className={styles.media}>
              <Image
                alt={product.cover.altText}
                fill
                priority={priority}
                sizes="(max-width: 720px) 84vw, (max-width: 960px) 30vw, 22vw"
                src={catalogImageUrl(product.cover, imageVariant)}
                style={{ objectPosition: product.cover.objectPosition }}
                unoptimized
              />
            </ProductMediaShell>
          </div>
          <div className={styles.summary}>
            <h3>{product.name}</h3>
            <p className={styles.styleName}>{styleText}</p>
          </div>
        </a>
      </article>
    );
  }

  // --- Internal cards: button as primary trigger, Link as secondary ---

  const handleFocusTrigger = () => {
    if (!focusContext) {
      // No focus manager: navigate to the product page
      window.location.href = productHref;
      return;
    }
    focusContext.focusProduct({
      slug: product.slug,
      flipFrame: flipFrameRef.current,
    });
  };

  const handlePreload = () => {
    if (focusContext) {
      focusContext.preloadProduct(product.slug);
    }
  };

  const isFocused = mode === "focused";
  const displayProduct = isFocused
    ? (focusContext?.focusedProductData ?? { ...product, images: [product.cover] } as any)
    : null;

  return (
    <article
      aria-hidden={clone || undefined}
      className={styles.card}
      data-mode={mode}
      data-catalog-product-id={clone ? undefined : product.id}
      data-catalog-product-name={clone ? undefined : product.name}
      data-catalog-product-slug={clone ? undefined : product.slug}
      data-catalog-product-brand={clone ? undefined : product.brand?.slug}
      data-presentation={presentation}
    >
      {/* Primary trigger: button, NOT anchor */}
      <button
        type="button"
        className={styles.focusTrigger}
        data-focus-trigger=""
        onClick={handleFocusTrigger}
        onPointerEnter={handlePreload}
        onFocus={handlePreload}
        onPointerDown={(e) => {
          // Mobile preload on pointerdown (main button only)
          if (e.button === 0) handlePreload();
        }}
        tabIndex={clone ? -1 : undefined}
        aria-label={`Visualizar ${product.name}`}
        aria-expanded={isFocused}
      >
        <div data-flip-frame className={styles.flipFrame} ref={flipFrameRef}>
          <ProductMediaShell presentation="catalog" className={styles.media}>
            <Image
              alt={product.cover.altText}
              fill
              priority={priority}
              sizes="(max-width: 720px) 84vw, (max-width: 960px) 30vw, 22vw"
              src={catalogImageUrl(product.cover, imageVariant)}
              style={{ objectPosition: product.cover.objectPosition }}
              unoptimized
            />
          </ProductMediaShell>
        </div>
        <div className={styles.summary}>
          <h3>{product.name}</h3>
          <p className={styles.styleName}>{styleText}</p>
          {!isFocused && (
            <span className={styles.cta}>Visualizar modelo</span>
          )}
        </div>
      </button>

      {/* Progressive focused details — additional child, not a replacement */}
      {isFocused && displayProduct && (
        <FocusedProductDetails product={displayProduct} />
      )}

      {/* Canonical link — secondary, outside the button, never inside it */}
      <Link
        href={productHref}
        className={styles.canonicalLink}
        data-vision-motion-ignore=""
        tabIndex={clone ? -1 : undefined}
      >
        Ver página completa
      </Link>
    </article>
  );
}
