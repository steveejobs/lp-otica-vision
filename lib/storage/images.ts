import "server-only";

import { randomUUID } from "node:crypto";

import { requireAdminRole, requireAdminSession } from "@/lib/auth/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MANAGED_IMAGE_BUCKETS = [
  "brand-logos",
  "catalog-products",
  "site-galleries",
  "promotions",
] as const;

export type ManagedImageBucket = (typeof MANAGED_IMAGE_BUCKETS)[number];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MANAGED_PATH_PATTERN = new RegExp(
  `^${UUID_PATTERN.source.slice(1, -1)}/${UUID_PATTERN.source.slice(1, -1)}\\.(?:jpe?g|png|webp|avif)$`,
  "i",
);

const imageFormats = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMime = keyof typeof imageFormats;

function hasBytes(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function matchesMimeSignature(bytes: Uint8Array, mime: AllowedMime) {
  if (mime === "image/jpeg") return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") {
    return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mime === "image/webp") {
    return hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
  return hasBytes(bytes, [0x66, 0x74, 0x79, 0x70], 4) && /avif|avis/.test(ascii(bytes, 8, 24));
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function uint16be(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function uint24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32be(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function jpegDimensions(bytes: Uint8Array) {
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda || offset + 2 > bytes.length) break;
    const length = uint16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrame.has(marker) && length >= 7) {
      return { height: uint16be(bytes, offset + 3), width: uint16be(bytes, offset + 5) };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array) {
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: uint24le(bytes, 24) + 1, height: uint24le(bytes, 27) + 1 };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30 && hasBytes(bytes, [0x9d, 0x01, 0x2a], 23)) {
    return {
      width: uint16be(Uint8Array.from([bytes[27], bytes[26]]), 0) & 0x3fff,
      height: uint16be(Uint8Array.from([bytes[29], bytes[28]]), 0) & 0x3fff,
    };
  }
  return null;
}

function avifDimensions(bytes: Uint8Array) {
  for (let index = 4; index + 16 <= bytes.length; index += 1) {
    if (ascii(bytes, index, index + 4) === "ispe") {
      return { width: uint32be(bytes, index + 8), height: uint32be(bytes, index + 12) };
    }
  }
  return null;
}

function imageDimensions(bytes: Uint8Array, mime: AllowedMime) {
  if (mime === "image/png" && bytes.length >= 24) {
    return { width: uint32be(bytes, 16), height: uint32be(bytes, 20) };
  }
  if (mime === "image/jpeg") return jpegDimensions(bytes);
  if (mime === "image/webp") return webpDimensions(bytes);
  return avifDimensions(bytes);
}

function assertManagedPath(path: string) {
  if (!path || path.length > 500 || path.includes("..") || !MANAGED_PATH_PATTERN.test(path)) {
    throw new Error("Caminho de imagem invalido.");
  }
}

async function validateImage(file: File, parentId: string) {
  if (!UUID_PATTERN.test(parentId)) throw new Error("Identificador de destino invalido para upload.");
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("A imagem deve possuir no maximo 8 MB.");
  if (!(file.type in imageFormats)) throw new Error("Formato nao permitido. Use JPEG, PNG, WebP ou AVIF.");

  const mime = file.type as AllowedMime;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesMimeSignature(bytes, mime)) throw new Error("O conteudo do arquivo nao corresponde ao MIME informado.");
  const dimensions = imageDimensions(bytes, mime);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > MAX_IMAGE_DIMENSION ||
    dimensions.height > MAX_IMAGE_DIMENSION
  ) {
    throw new Error("Nao foi possivel validar as dimensoes da imagem.");
  }

  return {
    bytes,
    height: dimensions.height,
    mime,
    path: `${parentId}/${randomUUID()}.${imageFormats[mime]}`,
    width: dimensions.width,
  };
}

