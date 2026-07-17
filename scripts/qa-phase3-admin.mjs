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
  if (!executable) throw new Error("Chrome ou Edge nao encontrado para QA do ADM.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3013").replace(/\/$/, "");
const statePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
if (!fs.existsSync(statePath)) throw new Error("Fixtures efemeras precisam estar ativas.");
const fixtures = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (!fixtures.phase3?.prepared || !fixtures.productIds?.length) {
  throw new Error("Fixtures da Fase 3 precisam estar preparadas.");
}

const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const email = `qa-phase3-admin-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const draftId = randomUUID();
const draftSku = `QA-PHASE3-${draftId.slice(0, 8)}`.toUpperCase();
const draftSlug = `qa-phase3-indicators-${draftId.slice(0, 8)}`;
let userId = null;
let browser = null;
let originalProduct = null;
let productWasRestored = false;
const results = [];
const consoleErrors = [];
const pageErrors = [];

function record(name, passed) {
  results.push({ name, passed: Boolean(passed) });
}

try {
  const productResult = await admin
    .from("products")
    .select("id, name, slug")
    .eq("id", fixtures.productIds[0])
    .single();
  if (productResult.error || !productResult.data) throw new Error("Produto de QA indisponivel.");
  originalProduct = productResult.data;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Fase 3" },
  });
  if (created.error || !created.data.user) throw new Error("Falha ao criar usuario temporario.");
  userId = created.data.user.id;

  const profileUpdate = await admin
    .from("profiles")
    .update({ active: true, name: "QA Fase 3", role: "admin" })
    .eq("id", userId);
  if (profileUpdate.error) throw new Error("Falha ao ativar admin temporario.");

  const draftInsert = await admin.from("products").insert({
    id: draftId,
    name: "[QA FASE 3] Indicadores editoriais",
    price_visibility: "hidden",
    published: false,
    sku: draftSku,
    slug: draftSlug,
  });
  if (draftInsert.error) throw new Error("Falha ao criar rascunho temporario.");

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  const context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "no-preference",
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 160));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 160)));

  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 20_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);

  await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: "domcontentloaded" });
  record(
    "admin_opens_catalog_analytics",
    page.url() === `${baseUrl}/admin/analytics` && await page.getByRole("heading", { name: "Analytics do catálogo" }).count() === 1,
  );
  record("admin_navigation_exposes_analytics", await page.getByRole("link", { name: "Analytics" }).count() === 1);

  await page.goto(`${baseUrl}/admin/produtos?q=${encodeURIComponent(draftSku)}`, { waitUntil: "domcontentloaded" });
  record(
    "product_list_exposes_missing_catalog_indicators",
    await page.getByText("Sem capa · Sem marca · Sem categoria", { exact: true }).count() === 1,
  );

  const editUrl = `${baseUrl}/admin/produtos/${originalProduct.id}`;
  await page.goto(editUrl, { waitUntil: "domcontentloaded" });
  record("published_product_has_direct_public_link", await page.getByRole("link", { name: "Ver página pública" }).count() === 1);

  const changedName = `${originalProduct.name} · QA cache`;
  await page.locator('input[name="name"]').fill(changedName);
  await Promise.all([
    page.waitForURL((url) => url.pathname === `/admin/produtos/${originalProduct.id}` && url.searchParams.get("status") === "saved", { timeout: 20_000 }),
    page.getByRole("button", { name: "Salvar produto" }).click(),
  ]);
  await page.goto(`${baseUrl}/catalogo/${originalProduct.slug}`, { waitUntil: "domcontentloaded" });
  record("authorized_product_edit_revalidates_public_page", await page.getByRole("heading", { level: 1, name: changedName }).count() === 1);

  await page.goto(editUrl, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="name"]').fill(originalProduct.name);
  await Promise.all([
    page.waitForURL((url) => url.pathname === `/admin/produtos/${originalProduct.id}` && url.searchParams.get("status") === "saved", { timeout: 20_000 }),
    page.getByRole("button", { name: "Salvar produto" }).click(),
  ]);
  await page.goto(`${baseUrl}/catalogo/${originalProduct.slug}`, { waitUntil: "domcontentloaded" });
  productWasRestored = await page.getByRole("heading", { level: 1, name: originalProduct.name, exact: true }).count() === 1;
  record("qa_product_content_is_restored_through_authorized_action", productWasRestored);

  const editorUpdate = await admin.from("profiles").update({ role: "editor" }).eq("id", userId);
  if (editorUpdate.error) throw new Error("Falha ao preparar papel editor.");
  await page.goto(`${baseUrl}/admin/analytics?probe=editor`, { waitUntil: "domcontentloaded" });
  record("editor_cannot_open_analytics", page.url().startsWith(`${baseUrl}/admin?status=forbidden`));
  record("editor_navigation_hides_analytics", await page.getByRole("link", { name: "Analytics" }).count() === 0);

  const attendantUpdate = await admin.from("profiles").update({ role: "attendant" }).eq("id", userId);
  if (attendantUpdate.error) throw new Error("Falha ao preparar papel atendente.");
  await page.goto(`${baseUrl}/admin/analytics?probe=attendant`, { waitUntil: "domcontentloaded" });
  record("attendant_cannot_open_analytics", page.url().startsWith(`${baseUrl}/admin?status=forbidden`));
  record("attendant_navigation_hides_analytics", await page.getByRole("link", { name: "Analytics" }).count() === 0);

  const inactiveUpdate = await admin.from("profiles").update({ active: false }).eq("id", userId);
  if (inactiveUpdate.error) throw new Error("Falha ao preparar usuario inativo.");
  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  record("inactive_user_loses_admin_access", page.url().startsWith(`${baseUrl}/admin/login`));

  await context.close();
} finally {
  if (browser) await browser.close();
  if (originalProduct && !productWasRestored) {
    await admin.from("products").update({ name: originalProduct.name }).eq("id", originalProduct.id);
  }
  await admin.from("products").delete().eq("id", draftId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  const auditIds = [draftId, userId].filter(Boolean);
  if (auditIds.length) await admin.from("audit_logs").delete().in("entity_id", auditIds);
}

record("admin_qa_has_no_console_or_page_errors", consoleErrors.length === 0 && pageErrors.length === 0);
const report = {
  consoleErrors: consoleErrors.length,
  pageErrors: pageErrors.length,
  passed: results.filter((result) => result.passed).length,
  tests: results,
  total: results.length,
};
fs.mkdirSync(path.resolve(".tmp/admin-qa"), { recursive: true });
fs.writeFileSync(path.resolve(".tmp/admin-qa/phase3-admin-results.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
