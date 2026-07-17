import "server-only";

import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { CATALOG_CACHE_TAG } from "./cache";

export const HOME_CATALOG_PREVIEW_SETTING_KEY = "home.catalog_preview.enabled";

export type HomeCatalogPreviewSettings = {
  configured: boolean;
  enabled: boolean;
};

export function parseHomeCatalogPreviewEnabled(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "enabled" in value &&
    typeof value.enabled === "boolean"
  ) {
    return value.enabled;
  }

  return true;
}

const getCachedHomeCatalogPreviewSettings = unstable_cache(
  async (): Promise<HomeCatalogPreviewSettings> => {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", HOME_CATALOG_PREVIEW_SETTING_KEY)
        .maybeSingle();

      if (error || !data) {
        return { configured: false, enabled: true };
      }

      return {
        configured: true,
        enabled: parseHomeCatalogPreviewEnabled(data.value),
      };
    } catch {
      return { configured: false, enabled: true };
    }
  },
  ["home-catalog-preview-settings-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export async function getHomeCatalogPreviewSettings() {
  return getCachedHomeCatalogPreviewSettings();
}
