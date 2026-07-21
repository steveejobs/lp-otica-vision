import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";

import { CatalogAnalytics } from "@/components/catalog/catalog-analytics";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { CatalogResultsMotion } from "@/components/catalog/catalog-results-motion";
import { CatalogShowroom } from "@/components/catalog/catalog-showroom";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getCatalogFilterOptions,
  getCatalogPage,
  getPublishedCollectionId,
} from "@/lib/catalog/data";
import {
  catalogHref,
  catalogProductHref,
  hasActiveCatalogFilters,
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/lib/catalog/query";
import { getCurationStyleOptions } from "@/lib/curation/data";
import { LINKS } from "@/lib/links";

import styles from "./catalog.module.css";

const title = "Vitrine Vision | Ótica Vision";
const description =
  "Explore armações nacionais e importadas da Ótica Vision e consulte cada modelo pelo WhatsApp.";

export const metadata: Metadata = {
  alternates: { canonical: "/catalogo" },
  description,
  openGraph: {
    description,
    title,
    type: "website",
    url: "/catalogo",
  },
  title,
  twitter: {
    card: "summary",
    description,
    title,
  },
};

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [catalog, filters, collectionId, styleOptions] = await Promise.all([
    getCatalogPage(query),
    getCatalogFilterOptions(),
    query.collection
      ? getPublishedCollectionId(query.collection)
      : Promise.resolve(null),
    getCurationStyleOptions(query.category),
  ]);
  const activeBrand = filters.brands.find((brand) => brand.key === query.brand);
  const activeStyle = styleOptions.find((style) => style.slug === query.style);
  const singlePublishedBrand = filters.brands.length === 1 ? filters.brands[0] : null;
  const hasFilters = hasActiveCatalogFilters(query);
  const refinementCount = [
    query.search,
    query.category,
    query.availability,
    query.collection,
  ].filter(Boolean).length;
  const resultTitle = activeStyle?.label
    ?? activeBrand?.name
    ?? (singlePublishedBrand ? `Edição ${singlePublishedBrand.name}` : "Seleção Vision");
  const motionKey = [
    query.search,
    query.brand,
    query.category,
    query.availability,
    query.collection,
    query.style,
    query.page,
  ].join(":");
  const showroomItems = catalog.products.map((product) => ({
    href: catalogProductHref(product.slug, query),
    product,
  }));

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="catalog-title">
          <div className={styles.heroInner} data-catalog-enter="hero">
            <p className="eyebrow">Catálogo Vision</p>
            <div className={styles.heroCopy}>
              <h1 id="catalog-title">Uma seleção para olhar de perto.</h1>
              <p className={styles.intro}>
                Explore a seleção Vision e consulte os detalhes pelo WhatsApp.
              </p>
            </div>
            <span className={styles.location}>Araguaína - TO</span>
          </div>
        </section>

        <section className={styles.filters} aria-label="Explorar o catálogo">
          <div className={styles.filterInner} data-catalog-enter="filters">
            <div className={styles.brandBlock}>
              <div className={styles.filterHeading}>
                <span className={styles.filterLabel}>Marcas na Vision</span>
                <small>Explore a seleção atual</small>
              </div>
              <nav className={styles.brandRail} aria-label="Selecionar marca">
                <Link
                  aria-current={!query.brand ? "page" : undefined}
                  data-catalog-filter-link
                  href={catalogHref(query, { brand: null, page: 1 })}
                  scroll={false}
                >
                  <strong>Todas</strong>
                  <span>{filters.brands.reduce((sum, item) => sum + item.count, 0)}</span>
                </Link>
                {filters.brands.map((brand) => (
                  <Link
                    aria-current={query.brand === brand.key ? "page" : undefined}
                    data-catalog-filter-link
                    href={catalogHref(query, { brand: brand.key, page: 1 })}
                    key={brand.key}
                    scroll={false}
                  >
                    <strong>{brand.name}</strong>
                    <span>{brand.count} {brand.count === 1 ? "modelo" : "modelos"}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {styleOptions.length ? (
              <div className={styles.styleBlock}>
                <span className={styles.filterLabel}>Estilo</span>
                <nav className={styles.styleRail} aria-label="Selecionar estilo">
                  <Link
                    aria-current={!query.style ? "page" : undefined}
                    data-catalog-filter-link
                    href={catalogHref(query, { page: 1, style: null })}
                    scroll={false}
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
                    >
                      {style.label}
                      <span>{style.productCount}</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={styles.disabledFilter}
                      key={style.id}
                      title="Nenhum modelo publicado neste estilo"
                    >
                      {style.label}
                      <small>0</small>
                    </span>
                  ))}
                </nav>
              </div>
            ) : null}

            <details className={styles.refinePanel} open={refinementCount > 0}>
              <summary>
                <span>
                  <SlidersHorizontal aria-hidden="true" size={17} strokeWidth={1.6} />
                  Filtrar
                </span>
                {refinementCount ? <strong>{refinementCount}</strong> : null}
              </summary>
              <form
                className={styles.filterForm}
                data-catalog-filter-form
                method="get"
                role="search"
              >
                {query.brand ? <input name="marca" type="hidden" value={query.brand} /> : null}
                {query.style ? <input name="estilo" type="hidden" value={query.style} /> : null}
                <label className={styles.field}>
                  <span>Buscar no catálogo</span>
                  <input
                    defaultValue={query.search}
                    maxLength={80}
                    name="busca"
                    placeholder="Nome, modelo, cor ou marca"
                    type="search"
                  />
                </label>
                {filters.categories.length ? (
                  <label className={styles.field}>
                    <span>Categoria</span>
                    <select defaultValue={query.category ?? ""} name="categoria">
                      <option value="">Todas as categorias</option>
                      {filters.categories.map((category) => (
                        <option key={category.key} value={category.key}>
                          {category.name} ({category.count})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {filters.availability.length ? (
                  <label className={styles.field}>
                    <span>Disponibilidade</span>
                    <select defaultValue={query.availability ?? ""} name="disponibilidade">
                      <option value="">Todas</option>
                      {filters.availability.map((availability) => (
                        <option key={availability.key} value={availability.key}>
                          {availability.name} ({availability.count})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {filters.collections.length ? (
                  <label className={styles.field}>
                    <span>Coleção</span>
                    <select defaultValue={query.collection ?? ""} name="colecao">
                      <option value="">Todas as coleções</option>
                      {filters.collections.map((collection) => (
                        <option key={collection.key} value={collection.key}>
                          {collection.name} ({collection.count})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className={styles.formActions}>
                  <button className={styles.submit} type="submit">Ver seleção</button>
                  {hasFilters ? (
                    <Link className={styles.clear} data-catalog-filter-link href="/catalogo" scroll={false}>
                      Limpar filtros
                    </Link>
                  ) : null}
                </div>
              </form>
            </details>
          </div>
        </section>

        <section className={styles.results} aria-labelledby="catalog-results-title">
          <div className={styles.resultsInner}>
            <div className={styles.resultSummary} data-catalog-enter="summary">
              <div>
                <p className="eyebrow">Curadoria atual</p>
                <h2 id="catalog-results-title">{resultTitle}</h2>
              </div>
              <p aria-live="polite">
                {catalog.total} {catalog.total === 1 ? "modelo" : "modelos"}
              </p>
            </div>

            {catalog.products.length === 0 ? (
              <div className={styles.empty} data-motion-reveal data-motion-variant="section">
                <h2>{hasFilters ? "Nenhum modelo nesta seleção." : "A vitrine está sendo atualizada."}</h2>
                <p>
                  {hasFilters
                    ? "Ajuste os filtros ou volte à seleção completa."
                    : "Enquanto novos modelos são publicados, fale diretamente com a equipe Vision."}
                </p>
                <div className={styles.emptyActions}>
                  {hasFilters ? <Link data-catalog-filter-link href="/catalogo" scroll={false}>Limpar filtros</Link> : null}
                  <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">
                    <MessageCircle aria-hidden="true" size={17} />
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            ) : catalog.products.length <= 4 ? (
              <CatalogShowroom items={showroomItems} />
            ) : (
              <>
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
                <p className={styles.catalogNote}>Catálogo para consulta. Fale com a Vision para confirmar os detalhes.</p>
              </>
            )}

            {catalog.totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Paginação do catálogo" data-motion-reveal>
                {catalog.page > 1 ? (
                  <Link data-catalog-filter-link href={catalogHref(query, { page: catalog.page - 1 })} scroll={false}>
                    <ArrowLeft aria-hidden="true" size={16} />Anterior
                  </Link>
                ) : <span />}
                <span>Página {catalog.page} de {catalog.totalPages}</span>
                {catalog.page < catalog.totalPages ? (
                  <Link data-catalog-filter-link href={catalogHref(query, { page: catalog.page + 1 })} scroll={false}>
                    Próxima<ArrowRight aria-hidden="true" size={16} />
                  </Link>
                ) : <span />}
              </nav>
            ) : null}
          </div>
        </section>
        <CatalogAnalytics collectionId={collectionId} query={query} resultCount={catalog.total} />
      </main>
      <SiteFooter />
    </div>
  );
}

export default async function CatalogPage(props: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  return <CatalogContent {...props} />;
}
