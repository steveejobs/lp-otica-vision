import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3018").replace(/\/$/, "");
const statePath = path.resolve(".tmp/catalog-transition-qa.json");
if (!fs.existsSync(statePath)) throw new Error("As fixtures temporárias do catálogo não estão ativas.");

const outputDir = path.resolve("docs/qa/catalog-transitions");
const videoDir = path.resolve(".tmp/catalog-transition-videos");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

function browserPath() {
  const candidates = [
    path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.PROGRAMFILES ?? "", "Microsoft/Edge/Application/msedge.exe"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome ou Edge não encontrado.");
  return found;
}

const report = { consoleErrors: [], pageErrors: [], runs: [] };
const browser = await chromium.launch({ executablePath: browserPath(), headless: true });

function observe(page) {
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => report.pageErrors.push(error.message.slice(0, 300)));
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator('[data-catalog-transition-manager][data-ready="true"]').waitFor({ state: "attached" });
  await page.waitForTimeout(650);
}

async function visibleImagesReady(page) {
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    })
    .every((image) => image.complete && image.naturalWidth > 0));
}

async function sharedOverlayCount(page) {
  return page.locator('img[class*="sharedMedia"]').count();
}

async function record(label, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    hasTouch: viewport.width <= 720,
    isMobile: viewport.width <= 720,
    recordVideo: { dir: videoDir, size: viewport },
    reducedMotion,
    viewport,
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  observe(page);
  const video = page.video();
  const result = { label, checks: {} };

  if (reducedMotion === "reduce") {
    await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.locator("#catalog-results-title").scrollIntoViewIfNeeded();
    const first = page.locator('[data-catalog-results-grid] [data-catalog-transition-link]').first();
    const start = performance.now();
    await first.click();
    await page.waitForURL(/\/catalogo\/qa-transicao-catalogo-/);
    result.checks.navigationMs = Math.round(performance.now() - start);
    result.checks.overlayDisabled = await sharedOverlayCount(page) === 0;
    await page.waitForTimeout(900);
  } else {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const preview = page.locator("#preview-catalogo");
    await preview.scrollIntoViewIfNeeded();
    await visibleImagesReady(page);
    await page.screenshot({ path: path.join(outputDir, `catalog-home-new-${label}.png`) });
    const catalogLink = preview.getByRole("link", { name: /Ver catálogo geral/ }).first();
    await catalogLink.click({ noWaitAfter: true });
    await page.waitForTimeout(60);
    result.checks.homeOverlay = await sharedOverlayCount(page) > 0;
    await page.waitForURL(`${baseUrl}/catalogo`);
    await settle(page);

    const results = page.locator("#catalog-results-title");
    await results.scrollIntoViewIfNeeded();
    await visibleImagesReady(page);
    await page.screenshot({ path: path.join(outputDir, `catalog-index-new-${label}.png`) });
    const initialCount = await page.locator("[data-catalog-results-grid] [data-catalog-product-id]").count();

    const brand = page.locator('[data-catalog-filter-link][href*="marca="]').first();
    await brand.click({ noWaitAfter: true });
    await page.waitForURL((url) => url.searchParams.has("marca"));
    await settle(page);
    const brandCount = await page.locator("[data-catalog-results-grid] [data-catalog-product-id]").count();
    result.checks.brandFilter = brandCount > 0 && brandCount < initialCount;
    await page.screenshot({ path: path.join(outputDir, `catalog-brand-new-${label}.png`) });

    const category = page.locator('select[name="categoria"]');
    const categoryValues = await category.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    await category.selectOption(categoryValues[0]);
    await page.getByRole("button", { name: "Aplicar filtros" }).click({ noWaitAfter: true });
    await page.waitForURL((url) => url.searchParams.has("categoria"));
    await settle(page);
    result.checks.categoryFilter = await page.locator("[data-catalog-results-grid] [data-catalog-product-id]").count() > 0;

    const clear = page.getByRole("link", { name: /Limpar seleção/ });
    await clear.click({ noWaitAfter: true });
    await page.waitForURL(`${baseUrl}/catalogo`);
    await settle(page);
    await page.locator("#catalog-results-title").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 240));
    const requestedSourceScroll = await page.evaluate(() => window.scrollY);
    const productLink = page.locator('[data-catalog-results-grid] [data-catalog-transition-link]').first();
    const productId = await productLink.getAttribute("data-catalog-product-id");
    await productLink.click({ noWaitAfter: true });
    await page.waitForTimeout(60);
    result.checks.productOverlay = await sharedOverlayCount(page) > 0;
    await page.waitForURL(/\/catalogo\/qa-transicao-catalogo-/);
    await page.locator(`[data-catalog-product-hero="${productId}"]`).waitFor({ state: "visible" });
    await settle(page);
    const recordedSourceScroll = await page.evaluate(() => {
      try { return JSON.parse(sessionStorage.getItem("vision:catalog-return") ?? "null")?.scrollY ?? null; }
      catch { return null; }
    });
    result.checks.productTarget = await page.locator(`[data-catalog-product-hero="${productId}"]`).count() === 1;
    await page.screenshot({ path: path.join(outputDir, `catalog-product-new-${label}.png`) });

    const back = page.getByRole("link", { name: /Voltar ao catálogo/ });
    await back.click({ noWaitAfter: true });
    await page.waitForURL(`${baseUrl}/catalogo`);
    await page.locator("#catalog-results-title").waitFor({ state: "visible" });
    await page.locator('body > img[class*="sharedMedia"]').waitFor({ state: "detached" });
    await page.waitForTimeout(120);
    const restoredScroll = await page.evaluate(() => window.scrollY);
    result.checks.requestedSourceScroll = requestedSourceScroll;
    result.checks.sourceScroll = recordedSourceScroll;
    result.checks.restoredScroll = restoredScroll;
    result.checks.returnPreservesScroll = typeof recordedSourceScroll === "number" && Math.abs(restoredScroll - recordedSourceScroll) < 90;
    result.checks.returnTarget = await page.locator(`[data-catalog-product-id="${productId}"]`).count() > 0;
    await page.waitForTimeout(900);
  }

  await context.close();
  const target = path.join(outputDir, `catalog-${label}${reducedMotion === "reduce" ? "-reduced" : "-transitions"}.webm`);
  await video.saveAs(target);
  result.video = path.relative(process.cwd(), target);
  report.runs.push(result);
}

try {
  const mode = process.env.QA_MODE?.trim() || "all";
  if (mode === "all" || mode === "mobile") await record("mobile", { height: 844, width: 390 });
  if (mode === "all" || mode === "desktop") await record("desktop", { height: 900, width: 1440 });
  if (mode === "all" || mode === "reduced") await record("mobile", { height: 844, width: 390 }, "reduce");
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outputDir, "catalog-transition-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

const passed = report.consoleErrors.length === 0 && report.pageErrors.length === 0 && report.runs.every((run) =>
  Object.entries(run.checks).every(([key, value]) => {
    if (key === "navigationMs") return value < 2500;
    if (key === "requestedSourceScroll" || key === "sourceScroll" || key === "restoredScroll") return typeof value === "number";
    return value === true;
  }),
);
if (!passed) process.exitCode = 1;
