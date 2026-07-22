import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { catalogImageUrl } from "@/lib/catalog/image-url";
import type { CatalogProductCard } from "@/lib/catalog/types";

import { CatalogPreviewRail } from "./catalog-preview-rail";
import styles from "./catalog-preview.module.css";

export function CatalogPreview({ products }: { products: CatalogProductCard[] }) {
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
            <p className="eyebrow">Vitrine Vision</p>
            <h2 id="catalog-preview-title">Modelos em Destaque</h2>
          </div>
          <div className={styles.headerAside}>
            <p>Selecione uma armação para abrir no WhatsApp com atendimento exclusivo em Araguaína - TO.</p>
            <Link
              className={styles.cta}
              data-catalog-collection-link
              data-catalog-transition-link
              href="/catalogo"
            >
              Ver catálogo completo
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </header>

        <div className={styles.grid}>
          {displayProducts.map((product) => {
            const descriptor = [product.brand?.name, product.model].filter(Boolean).join(" · ");
            const whatsappText = `Olá! Gostaria de consultar disponibilidade e detalhes do modelo ${product.name} (Ótica Vision Araguaína).`;
            const whatsappUrl = `https://api.whatsapp.com/send/?phone=5563992231522&text=${encodeURIComponent(whatsappText)}&type=phone_number&app_absent=0&utm_source=ig`;

            return (
              <div key={product.id} className={styles.productCard}>
                <Link
                  href={`/catalogo?produto=${product.slug}`}
                  className={styles.imageLink}
                  aria-label={`Ver ${product.name} no catálogo`}
                >
                  <div className={styles.imageShell}>
                    <Image
                      alt={product.cover.altText}
                      fill
                      sizes="(max-width: 720px) 90vw, (max-width: 1024px) 45vw, 280px"
                      src={catalogImageUrl(product.cover, "catalog_card")}
                      style={{ objectPosition: product.cover.objectPosition }}
                      className={styles.productImage}
                      unoptimized
                    />
                  </div>
                </Link>

                <div className={styles.cardInfo}>
                  <span className={styles.cardMeta}>{descriptor || "Ótica Vision"}</span>
                  <h3 className={styles.cardTitle}>{product.name}</h3>
                  
                  <div className={styles.cardActions}>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.whatsappBtn}
                      aria-label={`Consultar ${product.name} no WhatsApp`}
                    >
                      Consultar no WhatsApp
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
