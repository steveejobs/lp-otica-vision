import "server-only";

import { unstable_cache } from "next/cache";

import { getPublicPlacement } from "@/lib/content-placements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { galleryPlacementCacheTag, HOME_ROUTE_CACHE_TAG } from "./cache";

export type GalleryEditorialRole = "primary" | "secondary" | "detail";

export type PublishedGalleryMedia = {
  altText: string;
  assetVersion: string;
  backgroundColor: string;
  blurDataUrl: string | null;
  desktopObjectPosition: string;
  desktopScale: number;
  height: number;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  role: GalleryEditorialRole;
  seriesId: string;
  width: number;
};

type PublicationItemRow = {
  alt_text: string;
  asset_version: string;
  background_color: string | null;
  blur_data_url: string | null;
  desktop_object_position: string;
  desktop_scale: number;
  display_order: number;
  editorial_role: GalleryEditorialRole;
  height: number;
  id: string;
  mobile_object_position: string;
  mobile_scale: number;
  visual_series: string | null;
  width: number;
};

function createCachedPublishedGallery(routeKey: string, placementKey: string) {
  return unstable_cache(
    async (): Promise<PublishedGalleryMedia[]> => {
      const placement = getPublicPlacement(routeKey, placementKey);
      if (!placement || placement.status !== "implemented" || !placement.galleryMedia) return [];

      const supabase = createSupabaseAdminClient();
      const { data: gallery } = await supabase.from("galleries")
        .select("id")
        .eq("route_key", routeKey)
        .eq("placement_key", placementKey)
        .eq("published", true)
        .maybeSingle();
      if (!gallery) return [];

      const { data: publication } = await supabase.from("gallery_publications")
        .select("id")
        .eq("gallery_id", gallery.id)
        .eq("active", true)
        .maybeSingle();
      if (!publication) return [];

      const withSeries = await supabase.from("gallery_publication_items")
        .select("id, alt_text, mobile_object_position, desktop_object_position, mobile_scale, desktop_scale, editorial_role, background_color, blur_data_url, asset_version, width, height, display_order, visual_series")
        .eq("publication_id", publication.id)
        .order("display_order");
      const fallback = withSeries.error
        ? await supabase.from("gallery_publication_items")
            .select("id, alt_text, mobile_object_position, desktop_object_position, mobile_scale, desktop_scale, editorial_role, background_color, blur_data_url, asset_version, width, height, display_order")
            .eq("publication_id", publication.id)
            .order("display_order")
        : null;
      const data = (withSeries.error ? fallback?.data : withSeries.data) as unknown as PublicationItemRow[] | null;
      const error = withSeries.error ? fallback?.error : withSeries.error;
      if (error || !data) return [];

      return data.map((item) => ({
        altText: item.alt_text,
        assetVersion: item.asset_version,
        backgroundColor: item.background_color ?? "var(--vision-sand)",
        blurDataUrl: item.blur_data_url,
        desktopObjectPosition: item.desktop_object_position,
        desktopScale: Number(item.desktop_scale),
        height: item.height,
        id: item.id,
        mobileObjectPosition: item.mobile_object_position,
        mobileScale: Number(item.mobile_scale),
        role: item.editorial_role,
        seriesId: item.visual_series ?? "editorial",
        width: item.width,
      }));
    },
    ["published-gallery-media-v3", routeKey, placementKey],
    {
      revalidate: 28_800,
      tags: [galleryPlacementCacheTag(routeKey, placementKey), ...(routeKey === "home" ? [HOME_ROUTE_CACHE_TAG] : [])],
    },
  );
}

export function getPublishedGalleryMedia(routeKey: string, placementKey: string) {
  return createCachedPublishedGallery(routeKey, placementKey)();
}
