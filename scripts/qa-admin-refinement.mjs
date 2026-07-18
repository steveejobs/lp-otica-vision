import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

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
  if (!executable) throw new Error("Chrome ou Edge nao encontrado para QA visual.");
  return executable;
}

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3500";
const outputDir = path.resolve("docs/qa/admin-refinement/after/functional");
fs.mkdirSync(outputDir, { recursive: true });

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const admin = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const suffix = randomBytes(4).toString("hex");
const email = `qa-refinement-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const galleryId = randomUUID();
const gallerySlug = `qa-refinamento-${suffix}`;
const brandName = `Élan Vision QA ${suffix}`;
const duplicateName = `ELAN-VISION QA ${suffix}`;
const productName = `Produto QA ${suffix}`;
const productSlug = `produto-qa-${suffix}`;
const productSku = `OV-QA-${suffix.toUpperCase()}`;
const storagePaths = [];
const entityIds = [galleryId];
let userId;
let brandId;
let productId;
let browser;

const report = {
  audit: {},
  console_errors: [],
  crop: {},
  history: {},
  inline_brand: {},
  mobile: [],
  navigation: {},
  permissions: {},
  session: {},
};

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 90_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);
  await page.locator("#main-content h1").waitFor();
}

async function installFixture() {
  const { data: routeOwner, error: routeError } = await admin
    .from("galleries")
    .select("id")
    .eq("route_key", "home.featured_collection")
    .maybeSingle();
  if (routeError) throw routeError;
  if (routeOwner) throw new Error("A rota home.featured_collection possui dado real; QA nao alterou o registro.");

  const { error: galleryError } = await admin.from("galleries").insert({
    autoplay: false,
    display_order: 99999,
    id: galleryId,
    name: `Galeria QA ${suffix}`,
    published: false,
    route_key: "home.featured_collection",
    slug: gallerySlug,
  });
  if (galleryError) throw galleryError;

  const sources = ["1 (1).jpg", "2 (1).jpg", "3 (1).jpg"];
  const items = [];
  for (const [index, filename] of sources.entries()) {
    const itemId = randomUUID();
    const storagePath = `${galleryId}/${itemId}.jpg`;
    const body = fs.readFileSync(path.resolve("public/media/photos", filename));
    const { error: uploadError } = await admin.storage
      .from("site-galleries")
      .upload(storagePath, body, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw uploadError;
    storagePaths.push(storagePath);
    entityIds.push(itemId);
    items.push({
      alt_text: `Armação em composição editorial ${index + 1}`,
      desktop_object_position: index === 0 ? "42% 48%" : "50% 50%",
      display_order: index,
      gallery_id: galleryId,
      height: 1920,
      id: itemId,
      mobile_object_position: index === 0 ? "58% 44%" : "50% 50%",
      published: false,
      series_order: index === 2 ? 3 : index + 1,
      storage_path: storagePath,
      visual_series: "QA editorial",
      width: 1440,
    });
  }
  const { error: itemError } = await admin.from("gallery_items").insert(items);
  if (itemError) throw itemError;
}

async function visualAndFunctionalQa(context, page) {
  await page.goto(`${baseUrl}/admin/galerias/${galleryId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: `Galeria QA ${suffix}` }).waitFor();
  await page.getByText("Home › Coleção em destaque", { exact: true }).waitFor();
  await page.locator("aside").filter({ hasText: "Aparece em" }).screenshot({ path: path.join(outputDir, "gallery-location.png") });

  const preview = page.getByRole("region", { name: "Prévia real do enquadramento" });
  await preview.waitFor();
  await preview.screenshot({ path: path.join(outputDir, "gallery-preview-desktop.png") });
  await preview.getByRole("button", { name: "Mobile" }).click();
  await preview.screenshot({ path: path.join(outputDir, "gallery-preview-mobile.png") });
  await preview.getByRole("slider", { name: "Posição horizontal" }).fill("64");
  const firstItem = page.locator("article").first();
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("status") === "saved", { timeout: 90_000 }),
    firstItem.getByRole("button", { name: "Salvar item" }).click(),
  ]);
  const { data: cropRow, error: cropError } = await admin
    .from("gallery_items")
    .select("mobile_object_position, desktop_object_position")
    .eq("gallery_id", galleryId)
    .order("display_order")
    .limit(1)
    .single();
  if (cropError) throw cropError;
  report.crop = {
    desktop: cropRow.desktop_object_position,
    mobile: cropRow.mobile_object_position,
    separate_values_persisted: cropRow.desktop_object_position !== cropRow.mobile_object_position,
  };

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  const productForm = page.locator('select[name="brand_id"]').locator("xpath=ancestor::form");
  await productForm.getByLabel("SKU").fill(productSku);
  await productForm.getByLabel("Slug", { exact: true }).fill(productSlug);
  await productForm.getByLabel("Nome", { exact: true }).fill(productName);
  await productForm.getByLabel("Modelo").fill(`Modelo preservado ${suffix}`);
  await productForm.getByLabel("Cor").fill("Âmbar QA");
  await productForm.getByLabel("Descrição curta").fill(`Texto preservado ${suffix}`);
  await page.getByRole("button", { name: "Nova marca" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova marca" });
  await dialog.waitFor();
  await dialog.getByLabel("Nome").fill(brandName);
  await dialog.screenshot({ path: path.join(outputDir, "inline-brand-dialog.png") });
  await dialog.getByRole("button", { name: "Confirmar nova marca" }).click();
  await dialog.waitFor({ state: "hidden" });
  const brandSelectCount = await page.locator('select[name="brand_id"]').count();
  if (brandSelectCount !== 1) {
    await page.screenshot({ fullPage: false, path: path.join(outputDir, "inline-brand-unexpected-state.png") });
    const bodyText = (await page.locator("body").innerText()).slice(0, 1_000);
    throw new Error(`Estado inesperado apos criar marca em ${page.url()}: ${bodyText}`);
  }
  const selectedBrand = await productForm.locator('select[name="brand_id"]').inputValue();
  const preserved = {
    color: await productForm.getByLabel("Cor").inputValue(),
    description: await productForm.getByLabel("Descrição curta").inputValue(),
    model: await productForm.getByLabel("Modelo").inputValue(),
    name: await productForm.getByLabel("Nome", { exact: true }).inputValue(),
    sku: await productForm.getByLabel("SKU").inputValue(),
    slug: await productForm.getByLabel("Slug", { exact: true }).inputValue(),
  };
  const { data: createdBrand, error: brandError } = await admin
    .from("brands")
    .select("id, name, slug, active, logo_url")
    .eq("id", selectedBrand)
    .single();
  if (brandError) throw brandError;
  brandId = createdBrand.id;
  entityIds.push(brandId);
  report.inline_brand = {
    active_by_default: createdBrand.active,
    canonical_slug: createdBrand.slug,
    form_preserved: preserved.name === productName && preserved.model === `Modelo preservado ${suffix}` && preserved.description === `Texto preservado ${suffix}`,
    logo_optional: createdBrand.logo_url === null,
    selected_automatically: selectedBrand === brandId,
  };
  await page.screenshot({ fullPage: false, path: path.join(outputDir, "product-new-brand-selected.png") });

  await page.getByRole("button", { name: "Nova marca" }).click();
  await dialog.getByLabel("Nome").fill(duplicateName);
  await dialog.getByRole("button", { name: "Confirmar nova marca" }).click();
  await dialog.getByText(new RegExp(`Já existe a marca ${brandName}`, "i")).waitFor();
  await dialog.screenshot({ path: path.join(outputDir, "inline-brand-duplicate.png") });
  report.inline_brand.duplicate_suggested = true;
  await dialog.getByRole("button", { name: "Usar marca existente" }).click();
  await dialog.waitFor({ state: "hidden" });

  await Promise.all([
    page.waitForURL(/\/admin\/produtos\/[0-9a-f-]+\?status=created$/, { timeout: 90_000 }),
    page.getByRole("button", { name: "Criar rascunho" }).click(),
  ]);
  productId = new URL(page.url()).pathname.split("/").at(-1);
  entityIds.push(productId);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: productName }).waitFor();
  await page.getByRole("button", { name: "Salvar produto" }).waitFor();
  await page.locator('select[name="brand_id"]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0);
  await page.locator('select[name="brand_id"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ fullPage: false, path: path.join(outputDir, "product-with-new-brand.png") });
  const { data: productRow, error: productError } = await admin
    .from("products")
    .select("id, brand_id, published")
    .eq("id", productId)
    .single();
  if (productError) throw productError;
  report.inline_brand.product_persisted_with_brand = productRow.brand_id === brandId && productRow.published === false;

  await new Promise((resolve) => setTimeout(resolve, 250));
  const { data: auditRows, error: auditError } = await admin
    .from("audit_logs")
    .select("action, entity_id, entity_type, actor_id")
    .eq("actor_id", userId)
    .eq("entity_id", brandId);
  if (auditError) throw auditError;
  report.audit = { brand_creation_logged: Boolean(auditRows?.some((row) => row.action === "insert" && row.entity_type === "brands")) };

  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Produtos", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Produtos", exact: true }).waitFor();
  report.navigation.focus_after_route = await page.waitForFunction(
    () => document.activeElement?.tagName === "H1" && document.activeElement.textContent?.trim() === "Produtos",
    undefined,
    { timeout: 2_000 },
  ).then(() => true).catch(() => false);
  await page.getByRole("link", { name: "Marcas", exact: true }).click();
  await page.getByRole("heading", { name: "Marcas", exact: true }).waitFor();
  await page.goBack();
  await page.getByRole("heading", { name: "Produtos", exact: true }).waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Marcas", exact: true }).waitFor();
  report.history = { back_forward: true };

  const newTab = await context.newPage();
  await newTab.goto(`${baseUrl}/admin/galerias`, { waitUntil: "domcontentloaded" });
  await newTab.getByRole("heading", { name: "Galerias", exact: true }).waitFor();
  report.navigation.new_tab = true;
  await newTab.close();

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    connectionType: "cellular3g",
    downloadThroughput: 180_000,
    latency: 300,
    offline: false,
    uploadThroughput: 90_000,
  });
  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  const shell = await page.locator("#main-content").elementHandle();
  await page.getByRole("link", { name: "Galerias", exact: true }).click({ noWaitAfter: true });
  await page.getByRole("heading", { name: "Galerias", exact: true }).waitFor({ timeout: 90_000 });
  report.navigation.slow_network_shell_persisted = await shell.evaluate((node) => node.isConnected);
  await cdp.send("Network.emulateNetworkConditions", { downloadThroughput: -1, latency: 0, offline: false, uploadThroughput: -1 });

  const viewports = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/admin/galerias/${galleryId}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: `Galeria QA ${suffix}` }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    report.mobile.push({ ...viewport, horizontal_overflow: overflow });
  }
}

