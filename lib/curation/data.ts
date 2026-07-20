import "server-only";

import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAG } from "@/lib/catalog/cache";
import type { CatalogImage, CatalogTaxonomy } from "@/lib/catalog/types";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/supabase";

import type { CurationCategory, CurationSelection, CurationStyle, CuratedProduct } from "./types";

type CuratedRow = Database["public"]["Functions"]["search_curated_catalog_products"]["Returns"][number];

function taxonomy(id: string | null, name: string | null, slug: string | null): CatalogTaxonomy | null {
  return id && name && slug ? { id, name, slug } : null;
}

function cover(row: CuratedRow): CatalogImage {
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

function product(row: CuratedRow): CuratedProduct {
  return {
    availability: row.availability_status === "consultation" ? "available" : row.availability_status,
    brand: taxonomy(row.brand_id, row.brand_name, row.brand_slug),
    category: taxonomy(row.category_id, row.category_name, row.category_slug),
    color: row.color ?? null,
    cover: cover(row),
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
    styleDisplayOrder: row.style_display_order,
    styleFeatured: row.style_featured,
    styleId: row.style_id,
    styleLabel: row.style_label,
    styleSlug: row.style_slug,
    updatedAt: row.updated_at,
  };
}

const getCachedStyleOptions = unstable_cache(
  async (categorySlug: string | null): Promise<CurationStyle[]> => {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase.rpc("curation_style_options", {
        ...(categorySlug ? { p_category_slug: categorySlug } : {}),
      });
      if (error || !data) return [];
      return data.map((style) => ({
        description: style.description,
        displayOrder: style.display_order,
        id: style.id,
        label: style.label,
        productCount: Number(style.product_count),
        slug: style.slug,
      }));
    } catch {
      return [];
    }
  },
  ["curation-style-options-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

const getCachedCategoryOptions = unstable_cache(
  async (styleSlug: string): Promise<CurationCategory[]> => {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase.rpc("curation_category_options", { p_style_slug: styleSlug });
      if (error || !data) return [];
      return data.map((category) => ({
        displayOrder: category.display_order,
        id: category.id,
        label: category.name,
        productCount: Number(category.product_count),
        slug: category.slug,
      }));
    } catch {
      return [];
    }
  },
  ["curation-category-options-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export async function getCuratedProducts(input: {
  categorySlug?: string | null;
  limit?: number;
  offset?: number;
  styleSlug: string;
}) {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("search_curated_catalog_products", {
      p_category_slug: input.categorySlug ?? undefined,
      p_page_offset: input.offset ?? 0,
      p_page_size: Math.min(Math.max(input.limit ?? 8, 1), 48),
      p_style_slug: input.styleSlug,
    });
    if (error || !data) return { products: [], total: 0 };
    return {
      products: data.map(product),
      total: Number(data[0]?.total_count ?? 0),
    };
  } catch {
    return { products: [], total: 0 };
  }
}

export function getCurationStyleOptions(categorySlug: string | null = null) {
  return getCachedStyleOptions(categorySlug);
}

export function getCurationCategoryOptions(styleSlug: string) {
  return getCachedCategoryOptions(styleSlug);
}

export async function getCurationSelection(input: {
  categorySlug?: string | null;
  limit?: number;
  styleSlug?: string | null;
}): Promise<CurationSelection | null> {
  const styles = await getCurationStyleOptions(input.categorySlug ?? null);
  const selected = styles.find((style) => style.slug === input.styleSlug && style.productCount > 0)
    ?? styles.find((style) => style.productCount > 0);
  if (!selected) return null;
  const categories = await getCurationCategoryOptions(selected.slug);
  const categorySlug = input.categorySlug && categories.some((category) => category.slug === input.categorySlug)
    ? input.categorySlug
    : null;
  const result = await getCuratedProducts({
    categorySlug,
    limit: input.limit ?? 8,
    styleSlug: selected.slug,
  });
  if (!result.products.length) return null;
  return {
    categories,
    categorySlug,
    products: result.products,
    styleSlug: selected.slug,
    styles,
    total: result.total,
  };
}
