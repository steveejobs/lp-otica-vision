import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK/ILtS7i07ABKpXZBfq3UUnYALVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=",
  "base64",
);

type AllowedMime = "image/avif" | "image/jpeg" | "image/png" | "image/webp";

const mimeExtensions: Record<AllowedMime, readonly string[]> = {
  "image/avif": ["avif"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function validSignature(bytes: Uint8Array, mime: AllowedMime) {
  if (mime === "image/jpeg") return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") {
    return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mime === "image/webp") {
    return hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
  const brand = String.fromCharCode(...bytes.slice(8, 24));
  return hasBytes(bytes, [0x66, 0x74, 0x79, 0x70], 4) && /avif|avis/.test(brand);
}

function imageHeaders(contentType: string, cacheControl: string, etag?: string) {
  return {
    "Cache-Control": cacheControl,
    "Content-Disposition": 'inline; filename="catalog-image"',
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Type": contentType,
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    ...(etag ? { ETag: etag } : {}),
  };
}

function notFound() {
  return new Response(null, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
    status: 404,
  });
}

function fallbackImage() {
  return new Response(FALLBACK_PNG, {
    headers: {
      ...imageHeaders("image/png", "public, max-age=60, s-maxage=60"),
      "X-Catalog-Image-Fallback": "1",
    },
    status: 200,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return notFound();

  const supabase = createSupabaseAdminClient();
  const { data: image, error } = await supabase
    .from("product_images")
    .select(`
      id, product_id, storage_path, updated_at,
      product:products!inner(
        id, published, archived_at, brand_id, category_id,
        brand:brands(id, active),
        category:categories(id, active)
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !image || !image.product) return notFound();
  const product = image.product;
  if (
    product.id !== image.product_id ||
    product.published !== true ||
    product.archived_at !== null ||
    (product.brand_id !== null && product.brand?.active !== true) ||
    (product.category_id !== null && product.category?.active !== true)
  ) return notFound();

  const pathPattern = new RegExp(
    `^${product.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9a-f-]{36}\\.(?:jpe?g|png|webp|avif)$`,
    "i",
  );
  if (!pathPattern.test(image.storage_path) || image.storage_path.includes("..")) return notFound();

  const extension = image.storage_path.split(".").pop()?.toLowerCase();
  const { data: blob, error: storageError } = await supabase.storage
    .from("catalog-products")
    .download(image.storage_path);
  if (storageError || !blob || !extension) return fallbackImage();

  const mime = blob.type.toLowerCase() as AllowedMime;
  if (!(mime in mimeExtensions) || !mimeExtensions[mime].includes(extension)) return fallbackImage();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !validSignature(bytes, mime)) {
    return fallbackImage();
  }

  const etag = `"${createHash("sha256").update(bytes).digest("base64url")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      headers: imageHeaders(mime, "public, max-age=300, s-maxage=3600", etag),
      status: 304,
    });
  }

  const suppliedVersion = new URL(request.url).searchParams.get("v");
  const cacheControl = suppliedVersion === image.updated_at
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

  return new Response(bytes, {
    headers: imageHeaders(mime, cacheControl, etag),
    status: 200,
  });
}
