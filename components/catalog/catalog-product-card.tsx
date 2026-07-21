"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { X } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { ProductImageVariantKind } from "@/lib/catalog/image-variants";
import type { CatalogProductCard as CatalogProductCardData, CatalogProduct } from "@/lib/catalog/types";

import { ProductMediaShell } from "./product-media-shell";
import { ProductWhatsappButton } from "./product-whatsapp-button";
import { useCatalogFocus } from "./catalog-focus-manager";
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
  const isFocused = mode === "focused";

  const flipFrameRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productHref = `/catalogo/${product.slug}`;
  const styleText = product.category?.name || "Óculos de Sol";

  // Preload handler
  const handlePreload = () => {
    if (focusContext && !external) {
      focusContext.preloadProduct(product.slug);
    }
  };

  const handleFocusTrigger = () => {
    if (!focusContext || external) {
      if (typeof window !== "undefined") {
        window.location.href = productHref;
      }
      return;
    }
    focusContext.focusProduct({
      slug: product.slug,
      flipFrame: flipFrameRef.current,
    });
  };

  // --- External cards (WhatsApp preview cards) ---
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
          aria-label={`Consultar ${product.name} pelo WhatsApp`}
          className={styles.externalLink}
          href={externalHref}
          rel="noopener noreferrer"
          tabIndex={clone ? -1 : undefined}
          target="_blank"
        >
          <div data-flip-frame className={styles.flipFrame}>
            <ProductMediaShell presentation="catalog" className={styles.gridMedia}>
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

  // --- FOCUSED MODE: Single unified container, zero image duplication ---
  if (isFocused) {
    const displayProduct: CatalogProduct = (focusContext?.focusedProductData as CatalogProduct) ?? {
      ...product,
      images: [product.cover],
    };

    const images = displayProduct.images && displayProduct.images.length > 0
      ? displayProduct.images
      : [product.cover];

    const activeImage = images[activeImageIndex] || images[0] || product.cover;
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=5563992231522&text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+o+modelo+${encodeURIComponent(displayProduct.name)}&type=phone_number&app_absent=0&utm_source=ig`;

    return (
      <article
        className={styles.card}
        data-mode="focused"
        data-catalog-product-id={product.id}
        data-catalog-product-name={product.name}
        data-catalog-product-slug={product.slug}
        data-catalog-product-brand={product.brand?.slug}
        data-presentation={presentation}
      >
        <div className={styles.focusedContainer}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => focusContext?.closeFocus()}
            aria-label="Fechar detalhes do produto"
          >
            <X size={20} strokeWidth={1.5} />
          </button>

          <div className={styles.focusedGrid}>
            {/* Left/Stage Column: single FLIP frame with rounded white card + thumbnails below */}
            <div className={styles.focusedStageCol}>
              <div data-flip-frame className={styles.flipFrame} ref={flipFrameRef}>
                <ProductMediaShell presentation="gallery" className={styles.focusedMediaShell}>
                  <Image
                    key={activeImage.id}
                    alt={activeImage.altText}
                    fill
                    sizes="(max-width: 900px) 92vw, 55vw"
                    src={catalogImageUrl(activeImage, "product_detail")}
                    style={{ objectPosition: activeImage.objectPosition }}
                    unoptimized
                  />
                </ProductMediaShell>
              </div>

              {images.length > 1 && (
                <div className={styles.thumbnailRail}>
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      className={styles.thumbnailBtn}
                      aria-pressed={activeImageIndex === idx}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Ver imagem ${idx + 1} de ${images.length}`}
                    >
                      <ProductMediaShell presentation="gallery" className={styles.thumbnailShell}>
                        <Image
                          alt={img.altText}
                          fill
                          sizes="90px"
                          src={catalogImageUrl(img, "catalog_card")}
                          style={{ objectPosition: img.objectPosition }}
                          unoptimized
                        />
                      </ProductMediaShell>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right/Info Column: Brand, Title, Description, WhatsApp CTA, Canonical Link */}
            <div className={styles.focusedInfoCol}>
              {displayProduct.brand && (
                <span className={styles.brand}>{displayProduct.brand.name}</span>
              )}
              <h2 className={styles.title}>{displayProduct.name}</h2>

              <div className={styles.description}>
                <p>
                  Estrutura Premium selecionada. Entre em contato para consultar numerações, cores disponíveis e valores exatos desta armação com as suas lentes de grau feitas em nosso Laboratório Digital.
                </p>
              </div>

              <div className={styles.actions}>
                <ProductWhatsappButton
                  href={whatsappUrl}
                  label={`Consultar ${displayProduct.name}`}
                  productId={displayProduct.id}
                />
                <Link
                  href={productHref}
                  className={styles.focusedCanonicalLink}
                  data-vision-motion-ignore=""
                >
                  Ver página completa →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // --- GRID MODE: Clean cutout cutout image on paper background + button trigger + canonical link ---
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
      <button
        type="button"
        className={styles.focusTrigger}
        data-focus-trigger=""
        onClick={handleFocusTrigger}
        onPointerEnter={handlePreload}
        onFocus={handlePreload}
        onPointerDown={(e) => {
          if (e.button === 0) handlePreload();
        }}
        tabIndex={clone ? -1 : undefined}
        aria-label={`Visualizar ${product.name}`}
        aria-expanded={false}
      >
        <div data-flip-frame className={styles.flipFrame} ref={flipFrameRef}>
          <ProductMediaShell presentation="catalog" className={styles.gridMedia}>
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
          <span className={styles.cta}>Visualizar modelo</span>
        </div>
      </button>

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
