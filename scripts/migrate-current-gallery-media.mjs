import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const projectRoot = process.cwd();
const photoDirectory = path.join(projectRoot, "public", "media", "photos");
const reportDirectory = path.join(projectRoot, "docs", "qa");
const reportPath = path.join(reportDirectory, "admin-media-migration-inventory.json");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}.`);
  return value;
}

const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const currentMedia = {
  hero: {
    gallery: { name: "Hero principal", slug: "home-hero", routeKey: "home", placementKey: "hero", autoplay: true },
    items: [
      ["6 (1).jpg", "Série 6", 0, "primary", "Retrato editorial com óculos de lente marrom e trench coat", "50% 43%"],
      ["6 (2).jpg", "Série 6", 1, "secondary", "Retrato frontal com óculos de lente marrom e composição neutra", "50% 40%"],
      ["6 (3).jpg", "Série 6", 2, "detail", "Close editorial com armação marrom e acabamento metálico", "50% 43%"],
    ],
  },
  featuredCollection: {
    gallery: { name: "Coleção em destaque", slug: "home-featured-collection", routeKey: "home", placementKey: "featured_collection", autoplay: true },
    items: [
      ["1 (1).jpg", "Série 1", 0, "primary", "Retrato editorial com óculos escuros pretos e textura felpuda", "50% 46%"],
      ["1 (2).jpg", "Série 1", 1, "secondary", "Close lateral com óculos escuros pretos e detalhe metálico na haste", "50% 45%"],
      ["1 (3).jpg", "Série 1", 2, "detail", "Retrato frontal com óculos escuros pretos e casaco de textura felpuda", "50% 44%"],
      ["3 (1).jpg", "Série 3", 3, "secondary", "Retrato em tons neutros com óculos escuros e braço elevado", "50% 42%"],
      ["3 (2).jpg", "Série 3", 4, "detail", "Retrato em tons neutros com óculos escuros e mão sobre o cabelo", "50% 42%"],
      ["4 (1).jpg", "Série 4", 5, "secondary", "Retrato com óculos amplos de lente marrom sobre fundo escuro", "50% 44%"],
      ["4 (2).jpg", "Série 4", 6, "detail", "Retrato com óculos de lente espelhada e jaqueta vermelha", "50% 40%"],
    ],
  },
  lab: {
    gallery: { name: "LAB. DIGITAL", slug: "home-lab-digital", routeKey: "home", placementKey: "lab_digital", autoplay: false },
    items: [
      ["5 (1).jpg", "Série 5", 0, "primary", "Detalhe editorial de armação de grau e reflexo na lente", "50% 42%"],
      ["5 (2).jpg", "Série 5", 1, "secondary", "Perfil com armação de grau tartaruga e lente clara", "48% 42%"],
    ],
  },
  instagram: {
    gallery: { name: "Seleção editorial Instagram", slug: "instagram-editorial-selection", routeKey: "instagram", placementKey: "editorial_selection", autoplay: true },
    items: [
      ["6 (1).jpg", "Série 6", 0, "primary", "Retrato com armação tartaruga e acabamento em tom quente", "50% 43%"],
      ["6 (2).jpg", "Série 6", 1, "secondary", "Retrato frontal com óculos tartaruga e acabamento quente", "50% 40%"],
      ["6 (3).jpg", "Série 6", 2, "detail", "Close frontal com óculos estreitos de lente marrom", "50% 43%"],
      ["7 (1).jpg", "Série 7", 3, "secondary", "Perfil com óculos de lente marrom e casaco em tom neutro", "50% 43%"],
      ["7 (2).jpg", "Série 7", 4, "primary", "Retrato frontal com óculos de lente marrom sobre fundo escuro", "50% 42%"],
      ["7 (3).jpg", "Série 7", 5, "detail", "Close com óculos de lente marrom e acabamento translúcido", "50% 43%"],
    ],
  },
};

function etag(bytes) {
  return `"${createHash("sha256").update(bytes).digest("base64url")}"`;
}

async function derivative(bytes, parentId, maxWidth, maxHeight, quality) {
  const output = await sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000, sequentialRead: true })
    .rotate()
    .resize({ fit: "inside", height: maxHeight, kernel: sharp.kernel.lanczos3, withoutEnlargement: true, width: maxWidth })
    .webp({ alphaQuality: 94, effort: 5, quality, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  if (!output.info.width || !output.info.height || !output.data.byteLength) throw new Error("Não foi possível gerar derivado de galeria.");
  return {
    bytes: output.data,
    etag: etag(output.data),
    height: output.info.height,
    mime: "image/webp",
    path: `${parentId}/${randomUUID()}.webp`,
    sizeBytes: output.data.byteLength,
    width: output.info.width,
  };
}

async function uploadImageSet(galleryId, filename) {
  const source = await fs.readFile(path.join(photoDirectory, filename));
  const [master, mobile, desktop, thumbnail] = await Promise.all([
    derivative(source, galleryId, 2400, 2400, 92),
    derivative(source, galleryId, 800, 1000, 87),
    derivative(source, galleryId, 1200, 1600, 88),
    derivative(source, galleryId, 320, 400, 82),
  ]);
  const blur = await sharp(master.bytes, { failOn: "error", limitInputPixels: 80_000_000 })
    .resize({ fit: "inside", height: 30, width: 24, withoutEnlargement: true })
    .blur(0.6)
    .webp({ effort: 4, quality: 48 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  if (blurDataUrl.length > 4096) throw new Error("Placeholder excede o tamanho permitido.");

  const files = [master, mobile, desktop, thumbnail];
  const uploaded = [];
  try {
    for (const file of files) {
      const { error } = await admin.storage.from("site-galleries").upload(file.path, file.bytes, {
        cacheControl: "31536000",
        contentType: file.mime,
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(file.path);
    }
  } catch (error) {
    if (uploaded.length) await admin.storage.from("site-galleries").remove(uploaded);
    throw error;
  }
  return {
    assetVersion: randomUUID(),
    blurDataUrl,
    height: master.height,
    manifest: {
      desktop: { ...desktop, bytes: undefined },
      master: { ...master, bytes: undefined },
      mobile: { ...mobile, bytes: undefined },
      thumbnail: { ...thumbnail, bytes: undefined },
    },
    storagePath: master.path,
    width: master.width,
  };
}

async function getOrCreateGallery(gallery) {
  const { data: existing, error: lookupError } = await admin.from("galleries")
    .select("id, published")
    .eq("route_key", gallery.routeKey)
    .eq("placement_key", gallery.placementKey)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return { ...existing, created: false };
  const { data, error } = await admin.from("galleries").insert({
    autoplay: gallery.autoplay,
    display_order: 0,
    name: gallery.name,
    placement_key: gallery.placementKey,
    published: false,
    route_key: gallery.routeKey,
    slug: gallery.slug,
  }).select("id, published").single();
  if (error) throw error;
  return { ...data, created: true };
}

async function hasActivePublication(galleryId) {
  const { data, error } = await admin.from("gallery_publications").select("id").eq("gallery_id", galleryId).eq("active", true).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function seedGallery(spec) {
  const gallery = await getOrCreateGallery(spec.gallery);
  if (await hasActivePublication(gallery.id)) return { galleryId: gallery.id, status: "already-published", items: 0 };
  if (!gallery.created) {
    const { count, error } = await admin.from("gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", gallery.id);
    if (error) throw error;
    if ((count ?? 0) > 0) throw new Error(`Galeria ${spec.gallery.routeKey}.${spec.gallery.placementKey} já existe sem revisão ativa; a migração não a sobrescreve.`);
  }

  const createdItemIds = [];
  const uploadedPaths = [];
  try {
    for (const [filename, visualSeries, displayOrder, role, altText, objectPosition] of spec.items) {
      const uploaded = await uploadImageSet(gallery.id, filename);
      uploadedPaths.push(...Object.values(uploaded.manifest).map((file) => file.path));
      const { data, error } = await admin.from("gallery_items").insert({
        alt_text: altText,
        asset_version: uploaded.assetVersion,
        background_color: "#d7c3ad",
        blur_data_url: uploaded.blurDataUrl,
        desktop_object_position: objectPosition,
        desktop_scale: 1,
        display_order: displayOrder,
        editorial_role: role,
        gallery_id: gallery.id,
        height: uploaded.height,
        media_manifest: uploaded.manifest,
        mobile_object_position: objectPosition,
        mobile_scale: 1,
        published: true,
        series_order: displayOrder,
        storage_path: uploaded.storagePath,
        visual_series: visualSeries,
        width: uploaded.width,
      }).select("id").single();
      if (error) throw error;
      createdItemIds.push(data.id);
    }
    const { error: publishGalleryError } = await admin.from("galleries").update({ published: true }).eq("id", gallery.id);
    if (publishGalleryError) throw publishGalleryError;
    const { data: last } = await admin.from("gallery_publications").select("revision").eq("gallery_id", gallery.id).order("revision", { ascending: false }).limit(1).maybeSingle();
    const { data: publication, error: publicationError } = await admin.from("gallery_publications").insert({
      active: true,
      gallery_id: gallery.id,
      revision: (last?.revision ?? 0) + 1,
    }).select("id").single();
    if (publicationError) throw publicationError;

    const { data: items, error: itemsError } = await admin.from("gallery_items").select("*").in("id", createdItemIds).order("display_order");
    if (itemsError || !items) throw itemsError ?? new Error("Itens migrados não foram encontrados.");
    const { error: snapshotError } = await admin.from("gallery_publication_items").insert(items.map((item, index) => ({
      alt_text: item.alt_text,
      asset_version: item.asset_version,
      background_color: item.background_color,
      blur_data_url: item.blur_data_url,
      desktop_object_position: item.desktop_object_position,
      desktop_scale: item.desktop_scale,
      display_order: index,
      editorial_role: item.editorial_role,
      height: item.height,
      media_manifest: item.media_manifest,
      mobile_object_position: item.mobile_object_position,
      mobile_scale: item.mobile_scale,
      publication_id: publication.id,
      source_item_id: item.id,
      storage_path: item.storage_path,
      visual_series: item.visual_series,
      width: item.width,
    })));
    if (snapshotError) throw snapshotError;
    return { galleryId: gallery.id, status: "migrated", items: createdItemIds.length };
  } catch (error) {
    if (createdItemIds.length) await admin.from("gallery_items").delete().in("id", createdItemIds);
    if (uploadedPaths.length) await admin.storage.from("site-galleries").remove(uploadedPaths);
    throw error;
  }
}

async function annotateHeroSeries() {
  const { data: hero, error: heroError } = await admin.from("galleries").select("id").eq("route_key", "home").eq("placement_key", "hero").maybeSingle();
  if (heroError || !hero) return "not-found";
  const { data: publication, error: publicationError } = await admin.from("gallery_publications").select("id").eq("gallery_id", hero.id).eq("active", true).maybeSingle();
  if (publicationError || !publication) return "without-active-revision";
  const { data: snapshots, error: snapshotsError } = await admin.from("gallery_publication_items").select("id, source_item_id").eq("publication_id", publication.id);
  if (snapshotsError || !snapshots) throw snapshotsError;
  for (const snapshot of snapshots) {
    if (!snapshot.source_item_id) continue;
    const { data: source } = await admin.from("gallery_items").select("visual_series").eq("id", snapshot.source_item_id).maybeSingle();
    if (source?.visual_series) {
      const { error } = await admin.from("gallery_publication_items").update({ visual_series: source.visual_series }).eq("id", snapshot.id);
      if (error) throw error;
    }
  }
  return "annotated";
}

async function seedFeaturedCollection(galleryId) {
  const { data: existing, error: existingError } = await admin.from("collections").select("id").eq("slug", "selecao-vision").maybeSingle();
  if (existingError) throw existingError;
  if (existing) return "already-published";
  const { data: activeHome, error: activeHomeError } = await admin.from("collection_publications")
    .select("id").eq("active", true).eq("home_enabled", true).eq("home_placement_key", "featured_collection").maybeSingle();
  if (activeHomeError) throw activeHomeError;
  if (activeHome) throw new Error("Já existe uma coleção publicada na posição Home › Coleção em destaque; a migração não a substitui.");

  const { data: coverItem, error: coverError } = await admin.from("gallery_items")
    .select("alt_text, asset_version, blur_data_url, desktop_object_position, desktop_scale, height, media_manifest, mobile_object_position, mobile_scale, storage_path, width")
    .eq("gallery_id", galleryId).order("display_order").limit(1).single();
  if (coverError) throw coverError;

  const payload = {
    cover_alt_text: coverItem.alt_text,
    cover_asset_version: coverItem.asset_version,
    cover_blur_data_url: coverItem.blur_data_url,
    cover_desktop_object_position: coverItem.desktop_object_position,
    cover_desktop_scale: coverItem.desktop_scale,
    cover_height: coverItem.height,
    cover_media_manifest: coverItem.media_manifest,
    cover_mobile_object_position: coverItem.mobile_object_position,
    cover_mobile_scale: coverItem.mobile_scale,
    cover_object_position: coverItem.desktop_object_position,
    cover_path: coverItem.storage_path,
    cover_width: coverItem.width,
    description: "Linhas, proporções e acabamentos reunidos pela Vision.",
    display_order: 0,
    featured: true,
    home_cta_label: "Ver Instagram",
    home_cta_target: "instagram",
    home_description: "Linhas, proporções e acabamentos reunidos pela Vision.",
    home_enabled: true,
    home_gallery_id: galleryId,
    home_placement_key: "featured_collection",
    home_title: "A escolha ganha contorno.",
    home_variant: "editorial-protagonist",
    name: "Seleção Vision",
    published: true,
    slug: "selecao-vision",
  };
  const { data: collection, error } = await admin.from("collections").insert(payload).select("*").single();
  if (error) throw error;
  const { data: publication, error: publicationError } = await admin.from("collection_publications").insert({
    active: true,
    collection_id: collection.id,
    cover_alt_text: collection.cover_alt_text,
    cover_asset_version: collection.cover_asset_version,
    cover_blur_data_url: collection.cover_blur_data_url,
    cover_desktop_object_position: collection.cover_desktop_object_position,
    cover_desktop_scale: collection.cover_desktop_scale,
    cover_height: collection.cover_height,
    cover_media_manifest: collection.cover_media_manifest,
    cover_mobile_object_position: collection.cover_mobile_object_position,
    cover_mobile_scale: collection.cover_mobile_scale,
    cover_path: collection.cover_path,
    cover_width: collection.cover_width,
    home_cta_label: collection.home_cta_label,
    home_cta_target: collection.home_cta_target,
    home_description: collection.home_description,
    home_enabled: collection.home_enabled,
    home_gallery_id: collection.home_gallery_id,
    home_placement_key: collection.home_placement_key,
    home_title: collection.home_title,
    home_variant: collection.home_variant,
    name: collection.name,
    revision: 1,
    slug: collection.slug,
    starts_at: collection.starts_at,
    ends_at: collection.ends_at,
  }).select("id").single();
  if (publicationError) throw publicationError;
  return { collectionId: collection.id, publicationId: publication.id };
}

const inventory = [
  ...currentMedia.featuredCollection.items.map(([file, series, order, , alt, focus]) => ({ file, route: "/", section: "Coleção em destaque", placement_key: "featured_collection", series, order, mobile_object_position: focus, desktop_object_position: focus, alt, component: "EditorialGallery", status: "migrated" })),
  ...currentMedia.lab.items.map(([file, series, order, , alt, focus]) => ({ file, route: "/", section: "LAB. DIGITAL", placement_key: "lab_digital", series, order, mobile_object_position: focus, desktop_object_position: focus, alt, component: "LabSection", status: "migrated" })),
  ...currentMedia.instagram.items.map(([file, series, order, , alt, focus]) => ({ file, route: "/instagram", section: "Seleção editorial", placement_key: "editorial_selection", series, order, mobile_object_position: focus, desktop_object_position: focus, alt, component: "InstagramImageRail", status: "migrated" })),
  ...currentMedia.hero.items.map(([file, series, order, , alt, focus]) => ({ file, route: "/", section: "Hero", placement_key: "hero", series, order, mobile_object_position: focus, desktop_object_position: focus, alt, component: "VisionEditorialTakeover", status: "already-published" })),
  {
    file: "logo sem fundo.png", route: "*", section: "Identidade", placement_key: null,
    series: "Identidade", order: 0, mobile_object_position: null, desktop_object_position: null,
    alt: "Logotipo da Ótica Vision", component: "BrandLogo", status: "local-runtime-fallback",
  },
  {
    file: "favicon.png", route: "*", section: "Metadata", placement_key: null,
    series: "Identidade", order: 1, mobile_object_position: null, desktop_object_position: null,
    alt: "Ícone da Ótica Vision", component: "RootLayout metadata", status: "local-runtime-fallback",
  },
  ...[
    ["logo-rayban.png", "Ray-Ban"], ["carrera (1).png", "Carrera"],
    ["persol-logo-png-transparent.png", "Persol"], ["Tom-Ford-logo.png", "Tom Ford"],
    ["Swarovski-Logo-2016.png", "Swarovski"], ["images__2_-removebg-preview.png", "Dolce & Gabbana"],
    ["Jimmy_Choo_Ltd-Logo.wine.png", "Jimmy Choo"], ["Max-Mara-logo.png", "Max Mara"],
    ["versace-logo.png", "Versace"], ["Emilio-Pucci-Logo.png", "Emilio Pucci"],
  ].map(([file, brand], order) => ({
    file, route: "/, /instagram", section: "Marcas", placement_key: null,
    series: "Logotipos", order, mobile_object_position: null, desktop_object_position: null,
    alt: `Logo ${brand}`, component: "BrandRail", status: "local-runtime-fallback",
  })),
  ...["video-2.jpg", "video-3.jpg", "video-4.jpg"].map((file, order) => ({
    file, route: "/, /instagram", section: "Poster de vídeo", placement_key: null,
    series: "Vídeos editoriais", order, mobile_object_position: null, desktop_object_position: null,
    alt: "Poster editorial de vídeo", component: "ObservedVideo", status: "local-runtime-fallback",
  })),
];

const result = {
  hero: await annotateHeroSeries(),
  featuredCollection: await seedGallery(currentMedia.featuredCollection),
  lab: await seedGallery(currentMedia.lab),
  instagram: await seedGallery(currentMedia.instagram),
};
const featuredGalleryId = result.featuredCollection.galleryId;
if (!featuredGalleryId) throw new Error("A galeria editorial não foi criada.");
result.featuredCollectionRevision = await seedFeaturedCollection(featuredGalleryId);

await fs.mkdir(reportDirectory, { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  inventory,
  localFiles: {
    candidatesForRemovalAfterApproval: inventory.filter((item) => item.status === "migrated" || item.status === "already-published").map((item) => item.file),
    fallbackOrRuntime: inventory.filter((item) => item.status === "local-runtime-fallback").map((item) => item.file),
    masterArchive: ["2 (2).jpg", "8 (1).jpg", "8 (2).jpg", "8 (3).jpg", "8 (4).jpg", "video.mp4", "logo com fundo.png"],
  },
  result,
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: path.relative(projectRoot, reportPath), result }, null, 2));
