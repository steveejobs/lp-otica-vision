import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { isUuidString } from "@/lib/admin/validation";
import { getAdminSession } from "@/lib/auth/admin-access";
import { CATALOG_CACHE_TAG } from "@/lib/catalog/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function response(ok: boolean, status: number) {
  return NextResponse.json({ ok }, { headers: { "Cache-Control": "private, no-store, max-age=0" }, status });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return response(false, 401);
  if (session.profile.role !== "admin" && session.profile.role !== "editor") return response(false, 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response(false, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return response(false, 415);

  let body: { action?: unknown; imageId?: unknown; orderedIds?: unknown; productId?: unknown };
  try { body = await request.json(); }
  catch { return response(false, 400); }
  if (typeof body.productId !== "string" || !isUuidString(body.productId)) return response(false, 400);
  const productId = body.productId;

  const supabase = await createSupabaseServerClient();
  if (body.action === "order") {
    if (!Array.isArray(body.orderedIds) || !body.orderedIds.length || body.orderedIds.length > 10 || new Set(body.orderedIds).size !== body.orderedIds.length || body.orderedIds.some((id) => typeof id !== "string" || !isUuidString(id))) return response(false, 400);
    const orderedIds = body.orderedIds as string[];
    const { error } = await supabase.rpc("reorder_product_images", { ordered_ids: orderedIds, target_product_id: productId });
    if (error) return response(false, 409);
  } else if (body.action === "cover") {
    if (typeof body.imageId !== "string" || !isUuidString(body.imageId)) return response(false, 400);
    const { error } = await supabase.rpc("set_product_cover", { target_image_id: body.imageId, target_product_id: productId });
    if (error) return response(false, 409);
  } else return response(false, 400);

  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo/[slug]", "page");
  revalidatePath("/sitemap.xml");
  return response(true, 200);
}
