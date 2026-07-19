import "server-only";

import { unstable_cache } from "next/cache";

import { getCollectionPlacement, type CollectionHomeVariant } from "@/lib/content-placements";
import { getPublishedCatalogProductsByIds } from "@/lib/catalog/data";
import type { CatalogProductCard } from "@/lib/catalog/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { HOME_ROUTE_CACHE_TAG } from "../gallery/cache";

export type PublishedHomeCollection = {
  cover: {
    altText: string;
    assetVersion: string;
    blurDataUrl: string | null;
    desktopObjectPosition: string;
    desktopScale: number;
    height: number;
    mobileObjectPosition: string;
    mobileScale: number;
    publicationId: string;
    width: number;
  } | null;
  cta: { label: string; target: "catalog" | "collection" | "instagram" | "whatsapp" };
  description: string;
  galleryId: string | null;
  id: string;
  placementKey: string;
  products: CatalogProductCard[];
  slug: string;
  title: string;
  variant: CollectionHomeVariant;
};

type PublicationRow = {
  cover_alt_text: string | null;
  cover_asset_version: string | null;
  cover_blur_data_url: string | null;
  cover_desktop_object_position: string;
  cover_desktop_scale: number;
  cover_height: number | null;
  cover_mobile_object_position: string;
  cover_mobile_scale: number;
  cover_width: number | null;
  ends_at: string | null;
  home_cta_label: string | null;
  home_cta_target: "catalog" | "collection" | "instagram" | "whatsapp" | null;
  home_description: string | null;
  home_gallery_id: string | null;
  home_placement_key: string | null;
  home_title: string | null;
  home_variant: CollectionHomeVariant | null;
  id: string;
  slug: string;
  starts_at: string | null;
};

function isInWindow(startsAt: string | null, endsAt: string | null) {
  const now = Date.now();
  return (!startsAt || new Date(startsAt).getTime() <= now)
    && (!endsAt || new Date(endsAt).getTime() >= now);
}

function createCachedHomeCollection(placementKey: string) {
  return unstable_cache(
    async (): Promise<PublishedHomeCollection | null> => {
      const placement = getCollectionPlacement(placementKey);
      if (!placement) return null;
      const supabase = createSupabaseAdminClient();
      const { data: publication, error } = await supabase.from("collection_publications")
        .select("id, slug, starts_at, ends_at, home_placement_key, home_variant, home_title, home_description, home_cta_label, home_cta_target, home_gallery_id, cover_alt_text, cover_asset_version, cover_blur_data_url, cover_width, cover_height, cover_mobile_object_position, cover_desktop_object_position, cover_mobile_scale, cover_desktop_scale")
        .eq("active", true)
        .eq("home_enabled", true)
        .eq("home_placement_key", placementKey)
        .maybeSingle();
      if (error || !publication) return null;
      const row = publication as PublicationRow;
      if (!isInWindow(row.starts_at, row.ends_at) || !row.home_variant || !row.home_title || !row.home_description || !row.home_cta_label || !row.home_cta_target) return null;

      const { data: relations, error: relationError } = await supabase.from("collection_publication_products")
        .select("product_id, display_order")
        .eq("publication_id", row.id)
        .order("display_order");
      if (relationError) return null;
      const products = await getPublishedCatalogProductsByIds((relations ?? []).map((relation) => relation.product_id));

      const cover = row.cover_alt_text && row.cover_asset_version && row.cover_width && row.cover_height
        ? {
          altText: row.cover_alt_text,
          assetVersion: row.cover_asset_version,
          blurDataUrl: row.cover_blur_data_url,
          desktopObjectPosition: row.cover_desktop_object_position,
          desktopScale: Number(row.cover_desktop_scale),
          height: row.cover_height,
          mobileObjectPosition: row.cover_mobile_object_position,
          mobileScale: Number(row.cover_mobile_scale),
          publicationId: row.id,
          width: row.cover_width,
        }
        : null;

      return {
        cover,
        cta: { label: row.home_cta_label, target: row.home_cta_target },
        description: row.home_description,
        galleryId: row.home_gallery_id,
        id: row.id,
        placementKey,
        products,
        slug: row.slug,
        title: row.home_title,
        variant: row.home_variant,
      };
    },
    ["home-collection-publication-v2", placementKey],
    { revalidate: 28_800, tags: [`collection:home:${placementKey}`, HOME_ROUTE_CACHE_TAG] },
  );
}

export function getPublishedHomeCollection(placementKey: string) {
  return createCachedHomeCollection(placementKey)();
}
