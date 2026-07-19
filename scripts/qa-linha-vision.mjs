import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:5182").replace(/\/$/, "");
const outputDir = path.resolve("docs/qa/corte-vision");
const videoDir = path.resolve(".tmp/corte-vision/video");
const mobileViewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

function findBrowser() {
  const candidates = [
    path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
  ];
  const executable = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!executable) throw new Error("Chrome nao encontrado.");
  return executable;
}

function observe(page, errors) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.console.push(message.text().slice(0, 400));
  });
  page.on("pageerror", (error) => errors.page.push(error.message.slice(0, 400)));
}

async function gotoHero(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator("#hero").waitFor({ state: "visible", timeout: 90_000 });
  const image = page.locator("[data-vision-media-field] img").first();
  await image.waitFor({ state: "attached", timeout: 90_000 });
  await image.evaluate(async (element) => {
    if (!element.complete) {
      await new Promise((resolve) => element.addEventListener("load", resolve, { once: true }));
    }
    await element.decode?.();
  });
  await page.waitForFunction(() => document.querySelector("#hero [data-state]")?.getAttribute("data-state") === "idle");
}

async function snapshot(page) {
  return page.evaluate(() => {
    const hero = document.querySelector("#hero");
    const field = document.querySelector("[data-vision-media-field]");
    const visual = document.querySelector("#hero [data-state]");
    const title = document.querySelector("#hero-title");
    const paragraph = title?.nextElementSibling;
    const actions = paragraph?.nextElementSibling;
    const restLine = field?.querySelector("span span");
    if (!(hero instanceof HTMLElement) || !(field instanceof HTMLElement) || !(visual instanceof HTMLElement) || !(title instanceof HTMLElement) || !(paragraph instanceof HTMLElement) || !(actions instanceof HTMLElement)) {
      throw new Error("Hero incompleta.");
    }
    const heroRect = hero.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const paragraphRect = paragraph.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const lineRect = restLine?.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    const media = [...field.querySelectorAll("[data-vision-media]")].map((node) => ({
      id: node.querySelector("img")?.currentSrc ?? "",
      rect: node.getBoundingClientRect().toJSON(),
    }));
    return {
      actionsRect: actionsRect.toJSON(),
      fieldRect: fieldRect.toJSON(),
      heroRect: heroRect.toJSON(),
      lineEndsInsideHero: lineRect ? lineRect.bottom <= heroRect.bottom + 1 : false,
      media,
      phase: visual.dataset.state,
      spacing: {
        divider: fieldRect.left > 0 ? fieldRect.left - titleRect.right : null,
        titleToParagraph: paragraphRect.top - titleRect.bottom,
        paragraphToActions: actionsRect.top - paragraphRect.bottom,
      },
      title: {
        fontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        lineHeight,
        lines: Math.round(titleRect.height / lineHeight),
        rect: titleRect.toJSON(),
      },
      viewport: { height: innerHeight, width: innerWidth },
      viewportOverflow: document.documentElement.scrollWidth - innerWidth,
      visibleMedia: media.length,
    };
  });
}

async function waitForTransition(page) {
  await page.waitForFunction(() => document.querySelector("#hero [data-state]")?.getAttribute("data-state") === "transitioning", null, { timeout: 20_000 });
}

async function waitForIdleWithNewSource(page, previousSource) {
  await page.waitForFunction((source) => {
    const visual = document.querySelector("#hero [data-state]");
    const image = document.querySelector("#hero [data-vision-media] img");
    return visual?.getAttribute("data-state") === "idle" && image?.currentSrc !== source;
  }, previousSource, { timeout: 20_000 });
  return snapshot(page);
}

async function captureCorners(page, prefix) {
  const state = await snapshot(page);
  const size = 42;
  const { left, right, top, bottom } = state.fieldRect;
  const clips = {
    "top-left": { x: left, y: top },
    "top-right": { x: right - size, y: top },
    "bottom-left": { x: left, y: bottom - size },
    "bottom-right": { x: right - size, y: bottom - size },
  };
  for (const [name, clip] of Object.entries(clips)) {
    await page.screenshot({
      clip: { ...clip, width: size, height: size },
      path: path.join(outputDir, `${prefix}-${name}.png`),
      scale: "device",
    });
  }
}

async function saveVideo(context, video, filename) {
  await context.close();
  if (video) await video.saveAs(path.join(outputDir, filename));
}

