import "server-only";

import { NextResponse } from "next/server";

import { testGoogleAnalyticsConnection } from "@/lib/analytics/google-data";
import { getAdminSession } from "@/lib/auth/admin-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Origem inválida." }, { status: 403 });
  const result = await testGoogleAnalyticsConnection();
  return NextResponse.json({ message: result.message, ok: result.ok }, { headers: { "Cache-Control": "private, no-store" }, status: result.ok ? 200 : 503 });
}
