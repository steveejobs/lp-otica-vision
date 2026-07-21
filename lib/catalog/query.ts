import type { CatalogAvailability, CatalogQuery } from "./types";
export type { CatalogAvailability, CatalogQuery };

const availabilityValues = new Set<CatalogAvailability>([
  "available",
  "last_unit",
  "unavailable",
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SearchValue = string | string[] | undefined;
export type CatalogSearchParams = Record<string, SearchValue>;

function scalar(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function safeSlug(value: SearchValue) {
  const clean = scalar(value)?.trim().toLowerCase() ?? "";
  return clean.length <= 120 && slugPattern.test(clean) ? clean : null;
}

function safeSearch(value: SearchValue) {
  return (scalar(value) ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function parseCatalogQuery(params: CatalogSearchParams): CatalogQuery {
  const requestedPage = Number.parseInt(scalar(params.pagina) ?? "1", 10);
  const rawAvailability = scalar(params.disponibilidade);

  return {
    availability:
      rawAvailability && availabilityValues.has(rawAvailability as CatalogAvailability)
        ? (rawAvailability as CatalogAvailability)
        : null,
    brand: safeSlug(params.marca),
    category: safeSlug(params.categoria),
    collection: safeSlug(params.colecao),
    product: safeSlug(params.produto),
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 1000)
        : 1,
    search: safeSearch(params.busca),
    style: safeSlug(params.estilo),
  };
}

export function catalogHref(
  current: CatalogQuery,
  changes: Partial<CatalogQuery>,
) {
  const next = { ...current, ...changes };
  const query = new URLSearchParams();

  if (next.search) query.set("busca", next.search);
  if (next.brand) query.set("marca", next.brand);
  if (next.category) query.set("categoria", next.category);
  if (next.availability) query.set("disponibilidade", next.availability);
  if (next.collection) query.set("colecao", next.collection);
  if (next.style) query.set("estilo", next.style);
  if (next.product) query.set("produto", next.product);
  if (next.page > 1) query.set("pagina", String(next.page));

  const value = query.toString();
  return value ? `/catalogo?${value}` : "/catalogo";
}

export function hasActiveCatalogFilters(query: CatalogQuery) {
  return Boolean(
    query.search ||
      query.brand ||
      query.category ||
      query.availability ||
      query.collection ||
      query.style,
  );
}

export function catalogProductHref(slug: string, query: CatalogQuery) {
  const params = new URLSearchParams();
  if (query.style) params.set("estilo", query.style);
  if (query.category) params.set("categoria", query.category);
  const suffix = params.toString();
  return suffix ? `/catalogo/${slug}?${suffix}` : `/catalogo/${slug}`;
}
