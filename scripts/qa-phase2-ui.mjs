import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

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

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3100";
const outputDir = path.resolve(".tmp/admin-qa");
const fixtureStatePath = path.join(outputDir, "phase2-fixtures.json");
if (!fs.existsSync(fixtureStatePath)) throw new Error("Fixtures da Fase 2 nao estao ativas.");
const fixtures = JSON.parse(fs.readFileSync(fixtureStatePath, "utf8"));
fs.mkdirSync(outputDir, { recursive: true });

const service = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
);
const tempUsers = [];
const consoleErrors = [];
const pageErrors = [];
const notFoundResponses = [];
const routeResults = [];
const viewportResults = [];
const roleResults = [];
let browser;

function observe(page) {
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(30_000);
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 160));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 160)));
  page.on("response", (response) => {
    if (response.status() === 404) notFoundResponses.push(response.url());
  });
}

async function createRoleUser(role, active) {
  const email = `qa-ui-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}aA1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA UI Fase 2" },
  });
  if (error || !data.user) throw new Error("Falha ao criar usuario temporario de UI.");
  tempUsers.push(data.user.id);
  const { error: profileError } = await service
    .from("profiles")
    .update({ active, name: "QA UI Fase 2", role })
    .eq("id", data.user.id);
  if (profileError) throw new Error("Falha ao configurar usuario temporario de UI.");
  return { email, password };
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  const currentUrl = new URL(page.url());
  if (currentUrl.pathname.startsWith("/admin") && currentUrl.pathname !== "/admin/login") {
    await page.waitForFunction(() => {
      const nav = document.querySelector("nav");
      return Boolean(nav && Object.keys(nav).some((key) => key.startsWith("__reactFiber$")));
    }, undefined, { timeout: 20_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(500);
}

async function login(page, credentials) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/admin", { timeout: 25_000 }),
    page.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);
  await settle(page);
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const interactive = [...document.querySelectorAll(
      'button, a[href], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
    )];
    const smallTargets = interactive.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0
        && (rect.width < 44 || rect.height < 44);
    }).length;
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      smallTargets,
    };
  });
}

const adminCredentials = {
  email: required("QA_ADMIN_EMAIL"),
  password: required("QA_ADMIN_PASSWORD"),
};

const viewportCases = [
  {
    height: 800,
    name: "360x800",
    routes: [
      { name: "dashboard", path: "/admin", screenshot: true },
      { name: "brands", path: "/admin/marcas", screenshot: true },
      { name: "users", path: "/admin/usuarios" },
      { name: "audit", path: "/admin/auditoria" },
    ],
    width: 360,
  },
  {
    height: 844,
    name: "390x844",
    routes: [
      { name: "products", path: "/admin/produtos", screenshot: true },
      { name: "product-edit", path: `/admin/produtos/${fixtures.productIds[0]}`, screenshot: true },
      { name: "availability", path: "/admin/disponibilidade", screenshot: true },
      { name: "categories", path: "/admin/categorias" },
    ],
    width: 390,
  },
  {
    height: 932,
    name: "430x932",
    routes: [
      { name: "collections", path: "/admin/colecoes" },
      { name: "collection-edit", path: `/admin/colecoes/${fixtures.collectionIds[0]}`, screenshot: true },
      { name: "galleries", path: "/admin/galerias" },
      { name: "gallery-edit", path: `/admin/galerias/${fixtures.galleryIds[0]}`, screenshot: true },
    ],
    width: 430,
  },
  {
    height: 768,
    name: "1366x768",
    routes: [
      { name: "promotions", path: "/admin/promocoes" },
      { name: "promotion-edit", path: `/admin/promocoes/${fixtures.promotionIds[0]}`, screenshot: true },
      { name: "product-new", path: "/admin/produtos/novo", screenshot: true },
    ],
    width: 1366,
  },
  {
    height: 900,
    name: "1440x900",
    routes: [
      { name: "dashboard-desktop", path: "/admin", screenshot: true },
      { name: "audit-desktop", path: "/admin/auditoria", screenshot: true },
      { name: "self-user", path: null },
    ],
    width: 1440,
  },
];

try {
  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  const bootstrapContext = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { height: 900, width: 1440 },
  });
  const bootstrapPage = await bootstrapContext.newPage();
  observe(bootstrapPage);
  await login(bootstrapPage, adminCredentials);
  const adminId = await bootstrapPage.evaluate(async () => {
    const response = await fetch("/admin/usuarios", { redirect: "follow" });
    return response.ok;
  });
  if (!adminId) throw new Error("Administrador real nao acessou a area de usuarios.");
  const storageState = await bootstrapContext.storageState();

  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("active", true)
    .limit(1)
    .single();
  if (!profile) throw new Error("Perfil administrador nao encontrado para QA visual.");
  viewportCases[4].routes[2].path = `/admin/usuarios/${profile.id}`;

  for (const viewportCase of viewportCases) {
    const context = await browser.newContext({
      colorScheme: "light",
      reducedMotion: "reduce",
      storageState,
      viewport: { height: viewportCase.height, width: viewportCase.width },
    });
    const page = await context.newPage();
    observe(page);
    let viewportPassed = true;
    for (const route of viewportCase.routes) {
      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      const metrics = await pageMetrics(page);
      const status = response?.status() ?? 0;
      const protectedPage = page.url().startsWith(`${baseUrl}/admin`) && !page.url().includes("/login");
      const selfRoleProtected = route.name !== "self-user" || (
        await page.locator('select[name="role"]').count() === 0
        && await page.locator('input[disabled][value*="autoedição bloqueada"]').count() === 1
      );
      const passed = status === 200 && protectedPage && !metrics.overflow
        && metrics.smallTargets === 0 && selfRoleProtected;
      viewportPassed &&= passed;
      routeResults.push({
        name: route.name,
        overflow: metrics.overflow,
        passed,
        smallTargets: metrics.smallTargets,
        status,
        viewport: viewportCase.name,
      });
      if (route.screenshot) {
        await page.screenshot({
          caret: "initial",
          fullPage: true,
          path: path.join(outputDir, `phase2-${route.name}-${viewportCase.name}.png`),
        });
      }
    }
    await page.keyboard.press("Tab");
    const focusVisible = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return false;
      const style = window.getComputedStyle(active);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    viewportPassed &&= focusVisible;
    viewportResults.push({ focusVisible, name: viewportCase.name, passed: viewportPassed });
    await context.close();
  }

  const slowContext = await browser.newContext({ storageState, viewport: { height: 844, width: 390 } });
  const slowPage = await slowContext.newPage();
  observe(slowPage);
  await slowPage.route("**/*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  const slowResponse = await slowPage.goto(`${baseUrl}/admin/produtos`, { waitUntil: "domcontentloaded" });
  await settle(slowPage);
  const slowMetrics = await pageMetrics(slowPage);
  const slowNetworkPassed = slowResponse?.status() === 200 && !slowMetrics.overflow;
  await slowContext.close();

  const expiredContext = await browser.newContext({ storageState, viewport: { height: 900, width: 1440 } });
  const expiredCookies = (await expiredContext.cookies()).filter((cookie) => cookie.name.includes("auth-token"));
  await expiredContext.addCookies(expiredCookies.map((cookie) => ({
    ...cookie,
    expires: Math.floor(Date.now() / 1000) - 60,
  })));
  const expiredPage = await expiredContext.newPage();
  observe(expiredPage);
  await expiredPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await settle(expiredPage);
  const expiredSessionPassed = new URL(expiredPage.url()).pathname === "/admin/login";
  await expiredContext.close();

  const logoutPage = bootstrapPage;
  await logoutPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await settle(logoutPage);
  await logoutPage.locator("button:visible").filter({ hasText: "Sair" }).first().click();
  await logoutPage.waitForURL((url) => url.pathname === "/admin/login", { timeout: 20_000 });
  await logoutPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await settle(logoutPage);
  const logoutPassed = new URL(logoutPage.url()).pathname === "/admin/login";
  await bootstrapContext.close();

  const editor = await createRoleUser("editor", true);
  const attendant = await createRoleUser("attendant", true);
  const inactive = await createRoleUser("editor", false);

  const editorContext = await browser.newContext({ viewport: { height: 844, width: 390 } });
  const editorPage = await editorContext.newPage();
  observe(editorPage);
  await login(editorPage, editor);
  const editorNavPassed = await editorPage.locator('nav a[href="/admin/produtos"]').isVisible()
    && await editorPage.locator('nav a[href="/admin/usuarios"]').count() === 0
    && await editorPage.locator('nav a[href="/admin/auditoria"]').count() === 0;
  await editorPage.goto(`${baseUrl}/admin/usuarios`, { waitUntil: "domcontentloaded" });
  await settle(editorPage);
  const editorDirectBlocked = new URL(editorPage.url()).searchParams.get("status") === "forbidden";
  roleResults.push({ name: "editor", passed: editorNavPassed && editorDirectBlocked });
  await editorContext.close();

  const attendantContext = await browser.newContext({ viewport: { height: 800, width: 360 } });
  const attendantPage = await attendantContext.newPage();
  observe(attendantPage);
  await login(attendantPage, attendant);
  const attendantNavPassed = await attendantPage.locator('nav a[href="/admin/disponibilidade"]').isVisible()
    && await attendantPage.locator('nav a[href="/admin/produtos"]').count() === 0
    && await attendantPage.locator('nav a[href="/admin/marcas"]').count() === 0;
  await attendantPage.goto(`${baseUrl}/admin/produtos`, { waitUntil: "domcontentloaded" });
  await settle(attendantPage);
  const attendantDirectBlocked = new URL(attendantPage.url()).searchParams.get("status") === "forbidden";
  await attendantPage.goto(`${baseUrl}/admin/disponibilidade`, { waitUntil: "domcontentloaded" });
  await settle(attendantPage);
  const attendantAvailability = new URL(attendantPage.url()).pathname === "/admin/disponibilidade";
  roleResults.push({
    name: "attendant",
    passed: attendantNavPassed && attendantDirectBlocked && attendantAvailability,
  });
  await attendantContext.close();

  const inactiveContext = await browser.newContext({ viewport: { height: 800, width: 360 } });
  const inactivePage = await inactiveContext.newPage();
  observe(inactivePage);
  await inactivePage.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await settle(inactivePage);
  await inactivePage.locator('input[name="email"]').fill(inactive.email);
  await inactivePage.locator('input[name="password"]').fill(inactive.password);
  await inactivePage.getByRole("button", { name: "Entrar no ADM" }).click();
  await inactivePage.waitForURL((url) => url.pathname === "/admin/login" && url.searchParams.get("status") === "inactive", {
    timeout: 20_000,
  });
  roleResults.push({ name: "inactive", passed: true });
  await inactiveContext.close();

  const anonymousContext = await browser.newContext({ viewport: { height: 800, width: 360 } });
  const anonymousPage = await anonymousContext.newPage();
  observe(anonymousPage);
  await anonymousPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await settle(anonymousPage);
  roleResults.push({ name: "anonymous", passed: new URL(anonymousPage.url()).pathname === "/admin/login" });
  await anonymousContext.close();

  const selfRoute = routeResults.find((result) => result.name === "self-user");
  const report = {
    consoleErrors: consoleErrors.length,
    expiredSessionPassed,
    focusAndViewportTests: viewportResults,
    logoutPassed,
    notFoundResponses: notFoundResponses.length,
    pageErrors: pageErrors.length,
    roleTests: roleResults,
    routeTests: routeResults,
    selfRoleEditBlockedInUi: Boolean(selfRoute?.passed),
    slowNetworkPassed,
  };
  fs.writeFileSync(path.join(outputDir, "phase2-ui-results.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  const passed = consoleErrors.length === 0
    && pageErrors.length === 0
    && notFoundResponses.length === 0
    && expiredSessionPassed
    && logoutPassed
    && slowNetworkPassed
    && viewportResults.every((result) => result.passed)
    && routeResults.every((result) => result.passed)
    && roleResults.every((result) => result.passed);
  if (!passed) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const userId of tempUsers) {
    await service.auth.admin.deleteUser(userId);
    await service.from("audit_logs").delete().eq("entity_id", userId);
  }
}
