import type { Json } from "@/types/supabase";

const metadataKeys = new Set([
  "availability",
  "brand_slug",
  "category_slug",
  "click_location",
  "collection_slug",
  "filter_name",
  "filter_value",
  "product_slug",
  "search_result_count",
  "scroll_percent",
  "source_route",
  "style_slug",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);
const filterValuePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const routePattern = /^\/[a-z0-9/_-]*$/i;
const scrollMilestones = new Set([25, 50, 75, 100]);

export function sanitizeAnalyticsMetadata(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const clean: Record<string, Json> = {};

  for (const [key, item] of Object.entries(value).slice(0, 8)) {
    if (!metadataKeys.has(key)) continue;
    if (key === "scroll_percent") {
      if (typeof item === "number" && scrollMilestones.has(item)) {
        clean[key] = item;
      }
      continue;
    }
    if (typeof item === "boolean" || typeof item === "number") {
      clean[key] = item;
    } else if (typeof item === "string") {
      const normalized = item.normalize("NFKC").replace(/\s+/g, " ").trim();
      if (!normalized || normalized.length > 100) continue;
      if (normalized.includes("@") || /https?:\/\//i.test(normalized) || /\d{6,}/.test(normalized)) continue;
      if (key === "source_route") {
        if (routePattern.test(normalized)) clean[key] = normalized;
      } else if (["brand_slug", "category_slug", "collection_slug", "filter_name", "filter_value", "product_slug", "style_slug", "availability"].includes(key)) {
        if (filterValuePattern.test(normalized)) clean[key] = normalized;
      } else clean[key] = normalized;
    }
  }

  return JSON.stringify(clean).length <= 1024 ? clean : {};
}
