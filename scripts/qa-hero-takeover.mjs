import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
const outputDir = path.resolve("docs/qa/hero-loop-refinement");
const videoDir = path.resolve(".tmp/hero-loop-refinement/video");
const HOLD_AND_TRANSITION_MS = 6_700;
const MANUAL_RESUME_MS = 6_500;
const IMAGE_CHANGE_TIMEOUT_MS = 45_000;

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

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

function currentImage(page) {
  return page.locator("#hero figure:not([aria-hidden='true']) img").first();
}

async function waitForHero(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const image = currentImage(page);
  await image.waitFor({ state: "visible", timeout: 60_000 });
  await image.evaluate(async (element) => {
    if (!element.complete) await new Promise((resolve) => element.addEventListener("load", resolve, { once: true }));
    await element.decode?.();
  });
}

async function snapshotHero(page) {
  return page.locator("#hero").evaluate((hero) => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { height: Math.round(value.height), left: Math.round(value.left), top: Math.round(value.top), width: Math.round(value.width) };
    };
    const active = hero.querySelector("figure:not([aria-hidden='true']) img");
    const visual = hero.querySelector("[role='group']");
    const copy = hero.querySelector("h1")?.parentElement;
    const hiddenImages = [...hero.querySelectorAll("figure[aria-hidden='true'] img")];
    return {
      activeAlt: active?.getAttribute("alt") ?? null,
      activeSrc: active?.getAttribute("src") ?? null,
      copy: copy ? rect(copy) : null,
      decorativeTextPresent: /VISION\s*\/\s*CURADORIA|PROVA EDITORIAL|SLIDE\s*0|FRAME\s*0|CHAPTER\s*0|EDIT\s*0/i.test(hero.textContent ?? ""),
      hero: rect(hero),
      hiddenImagesHaveEmptyAlt: hiddenImages.every((image) => image.getAttribute("alt") === ""),
      imageCount: hero.querySelectorAll("img").length,
      motion: hero.getAttribute("data-motion"),
      publishedCount: Number(hero.getAttribute("data-count") ?? "0"),
      visual: visual ? rect(visual) : null,
    };
  });
}

async function waitForNextImage(page, previousSrc) {
  await page.waitForFunction(
    (previous) => document.querySelector("#hero figure:not([aria-hidden='true']) img")?.getAttribute("src") !== previous,
    previousSrc,
    { timeout: IMAGE_CHANGE_TIMEOUT_MS },
  );
  return snapshotHero(page);
}

async function recordCycle(browser, label, viewport, report, trackRequests = false) {
  const context = await browser.newContext({
    recordVideo: { dir: videoDir, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  observe(page, report, trackRequests);
  await waitForHero(page);

  const start = await snapshotHero(page);
  const sequence = [start.activeSrc];
  await page.screenshot({ path: path.join(outputDir, `hero-${label}-initial.png`) });
  let middle = start;
  let end = start;

  if (start.publishedCount > 1) {
    for (let index = 1; index <= start.publishedCount; index += 1) {
      const next = await waitForNextImage(page, sequence.at(-1));
      sequence.push(next.activeSrc);
      if (index === Math.ceil(start.publishedCount / 2)) {
        middle = next;
        await page.screenshot({ path: path.join(outputDir, `hero-${label}-middle.png`) });
      }
      end = next;
    }
  } else {
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: path.join(outputDir, `hero-${label}-middle.png`) });
  }
  await page.screenshot({ path: path.join(outputDir, `hero-${label}-seam.png`) });

  const cycle = {
    closesAtFirst: sequence[0] === sequence.at(-1),
    noRepeatBeforeSeam: start.publishedCount === 1 || new Set(sequence.slice(0, -1)).size === start.publishedCount,
    sequence,
  };
  const target = path.join(outputDir, `hero-${label}-cycle.webm`);
  await context.close();
  await video?.saveAs(target);

  return { cycle, end, middle, start, video: target };
}

async function recordSwipeAndResume(browser, report) {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: videoDir, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  observe(page, report);
  await waitForHero(page);
  const before = await snapshotHero(page);
  const visual = page.locator("#hero [role='group']");
  const box = await visual.boundingBox();
  if (!box) throw new Error("Palco visual da hero não encontrado para swipe.");
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.24, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  const afterSwipe = await waitForNextImage(page, before.activeSrc);
  await page.screenshot({ path: path.join(outputDir, "hero-mobile-after-swipe.png") });
  await page.waitForTimeout(MANUAL_RESUME_MS + 750);
  const afterResume = await snapshotHero(page);
  const target = path.join(outputDir, "hero-mobile-swipe-resume.webm");
  await context.close();
  await video?.saveAs(target);
  return { afterResume, afterSwipe, before, video: target };
}

async function checkReducedMotion(browser, report) {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  observe(page, report);
  await waitForHero(page);
  const before = await snapshotHero(page);
  await page.waitForTimeout(HOLD_AND_TRANSITION_MS + 600);
  const staticState = await snapshotHero(page);
  await page.locator("#hero [role='group']").focus();
  await page.keyboard.press("ArrowRight");
  const afterManual = await waitForNextImage(page, before.activeSrc);
  await page.screenshot({ path: path.join(outputDir, "hero-mobile-reduced-motion.png") });
  await context.close();
  return {
    manualNavigationWorks: afterManual.activeSrc !== before.activeSrc,
    autoplayDisabled: before.activeSrc === staticState.activeSrc && staticState.motion === "reduced",
  };
}

async function checkVisibilityAndViewport(browser, report) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  observe(page, report);
  await waitForHero(page);
  const beforeOffscreen = await snapshotHero(page);
  await page.locator("#video-story-title").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(HOLD_AND_TRANSITION_MS + 600);
  const offscreen = await snapshotHero(page);
  await page.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(500);
  const restored = await snapshotHero(page);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(250);
  const hiddenMotion = await snapshotHero(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(250);
  const visibleMotion = await snapshotHero(page);
  await context.close();
  return {
    offscreenPaused: beforeOffscreen.activeSrc === offscreen.activeSrc && offscreen.motion === "paused",
    restoredMotion: restored.motion,
    tabHiddenPaused: hiddenMotion.motion === "paused",
    tabVisibleMotion: visibleMotion.motion,
  };
}

async function checkViewports(browser, report) {
  const mobileViewports = [
    { width: 360, height: 800 }, { width: 375, height: 812 }, { width: 390, height: 844 },
    { width: 393, height: 852 }, { width: 412, height: 915 }, { width: 430, height: 932 },
  ];
  const desktopViewports = [
    { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1600, height: 900 }, { width: 1920, height: 1080 },
  ];
  const results = [];
  for (const [viewports, mobile] of [[mobileViewports, true], [desktopViewports, false]]) {
    const context = await browser.newContext({ hasTouch: mobile, isMobile: mobile, viewport: viewports[0] });
    const page = await context.newPage();
    observe(page, report);
    await waitForHero(page);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(240);
      results.push(await page.locator("#hero").evaluate((hero) => ({
        height: Math.round(hero.getBoundingClientRect().height),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        viewport: { height: window.innerHeight, width: window.innerWidth },
        zeroSizedImages: [...hero.querySelectorAll("img")].some((image) => image.naturalWidth < 1 || image.naturalHeight < 1),
      })));
    }
    await context.close();
  }
  return results;
}

