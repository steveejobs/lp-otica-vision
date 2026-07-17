import "server-only";

import { createHash, randomUUID } from "node:crypto";

import sharp from "sharp";

import { requireAdminRole, requireAdminSession } from "@/lib/auth/admin-access";
import {
  PRODUCT_IMAGE_VARIANT_KINDS,
  type ProductImageVariantKind,
} from "@/lib/catalog/image-variants";
import {
  PRODUCT_IMAGE_UPLOAD_MAX_BYTES,
  type ProductImageUploadMime,
} from "@/lib/catalog/image-upload";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MANAGED_IMAGE_BUCKETS = [
  "brand-logos",
  "catalog-products",
  "site-galleries",
  "promotions",
] as const;

export type ManagedImageBucket = (typeof MANAGED_IMAGE_BUCKETS)[number];

const MAX_IMAGE_DIMENSION = 20_000;
const MAX_IMAGE_PIXELS = 80_000_000;
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

type AllowedMime = ProductImageUploadMime;

export { PRODUCT_IMAGE_VARIANT_KINDS };
export type { ProductImageVariantKind };

type StoredImageFile = {
  etag: string;
  height: number;
  mime: "image/jpeg" | "image/webp";
  path: string;
  sizeBytes: number;
  width: number;
};

export type ProductImageVariantFile = StoredImageFile & {
  kind: ProductImageVariantKind;
};

export type UploadedProductImageSet = {
  assetVersion: string;
  blurDataUrl: string;
  master: StoredImageFile;
  source: {
    height: number;
    mime: AllowedMime;
    sizeBytes: number;
    width: number;
  };
  variants: ProductImageVariantFile[];
};

const productVariantSpecs: ReadonlyArray<{
  format: "jpeg" | "webp";
  kind: ProductImageVariantKind;
  maxHeight: number;
  maxWidth: number;
  quality: number;
}> = [
  { format: "webp", kind: "admin_thumbnail", maxHeight: 400, maxWidth: 320, quality: 82 },
  { format: "webp", kind: "catalog_card", maxHeight: 900, maxWidth: 720, quality: 86 },
  { format: "webp", kind: "home_preview", maxHeight: 1_000, maxWidth: 800, quality: 87 },
  { format: "webp", kind: "product_detail", maxHeight: 1_600, maxWidth: 1_200, quality: 88 },
  { format: "jpeg", kind: "open_graph", maxHeight: 1_200, maxWidth: 1_200, quality: 88 },
];

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
  if (!file.size || file.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES) throw new Error("A imagem deve possuir no maximo 8 MB.");
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

function contentEtag(bytes: Uint8Array) {
  return `"${createHash("sha256").update(bytes).digest("base64url")}"`;
}

function storedImageFile(input: {
  bytes: Uint8Array;
  extension: "jpg" | "webp";
  height: number;
  mime: "image/jpeg" | "image/webp";
  parentId: string;
  width: number;
}): StoredImageFile & { bytes: Uint8Array } {
  return {
    bytes: input.bytes,
    etag: contentEtag(input.bytes),
    height: input.height,
    mime: input.mime,
    path: `${input.parentId}/${randomUUID()}.${input.extension}`,
    sizeBytes: input.bytes.byteLength,
    width: input.width,
  };
}

async function createProductImageSet(
  validated: Awaited<ReturnType<typeof validateImage>>,
  parentId: string,
) {
  const masterOutput = await sharp(validated.bytes, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      fit: "inside",
      height: 2_400,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
      width: 2_400,
    })
    .webp({ alphaQuality: 95, effort: 5, quality: 92, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  if (!masterOutput.info.width || !masterOutput.info.height || !masterOutput.data.byteLength) {
    throw new Error("Nao foi possivel normalizar a imagem enviada.");
  }

  const master = storedImageFile({
    bytes: masterOutput.data,
    extension: "webp",
    height: masterOutput.info.height,
    mime: "image/webp",
    parentId,
    width: masterOutput.info.width,
  });

  const variants: Array<ProductImageVariantFile & { bytes: Uint8Array }> = [];
  for (const spec of productVariantSpecs) {
    const pipeline = sharp(masterOutput.data, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    }).resize({
      fit: "inside",
      height: spec.maxHeight,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
      width: spec.maxWidth,
    });

    const output = spec.format === "jpeg"
      ? await pipeline
          .flatten({ background: "#f4eee6" })
          .jpeg({ chromaSubsampling: "4:4:4", mozjpeg: true, quality: spec.quality })
          .toBuffer({ resolveWithObject: true })
      : await pipeline
          .webp({ alphaQuality: 94, effort: 5, quality: spec.quality, smartSubsample: true })
          .toBuffer({ resolveWithObject: true });

    if (!output.info.width || !output.info.height || !output.data.byteLength) {
      throw new Error("Nao foi possivel gerar os derivados da imagem.");
    }

    variants.push({
      ...storedImageFile({
        bytes: output.data,
        extension: spec.format === "jpeg" ? "jpg" : "webp",
        height: output.info.height,
        mime: spec.format === "jpeg" ? "image/jpeg" : "image/webp",
        parentId,
        width: output.info.width,
      }),
      kind: spec.kind,
    });
  }

  const placeholder = await sharp(masterOutput.data, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .resize({ fit: "inside", height: 30, withoutEnlargement: true, width: 24 })
    .blur(0.6)
    .webp({ effort: 4, quality: 48 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${placeholder.toString("base64")}`;
  if (blurDataUrl.length > 4_096) throw new Error("O placeholder gerado excedeu o limite seguro.");

  return {
    assetVersion: randomUUID(),
    blurDataUrl,
    master,
    source: {
      height: validated.height,
      mime: validated.mime,
      sizeBytes: validated.bytes.byteLength,
      width: validated.width,
    },
    variants,
  } satisfies UploadedProductImageSet & {
    master: StoredImageFile & { bytes: Uint8Array };
    variants: Array<ProductImageVariantFile & { bytes: Uint8Array }>;
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

export async function uploadProductImageSet(input: { file: File; parentId: string }) {
  await requireAdminRole(["admin", "editor"]);
  const validated = await validateImage(input.file, input.parentId);
  const generated = await createProductImageSet(validated, input.parentId);
  const supabase = await createSupabaseServerClient();
  const uploadedPaths: string[] = [];

  try {
    for (const file of [generated.master, ...generated.variants]) {
      const { error } = await supabase.storage.from("catalog-products").upload(file.path, file.bytes, {
        cacheControl: "31536000",
        contentType: file.mime,
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(file.path);
    }
  } catch {
    if (uploadedPaths.length) {
      await supabase.storage.from("catalog-products").remove(uploadedPaths);
    }
    throw new Error("Nao foi possivel armazenar todos os derivados da imagem.");
  }

  const { bytes: _masterBytes, ...master } = generated.master;
  void _masterBytes;
  const variants = generated.variants.map(({ bytes: _variantBytes, ...variant }) => {
    void _variantBytes;
    return variant;
  });

  return {
    assetVersion: generated.assetVersion,
    blurDataUrl: generated.blurDataUrl,
    master,
    source: generated.source,
    variants,
  } satisfies UploadedProductImageSet;
}

export async function removeManagedImage(bucket: ManagedImageBucket, path: string) {
  return removeManagedImages(bucket, [path]);
}

export async function removeManagedImages(bucket: ManagedImageBucket, paths: string[]) {
  await requireAdminRole(["admin", "editor"]);
  const uniquePaths = [...new Set(paths)];
  uniquePaths.forEach(assertManagedPath);
  if (!uniquePaths.length) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove(uniquePaths);
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
