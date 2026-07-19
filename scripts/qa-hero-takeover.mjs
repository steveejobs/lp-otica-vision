import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

function findBrowser() {
  const candidates = [
    path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.PROGRAMFILES ?? "", "Microsoft/Edge/Application/msedge.exe"),
  ];
  const executable = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!executable) throw new Error("Chrome ou Edge não encontrado para a QA da hero.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = path.resolve("docs/qa/hero-editorial-stage");
const videoTempDir = path.resolve(".tmp/hero-editorial-stage/video");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(videoTempDir, { recursive: true });

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
const consoleErrors = [];
const pageErrors = [];
const viewportResults = [];

async function installMetrics(context) {
  await context.addInitScript(() => {
    window.__heroQa = { cls: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__heroQa.cls += entry.value;
        }
      }).observe({ buffered: true, type: "layout-shift" });
    } catch {
      // The remaining functional checks still run without the observer.
    }
  });
}

function observePage(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));
}

async function waitForHero(page) {
  await page.locator("#hero").waitFor({ state: "visible" });
  await page.locator("#hero img").first().evaluate(async (image) => {
    if (!image.complete || image.naturalWidth < 1) {
      await new Promise((resolve) => image.addEventListener("load", resolve, { once: true }));
    }
    await image.decode?.();
  });
}

async function recordViewport({ height, label, width }) {
  const context = await browser.newContext({
    colorScheme: "light",
    hasTouch: width <= 720,
    isMobile: width <= 720,
    recordVideo: { dir: videoTempDir, size: { height, width } },
    reducedMotion: "no-preference",
    viewport: { height, width },
  });
  await installMetrics(context);
  const page = await context.newPage();
  observePage(page);
  const video = page.video();

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await waitForHero(page);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outputDir, `hero-${label}-start.png`), timeout: 60_000 });

  await page.waitForTimeout(3_900);
  await page.screenshot({ path: path.join(outputDir, `hero-${label}-middle.png`), timeout: 60_000 });

  await page.waitForTimeout(6_100);
  await page.screenshot({ path: path.join(outputDir, `hero-${label}-end.png`), timeout: 60_000 });
  await page.waitForTimeout(1_200);

  await page.locator("#video-story-title").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1_600);
  await page.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1_200);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHero(page);
  await page.waitForTimeout(900);
  const hiddenActBefore = await page.locator("#hero").getAttribute("data-act");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(() => document.querySelector("#hero")?.getAttribute("data-motion") === "paused");
  const hiddenMotion = await page.locator("#hero").getAttribute("data-motion");
  await page.waitForTimeout(3_400);
  const hiddenActAfter = await page.locator("#hero").getAttribute("data-act");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(() => document.querySelector("#hero")?.getAttribute("data-motion") === "playing");
  await page.waitForTimeout(2_100);

  await page.locator("#video-story-title").evaluate((element) => element.scrollIntoView({ block: "start" }));
  const offscreenActBefore = await page.locator("#hero").getAttribute("data-act");
  await page.waitForTimeout(3_400);
  const offscreenActAfter = await page.locator("#hero").getAttribute("data-act");
  await page.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1_000);

  const videoPath = path.join(outputDir, `hero-${label}-motion.webm`);
  await context.close();
  await video.saveAs(videoPath);

  return {
    hiddenActAfter,
    hiddenActBefore,
    hiddenMotion,
    hiddenPaused: hiddenActAfter === hiddenActBefore && hiddenMotion === "paused",
    offscreenActAfter,
    offscreenActBefore,
    offscreenPaused: offscreenActAfter === offscreenActBefore,
    video: path.relative(process.cwd(), videoPath),
  };
}

if (process.env.QA_VIEWPORT === "desktop") {
  const reportPath = path.join(outputDir, "hero-editorial-stage-results.json");
  const previous = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : {};
  const desktopRecording = await recordViewport({ height: 900, label: "desktop", width: 1440 });
  await browser.close();
  const report = { ...previous, consoleErrors, desktopRecording, pageErrors };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ consoleErrors, desktopRecording, pageErrors }, null, 2));
  process.exit(consoleErrors.length || pageErrors.length ? 1 : 0);
}

const mobileRecording = await recordViewport({ height: 844, label: "mobile", width: 390 });
const desktopRecording = await recordViewport({ height: 900, label: "desktop", width: 1440 });

const matrixContext = await browser.newContext({ colorScheme: "light", reducedMotion: "no-preference" });
await installMetrics(matrixContext);
const matrixPage = await matrixContext.newPage();
observePage(matrixPage);
const matrix = [
  { height: 800, width: 360 },
  { height: 812, width: 375 },
  { height: 844, width: 390 },
  { height: 915, width: 412 },
  { height: 932, width: 430 },
  { height: 768, width: 1366 },
  { height: 900, width: 1440 },
];

for (const viewport of matrix) {
  await matrixPage.setViewportSize(viewport);
  await matrixPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await waitForHero(matrixPage);
  await matrixPage.waitForTimeout(500);
  viewportResults.push(await matrixPage.evaluate(({ height, width }) => {
    const hero = document.querySelector("#hero");
    const title = document.querySelector("#hero-title");
    const actions = [...document.querySelectorAll("#hero a")];
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { bottom: box.bottom, height: box.height, left: box.left, right: box.right, top: box.top, width: box.width };
    };
    return {
      actions: actions.map(rect),
      cls: window.__heroQa?.cls ?? null,
      hero: rect(hero),
      heroPhotoCountAt500ms: hero.querySelectorAll("figure img").length,
      heroPriorityPhotoCount: hero.querySelectorAll('figure img[fetchpriority="high"]').length,
      maxScrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      title: rect(title),
      viewport: { height, width },
    };
  }, viewport));
}
await matrixContext.close();

const reducedContext = await browser.newContext({
  colorScheme: "light",
  reducedMotion: "reduce",
  viewport: { height: 844, width: 390 },
});
const reducedPage = await reducedContext.newPage();
observePage(reducedPage);
await reducedPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
await waitForHero(reducedPage);
await reducedPage.waitForTimeout(4_000);
const reducedResult = await reducedPage.evaluate(() => ({
  act: document.querySelector("#hero")?.getAttribute("data-act"),
  photoCount: document.querySelectorAll("#hero figure img").length,
  motion: document.querySelector("#hero")?.getAttribute("data-motion"),
}));
await reducedPage.screenshot({ path: path.join(outputDir, "hero-mobile-reduced-motion.png") });
await reducedContext.close();

const noJsContext = await browser.newContext({
  javaScriptEnabled: false,
  viewport: { height: 844, width: 390 },
});
const noJsPage = await noJsContext.newPage();
await noJsPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
const noJsResult = await noJsPage.evaluate(() => ({
  catalogHref: document.querySelector('#hero a[href="/catalogo"]')?.getAttribute("href"),
  heroVisible: document.querySelector("#hero")?.getBoundingClientRect().height > 0,
  photoCount: document.querySelectorAll("#hero figure img").length,
  whatsappHref: document.querySelector('#hero a[href*="whatsapp"]')?.getAttribute("href"),
}));
await noJsPage.screenshot({ path: path.join(outputDir, "hero-mobile-no-js.png") });
await noJsContext.close();

await browser.close();

const report = {
  consoleErrors,
  desktopRecording,
  mobileRecording,
  noJsResult,
  pageErrors,
  reducedResult,
  viewportResults,
};
fs.writeFileSync(path.join(outputDir, "hero-editorial-stage-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (consoleErrors.length || pageErrors.length) process.exitCode = 1;
