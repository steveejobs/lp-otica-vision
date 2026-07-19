import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MARKER = "[QA TRANSIÇÃO CATÁLOGO]";
const PREFIX = "qa-transicao-catalogo";
const statePath = path.resolve(".tmp/catalog-transition-qa.json");
const sources = [
  "public/media/photos/1 (1).jpg",
  "public/media/photos/1 (2).jpg",
  "public/media/photos/1 (3).jpg",
  "public/media/photos/3 (1).jpg",
  "public/media/photos/4 (1).jpg",
  "public/media/photos/4 (2).jpg",
  "public/media/photos/6 (1).jpg",
];
const specs = [
  ["admin_thumbnail", 320, 400, "webp", 82],
  ["catalog_card", 720, 900, "webp", 86],
  ["home_preview", 800, 1000, "webp", 87],
  ["product_detail", 1200, 1600, "webp", 88],
  ["open_graph", 1200, 1200, "jpeg", 88],
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}.`);
  return value;
}

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

function persist(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function loadState() {
  return fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : null;
}

function etag(bytes) {
  return `"${createHash("sha256").update(bytes).digest("base64url")}"`;
}

async function upload(pathname, bytes, mime, state) {
  const { error } = await supabase.storage.from("catalog-products").upload(pathname, bytes, {
    cacheControl: "31536000",
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload temporário: ${pathname}.`);
  state.storage.push(pathname);
  persist(state);
}

async function createImage(productId, sourcePath, displayOrder, isCover, state) {
  const source = fs.readFileSync(path.resolve(sourcePath));
  const sourceMetadata = await sharp(source).metadata();
  const masterOutput = await sharp(source)
    .rotate()
    .resize({ fit: "inside", height: 2400, width: 2400, withoutEnlargement: true })
    .webp({ effort: 5, quality: 92 })
    .toBuffer({ resolveWithObject: true });
  const masterPath = `${productId}/${randomUUID()}.webp`;
  await upload(masterPath, masterOutput.data, "image/webp", state);

  const assetVersion = randomUUID();
  const imageId = randomUUID();
  const placeholder = await sharp(masterOutput.data)
    .resize({ fit: "inside", height: 30, width: 24, withoutEnlargement: true })
    .webp({ effort: 4, quality: 48 })
    .toBuffer();
  const { error: imageError } = await supabase.from("product_images").insert({
    alt_text: `${MARKER} Prova fotográfica temporária ${displayOrder + 1}`,
    asset_version: assetVersion,
    blur_data_url: `data:image/webp;base64,${placeholder.toString("base64")}`,
    display_order: displayOrder,
    height: masterOutput.info.height,
    id: imageId,
    is_cover: isCover,
    mime_type: sourceMetadata.format === "jpeg" ? "image/jpeg" : "image/png",
    object_position: displayOrder % 2 ? "48% 44%" : "50% 42%",
    product_id: productId,
    size_bytes: source.byteLength,
    storage_path: masterPath,
    width: masterOutput.info.width,
  });
  if (imageError) throw new Error(`Falha ao registrar imagem temporária: ${imageError.message}`);
  state.imageIds.push(imageId);
  persist(state);

  for (const [kind, maxWidth, maxHeight, format, quality] of specs) {
    let pipeline = sharp(masterOutput.data).resize({ fit: "inside", height: maxHeight, width: maxWidth, withoutEnlargement: true });
    const output = format === "jpeg"
      ? await pipeline.flatten({ background: "#f4eee6" }).jpeg({ mozjpeg: true, quality }).toBuffer({ resolveWithObject: true })
      : await pipeline.webp({ effort: 5, quality }).toBuffer({ resolveWithObject: true });
    const extension = format === "jpeg" ? "jpg" : "webp";
    const mime = format === "jpeg" ? "image/jpeg" : "image/webp";
    const storagePath = `${productId}/${randomUUID()}.${extension}`;
    await upload(storagePath, output.data, mime, state);
    const variantId = randomUUID();
    const { error } = await supabase.from("product_image_variants").insert({
      asset_version: assetVersion,
      etag: etag(output.data),
      height: output.info.height,
      id: variantId,
      kind,
      mime_type: mime,
      product_image_id: imageId,
      size_bytes: output.data.byteLength,
      storage_path: storagePath,
      width: output.info.width,
    });
    if (error) throw new Error(`Falha ao registrar derivado temporário: ${error.message}`);
    state.variantIds.push(variantId);
    persist(state);
  }
}

