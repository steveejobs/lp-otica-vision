import { createHash } from "node:crypto";

import { isPublishedGalleryPlacement } from "@/lib/content-placements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:webp|jpe?g)$/i;
const variants = ["master", "mobile", "desktop", "thumbnail"] as const;
type Variant = (typeof variants)[number];
type ManifestFile = { etag: string; height: number; mime: string; path: string; sizeBytes: number; width: number };

function notFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

function validSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/webp") return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45;
  return mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requested = new URL(request.url).searchParams.get("variant") ?? "desktop";
  if (!UUID.test(id) || !variants.includes(requested as Variant)) return notFound();

  const supabase = createSupabaseAdminClient();
  const { data: item, error } = await supabase.from("gallery_publication_items")
    .select("publication_id, asset_version, media_manifest")
    .eq("id", id).maybeSingle();
  if (error || !item) return notFound();
  const { data: publication } = await supabase.from("gallery_publications")
    .select("gallery_id, active").eq("id", item.publication_id).eq("active", true).maybeSingle();
  if (!publication) return notFound();
  const { data: gallery } = await supabase.from("galleries").select("published, route_key, placement_key")
    .eq("id", publication.gallery_id).eq("published", true).maybeSingle();
  if (!gallery || !isPublishedGalleryPlacement(gallery.route_key, gallery.placement_key)) return notFound();

  const manifest = item.media_manifest as Record<string, ManifestFile> | null;
  const file = manifest?.[requested];
  if (!file || !PATH.test(file.path) || file.path.includes("..") || !["image/webp", "image/jpeg"].includes(file.mime) || file.width < 1 || file.height < 1 || file.sizeBytes < 1) return notFound();

  const { data: blob, error: storageError } = await supabase.storage.from("site-galleries").download(file.path);
  if (storageError || !blob) return notFound();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength !== file.sizeBytes || bytes.byteLength > 12_000_000 || !validSignature(bytes, file.mime)) return notFound();
  const etag = file.etag || `"${createHash("sha256").update(bytes).digest("base64url")}"`;
  const suppliedVersion = new URL(request.url).searchParams.get("v");
  const cacheControl = suppliedVersion === item.asset_version
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
