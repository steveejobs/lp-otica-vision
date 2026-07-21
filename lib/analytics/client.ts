"use client";

import { readAnalyticsConsent, writeAnalyticsConsent, type AnalyticsConsentChoice } from "./consent";
import {
  analyticsEventSignature,
  analyticsPropertyNames,
  googleRecommendedEventMap,
  type AnalyticsEventInput,
  type AnalyticsProperties,
} from "./events";

declare global {
  interface Window {
    __visionGaReady?: boolean;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SESSION_KEY = "vision.analytics.session";
const LAST_PAGE_KEY = "vision.analytics.last-page";
const LAST_GOOGLE_PAGE_KEY = "vision.analytics.last-google-page";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedProperties = new Set<string>(analyticsPropertyNames);
const recentEvents = new Map<string, number>();

function anonymousSessionId() {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const value = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, value);
    return value;
  } catch {
    return null;
  }
}

function cleanProperties(properties: AnalyticsProperties | undefined) {
  const clean: AnalyticsProperties = {};
  for (const [key, raw] of Object.entries(properties ?? {}).slice(0, 16)) {
    if (!allowedProperties.has(key)) continue;
    if (typeof raw === "number" && Number.isFinite(raw)) clean[key as keyof AnalyticsProperties] = raw;
    if (typeof raw === "boolean") clean[key as keyof AnalyticsProperties] = raw;
    if (typeof raw === "string") {
      const value = raw.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 100);
      if (value && !value.includes("@") && !/https?:\/\/[^/]*\?.*(token|secret|signature)=/i.test(value)) {
        clean[key as keyof AnalyticsProperties] = value;
      }
    }
  }
  return clean;
}

function isAccidentalDuplicate(input: AnalyticsEventInput, properties: AnalyticsProperties) {
  if (input.eventName === "page_view") return false;
  const now = Date.now();
  const key = analyticsEventSignature(input, properties, window.location.pathname);
  const previous = recentEvents.get(key) ?? 0;
  recentEvents.set(key, now);
  if (recentEvents.size > 80) {
    for (const [candidate, time] of recentEvents) if (now - time > 5000) recentEvents.delete(candidate);
  }
  return now - previous < 900;
}

function sendInternal(payload: object, transport: AnalyticsEventInput["transport"]) {
  const body = JSON.stringify(payload);
  if (transport === "beacon" && typeof navigator.sendBeacon === "function") {
    try {
      if (navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }))) return;
    } catch {}
  }
  void fetch("/api/analytics", {
    body,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}

function sendGoogle(eventName: string, properties: AnalyticsProperties, productId?: string | null) {
  if (readAnalyticsConsent() !== "accepted" || typeof window.gtag !== "function") return;
  const debugMode = (() => { try { return window.sessionStorage.getItem("vision.ga.debug") === "1"; } catch { return false; } })();
  window.gtag("event", eventName, {
    ...properties,
    ...(debugMode ? { debug_mode: true } : {}),
    ...(eventName === "view_item" && productId ? {
      items: [{
        item_brand: properties.brand_slug,
        item_category: properties.category_slug,
        item_id: productId,
        item_name: properties.product_name ?? properties.product_slug ?? productId,
      }],
    } : {}),
  });
}

export function trackEvent(input: AnalyticsEventInput) {
  if (typeof window === "undefined") return;
  const properties = cleanProperties(input.properties);
  if (isAccidentalDuplicate(input, properties)) return;
  const payload = {
    anonymousSessionId: anonymousSessionId(),
    collectionId: input.collectionId ?? null,
    eventName: input.eventName,
    metadata: properties,
    productId: input.productId ?? null,
    route: window.location.pathname.slice(0, 500),
  };
  if (input.internal !== false) sendInternal(payload, input.transport);
  if (input.eventName !== "page_view") {
    sendGoogle(googleRecommendedEventMap[input.eventName] ?? input.eventName, {
      ...properties,
      ...(input.productId ? { product_id: input.productId } : {}),
    }, input.productId);
  }
}

export function trackGooglePageView(properties: AnalyticsProperties) {
  if (typeof window === "undefined" || readAnalyticsConsent() !== "accepted" || typeof window.gtag !== "function") return;
  const signature = String(properties.page_location ?? window.location.href);
  try {
    if (window.sessionStorage.getItem(LAST_GOOGLE_PAGE_KEY) === signature) return;
    window.sessionStorage.setItem(LAST_GOOGLE_PAGE_KEY, signature);
  } catch {}
  sendGoogle("page_view", properties);
}

export function trackPageView(input: { location: string; referrer?: string; title: string }) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    const last = JSON.parse(window.sessionStorage.getItem(LAST_PAGE_KEY) ?? "null") as { location?: string; time?: number } | null;
    if (last?.location === input.location && typeof last.time === "number" && now - last.time < 1500) return;
    window.sessionStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ location: input.location, time: now }));
  } catch {}
  const url = new URL(input.location, window.location.origin);
  const properties: AnalyticsProperties = {
    page_location: `${url.origin}${url.pathname}${url.search}`,
    page_title: input.title.slice(0, 100),
    source_route: url.pathname,
  };
  if (input.referrer) properties.page_referrer = input.referrer.slice(0, 100);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const value = url.searchParams.get(key);
    if (value) properties[key] = value;
  }
  trackEvent({ eventName: "page_view", properties });
  trackGooglePageView(properties);
}

export function updateAnalyticsConsent(choice: Exclude<AnalyticsConsentChoice, "unknown">) {
  writeAnalyticsConsent(choice);
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: choice === "accepted" ? "granted" : "denied",
    });
  }
}

export const trackCatalogEvent = (input: {
  collectionId?: string | null;
  eventName: AnalyticsEventInput["eventName"];
  metadata?: AnalyticsProperties;
  productId?: string | null;
}) => {
  trackEvent({ collectionId: input.collectionId, eventName: input.eventName, productId: input.productId, properties: input.metadata });
  return Promise.resolve();
};
