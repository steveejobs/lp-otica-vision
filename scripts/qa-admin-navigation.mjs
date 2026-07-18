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

const phase = process.argv[2] || "before";
if (!/^[a-z0-9-]+$/i.test(phase)) throw new Error("Fase de evidencia invalida.");

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3100";
const outputDir = path.resolve(`docs/qa/admin-refinement/${phase}`);
const videoDir = path.join(outputDir, "video");
fs.mkdirSync(videoDir, { recursive: true });

const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const email = `qa-nav-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
let userId;
let browser;

const routes = [
  { label: "Produtos", path: "/admin/produtos", heading: "Produtos" },
  { label: "Marcas", path: "/admin/marcas", heading: "Marcas" },
  { label: "Categorias", path: "/admin/categorias", heading: "Categorias" },
  { label: "Galerias", path: "/admin/galerias", heading: "Galerias" },
  { label: "Destaques", path: "/admin/promocoes", heading: "Destaques" },
  { label: "Auditoria", path: "/admin/auditoria", heading: "Auditoria" },
  { label: "Visão geral", path: "/admin", heading: "Visão geral" },
];
const measuredRoutes = process.env.QA_SHORT === "1" ? routes.slice(0, 1) : routes;

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').waitFor({ state: "visible", timeout: 90_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(`${baseUrl}/admin`, { timeout: 90_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);
  await page.locator("#main-content h1").waitFor({ state: "visible" });
}

async function measureNavigation(page, route, warmed) {
  const resources = [];
  const responseTasks = [];
  const onResponse = (response) => {
    const task = (async () => {
    const request = response.request();
    const type = request.resourceType();
    if (!["document", "fetch", "xhr", "script", "stylesheet", "image"].includes(type)) return;
    const headers = await response.allHeaders().catch(() => ({}));
    const encoded = Number(headers["content-length"] ?? 0);
    const contentType = headers["content-type"] ?? "";
    const bodyPrefix = process.env.QA_DIAGNOSTIC_BODY === "1" && type === "fetch" && response.url().includes(`${route.path}?_rsc=`)
      ? (await response.text().catch(() => "")).slice(0, 2_000)
      : undefined;
    resources.push({ bodyPrefix, contentType, encoded, status: response.status(), type, url: response.url() });
    })();
    responseTasks.push(task);
  };
  page.on("response", onResponse);
  await page.evaluate(() => performance.clearResourceTimings());

  const link = page.getByRole("link", { name: route.label, exact: true });
  const shellHandle = await page.locator("#main-content").elementHandle();
  await page.evaluate((label) => {
    const state = { click: null, feedback: null };
    window.__qaAdminNavigation = state;
    const nav = document.querySelector("nav");
    const updateFeedback = () => {
      const pending = nav?.querySelector('[data-pending="true"]');
      if (state.click !== null && state.feedback === null && pending?.textContent?.includes(label)) {
        state.feedback = performance.now();
      }
    };
    const observer = new MutationObserver(updateFeedback);
    if (nav) {
      observer.observe(nav, { attributes: true, childList: true, subtree: true });
      nav.addEventListener("click", (event) => {
        const anchor = event.target instanceof Element ? event.target.closest("a") : null;
        if (anchor?.textContent?.includes(label)) {
          state.click = performance.now();
          queueMicrotask(updateFeedback);
        }
      }, { capture: true, once: true });
    }
    window.__qaAdminNavigationCleanup = () => observer.disconnect();
  }, route.label);
  const started = performance.now();
  await link.click({ noWaitAfter: true });

  let feedbackMs = null;
  try {
    await page.waitForFunction(
      () => window.__qaAdminNavigation?.feedback !== null,
      undefined,
      { timeout: 2_000 },
    );
    feedbackMs = await page.evaluate(() => {
      const timing = window.__qaAdminNavigation;
      return timing?.click !== null && timing?.feedback !== null ? timing.feedback - timing.click : null;
    });
  } catch {
    feedbackMs = null;
  }

  await page.waitForURL(`${baseUrl}${route.path}`, { timeout: 90_000 });
  const urlMs = performance.now() - started;
  await page.locator("#main-content h1").filter({ hasText: route.heading }).waitFor({ state: "visible", timeout: 90_000 });
  const contentMs = performance.now() - started;
  await page.waitForTimeout(450);
  const settledMs = performance.now() - started;
  const shellPersisted = shellHandle ? await shellHandle.evaluate((node) => node.isConnected).catch(() => false) : false;
  const performanceResources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => {
    const resource = entry;
    return { name: resource.name, transferSize: "transferSize" in resource ? resource.transferSize : 0 };
  }));
  await Promise.all(responseTasks);
  page.off("response", onResponse);
  await page.evaluate(() => window.__qaAdminNavigationCleanup?.()).catch(() => undefined);

  const resourceTypes = resources.reduce((counts, resource) => {
    counts[resource.type] = (counts[resource.type] ?? 0) + 1;
    return counts;
  }, {});

  return {
    content_ms: Math.round(contentMs),
    feedback_ms: feedbackMs === null ? null : Math.round(feedbackMs),
    javascript_bytes: performanceResources.filter((resource) => /\.(?:js|mjs)(?:\?|$)/.test(resource.name)).reduce((sum, resource) => sum + resource.transferSize, 0),
    path: route.path,
    request_count: resources.length,
    request_details: resources.filter((resource) => resource.type === "document" || resource.type === "fetch"),
    resource_types: resourceTypes,
    route: route.label,
    rsc_requests: resources.filter((resource) => resource.type === "fetch" && resource.url.includes("_rsc=")).length,
    settled_ms: Math.round(settledMs),
    shell_persisted: shellPersisted,
    transferred_bytes: performanceResources.reduce((sum, resource) => sum + resource.transferSize, 0),
    url_ms: Math.round(urlMs),
    warmed,
  };
}

try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Navegação" },
  });
  if (error || !data.user) throw new Error("Falha ao criar usuario temporario.");
  userId = data.user.id;
  const { error: profileError } = await admin.from("profiles").update({ active: true, name: "QA Navegação", role: "admin" }).eq("id", userId);
  if (profileError) throw new Error("Falha ao ativar usuario temporario.");

  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  const context = await browser.newContext({
    colorScheme: "light",
    recordVideo: { dir: videoDir, size: { height: 900, width: 1440 } },
    reducedMotion: "no-preference",
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90_000);
  page.setDefaultTimeout(90_000);
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await login(page);
  for (const route of measuredRoutes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
    await page.locator("#main-content h1").filter({ hasText: route.heading }).waitFor({ state: "visible", timeout: 90_000 });
    await page.waitForTimeout(250);
  }
  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await page.locator("#main-content h1").filter({ hasText: "Visão geral" }).waitFor({ state: "visible", timeout: 90_000 });

  const cold = [];
  for (const route of measuredRoutes) cold.push(await measureNavigation(page, route, false));
  const warm = [];
  for (const route of measuredRoutes) warm.push(await measureNavigation(page, route, true));

  await page.screenshot({ animations: "allow", fullPage: false, path: path.join(outputDir, "navigation-final.png") });
  const report = {
    base_url: baseUrl,
    console_errors: consoleErrors,
    measured_at: new Date().toISOString(),
    navigations: [...cold, ...warm],
    phase,
    viewport: { height: 900, width: 1440 },
  };
  fs.writeFileSync(path.join(outputDir, "navigation-metrics.json"), JSON.stringify(report, null, 2));
  await context.close();
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("audit_logs").delete().eq("entity_id", userId);
  }
}
