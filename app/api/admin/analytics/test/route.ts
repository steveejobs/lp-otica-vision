import "server-only";

import { NextResponse } from "next/server";

import { testGoogleAnalyticsConnection } from "@/lib/analytics/google-data";
import { hasValidAdminAnalyticsOrigin } from "@/lib/analytics/request-origin";
import { getAdminSession } from "@/lib/auth/admin-access";

export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.profile.role !== "admin") return json({ message: "Acesso negado." }, 403);
  if (!hasValidAdminAnalyticsOrigin(request)) return json({ message: "Origem inválida." }, 403);
  const result = await testGoogleAnalyticsConnection();
  return json({ message: result.message, ok: result.ok }, result.ok ? 200 : 503);
}
