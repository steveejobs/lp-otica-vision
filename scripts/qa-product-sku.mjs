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
  if (!executable) throw new Error("Chrome ou Edge nao encontrado para QA do SKU.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3024").replace(/\/$/, "");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const anonymous = createClient(supabaseUrl, required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const reportDir = path.resolve("docs/qa/phase4");
const skuPattern = /^OV-\d{8,}$/;
const email = `qa-sku-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const suffix = randomUUID().slice(0, 8);
const results = [];
const consoleErrors = [];
const pageErrors = [];
const productIds = [];
const auditIds = [];
let browser = null;
let context = null;
let userId = null;
let fatalError = null;

function record(name, passed, details) {
  results.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
}

try {
  const anonymousAttempt = await anonymous.rpc("allocate_product_sku");
  record("anonymous_cannot_call_sku_allocator", Boolean(anonymousAttempt.error));

  const concurrent = await Promise.all(Array.from({ length: 16 }, () => admin.rpc("allocate_product_sku")));
  const concurrentValues = concurrent.map(({ data }) => data).filter((value) => typeof value === "string");
  record(
    "concurrent_allocator_calls_never_repeat",
    concurrent.every(({ error }) => !error) &&
      concurrentValues.length === 16 &&
      concurrentValues.every((value) => skuPattern.test(value)) &&
      new Set(concurrentValues).size === concurrentValues.length,
    concurrentValues,
  );

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA SKU" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Falha ao criar editor de QA.");
  userId = created.data.user.id;
  auditIds.push(userId);
  const profileUpdate = await admin
    .from("profiles")
    .update({ active: true, name: "QA SKU", role: "editor" })
    .eq("id", userId);
  if (profileUpdate.error) throw profileUpdate.error;

  const editor = createClient(supabaseUrl, required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const editorSignIn = await editor.auth.signInWithPassword({ email, password });
  if (editorSignIn.error) throw editorSignIn.error;
  const editorDirectAttempt = await editor.rpc("allocate_product_sku");
  record("editor_cannot_bypass_server_action_to_call_allocator", Boolean(editorDirectAttempt.error));
  await editor.auth.signOut();

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "no-preference",
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 240));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 240)));

  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 30_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);

  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  const skuInput = page.locator('input[name="sku"]');
  const generateButton = page.getByRole("button", { name: "Gerar SKU" });
  record(
    "new_product_form_offers_one_click_sku_generation",
    await generateButton.count() === 1 && await skuInput.isEditable(),
  );

  await generateButton.click();
  await page.waitForFunction(() => /^OV-\d{8,}$/.test(document.querySelector('input[name="sku"]')?.value ?? ""));
  const firstSku = await skuInput.inputValue();
  await generateButton.click();
  await page.waitForFunction(
    (previous) => {
      const value = document.querySelector('input[name="sku"]')?.value ?? "";
      return value !== previous && /^OV-\d{8,}$/.test(value);
    },
    firstSku,
  );
  const savedSku = await skuInput.inputValue();
  record("repeated_button_click_allocates_a_new_sku", firstSku !== savedSku, { firstSku, savedSku });

  await skuInput.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(reportDir, "sku-generator-mobile-390x844.png") });
  await page.locator('input[name="name"]').fill("[QA SKU] Produto temporário");
  await page.locator('input[name="slug"]').fill(`qa-sku-produto-${suffix}`);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/admin/produtos/") && url.searchParams.get("status") === "created", { timeout: 30_000 }),
    page.getByRole("button", { name: "Criar rascunho" }).click(),
  ]);
  const createdProductId = page.url().match(/\/admin\/produtos\/([0-9a-f-]{36})/)?.[1] ?? null;
  if (!createdProductId) throw new Error("Produto criado sem identificador reconhecivel.");
  productIds.push(createdProductId);
  auditIds.push(createdProductId);
  const persisted = await admin.from("products").select("id, sku").eq("id", createdProductId).single();
  record("generated_sku_is_persisted_on_product", !persisted.error && persisted.data?.sku === savedSku, persisted.data);
  record("edit_form_does_not_encourage_replacing_existing_sku", await page.getByRole("button", { name: "Gerar SKU" }).count() === 0);

  const duplicateId = randomUUID();
  const duplicate = await admin.from("products").insert({
    id: duplicateId,
    name: "[QA SKU] Duplicado bloqueado",
    sku: savedSku.toLowerCase(),
    slug: `qa-sku-duplicado-${suffix}`,
  });
  const duplicateLookup = await admin.from("products").select("id", { count: "exact", head: true }).eq("id", duplicateId);
  record(
    "database_rejects_duplicate_sku_case_insensitively",
    Boolean(duplicate.error) && duplicateLookup.count === 0,
  );

  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Gerar SKU" }).click();
  await page.waitForFunction(() => /^OV-\d{8,}$/.test(document.querySelector('input[name="sku"]')?.value ?? ""));
  const nextFormSku = await page.locator('input[name="sku"]').inputValue();
  record("next_product_form_never_reuses_previous_allocations", ![firstSku, savedSku].includes(nextFormSku), { nextFormSku });

  const attendantUpdate = await admin.from("profiles").update({ role: "attendant" }).eq("id", userId);
  if (attendantUpdate.error) throw attendantUpdate.error;
  await page.goto(`${baseUrl}/admin/produtos/novo`, { waitUntil: "domcontentloaded" });
  record("attendant_cannot_access_sku_generator", page.url().startsWith(`${baseUrl}/admin?status=forbidden`));

  record("sku_generator_mobile_has_no_console_or_page_errors", consoleErrors.length === 0 && pageErrors.length === 0, {
    consoleErrors,
    pageErrors,
  });
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  record("sku_generator_qa_completed_without_unexpected_error", false, fatalError);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  if (productIds.length) await admin.from("products").delete().in("id", productIds);
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (auditIds.length) await admin.from("audit_logs").delete().in("entity_id", [...new Set(auditIds)]);

  const [{ count: qaProducts }, { count: activeAdmins }] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }).like("slug", "qa-sku-%"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("active", true),
  ]);
  record("sku_qa_cleanup_preserves_one_admin_and_zero_products", qaProducts === 0 && activeAdmins === 1, {
    activeAdmins,
    qaProducts,
  });
}

const report = {
  failed: results.filter((result) => !result.passed).length,
  fatalError,
  passed: results.filter((result) => result.passed).length,
  results,
  total: results.length,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "sku-generator-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (fatalError || report.failed) process.exitCode = 1;
