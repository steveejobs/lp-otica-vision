import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";
import { Suspense } from "react";

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
  hasActiveCatalogFilters,
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/lib/catalog/query";
import { getCatalogProductUrl } from "@/lib/catalog/site-url";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";
import { LINKS } from "@/lib/links";
import { buildProductWhatsappUrl } from "@/lib/whatsapp/product-link";

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
  const groups = new Map<string, { name: string; products: CatalogProductCardData[]; slug: string | null }>();
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

async function buildProductConsultationLinks(products: CatalogProductCardData[]) {
  const entries = await Promise.all(
    products.map(async (product) => [
      product.id,
      await buildProductWhatsappUrl({
        brand: product.brand?.name,
        color: product.color,
        model: product.model,
        productName: product.name,
        productUrl: getCatalogProductUrl(product.slug),
        sku: product.sku,
      }),
    ] as const),
  );

  return new Map(entries);
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const [catalog, filters, collectionId] = await Promise.all([
    getCatalogPage(query),
    getCatalogFilterOptions(),
    query.collection ? getPublishedCollectionId(query.collection) : Promise.resolve(null),
  ]);
  const activeBrand = filters.brands.find((brand) => brand.key === query.brand);
  const groups = query.brand
    ? [{ name: activeBrand?.name ?? "Produtos", products: catalog.products, slug: query.brand }]
    : groupByBrand(catalog.products);
  const hasFilters = hasActiveCatalogFilters(query);
  const productConsultationLinks = await buildProductConsultationLinks(catalog.products);

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <section
          className={styles.hero}
          data-motion-reveal
          data-motion-variant="hero"
          aria-labelledby="catalog-title"
        >
          <div className={styles.heroInner}>
            <p className="eyebrow">Catálogo geral</p>
            <h1 id="catalog-title">Vitrine Vision</h1>
            <p className={styles.intro}>
              Explore armações nacionais e importadas em uma vitrine sem carrinho:
              cada modelo abre uma conversa direta com a equipe em Araguaína - TO.
            </p>
          </div>
        </section>

        <section
          className={styles.filters}
          data-motion-reveal
          data-motion-variant="section"
          aria-label="Filtros do catálogo"
        >
          <div className={styles.filterInner}>
            <div className={styles.brandBlock}>
              <span className={styles.filterLabel}>Navegar por marca</span>
              <nav className={styles.brandRail} aria-label="Selecionar marca">
                <Link
                  aria-current={!query.brand ? "page" : undefined}
                  href={catalogHref(query, { brand: null, page: 1 })}
                  scroll={false}
                >
                  Todas
                  <span>{filters.brands.reduce((sum, item) => sum + item.count, 0)}</span>
                </Link>
                {filters.brands.map((brand) => (
                  <Link
                    aria-current={query.brand === brand.key ? "page" : undefined}
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

            <form className={styles.filterForm} method="get" role="search">
              {query.brand ? <input name="marca" type="hidden" value={query.brand} /> : null}
              <label className={styles.field}>
                <span>Buscar por nome, modelo, SKU, cor ou marca</span>
                <input
                  defaultValue={query.search}
                  maxLength={80}
                  name="busca"
                  placeholder="Digite sua busca"
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
                <button className={styles.submit} type="submit">Aplicar filtros</button>
                {hasFilters ? <Link className={styles.clear} href="/catalogo">Limpar seleção</Link> : null}
              </div>
            </form>
          </div>
        </section>

        <section
          className={styles.results}
          data-motion-reveal
          data-motion-variant="section"
          aria-labelledby="catalog-results-title"
        >
          <div className={styles.resultsInner}>
            <div className={styles.resultSummary}>
              <h2 id="catalog-results-title">
                {query.brand && activeBrand ? activeBrand.name : "Seleção publicada"}
              </h2>
              <p aria-live="polite">
                {catalog.total} {catalog.total === 1 ? "produto" : "produtos"}
              </p>
            </div>

            {catalog.products.length === 0 ? (
              <div className={styles.empty}>
                <h2>{hasFilters ? "Nenhum resultado por aqui." : "A vitrine está sendo atualizada."}</h2>
                <p>
                  {hasFilters
                    ? "Mantenha os filtros visíveis, ajuste sua busca ou limpe a seleção."
                    : "Enquanto novos produtos são publicados, fale diretamente com a equipe Vision."}
                </p>
                <div className={styles.emptyActions}>
                  {hasFilters ? <Link href="/catalogo">Limpar filtros</Link> : null}
                  <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">
                    <MessageCircle aria-hidden="true" size={17} />
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.chapters} data-motion-stagger>
                {groups.map((group) => (
                  <section
                    className={styles.chapter}
                    data-motion-reveal
                    data-motion-variant="section"
                    key={group.slug ?? "vision"}
                  >
                    <div className={styles.chapterHeader}>
                      <div className={styles.chapterTitle}>
                        <h2>{group.name}</h2>
                        <span>{group.products.length}</span>
                      </div>
                      {!query.brand && group.slug ? (
                        <Link href={catalogHref(query, { brand: group.slug, page: 1 })} scroll={false}>
                          Ver toda a marca
                          <ArrowUpRight aria-hidden="true" size={16} />
                        </Link>
                      ) : null}
                    </div>
                    <div className={styles.grid} data-motion-stagger>
                      {group.products.map((product) => {
                        const whatsappUrl = productConsultationLinks.get(product.id);

                        return (
                          <CatalogProductCard
                            actionLabel={whatsappUrl ? "Consultar no WhatsApp" : undefined}
                            external={Boolean(whatsappUrl)}
                            href={whatsappUrl}
                            key={product.id}
                            product={product}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {catalog.totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Paginação do catálogo">
                {catalog.page > 1 ? (
                  <Link href={catalogHref(query, { page: catalog.page - 1 })} scroll={false}>
                    <ArrowLeft aria-hidden="true" size={16} />
                    Anterior
                  </Link>
                ) : <span />}
                <span>Página {catalog.page} de {catalog.totalPages}</span>
                {catalog.page < catalog.totalPages ? (
                  <Link href={catalogHref(query, { page: catalog.page + 1 })} scroll={false}>
                    Próxima
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                ) : <span />}
              </nav>
            ) : null}
          </div>
        </section>
        <CatalogAnalytics collectionId={collectionId} query={query} />
      </main>
      <SiteFooter />
    </div>
  );
}

function CatalogLoading() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero} data-motion-reveal data-motion-variant="hero">
          <div className={styles.heroInner}>
            <p className="eyebrow">Catálogo geral</p>
            <h1>Vitrine Vision</h1>
            <p className={styles.intro}>Preparando a vitrine publicada.</p>
          </div>
        </section>
        <section
          className={styles.results}
          data-motion-reveal
          data-motion-variant="section"
          aria-busy="true"
          aria-label="Carregando catálogo"
        >
          <div className={styles.resultsInner}>
            <div className={styles.loadingGrid}>
              {Array.from({ length: 8 }, (_, index) => (
                <span className={styles.loadingItem} key={index} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CatalogPage(props: { searchParams: Promise<CatalogSearchParams> }) {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <CatalogContent {...props} />
    </Suspense>
  );
}
