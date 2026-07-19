import "server-only";

import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { HERO_CACHE_TAG, HOME_ROUTE_CACHE_TAG } from "./cache";

export type HeroEditorialRole = "primary" | "secondary" | "detail";

export type HeroMedia = {
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
  role: HeroEditorialRole;
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
  editorial_role: HeroEditorialRole;
  height: number;
  id: string;
  mobile_object_position: string;
  mobile_scale: number;
  width: number;
};

const getCachedHomeHero = unstable_cache(
  async (): Promise<HeroMedia[]> => {
    const supabase = createSupabaseAdminClient();
    const { data: gallery } = await supabase.from("galleries")
      .select("id")
      .eq("route_key", "home")
      .eq("placement_key", "hero")
      .eq("published", true)
      .maybeSingle();
    if (!gallery) return [];

    const { data: publication } = await supabase.from("gallery_publications")
      .select("id")
      .eq("gallery_id", gallery.id)
      .eq("active", true)
      .maybeSingle();
    if (!publication) return [];

    const { data, error } = await supabase.from("gallery_publication_items")
      .select("id, alt_text, mobile_object_position, desktop_object_position, mobile_scale, desktop_scale, editorial_role, background_color, blur_data_url, asset_version, width, height, display_order")
      .eq("publication_id", publication.id)
      .order("display_order")
      .limit(3);
    if (error || !data) return [];

    return (data as PublicationItemRow[]).map((item) => ({
      altText: item.alt_text,
      assetVersion: item.asset_version,
      backgroundColor: item.background_color ?? "#d7c3ad",
      blurDataUrl: item.blur_data_url,
      desktopObjectPosition: item.desktop_object_position,
      desktopScale: Number(item.desktop_scale),
      height: item.height,
      id: item.id,
      mobileObjectPosition: item.mobile_object_position,
      mobileScale: Number(item.mobile_scale),
      role: item.editorial_role,
      width: item.width,
    }));
  },
  ["home-hero-publication-v1"],
  { revalidate: 28_800, tags: [HERO_CACHE_TAG, HOME_ROUTE_CACHE_TAG] },
);

export function getHomeHeroMedia() {
  return getCachedHomeHero();
}
