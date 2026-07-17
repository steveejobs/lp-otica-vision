import "server-only";

import { unstable_cache } from "next/cache";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/supabase";

import { CATALOG_CACHE_TAG } from "./cache";
import { availabilityLabels } from "./format";
import type {
  CatalogFilterOption,
  CatalogFilterOptions,
  CatalogImage,
  CatalogPageResult,
  CatalogProduct,
  CatalogProductCard,
  CatalogQuery,
  CatalogTaxonomy,
} from "./types";

export const CATALOG_PAGE_SIZE = 24;
export const HOME_CATALOG_PREVIEW_SIZE = 6;

type SearchRow = Database["public"]["Functions"]["search_catalog_products"]["Returns"][number];

function taxonomy(id: string | null, name: string | null, slug: string | null): CatalogTaxonomy | null {
  return id && name && slug ? { id, name, slug } : null;
}

function coverFromSearch(row: SearchRow): CatalogImage {
  return {
    altText: row.cover_alt_text,
    blurDataUrl: row.cover_blur_data_url,
    height: row.cover_height,
    id: row.cover_image_id,
    isCover: true,
    objectPosition: row.cover_object_position,
    updatedAt: row.cover_updated_at,
    width: row.cover_width,
  };
}

function cardFromSearch(row: SearchRow): CatalogProductCard {
  return {
    availability: row.availability_status,
    brand: taxonomy(row.brand_id, row.brand_name, row.brand_slug),
    category: taxonomy(row.category_id, row.category_name, row.category_slug),
    color: row.color ?? null,
    cover: coverFromSearch(row),
    displayOrder: row.display_order,
    featured: row.featured,
    id: row.product_id,
    model: row.model ?? null,
    name: row.product_name,
    price: row.price ?? null,
    priceVisibility: row.price_visibility,
    shortDescription: row.short_description ?? null,
    sku: row.sku,
    slug: row.slug,
    updatedAt: row.updated_at,
  };
}

function genericCatalogError() {
  return new Error("Não foi possível carregar o catálogo agora.");
}

