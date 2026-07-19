import { createHash } from "node:crypto";

import { getCollectionPlacement } from "@/lib/content-placements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:webp|jpe?g)$/i;
const variants = ["mobile", "desktop"] as const;
type Variant = (typeof variants)[number];
type ManifestFile = { etag: string; height: number; mime: string; path: string; sizeBytes: number; width: number };

function notFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

function validSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/webp") return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45;
  return mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function inPublicationWindow(startsAt: string | null, endsAt: string | null) {
  const now = Date.now();
  return (!startsAt || new Date(startsAt).getTime() <= now)
    && (!endsAt || new Date(endsAt).getTime() >= now);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requested = new URL(request.url).searchParams.get("variant") ?? "desktop";
  if (!UUID.test(id) || !variants.includes(requested as Variant)) return notFound();
  const placement = getCollectionPlacement("featured_collection");
  if (!placement) return notFound();

  const supabase = createSupabaseAdminClient();
  const { data: publication, error } = await supabase.from("collection_publications")
    .select("active, home_enabled, home_placement_key, starts_at, ends_at, cover_asset_version, cover_media_manifest")
    .eq("id", id)
    .eq("active", true)
    .eq("home_enabled", true)
    .eq("home_placement_key", placement.placementKey)
    .maybeSingle();
  if (error || !publication || !inPublicationWindow(publication.starts_at, publication.ends_at)) return notFound();

  const manifest = publication.cover_media_manifest as Record<string, ManifestFile> | null;
  const file = manifest?.[requested];
  if (!file || !PATH.test(file.path) || file.path.includes("..") || !["image/webp", "image/jpeg"].includes(file.mime) || file.width < 1 || file.height < 1 || file.sizeBytes < 1) return notFound();

  const { data: blob, error: storageError } = await supabase.storage.from("site-galleries").download(file.path);
  if (storageError || !blob) return notFound();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength !== file.sizeBytes || bytes.byteLength > 12_000_000 || !validSignature(bytes, file.mime)) return notFound();

  const etag = file.etag || `"${createHash("sha256").update(bytes).digest("base64url")}"`;
  const suppliedVersion = new URL(request.url).searchParams.get("v");
  const cacheControl = suppliedVersion === publication.cover_asset_version
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
  const headers = {
    "Cache-Control": cacheControl,
    "Content-Length": String(bytes.byteLength),
    "Content-Type": file.mime,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { headers, status: 304 });
  return new Response(bytes, { headers, status: 200 });
}
