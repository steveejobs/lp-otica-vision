import "server-only";

import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";

import { analyticsEventNames, type AnalyticsEventName } from "@/lib/analytics/events";
import { sanitizeAnalyticsMetadata } from "@/lib/analytics/server-event";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

type EventName = Database["public"]["Enums"]["analytics_event_name"];
const eventNames = new Set<AnalyticsEventName>(analyticsEventNames);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function referrerDomain(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

function hasSameOrigin(request: Request, origin: string) {
  try {
    const parsed = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || new URL(request.url).protocol.replace(":", "");
    return parsed.host === requestHost && parsed.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

function rateLimitKey(request: Request, sessionId: string | null) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) return null;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 160) ?? "unknown";
  return createHmac("sha256", secret)
    .update(`${sessionId ?? "no-session"}|${address}|${agent}`)
    .digest("hex");
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ accepted: false }, 415);
  }

  const origin = request.headers.get("origin");
  if (origin && !hasSameOrigin(request, origin)) {
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
    !eventNames.has(eventName as AnalyticsEventName) ||
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

  const fingerprintHash = rateLimitKey(request, sessionId);
  if (!fingerprintHash) return jsonResponse({ accepted: false }, 503);

  const supabase = createSupabaseAdminClient();
  const rpcArgs = {
    p_anonymous_session_id: sessionId,
    p_collection_id: collectionId,
    p_event_name: eventName as EventName,
    p_fingerprint_hash: fingerprintHash,
    p_metadata: sanitizeAnalyticsMetadata(body.metadata),
    p_product_id: productId,
    p_promotion_id: promotionId,
    p_referrer_domain: referrerDomain(request.headers.get("referer")),
    p_route: route,
  } as unknown as Database["public"]["Functions"]["record_public_analytics_event"]["Args"];
  const { data: accepted, error } = await supabase.rpc(
    "record_public_analytics_event",
    rpcArgs,
  );

  if (error) {
    return jsonResponse({ accepted: false }, 503);
  }

  if (!accepted) return jsonResponse({ accepted: false }, 429);

  return jsonResponse({ accepted: true }, 202);
}