export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPageResult> {
  const supabase = createSupabasePublicClient();
  const args: Database["public"]["Functions"]["search_catalog_products"]["Args"] = {
    p_page_offset: (query.page - 1) * CATALOG_PAGE_SIZE,
    p_page_size: CATALOG_PAGE_SIZE,
  };

  if (query.search) args.p_search_term = query.search;
  if (query.brand) args.p_brand_slug = query.brand;
  if (query.category) args.p_category_slug = query.category;
  if (query.availability) args.p_availability = query.availability;
  if (query.collection) args.p_collection_slug = query.collection;

  const { data, error } = await supabase.rpc("search_catalog_products", args);
  if (error || !data) throw genericCatalogError();

  const total = data[0]?.total_count ?? 0;
  return {
    page: query.page,
    pageSize: CATALOG_PAGE_SIZE,
    products: data.map(cardFromSearch),
    total,
    totalPages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

const getCachedFilterOptions = unstable_cache(
  async (): Promise<CatalogFilterOptions> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("catalog_filter_options");
    if (error || !data) throw genericCatalogError();

    const groups: CatalogFilterOptions = {
      availability: [],
      brands: [],
      categories: [],
      collections: [],
    };
    const add = (target: CatalogFilterOption[], row: (typeof data)[number], name = row.option_name) => {
      target.push({
        count: row.product_count,
        key: row.option_key,
        name,
        order: row.display_order,
      });
    };

    for (const row of data) {
      if (row.product_count < 1) continue;
      if (row.option_type === "brand") add(groups.brands, row);
      if (row.option_type === "category") add(groups.categories, row);
      if (row.option_type === "collection") add(groups.collections, row);
      if (row.option_type === "availability") {
        const label = availabilityLabels[row.option_key as keyof typeof availabilityLabels];
        if (label) add(groups.availability, row, label);
      }
    }

    const sortOptions = (left: CatalogFilterOption, right: CatalogFilterOption) =>
      left.order - right.order || left.name.localeCompare(right.name, "pt-BR");
    groups.brands.sort(sortOptions);
    groups.categories.sort(sortOptions);
    groups.collections.sort(sortOptions);
    groups.availability.sort(sortOptions);
    return groups;
  },
  ["catalog-filter-options-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export async function getCatalogFilterOptions() {
  return getCachedFilterOptions();
}

type EmbeddedCardRow = {
  archived_at: string | null;
  availability_status: CatalogProductCard["availability"];
  brand: { active: boolean; id: string; name: string; slug: string } | null;
  brand_id: string | null;
  category: { active: boolean; id: string; name: string; slug: string } | null;
  category_id: string | null;
  color: string | null;
  cover: Array<{
    alt_text: string;
    blur_data_url: string | null;
    height: number | null;
    id: string;
    is_cover: boolean;
    object_position: string;
    updated_at: string;
    width: number | null;
  }>;
  display_order: number;
  featured: boolean;
  id: string;
  model: string | null;
  name: string;
  price: number | null;
  price_visibility: CatalogProductCard["priceVisibility"];
  published: boolean;
  short_description: string | null;
  sku: string;
  slug: string;
  updated_at: string;
};

function cardFromEmbedded(row: EmbeddedCardRow): CatalogProductCard | null {
  const cover = row.cover.find((image) => image.is_cover);
  if (
    !cover ||
    cover.width === null ||
    cover.height === null ||
    (row.brand_id && (!row.brand || !row.brand.active)) ||
    (row.category_id && (!row.category || !row.category.active))
  ) return null;

  return {
    availability: row.availability_status,
    brand: row.brand ? taxonomy(row.brand.id, row.brand.name, row.brand.slug) : null,
    category: row.category ? taxonomy(row.category.id, row.category.name, row.category.slug) : null,
    color: row.color,
    cover: {
      altText: cover.alt_text,
      blurDataUrl: cover.blur_data_url,
      height: cover.height,
      id: cover.id,
      isCover: true,
      objectPosition: cover.object_position,
      updatedAt: cover.updated_at,
      width: cover.width,
    },
    displayOrder: row.display_order,
    featured: row.featured,
    id: row.id,
    model: row.model,
    name: row.name,
    price: row.price,
    priceVisibility: row.price_visibility,
    shortDescription: row.short_description,
    sku: row.sku,
    slug: row.slug,
    updatedAt: row.updated_at,
  };
}

const embeddedCardSelect = `
  id, sku, slug, name, brand_id, category_id, model, color, short_description,
  price, price_visibility, availability_status, published, featured, display_order,
  archived_at, updated_at,
  brand:brands(id, name, slug, active),
  category:categories(id, name, slug, active),
  cover:product_images!inner(id, alt_text, blur_data_url, object_position, width, height, is_cover, updated_at)
`;

const getCachedFeaturedProducts = unstable_cache(
  async (): Promise<CatalogProductCard[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(embeddedCardSelect)
      .eq("published", true)
      .eq("featured", true)
      .is("archived_at", null)
      .eq("cover.is_cover", true)
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(HOME_CATALOG_PREVIEW_SIZE);

    if (error || !data) return [];
    return (data as unknown as EmbeddedCardRow[])
      .map(cardFromEmbedded)
      .filter((item): item is CatalogProductCard => Boolean(item))
      .slice(0, HOME_CATALOG_PREVIEW_SIZE);
  },
  ["home-catalog-featured-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export async function getFeaturedCatalogProducts() {
  return getCachedFeaturedProducts();
}

const getCachedPublishedProduct = unstable_cache(
  async (slug: string): Promise<CatalogProduct | null> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, sku, slug, name, brand_id, category_id, model, color, short_description,
        price, price_visibility, availability_status, published, featured, display_order,
        archived_at, updated_at,
        brand:brands(id, name, slug, active),
        category:categories(id, name, slug, active),
        images:product_images(id, alt_text, blur_data_url, object_position, width, height, is_cover, display_order, updated_at)
      `)
      .eq("slug", slug)
      .eq("published", true)
      .is("archived_at", null)
      .maybeSingle();

    if (error) throw genericCatalogError();
    if (!data) return null;
    if ((data.brand_id && (!data.brand || !data.brand.active)) || (data.category_id && (!data.category || !data.category.active))) {
      return null;
    }

    const images = data.images
      .filter((image) => image.width !== null && image.height !== null)
      .sort((left, right) => left.display_order - right.display_order)
      .map((image): CatalogImage => ({
        altText: image.alt_text,
        blurDataUrl: image.blur_data_url,
        height: image.height as number,
        id: image.id,
        isCover: image.is_cover,
        objectPosition: image.object_position,
        updatedAt: image.updated_at,
        width: image.width as number,
      }));
    const cover = images.find((image) => image.isCover);
    if (!cover) return null;

    return {
      availability: data.availability_status,
      brand: data.brand ? taxonomy(data.brand.id, data.brand.name, data.brand.slug) : null,
      category: data.category ? taxonomy(data.category.id, data.category.name, data.category.slug) : null,
      color: data.color,
      cover,
      displayOrder: data.display_order,
      featured: data.featured,
      id: data.id,
      images,
      model: data.model,
      name: data.name,
      price: data.price,
      priceVisibility: data.price_visibility,
      shortDescription: data.short_description,
      sku: data.sku,
      slug: data.slug,
      updatedAt: data.updated_at,
    };
  },
  ["published-catalog-product-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export async function getPublishedCatalogProduct(slug: string) {
  return getCachedPublishedProduct(slug);
}

export async function getRelatedCatalogProducts(product: CatalogProduct) {
  const supabase = createSupabasePublicClient();
  let query = supabase
    .from("products")
    .select(embeddedCardSelect)
    .eq("published", true)
    .is("archived_at", null)
    .neq("id", product.id)
    .eq("cover.is_cover", true)
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .limit(4);

  if (product.brand) query = query.eq("brand_id", product.brand.id);
  else if (product.category) query = query.eq("category_id", product.category.id);
  else return [];

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as EmbeddedCardRow[])
    .map(cardFromEmbedded)
    .filter((item): item is CatalogProductCard => Boolean(item));
}

export async function getCatalogSitemapProducts() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("catalog_sitemap_products");
  if (error || !data) return [];
  return data;
}

export async function getPublishedCollectionId(slug: string) {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return error ? null : data?.id ?? null;
}
