import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}.`);
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
  if (!executable) throw new Error("Chrome ou Edge não encontrado para o QA.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3026").replace(/\/$/, "");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const outputDir = path.resolve("docs/qa/product-simplification");
const suffix = randomUUID().slice(0, 8);
const email = `qa-product-showcase-${suffix}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const productIds = [];
const brandIds = [];
const auditEntityIds = [];
const storagePaths = [];
const results = [];
const consoleErrors = [];
const pageErrors = [];
let userId = null;
let browser = null;
let context = null;
let fatalError = null;

function record(name, passed, details) {
  results.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
}

async function row(id) {
  const { data, error } = await admin.from("products").select("*").eq("id", id).single();
  if (error || !data) throw error ?? new Error("Produto de QA não encontrado.");
  return data;
}

async function publishWithCover(productId) {
  const imageId = randomUUID();
  const assetVersion = randomUUID();
  const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=", "base64");
  const etag = `"${createHash("sha256").update(jpeg).digest("base64url")}"`;
  const masterPath = `${productId}/${randomUUID()}.jpg`;
  const kinds = ["admin_thumbnail", "catalog_card", "home_preview", "product_detail", "open_graph"];
  const variantRows = kinds.map((kind) => {
    const id = randomUUID();
    const storagePath = `${productId}/${randomUUID()}.jpg`;
    auditEntityIds.push(id);
    storagePaths.push(storagePath);
    return {
      asset_version: assetVersion,
      etag,
      height: 1,
      id,
      kind,
      mime_type: "image/jpeg",
      product_image_id: imageId,
      size_bytes: jpeg.length,
      storage_path: storagePath,
      width: 1,
    };
  });
  storagePaths.push(masterPath);
  auditEntityIds.push(imageId);

  for (const storagePath of [masterPath, ...variantRows.map((variant) => variant.storage_path)]) {
    const { error } = await admin.storage.from("catalog-products").upload(storagePath, jpeg, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
  }
  const imageResult = await admin.from("product_images").insert({
    alt_text: "Armação da vitrine de teste",
    asset_version: assetVersion,
    blur_data_url: "data:image/jpeg;base64,/9j/2Q==",
    display_order: 0,
    height: 1,
    id: imageId,
    is_cover: true,
    mime_type: "image/jpeg",
    object_position: "50% 50%",
    product_id: productId,
    size_bytes: jpeg.length,
    storage_path: masterPath,
    width: 1,
  });
  if (imageResult.error) throw imageResult.error;
  const variantResult = await admin.from("product_image_variants").insert(variantRows);
  if (variantResult.error) throw variantResult.error;
  const publishResult = await admin.from("products").update({ published: true }).eq("id", productId);
  if (publishResult.error) throw publishResult.error;
}

async function createDraft(page, { availability, brandId, model, name, priceCents }) {
  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Nome do produto", { exact: true }).fill(name);
  if (brandId) await page.locator('select[name="brand_id"]').selectOption(brandId);
  if (model) await page.locator('input[name="model"]').fill(model);
  if (priceCents) {
    await page.getByRole("radio", { name: "Preço definido" }).check();
    await page.locator('input[name="price_display"]').fill(priceCents);
  }
  if (availability !== "available") {
    await page.getByRole("radio", { exact: true, name: availability === "last_unit" ? "Última unidade" : "Indisponível" }).check();
  }
  await Promise.all([
    page.waitForURL((url) => /^\/admin\/produtos\/[0-9a-f-]{36}$/.test(url.pathname) && url.searchParams.get("status") === "created", { timeout: 30_000 }),
    page.getByRole("button", { name: "Salvar rascunho" }).click(),
  ]);
  const id = page.url().match(/\/admin\/produtos\/([0-9a-f-]{36})/)?.[1];
  if (!id) throw new Error("Produto criado sem ID reconhecível.");
  productIds.push(id);
  auditEntityIds.push(id);
  return id;
}

async function whatsappMessage(page, slug) {
  await page.goto(`${baseUrl}/catalogo/${slug}`, { waitUntil: "domcontentloaded" });
  const href = await page.getByRole("link", { name: "Consultar no WhatsApp" }).getAttribute("href");
  return href ? new URL(href).searchParams.get("text") ?? "" : "";
}

fs.mkdirSync(outputDir, { recursive: true });

try {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Cadastro Produto" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Falha ao criar usuário de QA.");
  userId = created.data.user.id;
  auditEntityIds.push(userId);
  const profile = await admin.from("profiles").update({ active: true, name: "QA Cadastro Produto", role: "admin" }).eq("id", userId);
  if (profile.error) throw profile.error;

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  context = await browser.newContext({ colorScheme: "light", viewport: { height: 844, width: 390 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300)); });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));

  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 30_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);

  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  const forbiddenNames = ["slug", "display_order", "whatsapp_message_override", "sku"];
  record("technical_fields_are_absent", await Promise.all(forbiddenNames.map((name) => page.locator(`[name="${name}"]`).count())).then((counts) => counts.every((count) => count === 0)));
  record("new_defaults_are_consult_and_available", await page.getByRole("radio", { exact: true, name: "Sob consulta" }).isChecked() && await page.getByRole("radio", { exact: true, name: "Disponível" }).isChecked());
  record("model_is_optional", !(await page.locator('input[name="model"]').getAttribute("required")));
  record("logical_sections_are_visible", await Promise.all(["Informações principais", "Apresentação", "Venda e contato", "Publicação"].map((name) => page.getByRole("heading", { name }).count())).then((counts) => counts.every((count) => count === 1)));
  record("mobile_form_has_no_horizontal_overflow", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

  await page.locator('select[name="brand_id"]').selectOption("__create_brand__");
  await page.getByRole("dialog", { name: "Criar nova marca" }).locator('input[name="name"]').fill(`Marca QA ${suffix}`);
  await page.getByRole("dialog", { name: "Criar nova marca" }).getByRole("button", { name: "Criar marca" }).click();
  await page.getByRole("dialog", { name: "Criar nova marca" }).waitFor({ state: "hidden" });
  const selectedBrandId = await page.locator('select[name="brand_id"]').inputValue();
  if (!selectedBrandId) throw new Error("Marca criada sem seleção automática.");
  brandIds.push(selectedBrandId);
  auditEntityIds.push(selectedBrandId);
  record("inline_brand_is_created_and_selected", Boolean(selectedBrandId));
  await page.screenshot({ fullPage: true, path: path.join(outputDir, "cadastro-mobile-390x844.png") });

  const firstId = await createDraft(page, {
    availability: "available",
    brandId: selectedBrandId,
    model: "",
    name: "Óculos Áureo Classic",
    priceCents: "129000",
  });
  const firstDraft = await row(firstId);
  record("defined_price_is_stored_exactly", firstDraft.price === 1290 && firstDraft.price_visibility === "visible", { price: firstDraft.price, visibility: firstDraft.price_visibility });
  record("first_slug_is_normalized", firstDraft.slug === "oculos-aureo-classic", firstDraft.slug);
  record("new_product_is_available_and_last_in_order", firstDraft.availability_status === "available" && firstDraft.display_order === 0);
  record("whatsapp_override_is_not_stored", firstDraft.whatsapp_message_override === null);

  const secondId = await createDraft(page, {
    availability: "last_unit",
    brandId: selectedBrandId,
    model: "AV-2",
    name: "Óculos Áureo Classic",
    priceCents: "",
  });
  const secondDraft = await row(secondId);
  record("duplicate_slug_receives_suffix", secondDraft.slug === "oculos-aureo-classic-2", secondDraft.slug);
  record("consult_price_clears_value", secondDraft.price === null && secondDraft.price_visibility === "consult");
  record("second_product_enters_after_first", secondDraft.display_order > firstDraft.display_order);
  record("last_unit_is_persisted", secondDraft.availability_status === "last_unit");

  const thirdId = await createDraft(page, {
    availability: "unavailable",
    brandId: selectedBrandId,
    model: "",
    name: "Óculos Grafite",
    priceCents: "",
  });
  const thirdDraft = await row(thirdId);
  record("unavailable_is_persisted", thirdDraft.availability_status === "unavailable");

  await publishWithCover(firstId);
  await publishWithCover(secondId);
  await publishWithCover(thirdId);

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${baseUrl}/admin/produtos/${firstId}`, { waitUntil: "domcontentloaded" });
  record("desktop_edit_hides_technical_fields", await Promise.all(forbiddenNames.map((name) => page.locator(`[name="${name}"]`).count())).then((counts) => counts.every((count) => count === 0)));
  await page.getByLabel("Nome do produto", { exact: true }).fill("Óculos Áureo Renomeado");
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith(firstId) && url.searchParams.get("status") === "saved", { timeout: 30_000 }),
    page.getByRole("button", { name: "Salvar alterações" }).click(),
  ]);
  await page.screenshot({ fullPage: true, path: path.join(outputDir, "edicao-desktop-1440x900.png") });
  const renamed = await row(firstId);
  record("published_slug_is_preserved_after_rename", renamed.slug === firstDraft.slug, { before: firstDraft.slug, after: renamed.slug });

  const noModelMessage = await whatsappMessage(page, renamed.slug);
  const modelMessage = await whatsappMessage(page, secondDraft.slug);
  const unavailableMessage = await whatsappMessage(page, thirdDraft.slug);
  record("whatsapp_without_model_matches_template", noModelMessage === `Olá! Tenho interesse no ${renamed.name}. Gostaria de confirmar a disponibilidade.\n\n${baseUrl}/catalogo/${renamed.slug}` || (noModelMessage.includes(`Olá! Tenho interesse no ${renamed.name}. Gostaria de confirmar a disponibilidade.`) && !noModelMessage.includes("modelo")), noModelMessage);
  record("whatsapp_with_model_matches_template", modelMessage.includes(`Olá! Tenho interesse no ${secondDraft.name}, modelo ${secondDraft.model}. Gostaria de confirmar a disponibilidade.`) && modelMessage.includes(`/catalogo/${secondDraft.slug}`), modelMessage);
  record("whatsapp_has_no_technical_or_empty_fields", !/slug|sku|código|preço|disponibilidade:|null|undefined/i.test(`${noModelMessage}\n${modelMessage}`));
  record("unavailable_product_keeps_whatsapp_contact", unavailableMessage.includes(thirdDraft.name));

  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "networkidle" });
  const catalogText = await page.locator("main").innerText();
  const normalizedCatalogText = catalogText.replace(/\u00a0/g, " ");
  record("public_catalog_formats_price_and_consult", normalizedCatalogText.includes("R$ 1.290,00") && normalizedCatalogText.includes("Sob consulta"));
  record("public_catalog_shows_three_exact_availabilities", ["Disponível", "Última unidade", "Indisponível"].every((label) => catalogText.includes(label)));
  record("public_catalog_never_shows_zero_price", !catalogText.includes("R$ 0,00"));

  const invalidAvailabilityId = randomUUID();
  const invalidAvailability = await admin.from("products").insert({ id: invalidAvailabilityId, name: "QA inválido", sku: `QA-${suffix}-A`, slug: `qa-invalido-a-${suffix}`, availability_status: "consultation" });
  record("database_rejects_legacy_availability", Boolean(invalidAvailability.error));
  const invalidPriceId = randomUUID();
  const invalidPrice = await admin.from("products").insert({ id: invalidPriceId, name: "QA preço inválido", sku: `QA-${suffix}-P`, slug: `qa-invalido-p-${suffix}`, price: 0, price_visibility: "visible" });
  record("database_rejects_nonpositive_defined_price", Boolean(invalidPrice.error));
  record("qa_has_no_console_or_page_errors", consoleErrors.length === 0 && pageErrors.length === 0, { consoleErrors, pageErrors });
} catch (error) {
  fatalError = error instanceof Error ? error.stack ?? error.message : String(error);
  record("qa_completed_without_unexpected_error", false, fatalError);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  if (productIds.length) await admin.from("products").delete().in("id", productIds);
  if (brandIds.length) await admin.from("brands").delete().in("id", brandIds);
  if (storagePaths.length) await admin.storage.from("catalog-products").remove(storagePaths);
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (auditEntityIds.length) await admin.from("audit_logs").delete().in("entity_id", [...new Set(auditEntityIds)]);
  const [{ count: productsLeft }, { count: brandsLeft }] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("brands").select("id", { count: "exact", head: true }),
  ]);
  record("temporary_data_was_removed", productsLeft === 0 && brandsLeft === 0, { brandsLeft, productsLeft });
}

const report = {
  failed: results.filter((result) => !result.passed).length,
  fatalError,
  passed: results.filter((result) => result.passed).length,
  results,
  total: results.length,
};
fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (fatalError || report.failed) process.exitCode = 1;