async function permissionQa(page) {
  await admin.from("profiles").update({ role: "attendant" }).eq("id", userId);
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { error: loginError } = await userClient.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  const forbiddenId = randomUUID();
  const { error: rlsError } = await userClient.from("brands").insert({
    id: forbiddenId,
    name: `Marca proibida ${suffix}`,
    slug: `marca-proibida-${suffix}`,
  });
  if (!rlsError) {
    entityIds.push(forbiddenId);
    await admin.from("brands").delete().eq("id", forbiddenId);
  }
  report.permissions.rls_blocks_attendant = Boolean(rlsError);
  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/admin" && url.searchParams.get("status") === "forbidden", { timeout: 90_000 });
  report.permissions.server_action_role_gate = await page.getByText("Seu papel não permite acessar essa configuração.", { exact: true }).isVisible();
}

async function expiredSessionQa(browserInstance) {
  const context = await browserInstance.newContext({ viewport: { height: 844, width: 390 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/admin/galerias`, { waitUntil: "domcontentloaded" });
  report.session.expired_redirects_to_login = new URL(page.url()).pathname === "/admin/login";
  report.session.return_path_preserved = new URL(page.url()).searchParams.get("next") === "/admin/galerias";
  await context.close();
}

try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Refinamento ADM" },
  });
  if (error || !data.user) throw error ?? new Error("Falha ao criar usuario temporario.");
  userId = data.user.id;
  await admin.from("profiles").update({ active: true, name: "QA Refinamento ADM", role: "admin" }).eq("id", userId);
  await installFixture();

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  const context = await browser.newContext({ colorScheme: "light", viewport: { height: 900, width: 1440 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  page.setDefaultNavigationTimeout(90_000);
  page.on("console", (message) => { if (message.type() === "error") report.console_errors.push(message.text()); });
  page.on("pageerror", (error) => report.console_errors.push(error.message));
  await login(page);
  await visualAndFunctionalQa(context, page);
  await permissionQa(page);
  await expiredSessionQa(browser);
  await context.close();

  report.passed =
    report.crop.separate_values_persisted &&
    report.inline_brand.form_preserved &&
    report.inline_brand.duplicate_suggested &&
    report.inline_brand.product_persisted_with_brand &&
    report.audit.brand_creation_logged &&
    report.permissions.rls_blocks_attendant &&
    report.permissions.server_action_role_gate &&
    report.session.expired_redirects_to_login &&
    report.navigation.focus_after_route &&
    report.navigation.slow_network_shell_persisted &&
    report.mobile.every((viewport) => !viewport.horizontal_overflow) &&
    report.console_errors.length === 0;
  fs.writeFileSync(path.join(outputDir, "functional-results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (productId) await admin.from("products").delete().eq("id", productId);
  if (brandId) await admin.from("brands").delete().eq("id", brandId);
  await admin.from("galleries").delete().eq("id", galleryId);
  if (storagePaths.length) await admin.storage.from("site-galleries").remove(storagePaths);
  if (userId) {
    await admin.from("audit_logs").delete().eq("actor_id", userId);
    if (entityIds.length) await admin.from("audit_logs").delete().in("entity_id", entityIds);
    await admin.auth.admin.deleteUser(userId);
  }
}
