import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Eye } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard } from "@/lib/catalog/types";

import styles from "./catalog-preview.module.css";

export function CatalogPreview({ products }: { products: CatalogProductCard[] }) {
  // Show top 4 curated products
  const displayProducts = products.slice(0, 4);

  return (
    <section
      id="preview-catalogo"
      className={styles.section}
      aria-labelledby="catalog-preview-title"
      data-motion-reveal
      data-motion-variant="section"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <span className="eyebrow">Vitrine Vision</span>
            <h2 id="catalog-preview-title">Modelos em Destaque</h2>
          </div>
          <div className={styles.headerAside}>
            <p>Selecione uma armação para visualizar no catálogo ou consultar atendimento direto via WhatsApp.</p>
            <Link
              className={styles.ctaHeader}
              data-catalog-collection-link
              data-catalog-transition-link
              href="/catalogo"
            >
              Ver catálogo completo
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </header>

        <div className={styles.grid} data-motion-stagger>
          {displayProducts.map((product, index) => {
            const brandName = product.brand?.name ?? "Ótica Vision";
            const whatsappText = `Olá! Gostaria de consultar disponibilidade e detalhes do modelo ${product.name} (Ótica Vision Araguaína).`;
            const whatsappUrl = `https://api.whatsapp.com/send/?phone=5563992231522&text=${encodeURIComponent(whatsappText)}&type=phone_number&app_absent=0&utm_source=ig`;

            return (
              <article
                key={product.id}
                className={styles.card}
                style={{ "--card-index": index } as React.CSSProperties}
              >
                {/* Image Container with overlay triggers */}
                <div className={styles.mediaContainer}>
                  <Link
                    href={`/catalogo?produto=${product.slug}`}
                    className={styles.imageLink}
                    aria-label={`Ver ${product.name} no catálogo`}
                  >
                    <Image
                      alt={product.cover.altText || product.name}
                      fill
                      sizes="(max-width: 600px) 45vw, (max-width: 1024px) 45vw, 280px"
                      src={catalogImageUrl(product.cover, "catalog_card")}
                      style={{ objectPosition: product.cover.objectPosition }}
                      className={styles.productImage}
                      unoptimized
                    />
                  </Link>

                  {/* Quick Action Overlay inside image for ergonomic mouse access */}
                  <div className={styles.mediaActions}>
                    <Link
                      href={`/catalogo?produto=${product.slug}`}
                      className={styles.quickViewBtn}
                      title="Ver modelo no catálogo"
                    >
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

                {/* Card Content & Primary WhatsApp Button right beneath */}
                <div className={styles.cardBody}>
                  <div className={styles.metaGroup}>
                    <span className={styles.brandTag}>{brandName}</span>
                    <h3 className={styles.productTitle}>
                      <Link href={`/catalogo?produto=${product.slug}`}>
                        {product.name}
                      </Link>
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
