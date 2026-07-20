import "server-only";

import { createSign } from "node:crypto";

import { unstable_cache } from "next/cache";

import { getGoogleAnalyticsServerConfig } from "./google-config";

type Row = { dimensions: string[]; metrics: number[] };
export type GoogleAnalyticsPeriod = number | { endDate: string; startDate: string };
export type GoogleAnalyticsResult<T> = { data: T | null; error: string | null; source: "Google Analytics"; updatedAt: string | null };

let tokenCache: { expiresAt: number; token: string } | null = null;

function encoded(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function accessToken() {
  const config = getGoogleAnalyticsServerConfig();
  if (!config) throw new Error("Integração incompleta");
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encoded({ alg: "RS256", typ: "JWT" })}.${encoded({ aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now, iss: config.clientEmail, scope: "https://www.googleapis.com/auth/analytics.readonly" })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(config.privateKey, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({ assertion, grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer" }),
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Conta de serviço sem acesso à propriedade" : "Falha ao autenticar na Data API");
  const payload = await response.json() as { access_token?: unknown; expires_in?: unknown };
  if (typeof payload.access_token !== "string") throw new Error("Resposta inválida da autenticação Google");
  tokenCache = { expiresAt: Date.now() + (typeof payload.expires_in === "number" ? payload.expires_in : 3500) * 1000, token: payload.access_token };
  return payload.access_token;
}

function normalizedRows(payload: unknown): Row[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const item = row && typeof row === "object" ? row as { dimensionValues?: Array<{ value?: unknown }>; metricValues?: Array<{ value?: unknown }> } : {};
    return {
      dimensions: (item.dimensionValues ?? []).map((entry) => typeof entry.value === "string" ? entry.value : ""),
      metrics: (item.metricValues ?? []).map((entry) => typeof entry.value === "string" ? Number(entry.value) || 0 : 0),
    };
  });
}

async function googleRequest(method: "runReport" | "runRealtimeReport", body: object) {
  const config = getGoogleAnalyticsServerConfig();
  if (!config) throw new Error("Integração incompleta");
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(config.propertyId)}:${method}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Data API sem permissão para esta propriedade");
    if (response.status === 429) throw new Error("Limite temporário da Data API atingido");
    throw new Error("Data API temporariamente indisponível");
  }
  return normalizedRows(await response.json());
}

function result<T>(data: T): GoogleAnalyticsResult<T> { return { data, error: null, source: "Google Analytics", updatedAt: new Date().toISOString() }; }
function failure<T>(error: unknown): GoogleAnalyticsResult<T> { return { data: null, error: error instanceof Error ? error.message : "Falha sanitizada na integração", source: "Google Analytics", updatedAt: null }; }
function dateRange(period: GoogleAnalyticsPeriod) { return typeof period === "number" ? [{ endDate: "today", startDate: `${Math.min(Math.max(period, 1), 365)}daysAgo` }] : [period]; }

const cachedOverview = unstable_cache(async (days: number) => {
  const rows = await googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }], orderBys: [{ dimension: { dimensionName: "date" } }] });
  return rows.map((row) => ({ activeUsers: row.metrics[0] ?? 0, date: row.dimensions[0] ?? "", sessions: row.metrics[1] ?? 0, views: row.metrics[2] ?? 0 }));
}, ["ga4-overview"], { revalidate: 600, tags: ["ga4:overview"] });

const cachedAcquisition = unstable_cache(async (days: GoogleAnalyticsPeriod) => {
  const [sources, campaigns, landingPages, devices] = await Promise.all([
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "sessionSourceMedium" }], limit: 50, metrics: [{ name: "sessions" }, { name: "activeUsers" }] }),
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "sessionCampaignName" }, { name: "sessionSource" }, { name: "sessionMedium" }], limit: 50, metrics: [{ name: "sessions" }] }),
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "landingPagePlusQueryString" }], limit: 50, metrics: [{ name: "sessions" }, { name: "activeUsers" }] }),
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "deviceCategory" }, { name: "browser" }, { name: "region" }], limit: 75, metrics: [{ name: "sessions" }, { name: "activeUsers" }] }),
  ]);
  return {
    campaigns: campaigns.map((row) => ({ campaign: row.dimensions[0], medium: row.dimensions[2], sessions: row.metrics[0], source: row.dimensions[1] })),
    devices: devices.map((row) => ({ browser: row.dimensions[1], device: row.dimensions[0], region: row.dimensions[2], sessions: row.metrics[0], users: row.metrics[1] })),
    landingPages: landingPages.map((row) => ({ landingPage: row.dimensions[0], sessions: row.metrics[0], users: row.metrics[1] })),
    sources: sources.map((row) => ({ sourceMedium: row.dimensions[0], sessions: row.metrics[0], users: row.metrics[1] })),
  };
}, ["ga4-acquisition"], { revalidate: 900, tags: ["ga4:acquisition"] });