async function recordFullCycle(browser, name, viewport, deviceScaleFactor = 1) {
  const context = await browser.newContext({
    deviceScaleFactor,
    hasTouch: viewport.width < 721,
    recordVideo: { dir: videoDir, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = { console: [], page: [] };
  const mediaRequests = new Map();
  observe(page, errors);
  page.on("request", (request) => {
    if (!request.url().includes("/api/galerias/imagem/")) return;
    mediaRequests.set(request.url(), (mediaRequests.get(request.url()) ?? 0) + 1);
  });
  await page.addInitScript(() => {
    window.__visionCumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__visionCumulativeLayoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await gotoHero(page);
  const initial = await snapshot(page);
  const sequence = [initial.media[0]?.id];
  await page.screenshot({ path: path.join(outputDir, `${name}-inicio.png`) });
  await captureCorners(page, `${name}-repouso`);

  let middle;
  let final;
  for (let index = 0; index < 3; index += 1) {
    await waitForTransition(page);
    await page.waitForTimeout(540);
    const transitionState = await snapshot(page);
    if (index === 0) {
      middle = transitionState;
      await page.screenshot({ path: path.join(outputDir, `${name}-50.png`) });
      await captureCorners(page, `${name}-50`);
    }
    if (index === 2) {
      await page.screenshot({ path: path.join(outputDir, `${name}-ultima-primeira.png`) });
    }
    final = await waitForIdleWithNewSource(page, sequence.at(-1));
    sequence.push(final.media[0]?.id);
  }
  await page.screenshot({ path: path.join(outputDir, `${name}-final.png`) });

  if (viewport.width >= 721) {
    await page.evaluate(() => window.scrollTo(0, 128));
    await page.screenshot({ path: path.join(outputDir, "linha-terminando-na-hero.png") });
  }
  const cumulativeLayoutShift = await page.evaluate(() => window.__visionCumulativeLayoutShift ?? 0);
  const requests = Object.fromEntries(mediaRequests);
  await saveVideo(context, video, `${name}-ciclo-completo.webm`);
  return { cumulativeLayoutShift, errors, final, initial, middle, requests, sequence };
}

async function recordVisibility(browser) {
  const context = await browser.newContext({ recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } }, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const video = page.video();
  await gotoHero(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(4_800);
  const hidden = await snapshot(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitForTransition(page);
  const resumed = await waitForIdleWithNewSource(page, before.media[0]?.id);
  await saveVideo(context, video, "aba-oculta-retorno.webm");
  return { before, hidden, resumed };
}

async function swipe(page) {
  await page.locator("#hero [data-state]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const pointer = { bubbles: true, button: 0, clientY: rect.top + rect.height * 0.58, isPrimary: true, pointerId: 7, pointerType: "touch" };
    element.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, clientX: rect.left + rect.width * 0.82 }));
    element.dispatchEvent(new PointerEvent("pointerup", { ...pointer, clientX: rect.left + rect.width * 0.22 }));
  });
}

async function recordSwipeResume(browser) {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, recordVideo: { dir: videoDir, size: { width: 390, height: 844 } }, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const video = page.video();
  await gotoHero(page);
  const before = await snapshot(page);
  await swipe(page);
  const afterSwipe = await waitForIdleWithNewSource(page, before.media[0]?.id);
  const afterAutoplay = await waitForIdleWithNewSource(page, afterSwipe.media[0]?.id);
  await saveVideo(context, video, "swipe-retomada.webm");
  return { afterAutoplay, afterSwipe, before };
}

async function testReducedMotion(browser) {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await gotoHero(page);
  const before = await snapshot(page);
  await page.waitForTimeout(4_500);
  const afterDwell = await snapshot(page);
  await swipe(page);
  await page.waitForFunction((source) => document.querySelector("#hero [data-vision-media] img")?.currentSrc !== source, before.media[0]?.id);
  const afterSwipe = await snapshot(page);
  await context.close();
  return { afterDwell, afterSwipe, before };
}

async function testResize(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await gotoHero(page);
  await waitForTransition(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector("#hero [data-state]")?.getAttribute("data-state") === "idle");
  const compact = await snapshot(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const restored = await snapshot(page);
  await page.close();
  return { compact, restored };
}

async function testViewports(browser) {
  const results = [];
  for (const viewport of [...mobileViewports, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const page = await browser.newPage({ viewport });
    await gotoHero(page);
    results.push(await snapshot(page));
    await page.close();
  }
  return results;
}

function contrastSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1919"><rect width="100%" height="100%" fill="${color}"/></svg>`;
}

async function testContrast(browser) {
  const context = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const mediaColors = new Map();
  await page.route("**/api/galerias/imagem/**", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    if (!mediaColors.has(id)) mediaColors.set(id, mediaColors.size % 2 === 0 ? "#ffffff" : "#050505");
    await route.fulfill({ body: contrastSvg(mediaColors.get(id)), contentType: "image/svg+xml" });
  });
  await gotoHero(page);
  const idle = await snapshot(page);
  await waitForTransition(page);
  await page.waitForTimeout(540);
  const middle = await snapshot(page);
  await page.screenshot({ path: path.join(outputDir, "contraste-50.png") });
  await captureCorners(page, "contraste-50");
  await context.close();
  return { idle, middle };
}

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
try {
  const desktop = await recordFullCycle(browser, "desktop-1440x900", { width: 1440, height: 900 });
  const mobile = await recordFullCycle(browser, "mobile-390x844", { width: 390, height: 844 }, 2);
  const visibility = await recordVisibility(browser);
  const swipeResume = await recordSwipeResume(browser);
  const reducedMotion = await testReducedMotion(browser);
  const resize = await testResize(browser);
  const viewports = await testViewports(browser);
  const contrast = await testContrast(browser);
  const checks = {
    contrastUsesAtMostTwoMedia: contrast.idle.visibleMedia === 1 && contrast.middle.visibleMedia === 2,
    desktopCycleReturnsWithoutEarlyRepeat: new Set(desktop.sequence.slice(0, 3)).size === 3 && desktop.sequence[0] === desktop.sequence[3],
    desktopTypography: desktop.initial.title.lines >= 3 && desktop.initial.title.lines <= 4 && desktop.initial.title.lineHeight >= desktop.initial.title.fontSize * 0.94,
    exactlyOneMediaAtRest: desktop.initial.visibleMedia === 1 && mobile.initial.visibleMedia === 1,
    hiddenPausesAndReturns: visibility.before.media[0]?.id === visibility.hidden.media[0]?.id && visibility.before.media[0]?.id !== visibility.resumed.media[0]?.id,
    lineEndsInsideHero: desktop.initial.lineEndsInsideHero && mobile.initial.lineEndsInsideHero,
    mobileCycleReturnsWithoutEarlyRepeat: new Set(mobile.sequence.slice(0, 3)).size === 3 && mobile.sequence[0] === mobile.sequence[3],
    noDuplicateMediaRequests: [...Object.values(desktop.requests), ...Object.values(mobile.requests)].every((count) => count === 1),
    noHeroLayoutShift: desktop.cumulativeLayoutShift === 0 && mobile.cumulativeLayoutShift === 0,
    noRuntimeErrors: !desktop.errors.console.length && !desktop.errors.page.length && !mobile.errors.console.length && !mobile.errors.page.length,
    noViewportOverflow: viewports.every((result) => result.viewportOverflow === 0),
    reducedMotionIsStaticAndManual: reducedMotion.before.media[0]?.id === reducedMotion.afterDwell.media[0]?.id && reducedMotion.afterSwipe.media[0]?.id !== reducedMotion.before.media[0]?.id && reducedMotion.afterSwipe.visibleMedia === 1,
    resizeReturnsToStableIdle: resize.compact.phase === "idle" && resize.compact.visibleMedia === 1 && resize.restored.visibleMedia === 1,
    swipeResumesAutoplay: swipeResume.before.media[0]?.id !== swipeResume.afterSwipe.media[0]?.id && swipeResume.afterSwipe.media[0]?.id !== swipeResume.afterAutoplay.media[0]?.id,
    twoMediaMaximumDuringCut: desktop.middle.visibleMedia === 2 && mobile.middle.visibleMedia === 2,
  };
  const report = { baseUrl, checks, contrast, desktop, mobile, reducedMotion, resize, swipeResume, viewports, visibility };
  fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ baseUrl, checks }, null, 2));
  if (Object.values(checks).includes(false)) process.exitCode = 1;
} finally {
  await browser.close();
}
