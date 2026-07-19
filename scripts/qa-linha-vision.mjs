import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:5175").replace(/\/$/, "");
const outputDir = path.resolve("docs/qa/linha-vision");
const videoDir = path.resolve(".tmp/linha-vision/video");

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
  if (!executable) throw new Error("Chrome ou Edge nao encontrado.");
  return executable;
}

async function snapshot(page) {
  return page.evaluate(() => {
    const field = document.querySelector("[data-vision-media-field]");
    const visual = document.querySelector("#hero [data-state]");
    if (!(field instanceof HTMLElement) || !(visual instanceof HTMLElement)) throw new Error("Hero Linha Vision nao encontrada.");
    const rect = field.getBoundingClientRect();
    const media = [...field.querySelectorAll("[data-vision-media]")].map((node) => {
      const image = node.querySelector("img");
      const imageRect = node.getBoundingClientRect();
      return { src: image?.currentSrc ?? image?.getAttribute("src"), rect: { bottom: imageRect.bottom, height: imageRect.height, left: imageRect.left, right: imageRect.right, top: imageRect.top, width: imageRect.width } };
    });
    return {
      field: { bottom: rect.bottom, height: rect.height, left: rect.left, right: rect.right, top: rect.top, width: rect.width },
      media,
      overflowing: [...document.querySelectorAll("body *")]
        .map((element) => ({ className: element.className, rect: element.getBoundingClientRect(), tagName: element.tagName }))
        .filter(({ rect }) => rect.right > window.innerWidth + 1 || rect.left < -1)
        .slice(0, 12)
        .map(({ className, rect, tagName }) => ({ className: typeof className === "string" ? className : "", left: rect.left, right: rect.right, tagName })),
      phase: visual.dataset.state,
      visibleMedia: media.length,
      viewportOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

async function captureCorners(page, name) {
  await page.locator("[data-vision-media-field]").scrollIntoViewIfNeeded();
  const state = await snapshot(page);
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const size = Math.max(28, Math.round(Math.min(state.field.width, state.field.height) * 0.075));
  const corners = {
    "top-left": { x: state.field.left + scroll.x, y: state.field.top + scroll.y },
    "top-right": { x: state.field.right - size + scroll.x, y: state.field.top + scroll.y },
    "bottom-left": { x: state.field.left + scroll.x, y: state.field.bottom - size + scroll.y },
    "bottom-right": { x: state.field.right - size + scroll.x, y: state.field.bottom - size + scroll.y },
  };
  await Promise.all(Object.entries(corners).map(([corner, point]) => page.screenshot({
    clip: { height: size, width: size, x: Math.max(0, Math.floor(point.x)), y: Math.max(0, Math.floor(point.y)) },
    path: path.join(outputDir, `${name}-${corner}.png`),
    scale: "device",
  })));
}

async function waitFor(page, predicate, argument) {
  await page.waitForFunction(predicate, argument, { timeout: 20_000 });
  return snapshot(page);
}

async function waitForTransition(page) {
  return waitFor(page, () => document.querySelector("#hero [data-state]")?.getAttribute("data-state") === "transitioning");
}

async function waitForIdleWithNewSource(page, before) {
  return waitFor(page, (source) => {
    const visual = document.querySelector("#hero [data-state]");
    const image = document.querySelector("[data-vision-media] img");
    return visual?.getAttribute("data-state") === "idle" && image?.currentSrc !== source;
  }, before);
}

async function saveVideo(context, video, filename) {
  await context.close();
  if (video) await video.saveAs(path.join(outputDir, filename));
}

function contrastSvg(color, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1919"><rect width="100%" height="100%" fill="${color}"/><text x="90" y="180" font-size="120" fill="${color === "#050505" ? "#ffffff" : "#050505"}">${label}</text></svg>`;
}

async function recordCycle(browser, name, viewport, deviceScaleFactor = 1) {
  const context = await browser.newContext({
    deviceScaleFactor,
    hasTouch: viewport.width < 721,
    recordVideo: { dir: videoDir, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("[data-vision-media-field] img").first().evaluate(async (image) => { await image.decode?.(); });
  const start = await snapshot(page);
  await captureCorners(page, `${name}-idle`);
  await waitForTransition(page);
  await page.waitForTimeout(420);
  const middle = await snapshot(page);
  await captureCorners(page, `${name}-middle`);
  const end = await waitForIdleWithNewSource(page, start.media[0]?.src);
  await page.screenshot({ path: path.join(outputDir, `${name}-end.png`) });
  await saveVideo(context, video, `${name}-cycle.webm`);
  return { consoleErrors, end, middle, pageErrors, start };
}

async function recordLoopAndContrast(browser) {
  const context = await browser.newContext({ recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } }, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const sequence = [(await snapshot(page)).media[0]?.src];
  for (let index = 0; index < 3; index += 1) {
    await waitForTransition(page);
    await page.waitForTimeout(430);
    if (index === 2) await captureCorners(page, "desktop-last-to-first-middle");
    const previous = sequence.at(-1);
    const next = await waitForIdleWithNewSource(page, previous);
    sequence.push(next.media[0]?.src);
  }
  await saveVideo(context, video, "desktop-full-loop.webm");

  const contrastContext = await browser.newContext({ recordVideo: { dir: videoDir, size: { width: 390, height: 844 } }, viewport: { width: 390, height: 844 }, hasTouch: true });
  const contrast = await contrastContext.newPage();
  const contrastVideo = contrast.video();
  await contrast.route("**/api/galerias/imagem/**", async (route) => {
    const src = route.request().url();
    const dark = !src.includes("4efc08dc-15c2-46f0-b28d-5beb89a8e893");
    await route.fulfill({ body: contrastSvg(dark ? "#050505" : "#ffffff", dark ? "DARK" : "LIGHT"), contentType: "image/svg+xml" });
  });
  await contrast.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForTransition(contrast);
  await contrast.waitForTimeout(430);
  const contrastMiddle = await snapshot(contrast);
  await captureCorners(contrast, "contrast-mobile-middle");
  await saveVideo(contrastContext, contrastVideo, "contrast-mobile-cycle.webm");
  return { contrastMiddle, sequence };
}

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
try {
  const desktop = await recordCycle(browser, "desktop-1440x900", { width: 1440, height: 900 });
  const mobile = await recordCycle(browser, "mobile-390x844", { width: 390, height: 844 }, 2);
  const loop = await recordLoopAndContrast(browser);
  const report = {
    checks: {
      contrastHasOnlyTwoMedia: loop.contrastMiddle.visibleMedia === 2,
      desktopMiddleHasOnlyTwoMedia: desktop.middle.visibleMedia === 2,
      desktopRestHasOneMedia: desktop.start.visibleMedia === 1 && desktop.end.visibleMedia === 1,
      loopVisitsEachLocalImageOnceBeforeReturning: new Set(loop.sequence.slice(0, 3)).size === 3 && loop.sequence[0] === loop.sequence[3],
      mobileMiddleHasOnlyTwoMedia: mobile.middle.visibleMedia === 2,
      mobileRestHasOneMedia: mobile.start.visibleMedia === 1 && mobile.end.visibleMedia === 1,
      noConsoleErrors: ![...desktop.consoleErrors, ...mobile.consoleErrors].length,
      noPageErrors: ![...desktop.pageErrors, ...mobile.pageErrors].length,
      noViewportOverflow: desktop.start.viewportOverflow === 0 && mobile.start.viewportOverflow === 0,
    },
    desktop,
    loop,
    mobile,
  };
  fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report.checks).includes(false)) process.exitCode = 1;
} finally {
  await browser.close();
}
