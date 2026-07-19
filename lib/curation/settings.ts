import "server-only";

import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAG } from "@/lib/catalog/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const HOME_CURATION_SETTING_KEY = "home.style_curator";

export type HomeCurationSettings = {
  categorySlug: string | null;
  configured: boolean;
  displayOrder: number;
  enabled: boolean;
  initialStyle: string;
  published: boolean;
  revision: number;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseHomeCurationSettings(value: unknown): HomeCurationSettings {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const initialStyle = typeof record.initialStyle === "string" && slugPattern.test(record.initialStyle)
    ? record.initialStyle
    : "classica";
  const categorySlug = typeof record.categorySlug === "string" && slugPattern.test(record.categorySlug)
    ? record.categorySlug
    : null;
  return {
    categorySlug,
    configured: Object.keys(record).length > 0,
    displayOrder: Number.isSafeInteger(record.displayOrder) ? Number(record.displayOrder) : 5,
    enabled: typeof record.enabled === "boolean" ? record.enabled : true,
    initialStyle,
    published: typeof record.published === "boolean" ? record.published : true,
    revision: Number.isSafeInteger(record.revision) && Number(record.revision) > 0 ? Number(record.revision) : 1,
  };
}

const getCachedHomeCurationSettings = unstable_cache(
  async (): Promise<HomeCurationSettings> => {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", HOME_CURATION_SETTING_KEY)
        .maybeSingle();
      if (error || !data) return parseHomeCurationSettings(null);
      return parseHomeCurationSettings(data.value);
    } catch {
      return parseHomeCurationSettings(null);
    }
  },
  ["home-style-curator-settings-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export function getHomeCurationSettings() {
  return getCachedHomeCurationSettings();
}

