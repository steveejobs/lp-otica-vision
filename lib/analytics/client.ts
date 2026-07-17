"use client";

import type { Database, Json } from "@/types/supabase";

type EventName = Database["public"]["Enums"]["analytics_event_name"];

type TrackCatalogEvent = {
  collectionId?: string | null;
  eventName: EventName;
  metadata?: Record<string, Json>;
  productId?: string | null;
  promotionId?: string | null;
};

const SESSION_KEY = "vision.catalog.session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function trackCatalogEvent(input: TrackCatalogEvent) {
  if (typeof window === "undefined") return Promise.resolve();

  const payload = {
    anonymousSessionId: anonymousSessionId(),
    collectionId: input.collectionId ?? null,
    eventName: input.eventName,
    metadata: input.metadata ?? {},
    productId: input.productId ?? null,
    promotionId: input.promotionId ?? null,
    route: window.location.pathname,
  };

  return fetch("/api/analytics", {
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).then(() => undefined).catch(() => undefined);
}
