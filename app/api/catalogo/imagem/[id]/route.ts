import "server-only";

import {
  isPublicProductImageVariant,
  type ProductImageVariantKind,
} from "@/lib/catalog/image-variants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_PATTERN = new RegExp(`^${UUID_SEGMENT}$`, "i");
const MAX_DERIVATIVE_BYTES = 4 * 1024 * 1024;
const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAoUlEQVR4nO2SMQkAURTD6l9ox5si4Iu4ITwoVEASGr6eXnQCJlC9IrtQ7y46AROoXpFdqHcXnYAJVK7IL9e6iEzCB6hXZhXp30QmYQPWK7EK9u+gETKB6RXah3l10AiZQvSK7UO8uOgETqF6RXah3F52ACVSvyC7Uu4tOwASqV2QX6t1FJ2AC1Sv+udAD+2GCleGPpz0AAAAASUVORK5CYII=",
  "base64",
);

type DerivativeMime = "image/jpeg" | "image/webp";

const mimeExtensions: Record<DerivativeMime, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function validSignature(bytes: Uint8Array, mime: DerivativeMime) {
  if (mime === "image/jpeg") return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  return hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8);
}

function cacheHeaders(cacheControl: string) {
  return {
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cacheControl,
    "Vercel-CDN-Cache-Control": cacheControl,
  };
}

function imageHeaders(input: {
  cacheControl: string;
  contentLength?: number;
  contentType: string;
  etag?: string;
  variant?: ProductImageVariantKind;
}) {
  return {
    ...cacheHeaders(input.cacheControl),
    "Content-Disposition": 'inline; filename="catalog-image"',
    "Content-Security-Policy": "default-src 'none'; sandbox",
    ...(input.contentLength !== undefined ? { "Content-Length": String(input.contentLength) } : {}),
    "Content-Type": input.contentType,
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    ...(input.etag ? { ETag: input.etag } : {}),
    ...(input.variant ? { "X-Catalog-Image-Variant": input.variant } : {}),
  };
}

function notFound() {
  return new Response(null, {
    headers: {
      ...cacheHeaders("private, no-store, max-age=0"),
      "X-Content-Type-Options": "nosniff",
    },
    status: 404,
  });
}

function fallbackImage() {
  return new Response(FALLBACK_PNG, {
    headers: {
      ...imageHeaders({
        cacheControl: "public, max-age=60, s-maxage=60",
        contentLength: FALLBACK_PNG.byteLength,
        contentType: "image/png",
      }),
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

  const requestedVariant = new URL(request.url).searchParams.get("variant") ?? "product_detail";
  if (!isPublicProductImageVariant(requestedVariant)) return notFound();

  const supabase = createSupabaseAdminClient();
  const { data: image, error } = await supabase
    .from("product_images")
    .select(`
      id, product_id, asset_version, updated_at,
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

  const { data: variant, error: variantError } = await supabase
    .from("product_image_variants")
    .select("storage_path, mime_type, size_bytes, width, height, etag")
    .eq("product_image_id", image.id)
    .eq("asset_version", image.asset_version)
    .eq("kind", requestedVariant)
    .maybeSingle();
  if (variantError || !variant) return fallbackImage();

  const pathPattern = new RegExp(
    `^${product.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${UUID_SEGMENT}\\.(?:jpe?g|webp)$`,
    "i",
  );
  if (!pathPattern.test(variant.storage_path) || variant.storage_path.includes("..")) {
    return fallbackImage();
  }

  const extension = variant.storage_path.split(".").pop()?.toLowerCase();
  const mime = variant.mime_type.toLowerCase() as DerivativeMime;
  if (!(mime in mimeExtensions) || !extension || !mimeExtensions[mime].includes(extension)) {
    return fallbackImage();
  }

  const suppliedVersion = new URL(request.url).searchParams.get("v");
  const cacheControl = suppliedVersion === image.asset_version || suppliedVersion === image.updated_at
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

  if (request.headers.get("if-none-match") === variant.etag) {
    return new Response(null, {
      headers: imageHeaders({
        cacheControl,
        contentType: mime,
        etag: variant.etag,
        variant: requestedVariant,
      }),
      status: 304,
    });
  }

  const { data: blob, error: storageError } = await supabase.storage
    .from("catalog-products")
    .download(variant.storage_path);
  if (storageError || !blob) return fallbackImage();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (
    blob.type.toLowerCase() !== mime ||
    !bytes.length ||
    bytes.length > MAX_DERIVATIVE_BYTES ||
    bytes.length !== variant.size_bytes ||
    !validSignature(bytes, mime)
  ) return fallbackImage();

  return new Response(bytes, {
    headers: imageHeaders({
      cacheControl,
      contentLength: bytes.byteLength,
      contentType: mime,
      etag: variant.etag,
      variant: requestedVariant,
    }),
    status: 200,
  });
}
