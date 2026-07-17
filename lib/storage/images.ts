import "server-only";

import { randomUUID } from "node:crypto";

import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MANAGED_IMAGE_BUCKETS = [
  "catalog-products",
  "site-galleries",
  "promotions",
] as const;

export type ManagedImageBucket = (typeof MANAGED_IMAGE_BUCKETS)[number];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (mime === "image/jpeg") {
    return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  }

  if (mime === "image/png") {
    return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (mime === "image/webp") {
    return (
      hasBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    );
  }

  const boxType = String.fromCharCode(...bytes.slice(4, 12));
  return boxType.startsWith("ftyp") && /avif|avis/.test(String.fromCharCode(...bytes.slice(8, 32)));
}

async function validateImage(file: File, parentId: string) {
  if (!UUID_PATTERN.test(parentId)) {
    throw new Error("Identificador de destino invalido para upload.");
  }

  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve possuir no maximo 8 MB.");
  }

  if (!(file.type in imageFormats)) {
    throw new Error("Formato nao permitido. Use JPEG, PNG, WebP ou AVIF.");
  }

  const mime = file.type as AllowedMime;
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  if (!matchesMimeSignature(bytes, mime)) {
    throw new Error("O conteudo do arquivo nao corresponde ao MIME informado.");
  }

  return {
    bytes: await file.arrayBuffer(),
    mime,
    path: `${parentId}/${randomUUID()}.${imageFormats[mime]}`,
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

  if (error) {
    throw new Error("Nao foi possivel armazenar a imagem.");
  }

  return { path: validated.path };
}

async function isPublishedImage(bucket: ManagedImageBucket, path: string) {
  const supabase = createSupabaseAdminClient();

  if (bucket === "catalog-products") {
    const { data: image } = await supabase
      .from("product_images")
      .select("product_id")
      .eq("storage_path", path)
      .maybeSingle();
    if (!image) return false;
    const { data: product } = await supabase
      .from("products")
      .select("published")
      .eq("id", image.product_id)
      .maybeSingle();
    return product?.published === true;
  }

  if (bucket === "site-galleries") {
    const { data: item } = await supabase
      .from("gallery_items")
      .select("gallery_id, published")
      .eq("storage_path", path)
      .maybeSingle();
    if (!item?.published) return false;
    const { data: gallery } = await supabase
      .from("galleries")
      .select("published")
      .eq("id", item.gallery_id)
      .maybeSingle();
    return gallery?.published === true;
  }

  const now = new Date().toISOString();
  const { data: promotion } = await supabase
    .from("promotions")
    .select("active, starts_at, ends_at")
    .eq("image_path", path)
    .eq("active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .maybeSingle();
  return Boolean(promotion);
}

export async function createPublishedImageUrl(
  bucket: ManagedImageBucket,
  path: string,
  expiresInSeconds = 300,
) {
  if (!path || path.length > 500 || path.includes("..")) {
    throw new Error("Caminho de imagem invalido.");
  }

  if (expiresInSeconds < 60 || expiresInSeconds > 3600) {
    throw new Error("Validade da URL assinada fora do intervalo permitido.");
  }

  if (!(await isPublishedImage(bucket, path))) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error("Nao foi possivel assinar a URL da imagem.");
  }

  return data.signedUrl;
}
