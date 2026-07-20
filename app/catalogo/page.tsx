import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";

import { CatalogAnalytics } from "@/components/catalog/catalog-analytics";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
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
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";
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

function groupByBrand(products: CatalogProductCardData[]) {
  const groups = new Map<
    string,
    { name: string; products: CatalogProductCardData[]; slug: string | null }
  >();
  for (const product of products) {
    const key = product.brand?.id ?? "vision";
    const current = groups.get(key) ?? {
      name: product.brand?.name ?? "Seleção Vision",
      products: [],
      slug: product.brand?.slug ?? null,
    };
    current.products.push(product);
    groups.set(key, current);
  }
  return [...groups.values()];
}

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
  const groups = query.style
    ? [
        {
          name: activeStyle?.label ?? "Seleção por estilo",
          products: catalog.products,
          slug: null,
        },
      ]
    : query.brand
      ? [
          {
            name: activeBrand?.name ?? "Produtos",
            products: catalog.products,
            slug: query.brand,
          },
        ]
      : groupByBrand(catalog.products);
  const hasFilters = hasActiveCatalogFilters(query);
  const refinementCount = [
    query.search,
    query.category,
    query.availability,
    query.collection,
  ].filter(Boolean).length;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="catalog-title">
          <div className={styles.heroInner} data-catalog-enter="hero">
            <div className={styles.heroLabel}>
              <p className="eyebrow">Catálogo Vision</p>
              <span>Araguaína - TO</span>
            </div>
            <div className={styles.heroCopy}>
              <h1 id="catalog-title">
                Armações para ver, comparar e escolher.
              </h1>
              <p className={styles.intro}>
                Explore armações nacionais e importadas por estilo, marca e
                categoria. Abra cada modelo para conhecer os detalhes e falar
                com a Vision.
              </p>
              <a className={styles.heroAction} href="#catalog-results-title">
                Explorar modelos
                <ArrowDown aria-hidden="true" size={17} strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </section>

        <section className={styles.filters} aria-label="Filtros do catálogo">
          <div className={styles.filterInner} data-catalog-enter="filters">
            {styleOptions.length ? (
              <div className={styles.brandBlock}>
                <span className={styles.filterLabel}>Direção de estilo</span>
                <nav
                  className={styles.brandRail}
                  aria-label="Selecionar estilo"
                >
                  <Link
                    aria-current={!query.style ? "page" : undefined}
                    data-catalog-filter-link
                    href={catalogHref(query, { page: 1, style: null })}
                    scroll={false}
                  >
                    Todos
                  </Link>
                  {styleOptions.map((style) => (
                    <Link
                      aria-current={
                        query.style === style.slug ? "page" : undefined
                      }
                      data-catalog-filter-link
                      href={catalogHref(query, { page: 1, style: style.slug })}
                      key={style.id}
                      scroll={false}
                    >
                      {style.label}
                      <span>{style.productCount}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}
            <div className={styles.brandBlock}>
              <span className={styles.filterLabel}>Navegar por marca</span>
              <nav className={styles.brandRail} aria-label="Selecionar marca">
                <Link
                  aria-current={!query.brand ? "page" : undefined}
                  data-catalog-filter-link
                  href={catalogHref(query, { brand: null, page: 1 })}
                  scroll={false}
                >
                  Todas
                  <span>
                    {filters.brands.reduce((sum, item) => sum + item.count, 0)}
                  </span>
                </Link>
                {filters.brands.map((brand) => (
                  <Link
                    aria-current={
                      query.brand === brand.key ? "page" : undefined
                    }
                    data-catalog-filter-link
                    href={catalogHref(query, { brand: brand.key, page: 1 })}
                    key={brand.key}
                    scroll={false}
                  >
                    {brand.name}
                    <span>{brand.count}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <details className={styles.refinePanel} open={refinementCount > 0}>
              <summary>
                <span>
                  <SlidersHorizontal
                    aria-hidden="true"
                    size={17}
                    strokeWidth={1.6}
                  />
                  Refinar seleção
                </span>
                {refinementCount ? <strong>{refinementCount}</strong> : null}
              </summary>
              <form
                className={styles.filterForm}
                data-catalog-filter-form
                method="get"
                role="search"
              >
                {query.brand ? (
                  <input name="marca" type="hidden" value={query.brand} />
                ) : null}
                {query.style ? (
                  <input name="estilo" type="hidden" value={query.style} />
                ) : null}
                <label className={styles.field}>
                  <span>Buscar no catálogo</span>
                  <input
                    defaultValue={query.search}
                    maxLength={80}
                    name="busca"
                    placeholder="Nome, modelo, SKU, cor ou marca"
                    type="search"
                  />
                </label>
                {filters.categories.length ? (
                  <label className={styles.field}>
                    <span>Categoria</span>
                    <select
                      defaultValue={query.category ?? ""}
                      name="categoria"
                    >
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
                    <select
                      defaultValue={query.availability ?? ""}
                      name="disponibilidade"
                    >
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
                    <select
                      defaultValue={query.collection ?? ""}
                      name="colecao"
                    >
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
                  <button className={styles.submit} type="submit">
                    Ver resultados
                  </button>
                  {hasFilters ? (
                    <Link
                      className={styles.clear}
                      data-catalog-filter-link
                      href="/catalogo"
                      scroll={false}
                    >
                      Limpar filtros
                    </Link>
                  ) : null}
                </div>
              </form>
            </details>
          </div>
        </section>

        <section
          className={styles.results}
          aria-labelledby="catalog-results-title"
        >
          <div className={styles.resultsInner}>
            <div className={styles.resultSummary} data-catalog-enter="summary">
              <h2 id="catalog-results-title">
                {activeStyle?.label ??
                  (query.brand && activeBrand
                    ? activeBrand.name
                    : "Modelos em catálogo")}
              </h2>
              <p aria-live="polite">
                {catalog.total} {catalog.total === 1 ? "produto" : "produtos"}
              </p>
            </div>

            {catalog.products.length === 0 ? (
              <div
                className={styles.empty}
                data-motion-reveal
                data-motion-variant="section"
              >
                <h2>
                  {hasFilters
                    ? "Nenhum resultado por aqui."
                    : "A vitrine está sendo atualizada."}
                </h2>
                <p>
                  {hasFilters
                    ? "Mantenha os filtros visíveis, ajuste sua busca ou limpe a seleção."
                    : "Enquanto novos produtos são publicados, fale diretamente com a equipe Vision."}
                </p>
                <div className={styles.emptyActions}>
                  {hasFilters ? (
                    <Link
                      data-catalog-filter-link
                      href="/catalogo"
                      scroll={false}
                    >
                      Limpar filtros
                    </Link>
                  ) : null}
                  <a
                    href={LINKS.whatsapp}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <MessageCircle aria-hidden="true" size={17} />
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.chapters} data-catalog-results-grid>
                {groups.map((group) => (
                  <section
                    className={styles.chapter}
                    key={group.slug ?? "vision"}
                  >
                    <div
                      className={styles.chapterHeader}
                      data-motion-reveal
                      data-motion-variant="section"
                    >
                      <div className={styles.chapterTitle}>
                        <h2>{group.name}</h2>
                        <span>{group.products.length}</span>
                      </div>
                      {!query.style && !query.brand && group.slug ? (
                        <Link
                          data-catalog-filter-link
                          href={catalogHref(query, {
                            brand: group.slug,
                            page: 1,
                          })}
                          scroll={false}
                        >
                          Ver toda a marca
                          <ArrowUpRight aria-hidden="true" size={16} />
                        </Link>
                      ) : null}
                    </div>
                    <div className={styles.grid} data-motion-stagger>
                      {group.products.map((product) => (
                        <CatalogProductCard
                          href={catalogProductHref(product.slug, query)}
                          key={product.id}
                          product={product}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {catalog.totalPages > 1 ? (
              <nav
                className={styles.pagination}
                aria-label="Paginação do catálogo"
                data-motion-reveal
              >
                {catalog.page > 1 ? (
                  <Link
                    data-catalog-filter-link
                    href={catalogHref(query, { page: catalog.page - 1 })}
                    scroll={false}
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Página {catalog.page} de {catalog.totalPages}
                </span>
                {catalog.page < catalog.totalPages ? (
                  <Link
                    data-catalog-filter-link
                    href={catalogHref(query, { page: catalog.page + 1 })}
                    scroll={false}
                  >
                    Próxima
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                ) : (
                  <span />
                )}
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