async function seed() {
  if (loadState()) throw new Error("As fixtures de transição já estão ativas.");
  const run = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const state = {
    auditEntityIds: [], brandIds: [], categoryIds: [], imageIds: [], productIds: [],
    run, startedAt: new Date().toISOString(), storage: [], variantIds: [], setting: null,
  };
  persist(state);

  const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "home.catalog_preview.enabled").maybeSingle();
  state.setting = setting ? { existed: true, value: setting.value } : { existed: false, value: null };
  const { error: settingError } = await supabase.from("site_settings").upsert({
    key: "home.catalog_preview.enabled",
    value: { enabled: true },
  });
  if (settingError) throw new Error("Falha ao habilitar a vitrine temporária da home.");
  state.auditEntityIds.push("home.catalog_preview.enabled");
  persist(state);

  for (let index = 0; index < 3; index += 1) {
    const id = randomUUID();
    const slug = `${PREFIX}-${run}-marca-${index + 1}`;
    const { error } = await supabase.from("brands").insert({
      active: true, display_order: index, id, name: `${MARKER} Marca ${index + 1}`, slug,
    });
    if (error) throw new Error(`Falha ao criar marca temporária: ${error.message}`);
    state.brandIds.push(id); state.auditEntityIds.push(id); persist(state);
  }

  for (let index = 0; index < 2; index += 1) {
    const id = randomUUID();
    const slug = `${PREFIX}-${run}-categoria-${index + 1}`;
    const { error } = await supabase.from("categories").insert({
      active: true, display_order: index, id, name: `${MARKER} Categoria ${index + 1}`, slug,
    });
    if (error) throw new Error(`Falha ao criar categoria temporária: ${error.message}`);
    state.categoryIds.push(id); state.auditEntityIds.push(id); persist(state);
  }

  const availability = ["available", "last_unit", "consultation", "unavailable", "available", "consultation"];
  for (let index = 0; index < 6; index += 1) {
    const id = randomUUID();
    const slug = `${PREFIX}-${run}-produto-${index + 1}`;
    const { error } = await supabase.from("products").insert({
      availability_status: availability[index],
      brand_id: state.brandIds[index % 3],
      category_id: state.categoryIds[index % 2],
      color: `Cor editorial ${index + 1}`,
      display_order: index,
      featured: false,
      id,
      model: `QA-${index + 1}`,
      name: `${MARKER} Modelo ${index + 1}`,
      price: index % 2 ? 489 + index * 10 : null,
      price_visibility: index % 2 ? "visible" : "consult",
      published: false,
      short_description: `${MARKER} Conteúdo efêmero para comprovar continuidade espacial.`,
      sku: `QA-TRANS-${run}-${index + 1}`.toUpperCase(),
      slug,
    });
    if (error) throw new Error(`Falha ao criar produto temporário: ${error.message}`);
    state.productIds.push(id); state.auditEntityIds.push(id); persist(state);
    await createImage(id, sources[index], 0, true, state);
    if (index === 0) await createImage(id, sources[6], 1, false, state);
    const { error: publishError } = await supabase.from("products").update({ featured: true, published: true }).eq("id", id);
    if (publishError) throw new Error(`Falha ao publicar produto temporário: ${publishError.message}`);
  }

  console.log(JSON.stringify({ marker: MARKER, products: 6, brands: 3, categories: 2, images: 7 }, null, 2));
}

async function cleanup() {
  const state = loadState();
  if (!state) return console.log(JSON.stringify({ cleaned: true, found: false }));

  const { data: events } = await supabase
    .from("analytics_events")
    .select("id, product_id, metadata")
    .gte("created_at", state.startedAt);
  const fixtureSlugs = new Set([
    ...state.brandIds.map((_, index) => `${PREFIX}-${state.run}-marca-${index + 1}`),
    ...state.categoryIds.map((_, index) => `${PREFIX}-${state.run}-categoria-${index + 1}`),
  ]);
  const eventIds = (events ?? [])
    .filter((event) => state.productIds.includes(event.product_id) || fixtureSlugs.has(event.metadata?.value))
    .map((event) => event.id);
  if (eventIds.length) await supabase.from("analytics_events").delete().in("id", eventIds);

  await supabase.from("products").delete().in("id", state.productIds);
  if (state.storage.length) await supabase.storage.from("catalog-products").remove(state.storage);
  await supabase.from("brands").delete().in("id", state.brandIds);
  await supabase.from("categories").delete().in("id", state.categoryIds);
  if (state.setting?.existed) {
    await supabase.from("site_settings").update({ value: state.setting.value }).eq("key", "home.catalog_preview.enabled");
  } else {
    await supabase.from("site_settings").delete().eq("key", "home.catalog_preview.enabled");
  }
  const entityIds = [...new Set([...state.auditEntityIds, ...state.imageIds, ...state.variantIds])];
  for (let index = 0; index < entityIds.length; index += 100) {
    await supabase.from("audit_logs").delete().in("entity_id", entityIds.slice(index, index + 100));
  }
  fs.rmSync(statePath);
  console.log(JSON.stringify({ cleaned: true, analyticsEvents: eventIds.length, storageObjects: state.storage.length }, null, 2));
}

async function status() {
  const state = loadState();
  const { count: products } = await supabase.from("products").select("id", { count: "exact", head: true }).ilike("slug", `${PREFIX}-%`);
  const { count: brands } = await supabase.from("brands").select("id", { count: "exact", head: true }).ilike("slug", `${PREFIX}-%`);
  const { count: categories } = await supabase.from("categories").select("id", { count: "exact", head: true }).ilike("slug", `${PREFIX}-%`);
  console.log(JSON.stringify({ activeState: Boolean(state), brands, categories, products }, null, 2));
}

try {
  const command = process.argv[2] ?? "status";
  if (command === "seed") await seed();
  else if (command === "cleanup") await cleanup();
  else if (command === "status") await status();
  else throw new Error("Use seed, cleanup ou status.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha nas fixtures de transição.");
  process.exitCode = 1;
}
