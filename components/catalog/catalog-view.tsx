import { Suspense } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { CatalogAnalytics } from "@/components/catalog/catalog-analytics";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { CatalogResultsMotion } from "@/components/catalog/catalog-results-motion";
import { CatalogFocusManager } from "@/components/catalog/catalog-focus-manager";
import { CatalogSearchBar } from "@/components/catalog/catalog-search-bar";
import { FocusGridWrapper } from "@/components/catalog/focus-grid-wrapper";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CatalogFilterOptions, CatalogPageResult, CatalogProductCard as CatalogProductCardType, CatalogProduct } from "@/lib/catalog/types";
import { catalogHref, catalogProductHref, hasActiveCatalogFilters, type CatalogQuery } from "@/lib/catalog/query";
import type { CurationStyle } from "@/lib/curation/types";
import { LINKS } from "@/lib/links";

import { CatalogHeaderSpotlight } from "@/components/catalog/catalog-header-spotlight";

import styles from "./catalog.module.css";

interface CatalogViewProps {
  catalog: CatalogPageResult;
  collectionId: string | null;
  featuredProducts: CatalogProductCardType[];
  filters: CatalogFilterOptions;
  query: CatalogQuery;
  styleOptions: CurationStyle[];
  initialFocusedProduct: CatalogProduct | null;
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
  initialFocusedProduct,
}: CatalogViewProps) {
  const activeBrand = filters.brands.find((brand) => brand.key === query.brand);
  const activeStyle = styleOptions.find((style) => style.slug === query.style);
  const hasFilters = hasActiveCatalogFilters(query);
  const title = activeBrand?.name || "Catálogo";
  
  const motionKey = [
    query.search,
    query.brand,
    query.category,
    query.availability,
    query.collection,
    query.style,
    query.page,
  ].join(":");

  const spotlightProducts = featuredProducts && featuredProducts.length > 0
    ? featuredProducts
    : catalog.products.slice(0, 5);

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <CatalogFocusManager initialSlug={query.product} initialProduct={initialFocusedProduct} query={query} catalogProducts={catalog.products}>
          <section className={styles.premiumHeader} aria-label="Detalhes da vitrine">
            <div className={styles.premiumHeaderInner}>
              <div className={styles.headerLeftCol}>
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
                    href={catalogHref(query, { brand: null, page: 1, product: null })}
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
                        href={catalogHref(query, { brand: brand.key, page: 1, product: null })}
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
                      href={catalogHref(query, { page: 1, style: null, product: null })}
                      scroll={false}
                      className={styles.styleTab}
                    >
                      Todos
                    </Link>
                    {styleOptions.map((style) => style.productCount > 0 ? (
                      <Link
                        aria-current={query.style === style.slug ? "page" : undefined}
                        data-catalog-filter-link
                        href={catalogHref(query, { page: 1, style: style.slug, product: null })}
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

              <div className={styles.headerRightCol}>
                <CatalogHeaderSpotlight products={spotlightProducts} />
              </div>
            </div>
          </section>

          <section className={styles.results} aria-labelledby="catalog-results-title">
            <div className={styles.resultsInner}>
              <Suspense fallback={null}>
                <CatalogSearchBar />
              </Suspense>

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
                  <FocusGridWrapper catalog={catalog} query={query} />
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
        </CatalogFocusManager>
        <CatalogAnalytics collectionId={collectionId} query={query} resultCount={catalog.total} />
      </main>
      <SiteFooter />
    </div>
  );
}
