import "server-only";

import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/supabase";

export const runtime = "nodejs";

type EventName = Database["public"]["Enums"]["analytics_event_name"];

const eventNames = new Set<EventName>([
  "page_view",
  "product_view",
  "product_whatsapp_click",
  "collection_view",
  "promotion_view",
  "promotion_click",
  "gallery_interaction",
]);
const metadataKeys = new Set([
  "item_index",
  "position",
  "source",
  "surface",
  "test",
  "viewport",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rateBuckets = new Map<string, { count: number; expiresAt: number }>();

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

function optionalUuid(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : undefined;
}

function sanitizeMetadata(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const clean: Record<string, Json> = {};

  for (const [key, item] of Object.entries(value).slice(0, 8)) {
    if (!metadataKeys.has(key)) continue;
    if (typeof item === "boolean" || typeof item === "number") {
      clean[key] = item;
    } else if (typeof item === "string" && item.length <= 100) {
      clean[key] = item;
    }
  }

  return JSON.stringify(clean).length <= 1024 ? clean : {};
}

function referrerDomain(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

function rateLimitKey(request: Request, sessionId: string | null) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 160) ?? "unknown";
  return createHash("sha256")
    .update(`${sessionId ?? "no-session"}|${address}|${agent}`)
    .digest("hex");
}

function exceedsRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    rateBuckets.set(key, { count: 1, expiresAt: now + 60_000 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > 30;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ accepted: false }, 415);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return jsonResponse({ accepted: false }, 403);
  }

  const raw = await request.text();
  if (!raw || raw.length > 8192) {
    return jsonResponse({ accepted: false }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonResponse({ accepted: false }, 400);
  }

  const eventName = body.eventName;
  const route = body.route;
  const productId = optionalUuid(body.productId);
  const collectionId = optionalUuid(body.collectionId);
  const promotionId = optionalUuid(body.promotionId);
  const sessionId = optionalUuid(body.anonymousSessionId);

  if (
    typeof eventName !== "string" ||
    !eventNames.has(eventName as EventName) ||
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.startsWith("//") ||
    route.length > 500 ||
    productId === undefined ||
    collectionId === undefined ||
    promotionId === undefined ||
    sessionId === undefined
  ) {
    return jsonResponse({ accepted: false }, 400);
  }

  if (exceedsRateLimit(rateLimitKey(request, sessionId))) {
    return jsonResponse({ accepted: false }, 429);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("analytics_events").insert({
    anonymous_session_id: sessionId,
    collection_id: collectionId,
    event_name: eventName as EventName,
    metadata: sanitizeMetadata(body.metadata),
    product_id: productId,
    promotion_id: promotionId,
    referrer_domain: referrerDomain(request.headers.get("referer")),
    route,
  });

  if (error) {
    return jsonResponse({ accepted: false }, 400);
  }

  return jsonResponse({ accepted: true }, 202);
}
