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
  const bundled = chromium.executablePath();
  const candidates = [
    bundled,
    path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.PROGRAMFILES ?? "", "Microsoft/Edge/Application/msedge.exe"),
  ];
  const executable = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!executable) throw new Error("Chromium, Chrome ou Edge nao encontrado para QA visual.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3013").replace(/\/$/, "");
const statePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
if (!fs.existsSync(statePath)) throw new Error("Fixtures da Fase 3 nao estao ativas.");
const fixtures = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (!fixtures.phase3?.prepared) throw new Error("Fixtures da Fase 3 nao foram preparadas.");

const service = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
);
const { data: products, error: productError } = await service
  .from("products")
  .select("id, slug, brand:brands(slug)")
  .in("id", fixtures.productIds)
  .order("display_order");
if (productError || products?.length !== 5 || !products[0].brand) throw new Error("Fixtures publicas indisponiveis.");

const qaDir = path.resolve("docs/qa");
const videoTempDir = path.resolve(".tmp/phase3-videos");
fs.mkdirSync(qaDir, { recursive: true });
fs.mkdirSync(videoTempDir, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const failedResponses = [];
const viewportResults = [];
const behaviorResults = [];
const requestHosts = new Set();
let browser;

function observe(page) {
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(30_000);
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 220));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 220)));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  page.on("request", (request) => {
    try { requestHosts.add(new URL(request.url()).host); } catch { /* Ignore data URLs. */ }
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(450);
}

async function scrollElementToTop(locator, offset = 12) {
  await locator.evaluate((element, topOffset) => {
    window.scrollTo({ behavior: "instant", top: element.getBoundingClientRect().top + window.scrollY - Number(topOffset) });
  }, offset);
  await locator.page().waitForTimeout(250);
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("img")]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    })
    .every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 20_000 });
}

async function metrics(page) {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll("main button, main input, main select, main a[href]")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
    const importantSmallTargets = controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      const linkContainsLargeContent = element.tagName === "A" && rect.height > 100;
      return !linkContainsLargeContent && (rect.width < 44 || rect.height < 44);
    }).length;
    const layoutShifts = Array.isArray(window.__visionLayoutShifts)
      ? window.__visionLayoutShifts.reduce((sum, value) => sum + value, 0)
      : 0;
    return {
      importantSmallTargets,
      layoutShifts,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

async function addLayoutShiftObserver(context) {
  await context.addInitScript(() => {
    window.__visionLayoutShifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__visionLayoutShifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch { /* Unsupported observers do not affect the page. */ }
  });
}

async function captureDesktop(width, height) {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { height, width } });
  await addLayoutShiftObserver(context);
  const page = await context.newPage();
  observe(page);

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const preview = page.locator("section[aria-labelledby='catalog-preview-title']");
  await scrollElementToTop(preview, 18);
  await waitForVisibleImages(page);
  if (width === 1440) await page.screenshot({ path: path.join(qaDir, "catalog-home-preview-1440x900.png") });

  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await scrollElementToTop(page.locator("#catalog-results-title"), 88);
  await waitForVisibleImages(page);
  if (width === 1440) await page.screenshot({ path: path.join(qaDir, "catalog-index-1440x900.png") });
  const catalogMetrics = await metrics(page);

  await page.goto(`${baseUrl}/catalogo/${products[0].slug}`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await scrollElementToTop(page.locator("main > article").first(), 10);
  await waitForVisibleImages(page);
  if (width === 1440) await page.screenshot({ path: path.join(qaDir, "catalog-product-1440x900.png") });
  const productMetrics = await metrics(page);

  viewportResults.push({
    height,
    passed: !catalogMetrics.overflow && !productMetrics.overflow && catalogMetrics.importantSmallTargets === 0 && productMetrics.importantSmallTargets === 0 && Math.max(catalogMetrics.layoutShifts, productMetrics.layoutShifts) < 0.1,
    width,
    worstLayoutShift: Math.max(catalogMetrics.layoutShifts, productMetrics.layoutShifts),
  });
  await context.close();
}