function observe(page, report, trackRequests = false) {
  page.on("console", (message) => {
    if (message.type() !== "error" || message.text().includes("webpack-hmr")) return;
    report.consoleErrors.push(message.text().slice(0, 500));
  });
  page.on("pageerror", (error) => report.pageErrors.push(error.message.slice(0, 500)));
  if (!trackRequests) return;
  page.on("request", (request) => {
    if (!request.url().includes("/api/galerias/imagem/")) return;
    report.imageRequests.set(request.url(), (report.imageRequests.get(request.url()) ?? 0) + 1);
  });
}

const report = { consoleErrors: [], imageRequests: new Map(), pageErrors: [] };
const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });

try {
  const desktop = await recordCycle(browser, "desktop-1440x900", { width: 1440, height: 900 }, report, true);
  const mobile = await recordCycle(browser, "mobile-390x844", { width: 390, height: 844 }, report);
  const swipe = await recordSwipeAndResume(browser, report);
  const reducedMotion = await checkReducedMotion(browser, report);
  const visibility = await checkVisibilityAndViewport(browser, report);
  const viewports = await checkViewports(browser, report);
  const snapshot = desktop.start;
  const result = {
    checks: {
      desktopCycle: desktop.cycle,
      desktopFieldsSeparated: Boolean(desktop.start.copy && desktop.start.visual && desktop.start.copy.left + desktop.start.copy.width <= desktop.start.visual.left),
      mobileCycle: mobile.cycle,
      noDecorativeHeroText: !snapshot.decorativeTextPresent,
      noDuplicateImageRequests: [...report.imageRequests.values()].every((count) => count <= 1),
      noImageCloneAccessibilityViolation: snapshot.hiddenImagesHaveEmptyAlt,
      noViewportOverflow: viewports.every((viewport) => !viewport.overflow),
      noZeroSizedImages: viewports.every((viewport) => !viewport.zeroSizedImages),
      reducedMotion,
      swipeChangedImage: swipe.before.activeSrc !== swipe.afterSwipe.activeSrc,
      swipeResumedAutoplay: swipe.afterResume.motion === "playing",
      visibility,
    },
    consoleErrors: report.consoleErrors,
    imageRequestCounts: Object.fromEntries(report.imageRequests),
    pageErrors: report.pageErrors,
    publishedImageCount: snapshot.publishedCount,
    recordings: { desktop: desktop.video, mobile: mobile.video, swipe: swipe.video },
    snapshots: { desktop, mobile },
    viewports,
  };
  fs.writeFileSync(path.join(outputDir, "hero-loop-results.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
  if (report.consoleErrors.length || report.pageErrors.length || Object.values(result.checks).includes(false)) process.exitCode = 1;
} finally {
  await browser.close();
}
