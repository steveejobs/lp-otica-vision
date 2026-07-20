import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type InternalAnalyticsReport = {
  counts: Record<string, { events: number; sessions: number }>;
  days: number;
  external: Array<{ clicks: number; eventName: string }>;
  filters: Array<{ filterName: string; filterValue: string; uses: number }>;
  funnel: Array<{ label: string; sessions: number; step: number }>;
  recent: Array<{ createdAt: string; eventName: string; productId: string | null; route: string }>;
  retention: { aggregateDays: number; enforcement: string; rawDays: number; version: number } | null;
  routes: Array<{ route: string; views: number }>;
  timeline: Array<{ date: string; pageViews: number; whatsapp: number }>;
  topBrands: Array<{ slug: string; uses: number }>;
  topCategories: Array<{ slug: string; uses: number }>;
  topCollections: Array<{ opens: number; slug: string }>;
  topProducts: Array<{ id: string; name: string; slug: string; views: number; whatsapp: number }>;
  topStyles: Array<{ slug: string; uses: number }>;
};

export type AnalyticsProductCover = {
  altText: string;
  assetVersion: string;
  height: number | null;
  id: string;
  objectPosition: string;
  productId: string;
  width: number | null;
};

function object(value: Json | undefined): Record<string, Json | undefined> { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function array(value: Json | undefined) { return Array.isArray(value) ? value.map(object) : []; }
function text(value: Json | undefined) { return typeof value === "string" ? value : ""; }
function number(value: Json | undefined) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }

function empty(days: number): InternalAnalyticsReport {
  return { counts: {}, days, external: [], filters: [], funnel: [], recent: [], retention: null, routes: [], timeline: [], topBrands: [], topCategories: [], topCollections: [], topProducts: [], topStyles: [] };
}

function parseNew(value: Json, days: number): InternalAnalyticsReport {
  const root = object(value);
  const report = empty(days);
  const counts = object(root.counts);
  for (const [name, raw] of Object.entries(counts)) {
    const row = object(raw);
    report.counts[name] = { events: number(row.events), sessions: number(row.sessions) };
  }
  report.timeline = array(root.timeline).map((row) => ({ date: text(row.day), pageViews: number(row.page_views), whatsapp: number(row.whatsapp) }));
  report.funnel = array(root.funnel).map((row) => ({ label: text(row.label), sessions: number(row.sessions), step: number(row.step) }));
  report.topProducts = array(root.topProducts).map((row) => ({ id: text(row.id), name: text(row.name), slug: text(row.slug), views: number(row.views), whatsapp: number(row.whatsapp) })).filter((row) => row.id);
  report.topStyles = array(root.topStyles).map((row) => ({ slug: text(row.slug), uses: number(row.uses) })).filter((row) => row.slug);
  report.topCategories = array(root.topCategories).map((row) => ({ slug: text(row.slug), uses: number(row.uses) })).filter((row) => row.slug);
  report.topBrands = array(root.topBrands).map((row) => ({ slug: text(row.slug), uses: number(row.uses) })).filter((row) => row.slug);
  report.topCollections = array(root.topCollections).map((row) => ({ opens: number(row.opens), slug: text(row.slug) })).filter((row) => row.slug);
  report.filters = array(root.filters).map((row) => ({ filterName: text(row.filter_name), filterValue: text(row.filter_value), uses: number(row.uses) })).filter((row) => row.filterName && row.filterValue);
  report.routes = array(root.routes).map((row) => ({ route: text(row.route), views: number(row.views) })).filter((row) => row.route);
  report.external = array(root.external).map((row) => ({ clicks: number(row.clicks), eventName: text(row.event_name) })).filter((row) => row.eventName);
  report.recent = array(root.recent).map((row) => ({ createdAt: text(row.created_at), eventName: text(row.event_name), productId: text(row.product_id) || null, route: text(row.route) })).filter((row) => row.createdAt);
  const retention = object(root.retention);
  if (Object.keys(retention).length) report.retention = { aggregateDays: number(retention.aggregateDays), enforcement: text(retention.enforcement), rawDays: number(retention.rawDays), version: number(retention.version) };
  return report;
}

function parseLegacy(value: Json, days: number) {
  const root = object(value);
  const report = empty(days);
  report.topProducts = array(root.topProducts).map((row) => ({ id: text(row.id), name: text(row.name), slug: text(row.slug), views: number(row.views), whatsapp: number(row.clicks) })).filter((row) => row.id);
  report.topBrands = array(root.topBrands).map((row) => ({ slug: text(row.slug), uses: number(row.views) })).filter((row) => row.slug);
  report.filters = array(root.topFilters).map((row) => ({ filterName: text(row.filter_name), filterValue: text(row.value), uses: number(row.uses) })).filter((row) => row.filterName && row.filterValue);
  return report;
}

export async function getInternalAnalyticsReport(days: number) {
  const supabase = await createSupabaseServerClient();
  const current = await supabase.rpc("admin_analytics_report", { p_days: days });
  if (!current.error && current.data) return { data: parseNew(current.data, days), error: null, source: "Dados internos" as const };
  const legacy = await supabase.rpc("admin_catalog_analytics", { p_days: days });
  if (!legacy.error && legacy.data) return { data: parseLegacy(legacy.data, days), error: "A migração analítica do preview ainda não foi aplicada; exibindo o relatório legado.", source: "Dados internos" as const };
  return { data: empty(days), error: "Dados internos temporariamente indisponíveis.", source: "Dados internos" as const };
}

export async function getAnalyticsProductCovers(productIds: string[]) {
  if (!productIds.length) return {} as Record<string, AnalyticsProductCover>;
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from("product_images")
    .select("id, alt_text, asset_version, height, object_position, product_id, width")
    .in("product_id", productIds)
    .eq("is_cover", true);
  if (result.error || !result.data) return {} as Record<string, AnalyticsProductCover>;
  return Object.fromEntries(result.data.map((cover) => [cover.product_id, {
    altText: cover.alt_text,
    assetVersion: cover.asset_version,
    height: cover.height,
    id: cover.id,
    objectPosition: cover.object_position,
    productId: cover.product_id,
    width: cover.width,
  }])) as Record<string, AnalyticsProductCover>;
}
