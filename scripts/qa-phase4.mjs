import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import sharp from "sharp";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

function findBrowser() {
  const candidates = [
    path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.PROGRAMFILES ?? "", "Microsoft/Edge/Application/msedge.exe"),
  ];
  const executable = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!executable) throw new Error("Chrome ou Edge nao encontrado para QA da Fase 4.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3014").replace(/\/$/, "");
const reportDir = path.resolve("docs/qa/phase4");
const videoTempDir = path.resolve(".tmp/phase4-qa/video");
const sourceFiles = [
  path.resolve("public/media/photos/1 (1).jpg"),
  path.resolve("public/media/photos/1 (2).jpg"),
  path.resolve("public/media/photos/3 (1).jpg"),
];
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(videoTempDir, { recursive: true });

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const publicClient = createClient(supabaseUrl, required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const runId = randomUUID().slice(0, 8);
const email = `qa-phase4-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const sku = `QA-PHASE4-${runId}`.toUpperCase();
const productSlug = `qa-phase4-produto-${runId}`;
const results = [];
const consoleErrors = [];
const pageErrors = [];
const state = {
  analyticsSessionIds: [],
  auditIds: [],
  brandId: null,
  brandLogoPath: null,
  categoryId: null,
  collectionId: null,
  productId: null,
  secondaryProductId: null,
  userId: null,
};
let browser = null;
let context = null;
let page = null;
let video = null;

function record(name, passed, details = undefined) {
  results.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
}

async function installVitals(targetContext) {
  await targetContext.addInitScript(() => {
    window.__visionQaVitals = { cls: 0, lcp: 0, lcpElement: null };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__visionQaVitals.cls += entry.value;
        }
      }).observe({ buffered: true, type: "layout-shift" });
      new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1);
        if (!entry) return;
        window.__visionQaVitals.lcp = entry.startTime;
        window.__visionQaVitals.lcpElement = entry.element?.id || entry.element?.tagName || null;
      }).observe({ buffered: true, type: "largest-contentful-paint" });
    } catch {
      // Browsers without these observers still run the functional matrix.
    }
  });
}

async function collectBrowserMetrics(targetPage) {
  return targetPage.evaluate(() => {
    const resources = performance.getEntriesByType("resource").map((entry) => ({
      duration: Math.round(entry.duration),
      initiatorType: entry.initiatorType,
      name: entry.name,
      transferSize: entry.transferSize || entry.encodedBodySize || 0,
    }));
    const counts = new Map();
    for (const resource of resources) counts.set(resource.name, (counts.get(resource.name) ?? 0) + 1);
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([name, count]) => ({ count, name }));
    const imageResources = resources.filter((resource) => resource.name.includes("/api/catalogo/imagem/"));
    const scriptResources = resources.filter((resource) => resource.initiatorType === "script");
    const navigation = performance.getEntriesByType("navigation")[0];
    const memory = performance.memory;
    return {
      cls: window.__visionQaVitals?.cls ?? null,
      documentRequestMs: navigation ? Math.round(navigation.responseEnd) : null,
      duplicates,
      imageRequestCount: imageResources.length,
      imageTransferBytes: imageResources.reduce((sum, resource) => sum + resource.transferSize, 0),
      jsHeapBytes: memory?.usedJSHeapSize ?? null,
      jsTransferBytes: scriptResources.reduce((sum, resource) => sum + resource.transferSize, 0),
      lcpElement: window.__visionQaVitals?.lcpElement ?? null,
      lcpMs: Math.round(window.__visionQaVitals?.lcp ?? 0),
      requestCount: resources.length + 1,
      totalTransferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    };
  });
}

async function waitForLoadedImages(scope) {
  const images = scope.locator("img");
  await images.first().waitFor({ state: "visible" });
  await images.evaluateAll((elements) => Promise.all(elements.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  })));
}

async function storagePaths(bucket, parentId) {
  const { data, error } = await admin.storage.from(bucket).list(parentId, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  return (data ?? []).filter((entry) => entry.name && entry.id).map((entry) => `${parentId}/${entry.name}`);
}

async function productMedia(productId) {
  const { data, error } = await admin
    .from("product_images")
    .select("*, variants:product_image_variants(*)")
    .eq("product_id", productId)
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}

async function submitAndWait(form, buttonName, status, timeout = 60_000) {
  const currentUrl = new URL(page.url());
  if (currentUrl.searchParams.get("status") === status) {
    await page.evaluate(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      url.searchParams.delete("error");
      window.history.replaceState(window.history.state, "", url);
    });
  }
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("status") === status, { timeout }),
    form.getByRole("button", { name: buttonName }).click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
}

async function saveProduct() {
  const form = page.locator('section[aria-labelledby="product-data-title"] form');
  await submitAndWait(form, "Salvar produto", "saved");
}

async function removeQaProduct(productId) {
  if (productId) {
    const images = await productMedia(productId).catch(() => []);
    const paths = [
      ...images.map((image) => image.storage_path),
      ...images.flatMap((image) => image.variants.map((variant) => variant.storage_path)),
      ...(await storagePaths("catalog-products", productId).catch(() => [])),
    ];
    await admin.from("products").update({ featured: false, published: false }).eq("id", productId);
    await admin.from("products").delete().eq("id", productId);
    if (paths.length) await admin.storage.from("catalog-products").remove([...new Set(paths)]);
    await admin.from("analytics_events").delete().eq("product_id", productId);
  }
}

async function createSecondaryFeaturedFixture(sourceImages) {
  const source = sourceImages.find((image) => image.is_cover);
  if (!source || source.variants.length !== 5) throw new Error("Capa completa ausente para fixture secundaria.");
  const productId = randomUUID();
  const imageId = randomUUID();
  const assetVersion = randomUUID();
  state.secondaryProductId = productId;
  state.auditIds.push(productId, imageId);

  const copied = [];
  for (const item of [source, ...source.variants]) {
    const extension = item.storage_path.split(".").pop();
    const storagePath = `${productId}/${randomUUID()}.${extension}`;
    const { error } = await admin.storage.from("catalog-products").copy(item.storage_path, storagePath);
    if (error) throw error;
    copied.push({ source: item, storagePath });
  }

  const { error: productError } = await admin.from("products").insert({
    availability_status: "consultation",
    brand_id: state.brandId,
    category_id: state.categoryId,
    color: null,
    display_order: 1,
    featured: false,
    id: productId,
    model: null,
    name: `[QA FASE 4] Apoio autoplay ${runId}`,
    price: null,
    price_visibility: "consult",
    published: false,
    short_description: "Fixture temporária para validar movimento com mais de um destaque.",
    sku: `${sku}-HOME`,
    slug: `${productSlug}-home`,
  });
  if (productError) throw productError;

  const master = copied[0];
  const { error: imageError } = await admin.from("product_images").insert({
    alt_text: "Armação temporária de apoio ao teste de autoplay",
    asset_version: assetVersion,
    blur_data_url: source.blur_data_url,
    display_order: 0,
    height: source.height,
    id: imageId,
    is_cover: true,
    mime_type: source.mime_type,
    object_position: source.object_position,
    product_id: productId,
    size_bytes: source.size_bytes,
    storage_path: master.storagePath,
    width: source.width,
  });
  if (imageError) throw imageError;

  const secondaryVariantRows = copied.slice(1).map(({ source: variant, storagePath }) => {
    const id = randomUUID();
    state.auditIds.push(id);
    return {
      asset_version: assetVersion,
      etag: variant.etag,
      height: variant.height,
      id,
      kind: variant.kind,
      mime_type: variant.mime_type,
      product_image_id: imageId,
      size_bytes: variant.size_bytes,
      storage_path: storagePath,
      width: variant.width,
    };
  });
  const { error: variantsError } = await admin.from("product_image_variants").insert(secondaryVariantRows);
  if (variantsError) throw variantsError;
  const { error: publishError } = await admin
    .from("products")
    .update({ featured: true, published: true })
    .eq("id", productId);
  if (publishError) throw publishError;
}

async function cleanup() {
  await removeQaProduct(state.secondaryProductId);
  await removeQaProduct(state.productId);
  for (const sessionId of state.analyticsSessionIds) {
    await admin.from("analytics_events").delete().eq("anonymous_session_id", sessionId);
  }
  if (state.collectionId) await admin.from("collections").delete().eq("id", state.collectionId);
  if (state.brandId) await admin.from("brands").delete().eq("id", state.brandId);
  if (state.brandLogoPath) await admin.storage.from("brand-logos").remove([state.brandLogoPath]);
  if (state.categoryId) await admin.from("categories").delete().eq("id", state.categoryId);
  if (state.userId) await admin.auth.admin.deleteUser(state.userId);
  if (state.auditIds.length) {
    for (let index = 0; index < state.auditIds.length; index += 100) {
      await admin.from("audit_logs").delete().in("entity_id", [...new Set(state.auditIds)].slice(index, index + 100));
    }
  }
}

let fatalError = null;
try {
  for (const source of sourceFiles) {
    if (!fs.existsSync(source)) throw new Error(`Asset de QA ausente: ${source}`);
  }

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Fase 4" },
  });
  if (created.error || !created.data.user) throw new Error("Falha ao criar usuario temporario da Fase 4.");
  state.userId = created.data.user.id;
  state.auditIds.push(state.userId);
  const profileUpdate = await admin
    .from("profiles")
    .update({ active: true, name: "QA Fase 4", role: "admin" })
    .eq("id", state.userId);
  if (profileUpdate.error) throw profileUpdate.error;

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  context = await browser.newContext({
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: videoTempDir, size: { height: 844, width: 390 } },
    reducedMotion: "no-preference",
    viewport: { height: 844, width: 390 },
  });
  await installVitals(context);
  await context.route("https://api.whatsapp.com/**", (route) => route.abort());
  page = await context.newPage();
  video = page.video();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 240));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 240)));

  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 20_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);

  await page.goto(`${baseUrl}/admin/marcas`, { waitUntil: "domcontentloaded" });
  const brandForm = page.locator('section[aria-labelledby="new-brand-title"] form');
  await brandForm.locator('input[name="name"]').fill(`[QA FASE 4] Marca ${runId}`);
  await brandForm.locator('input[name="slug"]').fill(`qa-fase4-marca-${runId}`);
  await brandForm.locator('input[name="active"]').check();
  await brandForm.locator('input[name="logo"]').setInputFiles(path.resolve("public/media/brands/logo-rayban.png"));
  await submitAndWait(brandForm, "Criar marca", "created");
  state.brandId = new URL(page.url()).pathname.split("/").pop();
  state.auditIds.push(state.brandId);
  const { data: brand } = await admin.from("brands").select("logo_url").eq("id", state.brandId).single();
  state.brandLogoPath = brand?.logo_url ?? null;
  record("admin_creates_confirmed_brand_with_private_logo", Boolean(state.brandId && state.brandLogoPath));

  await page.goto(`${baseUrl}/admin/categorias`, { waitUntil: "domcontentloaded" });
  const categoryForm = page.locator('section[aria-labelledby="new-category-title"] form');
  await categoryForm.locator('input[name="name"]').fill(`[QA FASE 4] Categoria ${runId}`);
  await categoryForm.locator('input[name="slug"]').fill(`qa-fase4-categoria-${runId}`);
  await submitAndWait(categoryForm, "Criar categoria", "created");
  state.categoryId = new URL(page.url()).pathname.split("/").pop();
  state.auditIds.push(state.categoryId);
  record("admin_creates_active_category", Boolean(state.categoryId));

  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  const createForm = page.locator('form').filter({ has: page.getByRole("button", { name: "Criar rascunho" }) });
  await createForm.locator('input[name="sku"]').fill(sku);
  await createForm.locator('input[name="slug"]').fill(productSlug);
  await createForm.locator('input[name="name"]').fill(`[QA FASE 4] Armação ${runId}`);
  await createForm.locator('select[name="brand_id"]').selectOption(state.brandId);
  await createForm.locator('select[name="category_id"]').selectOption(state.categoryId);
  await createForm.locator('input[name="model"]').fill(`Modelo QA ${runId}`);
  await createForm.locator('input[name="color"]').fill("Grafite QA");
  await createForm.locator('textarea[name="short_description"]').fill("Registro temporário e factual para validar a Fase 4.");
  await submitAndWait(createForm, "Criar rascunho", "created");
  state.productId = new URL(page.url()).pathname.split("/").pop();
  state.auditIds.push(state.productId);
  record("admin_creates_product_as_draft_consultation", Boolean(state.productId));

  const uploadForm = page.locator('section[aria-labelledby="product-upload-title"] form');
  await uploadForm.locator('input[name="alt_base"]').fill("Armação temporária da QA Fase 4");
  await uploadForm.locator('input[name="files"]').setInputFiles(sourceFiles.slice(0, 2));
  await submitAndWait(uploadForm, "Enviar imagens", "uploaded", 90_000);

  let images = await productMedia(state.productId);
  images.forEach((image) => state.auditIds.push(image.id, ...image.variants.map((variant) => variant.id)));
  const expectedKinds = ["admin_thumbnail", "catalog_card", "home_preview", "product_detail", "open_graph"];
  const completeSets = images.length === 2 && images.every((image) =>
    image.mime_type === "image/webp" &&
    image.size_bytes > 0 &&
    image.width <= 2_400 &&
    image.height <= 2_400 &&
    image.blur_data_url?.startsWith("data:image/webp;base64,") &&
    image.variants.length === 5 &&
    expectedKinds.every((kind) => image.variants.some((variant) => variant.kind === kind)),
  );
  record("upload_generates_two_complete_persistent_derivative_sets", completeSets);

  const sourceBytes = sourceFiles.slice(0, 2).reduce((total, file) => total + fs.statSync(file).size, 0);
  const transferredBytes = images.reduce(
    (total, image) => total + image.size_bytes + image.variants.reduce((sum, variant) => sum + variant.size_bytes, 0),
    0,
  );
  const sourceMetadata = await Promise.all(sourceFiles.slice(0, 2).map((file) => sharp(file).metadata()));
  const ratiosPreserved = images.every((image, index) => {
    const metadata = sourceMetadata[index];
    if (!metadata.width || !metadata.height) return false;
    return Math.abs(image.width / image.height - metadata.width / metadata.height) < 0.015;
  });
  record("orientation_ratio_and_premium_quality_are_preserved", ratiosPreserved && transferredBytes > 0, {
    sourceBytes,
    storedMasterAndDerivativesBytes: transferredBytes,
  });
  const adminImagesSection = page.locator('section[aria-labelledby="product-images-title"]');
  record("admin_uses_thumbnail_instead_of_master", await adminImagesSection.locator("img").first().evaluate((image) => image.naturalWidth <= 320));
  await adminImagesSection.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await waitForLoadedImages(adminImagesSection);
  await adminImagesSection.screenshot({ path: path.join(reportDir, "admin-images-390x844.png") });

  const secondRow = page.locator("article").filter({ hasText: "2 de 2" });
  await submitAndWait(secondRow.locator("form").filter({ hasText: "Definir como capa" }), "Definir como capa", "saved");
  images = await productMedia(state.productId);
  record("admin_changes_cover", images.filter((image) => image.is_cover).length === 1 && images[1].is_cover);

  const reorderedSecond = page.locator("article").filter({ hasText: "2 de 2" });
  await reorderedSecond.getByRole("button", { name: "Subir" }).click();
  const reorderForm = page.locator('section[aria-labelledby="product-images-title"] form').filter({ hasText: "Salvar ordem das imagens" });
  await submitAndWait(reorderForm, "Salvar ordem das imagens", "reordered");
  images = await productMedia(state.productId);
  record("admin_reorders_images_atomically", images[0].is_cover && images[0].display_order === 0);

  const replaceTarget = images.find((image) => !image.is_cover);
  const oldReplacePaths = [replaceTarget.storage_path, ...replaceTarget.variants.map((variant) => variant.storage_path)];
  const replaceForm = page.locator(`form`).filter({ has: page.locator(`#replace-${replaceTarget.id}`) });
  await replaceForm.locator('input[name="file"]').setInputFiles(sourceFiles[2]);
  await submitAndWait(replaceForm, "Substituir arquivo", "uploaded", 90_000);
  images = await productMedia(state.productId);
  const replaced = images.find((image) => image.id === replaceTarget.id);
  const storageAfterReplace = await storagePaths("catalog-products", state.productId);
  record(
    "replacement_regenerates_all_derivatives_and_removes_old_objects",
    replaced?.variants.length === 5 && oldReplacePaths.every((oldPath) => !storageAfterReplace.includes(oldPath)) && storageAfterReplace.length === 12,
  );

  await page.locator('input[name="published"]').check();
  await page.locator('input[name="featured"]').check();
  await saveProduct();
  const { data: publishedProduct } = await admin
    .from("products")
    .select("published, featured, availability_status")
    .eq("id", state.productId)
    .single();
  record(
    "admin_publishes_and_features_only_after_valid_cover",
    publishedProduct?.published === true && publishedProduct.featured === true && publishedProduct.availability_status === "consultation",
  );
  images = await productMedia(state.productId);
  await createSecondaryFeaturedFixture(images);
  await saveProduct();
  record("home_autoplay_fixture_has_two_valid_featured_products", Boolean(state.secondaryProductId));
  const [paginationFirst, paginationSecond, publicFilterOptions] = await Promise.all([
    publicClient.rpc("search_catalog_products", { p_page_offset: 0, p_page_size: 1 }),
    publicClient.rpc("search_catalog_products", { p_page_offset: 1, p_page_size: 1 }),
    publicClient.rpc("catalog_filter_options"),
  ]);
  record(
    "catalog_backend_paginates_without_duplicates",
    !paginationFirst.error && !paginationSecond.error &&
      paginationFirst.data?.length === 1 && paginationSecond.data?.length === 1 &&
      paginationFirst.data[0].total_count === 2 && paginationSecond.data[0].total_count === 2 &&
      paginationFirst.data[0].product_id !== paginationSecond.data[0].product_id,
  );
  record(
    "catalog_rpc_returns_persisted_cover_blur_placeholder",
    paginationFirst.data?.[0]?.cover_blur_data_url?.startsWith("data:image/webp;base64,") &&
      paginationSecond.data?.[0]?.cover_blur_data_url?.startsWith("data:image/webp;base64,"),
  );
  record(
    "catalog_filter_options_exclude_empty_values",
    !publicFilterOptions.error && publicFilterOptions.data?.length > 0 &&
      publicFilterOptions.data.every((option) => option.product_count > 0),
  );
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
  await page.screenshot({ path: path.join(reportDir, "admin-product-390x844.png") });

  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  const publicProductLink = page.getByRole("link", {
    name: `Ver [QA FASE 4] Armação ${runId}, código ${sku}`,
  });
  await publicProductLink.waitFor({ state: "visible" });
  record("public_catalog_renders_published_product", await publicProductLink.count() === 1);
  record("public_pages_expose_no_administrative_links", await page.locator('a[href^="/admin"]').count() === 0);
  await page.screenshot({ path: path.join(reportDir, "catalog-mobile-390x844.png") });

  await page.goto(`${baseUrl}/catalogo?marca=qa-fase4-marca-${runId}`, { waitUntil: "domcontentloaded" });
  record("brand_filter_has_shareable_url", page.url().includes(`marca=qa-fase4-marca-${runId}`) && await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).count() >= 1);
  await page.screenshot({ path: path.join(reportDir, "catalog-brand-filter-390x844.png") });

  await page.goto(`${baseUrl}/catalogo?busca=${encodeURIComponent(sku)}`, { waitUntil: "domcontentloaded" });
  record("catalog_search_finds_sku", await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).count() >= 1);
  await page.screenshot({ path: path.join(reportDir, "catalog-search-390x844.png") });

  await page.goto(`${baseUrl}/catalogo?busca=${encodeURIComponent(`Armação ${runId}`)}`, { waitUntil: "domcontentloaded" });
  await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).first().waitFor();
  record("catalog_search_finds_name", await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).count() >= 1);
  await page.goto(`${baseUrl}/catalogo?busca=${encodeURIComponent(`Modelo QA ${runId}`)}`, { waitUntil: "domcontentloaded" });
  await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).first().waitFor();
  record("catalog_search_finds_model", await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).count() >= 1);

  const combinedUrl = `${baseUrl}/catalogo?marca=qa-fase4-marca-${runId}&categoria=qa-fase4-categoria-${runId}&disponibilidade=consultation&busca=${encodeURIComponent(`Modelo QA ${runId}`)}`;
  await page.goto(combinedUrl, { waitUntil: "domcontentloaded" });
  await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).first().waitFor();
  record(
    "catalog_combines_brand_category_availability_and_search",
    await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).count() >= 1 &&
      page.url().includes("disponibilidade=consultation"),
  );

  await page.goto(`${baseUrl}/catalogo?busca=resultado-inexistente-${runId}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Nenhum resultado por aqui.", { exact: true }).waitFor();
  record(
    "catalog_empty_state_keeps_filters_and_clear_action",
    await page.locator('form[role="search"]').count() === 1 && await page.getByText("Limpar seleção", { exact: true }).count() === 1,
  );

  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: new RegExp(`\\[QA FASE 4\\] Marca ${runId}`) }).first().click();
  await page.waitForURL((url) => url.searchParams.get("marca") === `qa-fase4-marca-${runId}`);
  await Promise.all([
    page.waitForURL((url) => !url.searchParams.has("marca")),
    page.goBack(),
  ]);
  const backUrl = page.url();
  const backRestoredAll = !new URL(backUrl).searchParams.has("marca");
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("marca") === `qa-fase4-marca-${runId}`),
    page.goForward(),
  ]);
  const forwardUrl = page.url();
  record(
    "catalog_browser_back_and_forward_restore_shareable_filters",
    backRestoredAll && new URL(forwardUrl).searchParams.get("marca") === `qa-fase4-marca-${runId}`,
    { backUrl, forwardUrl },
  );

  images = await productMedia(state.productId);
  const cover = images.find((image) => image.is_cover);
  const cardVariant = cover.variants.find((variant) => variant.kind === "catalog_card");
  const cardResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${cover.id}?variant=catalog_card&v=${encodeURIComponent(cover.updated_at)}`);
  const cardBytes = new Uint8Array(await cardResponse.arrayBuffer());
  record(
    "public_proxy_serves_persisted_card_with_complete_security_cache_headers",
    cardResponse.status === 200 &&
      cardResponse.headers.get("content-type") === "image/webp" &&
      cardResponse.headers.get("content-length") === String(cardVariant.size_bytes) &&
      cardResponse.headers.get("etag") === cardVariant.etag &&
      cardResponse.headers.get("cache-control")?.includes("immutable") &&
      cardResponse.headers.get("x-content-type-options") === "nosniff" &&
      cardResponse.headers.get("x-catalog-image-variant") === "catalog_card" &&
      cardBytes.byteLength === cardVariant.size_bytes &&
      cardBytes.byteLength < fs.statSync(sourceFiles[0]).size,
  );
  const notModifiedResponse = await fetch(
    `${baseUrl}/api/catalogo/imagem/${cover.id}?variant=catalog_card&v=${encodeURIComponent(cover.updated_at)}`,
    { headers: { "If-None-Match": cardVariant.etag } },
  );
  record(
    "public_proxy_reuses_persisted_etag_without_body",
    notModifiedResponse.status === 304 && (await notModifiedResponse.arrayBuffer()).byteLength === 0,
  );
  const variantBounds = {
    admin_thumbnail: [320, 400, "image/webp"],
    catalog_card: [720, 900, "image/webp"],
    home_preview: [800, 1_000, "image/webp"],
    open_graph: [1_200, 1_200, "image/jpeg"],
    product_detail: [1_200, 1_600, "image/webp"],
  };
  record(
    "derivatives_respect_dimensions_mime_and_size_budget",
    images.every((image) => image.variants.every((variant) => {
      const [maxWidth, maxHeight, mime] = variantBounds[variant.kind] ?? [];
      return maxWidth && variant.width <= maxWidth && variant.height <= maxHeight &&
        variant.mime_type === mime && variant.size_bytes > 0 && variant.size_bytes < 4 * 1024 * 1024;
    })),
    images.map((image) => ({
      masterBytes: image.size_bytes,
      variants: image.variants.map((variant) => ({ bytes: variant.size_bytes, height: variant.height, kind: variant.kind, width: variant.width })),
    })),
  );
  const blockedAdminVariant = await fetch(`${baseUrl}/api/catalogo/imagem/${cover.id}?variant=admin_thumbnail`);
  const arbitraryPath = await fetch(`${baseUrl}/api/catalogo/imagem/not-a-uuid?variant=catalog_card`);
  record("public_proxy_blocks_admin_variant_and_arbitrary_path", blockedAdminVariant.status === 404 && arbitraryPath.status === 404);

  const fallbackImage = images.find((image) => !image.is_cover);
  const fallbackVariant = fallbackImage?.variants.find((variant) => variant.kind === "catalog_card");
  let fallbackPassed = false;
  if (fallbackImage && fallbackVariant) {
    const { data: storedFallbackSource, error: fallbackDownloadError } = await admin.storage
      .from("catalog-products")
      .download(fallbackVariant.storage_path);
    if (fallbackDownloadError || !storedFallbackSource) throw fallbackDownloadError ?? new Error("Derivado de fallback ausente.");
    const fallbackBytes = new Uint8Array(await storedFallbackSource.arrayBuffer());
    const { error: fallbackRemoveError } = await admin.storage
      .from("catalog-products")
      .remove([fallbackVariant.storage_path]);
    if (fallbackRemoveError) throw fallbackRemoveError;
    try {
      const fallbackResponse = await fetch(
        `${baseUrl}/api/catalogo/imagem/${fallbackImage.id}?variant=catalog_card&v=fallback-${runId}`,
      );
      fallbackPassed = fallbackResponse.status === 200 &&
        fallbackResponse.headers.get("x-catalog-image-fallback") === "1" &&
        fallbackResponse.headers.get("content-type") === "image/png" &&
        (await fallbackResponse.arrayBuffer()).byteLength > 0;
    } finally {
      const { error: fallbackRestoreError } = await admin.storage
        .from("catalog-products")
        .upload(fallbackVariant.storage_path, fallbackBytes, {
          cacheControl: "31536000",
          contentType: fallbackVariant.mime_type,
          upsert: false,
        });
      if (fallbackRestoreError) throw fallbackRestoreError;
    }
  }
  record("public_proxy_returns_controlled_nonwhite_fallback", fallbackPassed);

  await page.goto(`${baseUrl}/catalogo/${productSlug}`, { waitUntil: "domcontentloaded" });
  const gallery = page.getByRole("region", { name: new RegExp("Galeria de") });
  const box = await gallery.boundingBox();
  if (box) {
    const cdp = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { touchPoints: [{ x: box.x + box.width * 0.82, y }], type: "touchStart" });
    await cdp.send("Input.dispatchTouchEvent", { touchPoints: [{ x: box.x + box.width * 0.18, y }], type: "touchMove" });
    await cdp.send("Input.dispatchTouchEvent", { touchPoints: [], type: "touchEnd" });
    await page.waitForTimeout(700);
  }
  record("product_gallery_responds_to_mobile_swipe", (await page.locator("text=/2 \\/ 2/").count()) >= 1);
  record(
    "product_without_authorized_price_shows_consultation_without_currency",
    await page.getByText("Consulte", { exact: true }).count() >= 1 && await page.getByText(/R\$/).count() === 0,
  );
  record("related_products_render_only_when_published", await page.getByRole("heading", { name: "Outros modelos" }).count() === 1);
  await waitForLoadedImages(gallery);
  await page.screenshot({ path: path.join(reportDir, "product-mobile-390x844.png") });

  const whatsapp = page.getByRole("link", { name: "Consultar no WhatsApp" });
  const whatsappUrl = new URL(await whatsapp.getAttribute("href"));
  const whatsappText = whatsappUrl.searchParams.get("text") ?? "";
  record(
    "whatsapp_message_contains_only_context_and_confirmation_request",
    whatsappText.includes(`[QA FASE 4] Armação ${runId}`) &&
      whatsappText.includes(`Código: ${sku}`) &&
      whatsappText.includes(`[QA FASE 4] Marca ${runId}`) &&
      whatsappText.includes(`Modelo QA ${runId}`) &&
      whatsappText.includes("Cor: Grafite QA") &&
      whatsappText.includes(`/catalogo/${productSlug}`) &&
      whatsappText.includes("Gostaria de confirmar a disponibilidade.") &&
      !/estoque|reserva confirmada/i.test(whatsappText),
  );
  await admin.from("analytics_events").delete().eq("product_id", state.productId).eq("event_name", "product_whatsapp_click");
  const clickResponse = page.waitForResponse((response) =>
    response.url() === `${baseUrl}/api/analytics` && response.request().method() === "POST",
  );
  await whatsapp.click();
  await clickResponse;
  await page.waitForTimeout(400);
  const { count: clickCount } = await admin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("product_id", state.productId)
    .eq("event_name", "product_whatsapp_click");
  record("whatsapp_click_is_recorded_exactly_once", clickCount === 1);

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const preview = page.locator('section[aria-labelledby="catalog-preview-title"] [role="region"]');
  await preview.waitFor({ state: "attached" });
  const offscreenStart = await preview.evaluate((element) => element.scrollLeft);
  await page.waitForTimeout(900);
  const offscreenEnd = await preview.evaluate((element) => element.scrollLeft);
  record("home_preview_pauses_outside_viewport", Math.abs(offscreenEnd - offscreenStart) < 2);

  const semanticCards = await preview.locator('article:not([aria-hidden="true"])').count();
  const hiddenClones = await preview.locator('article[aria-hidden="true"]').count();
  record(
    "home_preview_limits_products_and_hides_loop_clones_semantically",
    semanticCards === 2 && semanticCards <= 6 && hiddenClones === semanticCards,
  );
  await preview.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await page.mouse.move(1, 1);
  await page.waitForTimeout(300);
  const autoplayStart = await preview.evaluate((element) => element.scrollLeft);
  const autoplayEnd = await preview.evaluate((element, start) => new Promise((resolve) => {
    const deadline = performance.now() + 3_200;
    const observe = () => {
      if (element.scrollLeft > start + 8 || performance.now() >= deadline) {
        resolve(element.scrollLeft);
        return;
      }
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  }), autoplayStart);
  const previewMetrics = await preview.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  record(
    "home_preview_autoplay_moves_only_when_visible",
    autoplayEnd > autoplayStart + 8,
    { autoplayEnd, autoplayStart, ...previewMetrics },
  );

  const previewBox = await preview.boundingBox();
  let dragMoved = false;
  let interactionPaused = false;
  let interactionResumed = false;
  if (previewBox) {
    const y = previewBox.y + Math.min(previewBox.height * 0.45, 260);
    const dragStart = await preview.evaluate((element) => element.scrollLeft);
    await page.mouse.move(previewBox.x + previewBox.width * 0.78, y);
    await page.mouse.down();
    await page.mouse.move(previewBox.x + previewBox.width * 0.24, y, { steps: 8 });
    await page.mouse.up();
    const dragEnd = await preview.evaluate((element) => element.scrollLeft);
    dragMoved = dragEnd > dragStart + 20;
    await page.mouse.move(1, 1);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.waitForTimeout(300);
    const pauseStart = await preview.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(900);
    const pauseEnd = await preview.evaluate((element) => element.scrollLeft);
    interactionPaused = Math.abs(pauseEnd - pauseStart) < 3;
    await page.waitForTimeout(3_500);
    const resumeStart = await preview.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(1_000);
    const resumeEnd = await preview.evaluate((element) => element.scrollLeft);
    interactionResumed = resumeEnd > resumeStart + 8;
  }
  record(
    "home_preview_supports_drag_then_pauses_and_resumes",
    dragMoved && interactionPaused && interactionResumed,
    { dragMoved, interactionPaused, interactionResumed },
  );
  await waitForLoadedImages(
    page.locator('section[aria-labelledby="catalog-preview-title"] article:not([aria-hidden="true"])'),
  );
  await page.screenshot({ path: path.join(reportDir, "home-preview-390x844.png") });

  const reducedContext = await browser.newContext({ hasTouch: true, isMobile: true, reducedMotion: "reduce", viewport: { height: 844, width: 390 } });
  await installVitals(reducedContext);
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const reducedPreview = reducedPage.locator('section[aria-labelledby="catalog-preview-title"] [role="region"]');
  await reducedPreview.scrollIntoViewIfNeeded();
  const reducedStart = await reducedPreview.evaluate((element) => element.scrollLeft);
  await reducedPage.waitForTimeout(1_400);
  const reducedEnd = await reducedPreview.evaluate((element) => element.scrollLeft);
  record("home_preview_respects_reduced_motion", Math.abs(reducedEnd - reducedStart) < 2);
  await reducedContext.close();

  const perfContext = await browser.newContext({
    reducedMotion: "no-preference",
    serviceWorkers: "block",
    viewport: { height: 844, width: 390 },
  });
  await installVitals(perfContext);
  const perfPage = await perfContext.newPage();
  const perfImageHeaderPromises = [];
  perfPage.on("response", (response) => {
    if (!response.url().includes("/api/catalogo/imagem/")) return;
    perfImageHeaderPromises.push(response.allHeaders().then((headers) => ({
      contentLength: headers["content-length"] ?? null,
      contentType: headers["content-type"] ?? null,
      nosniff: headers["x-content-type-options"] ?? null,
      url: response.url(),
      variant: headers["x-catalog-image-variant"] ?? null,
    })));
  });
  const perfCdp = await perfContext.newCDPSession(perfPage);
  await perfCdp.send("Network.enable");
  await perfCdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await perfCdp.send("Network.emulateNetworkConditions", {
    connectionType: "cellular3g",
    downloadThroughput: 200_000,
    latency: 150,
    offline: false,
    uploadThroughput: 93_750,
  });
  await perfPage.goto(`${baseUrl}/catalogo`, { timeout: 120_000, waitUntil: "domcontentloaded" });
  await perfPage.getByRole("link", { name: `Ver [QA FASE 4] Armação ${runId}, código ${sku}` }).waitFor();
  await perfPage.waitForTimeout(1_800);
  const slowCatalogMetrics = await collectBrowserMetrics(perfPage);
  await perfPage.goto(`${baseUrl}/catalogo/${productSlug}`, { timeout: 120_000, waitUntil: "domcontentloaded" });
  const productCoverImage = perfPage.locator('[role="region"][aria-label^="Galeria de"] img').first();
  await productCoverImage.waitFor();
  await productCoverImage.evaluate((image) => image.complete
    ? undefined
    : new Promise((resolve) => image.addEventListener("load", resolve, { once: true })));
  await perfPage.waitForTimeout(1_200);
  const slowProductMetrics = await collectBrowserMetrics(perfPage);
  const perfImageHeaders = await Promise.all(perfImageHeaderPromises);
  record(
    "slow_mobile_catalog_has_stable_bounded_first_viewport",
    slowCatalogMetrics.lcpMs > 0 && slowCatalogMetrics.lcpMs < 5_000 &&
      slowCatalogMetrics.cls <= 0.1 &&
      slowCatalogMetrics.totalTransferBytes < 1_500_000 &&
      slowCatalogMetrics.jsTransferBytes < 750_000 &&
      slowCatalogMetrics.imageRequestCount <= 2 &&
      slowCatalogMetrics.duplicates.length === 0,
    slowCatalogMetrics,
  );
  record(
    "slow_mobile_product_uses_only_persisted_detail_derivatives",
    slowProductMetrics.lcpMs > 0 && slowProductMetrics.lcpMs < 4_000 &&
      slowProductMetrics.cls <= 0.1 &&
      slowProductMetrics.imageRequestCount >= 1 &&
      perfImageHeaders.every((item) =>
        item.contentLength &&
        item.contentType?.startsWith("image/") &&
        item.nosniff === "nosniff" &&
        item.variant !== "admin_thumbnail"
      ),
    { imageHeaders: perfImageHeaders, metrics: slowProductMetrics },
  );
  await perfContext.close();

  const viewportMatrix = [
    { height: 800, width: 360 },
    { height: 812, width: 375 },
    { height: 844, width: 390 },
    { height: 915, width: 412 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1366 },
    { height: 900, width: 1440 },
  ];
  for (const viewport of viewportMatrix) {
    await page.setViewportSize(viewport);
    const routes = [
      { path: "/catalogo", ready: "#catalog-title" },
      { path: `/catalogo/${productSlug}`, ready: "main h1" },
      { path: "/", ready: "#hero-title" },
      { path: `/admin/produtos/${state.productId}`, ready: 'section[aria-labelledby="product-data-title"]' },
    ];
    const routeMetrics = [];
    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
      await page.locator(route.ready).first().waitFor();
      if (route.path === "/") {
        await page.locator('section[aria-labelledby="catalog-preview-title"]').waitFor({ state: "attached" });
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);
      routeMetrics.push(await page.evaluate((pathname) => ({
        clientWidth: document.documentElement.clientWidth,
        maxScrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        pathname,
      }), route.path));
      if (route.path === "/" && viewport.width === 1440) {
        const desktopPreview = page.locator('section[aria-labelledby="catalog-preview-title"]');
        await desktopPreview.scrollIntoViewIfNeeded();
        await waitForLoadedImages(desktopPreview.locator('article:not([aria-hidden="true"])'));
        await page.screenshot({ path: path.join(reportDir, "home-preview-1440x900.png") });
      }
    }
    record(
      `responsive_${viewport.width}x${viewport.height}_has_no_document_overflow`,
      routeMetrics.every((metric) => metric.maxScrollWidth <= metric.clientWidth + 1),
      routeMetrics,
    );
  }
  await page.setViewportSize({ height: 844, width: 390 });
  await removeQaProduct(state.secondaryProductId);
  state.secondaryProductId = null;

  await page.goto(`${baseUrl}/admin/disponibilidade?q=${encodeURIComponent(sku)}`, { waitUntil: "domcontentloaded" });
  const availabilityForm = page.locator("article").filter({ hasText: sku }).locator("form");
  await availabilityForm.locator('select[name="availability_status"]').selectOption("unavailable");
  await submitAndWait(availabilityForm, "Atualizar", "saved");
  const unavailableHtml = await (await fetch(`${baseUrl}/catalogo/${productSlug}`)).text();
  record("mobile_quick_availability_revalidates_public_product", unavailableHtml.includes("Indisponível"));
  await page.goto(`${baseUrl}/catalogo?disponibilidade=unavailable`, { waitUntil: "domcontentloaded" });
  await page.getByText(`[QA FASE 4] Armação ${runId}`, { exact: true }).first().waitFor();
  record(
    "availability_filter_includes_unavailable_product_without_stock_claim",
    await page.getByText("Indisponível", { exact: true }).count() >= 1 && !/em estoque/i.test(await page.locator("body").innerText()),
  );
  await page.goto(`${baseUrl}/admin/disponibilidade?q=${encodeURIComponent(sku)}`, { waitUntil: "domcontentloaded" });
  await availabilityForm.locator('select[name="availability_status"]').selectOption("consultation");
  await submitAndWait(availabilityForm, "Atualizar", "saved");

  await page.goto(`${baseUrl}/admin/colecoes`, { waitUntil: "domcontentloaded" });
  const collectionForm = page.locator('section[aria-labelledby="new-collection-title"] form');
  await collectionForm.locator('input[name="name"]').fill(`[QA FASE 4] Coleção ${runId}`);
  await collectionForm.locator('input[name="slug"]').fill(`qa-fase4-colecao-${runId}`);
  await submitAndWait(collectionForm, "Criar rascunho", "created");
  state.collectionId = new URL(page.url()).pathname.split("/").pop();
  state.auditIds.push(state.collectionId, `${state.collectionId}:${state.productId}`);
  await page.getByLabel("Adicionar produto").selectOption(state.productId);
  await page.getByRole("button", { name: "Adicionar à sequência" }).click();
  const relationForm = page.locator("form").filter({ hasText: "Salvar produtos e ordem" });
  await submitAndWait(relationForm, "Salvar produtos e ordem", "reordered");
  const { count: relationCount } = await admin
    .from("collection_products")
    .select("product_id", { count: "exact", head: true })
    .eq("collection_id", state.collectionId)
    .eq("product_id", state.productId);
  record("admin_links_product_to_collection", relationCount === 1);

  await page.goto(`${baseUrl}/admin/auditoria?entity=products&action=update`, { waitUntil: "domcontentloaded" });
  record("admin_filters_audit_by_entity_and_action", await page.getByText(state.productId, { exact: true }).count() >= 1);

  await page.goto(`${baseUrl}/admin/produtos/${state.productId}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="featured"]').uncheck();
  await saveProduct();
  const homeWithoutFeature = await (await fetch(`${baseUrl}/`)).text();
  record("home_preview_disappears_without_valid_featured_products", !homeWithoutFeature.includes("catalog-preview-title"));
  await page.locator('input[name="featured"]').check();
  await saveProduct();

  await page.locator('input[name="featured"]').uncheck();
  await page.locator('input[name="published"]').uncheck();
  await saveProduct();
  const draftImageResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${cover.id}?variant=catalog_card`);
  const draftPageResponse = await fetch(`${baseUrl}/catalogo/${productSlug}`);
  const catalogWithoutPublishedProducts = await (await fetch(`${baseUrl}/catalogo`)).text();
  record(
    "draft_product_and_images_are_not_public",
    draftImageResponse.status === 404 && draftPageResponse.status === 404,
    { draftImageStatus: draftImageResponse.status, draftPageStatus: draftPageResponse.status },
  );
  record(
    "catalog_hides_taxonomies_without_published_products",
    !catalogWithoutPublishedProducts.includes(`[QA FASE 4] Marca ${runId}`) &&
      !catalogWithoutPublishedProducts.includes(`[QA FASE 4] Categoria ${runId}`) &&
      catalogWithoutPublishedProducts.includes("A vitrine está sendo atualizada."),
  );
  await page.locator('input[name="published"]').check();
  await page.locator('input[name="featured"]').check();
  await saveProduct();

  images = await productMedia(state.productId);
  const removable = images.find((image) => !image.is_cover);
  const removablePaths = [removable.storage_path, ...removable.variants.map((variant) => variant.storage_path)];
  const removableIndex = images.findIndex((image) => image.id === removable.id) + 1;
  const removableRow = page.locator("article").filter({ hasText: `${removableIndex} de ${images.length}` });
  page.once("dialog", (dialog) => dialog.accept());
  await submitAndWait(removableRow.locator("form").filter({ hasText: "Remover imagem" }), "Remover imagem", "removed");
  images = await productMedia(state.productId);
  const storageAfterRemove = await storagePaths("catalog-products", state.productId);
  record(
    "image_delete_removes_master_and_all_derivatives_without_orphans",
    images.length === 1 && images[0].variants.length === 5 && removablePaths.every((item) => !storageAfterRemove.includes(item)) && storageAfterRemove.length === 6,
  );

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(reportDir, "catalog-desktop-1440x900.png") });
  await page.goto(`${baseUrl}/catalogo/${productSlug}`, { waitUntil: "domcontentloaded" });
  await waitForLoadedImages(page.locator('[role="region"][aria-label^="Galeria de"]'));
  await page.screenshot({ path: path.join(reportDir, "product-desktop-1440x900.png") });

  const rateSessionId = randomUUID();
  state.analyticsSessionIds.push(rateSessionId);
  const second = new Date().getUTCSeconds();
  if (second > 30) await new Promise((resolve) => setTimeout(resolve, (62 - second) * 1_000));
  const rateStatuses = [];
  for (let start = 0; start < 46; start += 8) {
    const batch = await Promise.all(Array.from({ length: Math.min(8, 46 - start) }, async () => {
      const response = await fetch(`${baseUrl}/api/analytics`, {
        body: JSON.stringify({
          anonymousSessionId: rateSessionId,
          collectionId: null,
          eventName: "page_view",
          metadata: { test: true },
          productId: null,
          promotionId: null,
          route: "/qa-phase4-rate-limit",
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: baseUrl,
          "User-Agent": "Vision-Phase4-Rate-QA",
        },
        method: "POST",
      });
      return response.status;
    }));
    rateStatuses.push(...batch);
  }
  record(
    "analytics_rate_limit_allows_45_per_minute_and_rejects_overflow",
    rateStatuses.filter((status) => status === 202).length === 45 &&
      rateStatuses.filter((status) => status === 429).length === 1,
    rateStatuses,
  );

  record("qa_has_no_console_or_page_errors", consoleErrors.length === 0 && pageErrors.length === 0, {
    consoleErrors,
    pageErrors,
  });
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  record("phase4_qa_completed_without_unexpected_error", false, fatalError);
} finally {
  if (context) {
    await context.close().catch(() => undefined);
    if (video) await video.saveAs(path.join(reportDir, "phase4-interactions.webm")).catch(() => undefined);
  }
  if (browser) await browser.close().catch(() => undefined);
  await cleanup().catch((error) => {
    fatalError = fatalError ?? `Falha na limpeza: ${error instanceof Error ? error.message : String(error)}`;
  });

  const { count: activeAdmins } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true);
  const { count: fixtureProducts } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .like("slug", "qa-phase4-%");
  record("cleanup_restores_exactly_one_admin_and_zero_phase4_products", activeAdmins === 1 && fixtureProducts === 0, {
    activeAdmins,
    fixtureProducts,
  });
}

const report = {
  failed: results.filter((result) => !result.passed).length,
  fatalError,
  passed: results.filter((result) => result.passed).length,
  results,
  total: results.length,
};
fs.writeFileSync(path.join(reportDir, "phase4-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (fatalError || report.failed) process.exitCode = 1;
