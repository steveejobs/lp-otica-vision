import "server-only";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasValidAdminAnalyticsOrigin } from "@/lib/analytics/request-origin";
import { getAdminSession } from "@/lib/auth/admin-access";

const tags: Record<string, string[]> = { overview: ["ga4:overview"], acquisition: ["ga4:acquisition"], behavior: ["ga4:behavior"], conversions: ["ga4:conversions"], catalog: [], realtime: ["ga4:realtime"] };

function json(ok: boolean, status = 200) {
  return NextResponse.json({ ok }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.profile.role !== "admin") return json(false, 403);
  if (!hasValidAdminAnalyticsOrigin(request)) return json(false, 403);
  let body: { area?: unknown };
  try { body = await request.json(); } catch { return json(false, 400); }
  if (typeof body.area !== "string" || !(body.area in tags)) return json(false, 400);
  for (const tag of tags[body.area] ?? []) revalidateTag(tag, { expire: 0 });
  return json(true);
}
