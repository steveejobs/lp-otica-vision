import "server-only";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-access";

const tags: Record<string, string[]> = { overview: ["ga4:overview"], acquisition: ["ga4:acquisition"], behavior: ["ga4:behavior"], conversions: ["ga4:conversions"], catalog: [], realtime: ["ga4:realtime"] };

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  let body: { area?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (typeof body.area !== "string" || !(body.area in tags)) return NextResponse.json({ ok: false }, { status: 400 });
  for (const tag of tags[body.area] ?? []) revalidateTag(tag, "max");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