async function validateViewport(width, height) {
  const context = await browser.newContext({ deviceScaleFactor: 1, hasTouch: width <= 768, isMobile: width <= 768, viewport: { height, width } });
  await addLayoutShiftObserver(context);
  const page = await context.newPage();
  observe(page);
  await page.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await scrollElementToTop(page.locator("#catalog-results-title"), 12);
  await waitForVisibleImages(page);
  const catalogMetrics = await metrics(page);
  await page.goto(`${baseUrl}/catalogo/${products[0].slug}`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const productMetrics = await metrics(page);
  viewportResults.push({
    height,
    passed: !catalogMetrics.overflow && !productMetrics.overflow && catalogMetrics.importantSmallTargets === 0 && productMetrics.importantSmallTargets === 0 && Math.max(catalogMetrics.layoutShifts, productMetrics.layoutShifts) < 0.1,
    width,
    worstLayoutShift: Math.max(catalogMetrics.layoutShifts, productMetrics.layoutShifts),
  });
  await context.close();
}

try {
  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });

  const motionContext = await browser.newContext({
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: videoTempDir, size: { height: 844, width: 390 } },
    viewport: { height: 844, width: 390 },
  });
  await addLayoutShiftObserver(motionContext);
  const motionPage = await motionContext.newPage();
  observe(motionPage);
  const normalVideo = motionPage.video();

  await motionPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await settle(motionPage);
  const previewSection = motionPage.locator("section[aria-labelledby='catalog-preview-title']");
  await scrollElementToTop(previewSection, 8);
  const previewRail = motionPage.getByRole("region", { name: /Prévia automática/ });
  await waitForVisibleImages(motionPage);
  await motionPage.screenshot({ path: path.join(qaDir, "catalog-home-preview-390x844.png") });
  const autoStart = await previewRail.evaluate((element) => element.scrollLeft);
  await motionPage.waitForTimeout(1800);
  const autoEnd = await previewRail.evaluate((element) => element.scrollLeft);
  const pauseButton = motionPage.getByRole("button", { name: "Pausar movimento" });
  await pauseButton.click();
  await motionPage.waitForTimeout(350);
  const pauseStart = await previewRail.evaluate((element) => element.scrollLeft);
  await motionPage.waitForTimeout(1200);
  const pauseEnd = await previewRail.evaluate((element) => element.scrollLeft);
  await motionPage.getByRole("button", { name: "Retomar movimento" }).click();
  await motionPage.waitForTimeout(1600);
  const resumeEnd = await previewRail.evaluate((element) => element.scrollLeft);
  const railBox = await previewRail.boundingBox();
  if (railBox) {
    await motionPage.mouse.move(railBox.x + railBox.width * 0.72, railBox.y + railBox.height * 0.55);
    await motionPage.mouse.down();
    await motionPage.mouse.move(railBox.x + railBox.width * 0.28, railBox.y + railBox.height * 0.55, { steps: 8 });
    await motionPage.mouse.up();
  }
  const dragEnd = await previewRail.evaluate((element) => element.scrollLeft);
  await motionPage.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
  await motionPage.waitForTimeout(400);
  const offscreenStart = await previewRail.evaluate((element) => element.scrollLeft);
  await motionPage.waitForTimeout(900);
  const offscreenEnd = await previewRail.evaluate((element) => element.scrollLeft);
  behaviorResults.push({
    name: "home_autoplay_pause_resume_drag_viewport",
    passed: autoEnd > autoStart + 8 && Math.abs(pauseEnd - pauseStart) < 3 && resumeEnd > pauseEnd + 6 && dragEnd !== resumeEnd && Math.abs(offscreenEnd - offscreenStart) < 3,
  });

  await motionPage.goto(`${baseUrl}/catalogo`, { waitUntil: "domcontentloaded" });
  await settle(motionPage);
  await scrollElementToTop(motionPage.locator("#catalog-results-title"), 10);
  await waitForVisibleImages(motionPage);
  await motionPage.screenshot({ path: path.join(qaDir, "catalog-index-390x844.png") });
  const initialLinks = await motionPage.locator("a[href^='/catalogo/']").count();
  const brandLink = motionPage.locator("nav[aria-label='Selecionar marca'] a").nth(1);
  await brandLink.click();
  await motionPage.waitForURL((value) => value.searchParams.has("marca"));
  await settle(motionPage);
  await scrollElementToTop(motionPage.locator("#catalog-results-title"), 10);
  await motionPage.screenshot({ path: path.join(qaDir, "catalog-brand-filter-390x844.png") });
  const filteredLinks = await motionPage.locator("a[href^='/catalogo/']").count();
  const selectedExposed = await motionPage.locator("nav[aria-label='Selecionar marca'] a[aria-current='page']").count() === 1;
  await motionPage.goBack();
  await settle(motionPage);
  const backRestored = !new URL(motionPage.url()).searchParams.has("marca");
  behaviorResults.push({ name: "brand_filter_reorganizes_and_browser_back_restores", passed: filteredLinks < initialLinks && selectedExposed && backRestored });

  await motionPage.goto(`${baseUrl}/catalogo/${products[0].slug}`, { waitUntil: "domcontentloaded" });
  await settle(motionPage);
  await scrollElementToTop(motionPage.locator("main > article").first(), 5);
  await waitForVisibleImages(motionPage);
  await motionPage.screenshot({ path: path.join(qaDir, "catalog-product-390x844.png") });
  const gallery = motionPage.getByRole("region", { name: /Galeria de/ });
  const galleryBox = await gallery.boundingBox();
  const galleryBefore = await gallery.evaluate((element) => element.scrollLeft);
  if (galleryBox) {
    const session = await motionContext.newCDPSession(motionPage);
    const y = galleryBox.y + galleryBox.height * 0.5;
    await session.send("Input.dispatchTouchEvent", { touchPoints: [{ x: galleryBox.x + galleryBox.width * 0.82, y }], type: "touchStart" });
    await session.send("Input.dispatchTouchEvent", { touchPoints: [{ x: galleryBox.x + galleryBox.width * 0.22, y }], type: "touchMove" });
    await session.send("Input.dispatchTouchEvent", { touchPoints: [], type: "touchEnd" });
    await motionPage.waitForTimeout(700);
  }
  const galleryAfter = await gallery.evaluate((element) => element.scrollLeft);
  behaviorResults.push({ name: "product_gallery_accepts_natural_swipe", passed: galleryAfter > galleryBefore + 20 });
  await motionContext.close();
  if (normalVideo) await normalVideo.saveAs(path.join(qaDir, "catalog-interactions.webm"));

  const reducedContext = await browser.newContext({
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: videoTempDir, size: { height: 844, width: 390 } },
    reducedMotion: "reduce",
    viewport: { height: 844, width: 390 },
  });
  const reducedPage = await reducedContext.newPage();
  observe(reducedPage);
  const reducedVideo = reducedPage.video();
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await settle(reducedPage);
  const reducedSection = reducedPage.locator("section[aria-labelledby='catalog-preview-title']");
  await scrollElementToTop(reducedSection, 8);
  const reducedRail = reducedPage.getByRole("region", { name: /Prévia automática/ });
  const reducedStart = await reducedRail.evaluate((element) => element.scrollLeft);
  await reducedPage.waitForTimeout(1600);
  const reducedEnd = await reducedRail.evaluate((element) => element.scrollLeft);
  await reducedRail.evaluate((element) => element.scrollBy({ behavior: "instant", left: 140 }));
  await reducedPage.waitForTimeout(500);
  const reducedManual = await reducedRail.evaluate((element) => element.scrollLeft);
  behaviorResults.push({ name: "reduced_motion_disables_autoplay_but_keeps_manual_navigation", passed: Math.abs(reducedEnd - reducedStart) < 3 && reducedManual > reducedEnd + 80 });
  await reducedContext.close();
  if (reducedVideo) await reducedVideo.saveAs(path.join(qaDir, "catalog-reduced-motion.webm"));

  await captureDesktop(1440, 900);
  await captureDesktop(1366, 768);
  for (const [width, height] of [[360, 800], [375, 812], [390, 844], [412, 915], [430, 932], [768, 1024]]) {
    await validateViewport(width, height);
  }

  const directSupabaseRequests = [...requestHosts].filter((host) => host.includes("supabase"));
  const report = {
    behaviorResults,
    consoleErrors,
    directSupabaseRequests,
    failedResponses,
    pageErrors,
    screenshots: fs.readdirSync(qaDir).filter((file) => file.startsWith("catalog-") && file.endsWith(".png")),
    videos: fs.readdirSync(qaDir).filter((file) => file.startsWith("catalog-") && file.endsWith(".webm")),
    viewportResults,
  };
  fs.writeFileSync(path.join(qaDir, "catalog-phase3-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  const passed = behaviorResults.every((result) => result.passed)
    && viewportResults.every((result) => result.passed)
    && consoleErrors.length === 0
    && pageErrors.length === 0
    && failedResponses.length === 0
    && directSupabaseRequests.length === 0
    && report.screenshots.length === 7
    && report.videos.length === 2;
  if (!passed) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
