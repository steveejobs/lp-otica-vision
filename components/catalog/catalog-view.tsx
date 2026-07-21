import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { CatalogAnalytics } from "@/components/catalog/catalog-analytics";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { CatalogResultsMotion } from "@/components/catalog/catalog-results-motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CatalogFilterOptions, CatalogPageResult, CatalogProductCard as CatalogProductCardType } from "@/lib/catalog/types";
import { catalogHref, catalogProductHref, hasActiveCatalogFilters, type CatalogQuery } from "@/lib/catalog/query";
import type { CurationStyle } from "@/lib/curation/types";
import { LINKS } from "@/lib/links";

import styles from "./catalog.module.css";

interface CatalogViewProps {
  catalog: CatalogPageResult;
  collectionId: string | null;
  featuredProducts: CatalogProductCardType[];
  filters: CatalogFilterOptions;
  query: CatalogQuery;
  styleOptions: CurationStyle[];
}

const BRAND_LOGOS: Record<string, string> = {
  "carrera": "/media/brands/carrera (1).png",
  "ray-ban": "/media/brands/logo-rayban.png",
  "max-mara": "/media/brands/Max-Mara-logo.png",
  "persol": "/media/brands/persol-logo-png-transparent.png",
  "swarovski": "/media/brands/Swarovski-Logo-2016.png",
  "tom-ford": "/media/brands/Tom-Ford-logo.png",
  "versace": "/media/brands/versace-logo.png",
  "emilio-pucci": "/media/brands/Emilio-Pucci-Logo.png",
  "jimmy-choo": "/media/brands/Jimmy_Choo_Ltd-Logo.wine.png",
  "vision": "/media/brands/images__2_-removebg-preview.png",
};

export function CatalogView({
  catalog,
  collectionId,
  featuredProducts,
  filters,
  query,
  styleOptions,
}: CatalogViewProps) {
  const activeBrand = filters.brands.find((brand) => brand.key === query.brand);
  const activeStyle = styleOptions.find((style) => style.slug === query.style);
  const singlePublishedBrand = filters.brands.length === 1 ? filters.brands[0] : null;
  const hasFilters = hasActiveCatalogFilters(query);
  const title = singlePublishedBrand?.name || activeBrand?.name || "Catálogo";
  
  const motionKey = [
    query.search,
    query.brand,
    query.category,
    query.availability,
    query.collection,
    query.style,
    query.page,
  ].join(":");

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        
        <section className={styles.premiumHeader} aria-label="Detalhes da vitrine">
          <div className={styles.premiumHeaderInner}>
            <div className={styles.premiumHeaderContent}>
              <h1 id="catalog-results-title">{title}</h1>
              <p aria-live="polite" className={styles.premiumModelCount}>
                {catalog.total} {catalog.total === 1 ? "modelo disponível" : "modelos disponíveis"}
              </p>
              <p className={styles.premiumDescription}>
                Escolha um modelo e fale com a ótica pelo WhatsApp para consultar detalhes e disponibilidade.
              </p>
            </div>

            <nav className={styles.brandRail} aria-label="Selecionar marca">
              <Link
                aria-current={!query.brand ? "page" : undefined}
                data-catalog-filter-link
                href={catalogHref(query, { brand: null, page: 1 })}
                scroll={false}
                className={styles.brandLinkText}
              >
                <strong>Todas as Marcas</strong>
              </Link>
              {filters.brands.map((brand) => {
                const logoPath = BRAND_LOGOS[brand.key];
                return (
                  <Link
                    aria-current={query.brand === brand.key ? "page" : undefined}
                    data-catalog-filter-link
                    href={catalogHref(query, { brand: brand.key, page: 1 })}
                    key={brand.key}
                    scroll={false}
                    className={logoPath ? styles.brandLinkImage : styles.brandLinkText}
                  >
                    {logoPath ? (
                       <div className={styles.brandLogoWrapper}>
                         <img src={logoPath} alt={brand.name} className={styles.brandLogo} />
                       </div>
                    ) : (
                      <strong>{brand.name}</strong>
                    )}
                  </Link>
                );
              })}
            </nav>

            {styleOptions.some(style => style.productCount > 0) ? (
              <nav className={styles.styleTabs} aria-label="Selecionar estilo">
                <Link
                  aria-current={!query.style ? "page" : undefined}
                  data-catalog-filter-link
                  href={catalogHref(query, { page: 1, style: null })}
                  scroll={false}
                  className={styles.styleTab}
                >
                  Todos
                </Link>
                {styleOptions.map((style) => style.productCount > 0 ? (
                  <Link
                    aria-current={query.style === style.slug ? "page" : undefined}
                    data-catalog-filter-link
                    href={catalogHref(query, { page: 1, style: style.slug })}
                    key={style.id}
                    scroll={false}
                    className={styles.styleTab}
                  >
                    {style.label}
                  </Link>
                ) : null)}
              </nav>
            ) : null}
          </div>
        </section>

        <section className={styles.results} aria-labelledby="catalog-results-title">
          <div className={styles.resultsInner}>
            {catalog.products.length === 0 ? (
              <div className={styles.empty} data-motion-reveal data-motion-variant="section">
                <h2>{hasFilters ? "Nenhum modelo nesta seleção." : "A vitrine está sendo atualizada."}</h2>
                <p>
                  {hasFilters
                    ? "Ajuste os filtros ou volte à seleção completa."
                    : "Enquanto novos modelos são publicados, fale diretamente com a equipe Vision."}
                </p>
                <div className={styles.emptyActions}>
                  {hasFilters ? <Link data-catalog-filter-link href="/catalogo" scroll={false}>Ver catálogo completo</Link> : null}
                  <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">
                    <MessageCircle aria-hidden="true" size={17} />
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <CatalogResultsMotion motionKey={motionKey}>
                <div className={styles.grid} data-catalog-results-grid data-count={Math.min(catalog.products.length, 9)}>
                  {catalog.products.map((product, index) => (
                    <CatalogProductCard
                      href={catalogProductHref(product.slug, query)}
                      key={product.id}
                      priority={index === 0}
                      product={product}
                    />
                  ))}
                </div>
              </CatalogResultsMotion>
            )}

            {catalog.page < catalog.totalPages ? (
              <div className={styles.pagination} data-motion-reveal>
                <Link 
                  className={styles.loadMore}
                  data-catalog-filter-link 
                  href={catalogHref(query, { page: catalog.page + 1 })} 
                  replace
                  scroll={false}
                >
                  Carregar mais modelos
                </Link>
                <span>Mostrando {catalog.products.length} de {catalog.total}</span>
              </div>
            ) : null}
          </div>
        </section>
        <CatalogAnalytics collectionId={collectionId} query={query} resultCount={catalog.total} />
      </main>
      <SiteFooter />
    </div>
  );
}