const cachedBehavior = unstable_cache(async (days: number) => {
  const [pages, events] = await Promise.all([
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "pagePathPlusQueryString" }], limit: 50, metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }] }),
    googleRequest("runReport", { dateRanges: dateRange(days), dimensions: [{ name: "eventName" }], limit: 75, metrics: [{ name: "eventCount" }, { name: "totalUsers" }] }),
  ]);
  return { events: events.map((row) => ({ count: row.metrics[0], eventName: row.dimensions[0], users: row.metrics[1] })), pages: pages.map((row) => ({ path: row.dimensions[0], users: row.metrics[1], views: row.metrics[0] })) };
}, ["ga4-behavior"], { revalidate: 900, tags: ["ga4:behavior"] });

const cachedConversions = unstable_cache(async (days: number) => {
  const rows = await googleRequest("runReport", { dateRanges: dateRange(days), dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: ["product_whatsapp_clicked", "general_whatsapp_clicked"] } } }, dimensions: [{ name: "eventName" }, { name: "sessionSourceMedium" }, { name: "deviceCategory" }], limit: 100, metrics: [{ name: "eventCount" }, { name: "totalUsers" }] });
  return rows.map((row) => ({ device: row.dimensions[2], eventName: row.dimensions[0], events: row.metrics[0], sourceMedium: row.dimensions[1], users: row.metrics[1] }));
}, ["ga4-conversions"], { revalidate: 600, tags: ["ga4:conversions"] });

const cachedRealtime = unstable_cache(async () => {
  const [overview, geo, pages, events] = await Promise.all([
    googleRequest("runRealtimeReport", { metrics: [{ name: "activeUsers" }, { name: "eventCount" }, { name: "screenPageViews" }] }),
    googleRequest("runRealtimeReport", { dimensions: [{ name: "countryId" }, { name: "country" }, { name: "city" }], limit: 100, metrics: [{ name: "activeUsers" }, { name: "eventCount" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] }),
    googleRequest("runRealtimeReport", { dimensions: [{ name: "unifiedScreenName" }], limit: 50, metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] }),
    googleRequest("runRealtimeReport", { dimensions: [{ name: "eventName" }], limit: 75, metrics: [{ name: "activeUsers" }, { name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }] }),
  ]);
  return {
    cities: geo.map((row) => ({ activeUsers: row.metrics[0], city: row.dimensions[2], country: row.dimensions[1], countryCode: row.dimensions[0], eventCount: row.metrics[1] })),
    events: events.map((row) => ({ activeUsers: row.metrics[0], eventCount: row.metrics[1], eventName: row.dimensions[0] })),
    overview: { activeUsers: overview[0]?.metrics[0] ?? 0, eventCount: overview[0]?.metrics[1] ?? 0, pageViews: overview[0]?.metrics[2] ?? 0 },
    pages: pages.map((row) => ({ activeUsers: row.metrics[0], page: row.dimensions[0], views: row.metrics[1] })),
  };
}, ["ga4-realtime"], { revalidate: 45, tags: ["ga4:realtime"] });

export async function getOverviewReport(days: number) { try { return result(await cachedOverview(days)); } catch (error) { return failure<Awaited<ReturnType<typeof cachedOverview>>>(error); } }
export async function getAcquisitionReport(period: GoogleAnalyticsPeriod) { try { return result(await cachedAcquisition(period)); } catch (error) { return failure<Awaited<ReturnType<typeof cachedAcquisition>>>(error); } }
export async function getBehaviorReport(days: number) { try { return result(await cachedBehavior(days)); } catch (error) { return failure<Awaited<ReturnType<typeof cachedBehavior>>>(error); } }
export async function getConversionReport(days: number) { try { return result(await cachedConversions(days)); } catch (error) { return failure<Awaited<ReturnType<typeof cachedConversions>>>(error); } }
export async function getRealtimeReport() { try { return result(await cachedRealtime()); } catch (error) { return failure<Awaited<ReturnType<typeof cachedRealtime>>>(error); } }
export async function testGoogleAnalyticsConnection() {
  try {
    await googleRequest("runReport", { dateRanges: [{ startDate: "yesterday", endDate: "today" }], limit: 1, metrics: [{ name: "activeUsers" }] });
    return { ok: true, message: "Conexão com a Data API confirmada." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Falha sanitizada na conexão." }; }
}