export async function uploadManagedImage(input: {
  bucket: ManagedImageBucket;
  file: File;
  parentId: string;
}) {
  await requireAdminRole(["admin", "editor"]);
  const validated = await validateImage(input.file, input.parentId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(input.bucket).upload(validated.path, validated.bytes, {
    cacheControl: "31536000",
    contentType: validated.mime,
    upsert: false,
  });
  if (error) throw new Error("Nao foi possivel armazenar a imagem.");
  return {
    height: validated.height,
    mime: validated.mime,
    path: validated.path,
    width: validated.width,
  };
}

export async function removeManagedImage(bucket: ManagedImageBucket, path: string) {
  await requireAdminRole(["admin", "editor"]);
  assertManagedPath(path);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error("Nao foi possivel remover a imagem armazenada.");
}

export async function createAdminImageUrl(
  bucket: ManagedImageBucket,
  path: string | null,
  expiresInSeconds = 900,
) {
  await requireAdminSession();
  if (!path) return null;
  assertManagedPath(path);
  if (expiresInSeconds < 60 || expiresInSeconds > 3600) throw new Error("Validade da URL assinada invalida.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function createAdminImageUrls(
  bucket: ManagedImageBucket,
  paths: (string | null)[],
  expiresInSeconds = 900,
) {
  await requireAdminSession();
  const validPaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  validPaths.forEach(assertManagedPath);
  if (!validPaths.length) return new Map<string, string>();
  if (expiresInSeconds < 60 || expiresInSeconds > 3600) throw new Error("Validade da URL assinada invalida.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(validPaths, expiresInSeconds);
  if (error) return new Map<string, string>();
  return new Map(
    data
      .filter((item): item is typeof item & { signedUrl: string } => Boolean(item.signedUrl))
      .map((item) => [item.path, item.signedUrl]),
  );
}

async function isPublishedImage(bucket: ManagedImageBucket, path: string) {
  const supabase = createSupabaseAdminClient();
  if (bucket === "brand-logos") {
    const { data } = await supabase.from("brands").select("id").eq("logo_url", path).eq("active", true).maybeSingle();
    return Boolean(data);
  }
  if (bucket === "catalog-products") {
    const { data: image } = await supabase.from("product_images").select("product_id").eq("storage_path", path).maybeSingle();
    if (!image) return false;
    const { data: product } = await supabase.from("products").select("published, archived_at").eq("id", image.product_id).maybeSingle();
    return product?.published === true && product.archived_at === null;
  }
  if (bucket === "site-galleries") {
    const { data: item } = await supabase.from("gallery_items").select("gallery_id, published").eq("storage_path", path).maybeSingle();
    if (item?.published) {
      const { data: gallery } = await supabase.from("galleries").select("published").eq("id", item.gallery_id).maybeSingle();
      if (gallery?.published) return true;
    }
    const { data: collection } = await supabase
      .from("collections")
      .select("published, starts_at, ends_at")
      .eq("cover_path", path)
      .maybeSingle();
    if (!collection?.published) return false;
    const now = Date.now();
    return (!collection.starts_at || new Date(collection.starts_at).getTime() <= now) &&
      (!collection.ends_at || new Date(collection.ends_at).getTime() >= now);
  }
  const { data: promotion } = await supabase
    .from("promotions")
    .select("active, starts_at, ends_at")
    .eq("image_path", path)
    .maybeSingle();
  if (!promotion?.active) return false;
  const now = Date.now();
  return new Date(promotion.starts_at).getTime() <= now && new Date(promotion.ends_at).getTime() >= now;
}

export async function createPublishedImageUrl(
  bucket: ManagedImageBucket,
  path: string,
  expiresInSeconds = 300,
) {
  assertManagedPath(path);
  if (expiresInSeconds < 60 || expiresInSeconds > 3600) throw new Error("Validade da URL assinada fora do intervalo permitido.");
  if (!(await isPublishedImage(bucket, path))) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error("Nao foi possivel assinar a URL da imagem.");
  return data.signedUrl;
}
