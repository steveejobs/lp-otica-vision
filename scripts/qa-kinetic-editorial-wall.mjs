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
  if (!executable) throw new Error("Chrome ou Edge não encontrado para a prova visual.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDirectory = path.resolve("docs/qa/kinetic-editorial-wall");
const videoDirectory = path.resolve(".tmp/kinetic-editorial-wall-video");
const HOLD_MS = 2_650;
const TRANSITION_MS = 1_080;
const CYCLE_MS = 3 * (HOLD_MS + TRANSITION_MS);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(videoDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });

async function waitForImage(locator) {
  await locator.evaluate(async (image) => {
    if (!(image instanceof HTMLImageElement)) throw new Error("A imagem protagonista não foi encontrada.");
    if (!image.complete || image.naturalWidth < 1) {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", reject, { once: true });
      });
    }
  });
}

async function waitForActiveChange(page, previousSource) {
  await page.waitForFunction(
    (source) => document.querySelector("#hero figure[class*='active'] img")?.getAttribute("src") !== source,
    previousSource,
    { timeout: HOLD_MS + TRANSITION_MS + 2_500 },
  );
  return page.locator("#hero figure[class*='active'] img").getAttribute("src");
}

async function capture(label, viewport) {
  const context = await browser.newContext({
    colorScheme: "light",
    hasTouch: viewport.width <= 720,
    isMobile: viewport.width <= 720,
    recordVideo: { dir: videoDirectory, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${baseUrl}/`, { timeout: 90_000, waitUntil: "networkidle" });
  const hero = page.locator("#hero");
  const active = hero.locator("figure[class*='active'] img");
  await hero.waitFor({ state: "visible" });
  await waitForImage(active);
  await page.waitForTimeout(280);
  await page.screenshot({ path: path.join(outputDirectory, `${label}-start.png`), fullPage: false });
  const first = await active.getAttribute("src");

  await hero.locator("[data-transitioning]").waitFor({ state: "attached", timeout: HOLD_MS + 2_000 });
  await page.waitForTimeout(Math.round(TRANSITION_MS / 2));
  await page.screenshot({ path: path.join(outputDirectory, `${label}-middle.png`), fullPage: false });

  const second = await waitForActiveChange(page, first);
  const third = await waitForActiveChange(page, second);
  const restart = await waitForActiveChange(page, third);
  await page.screenshot({ path: path.join(outputDirectory, `${label}-end.png`), fullPage: false });

  const video = page.video();
  await context.close();
  if (video) await video.saveAs(path.join(outputDirectory, `${label}-cycle.webm`));
  return { errors, sequence: [first, second, third, restart] };
}

try {
  const mobile = await capture("mobile", { width: 390, height: 844 });
  const desktop = await capture("desktop", { width: 1440, height: 900 });
  const isFullCycle = (sequence) => (
    sequence.every(Boolean)
    && new Set(sequence.slice(0, 3)).size === 3
    && sequence[0] === sequence[3]
  );
  const report = {
    cycleDurationMs: CYCLE_MS,
    desktop,
    mobile,
    passed: desktop.errors.length === 0 && mobile.errors.length === 0
      && isFullCycle(desktop.sequence) && isFullCycle(mobile.sequence),
  };
  fs.writeFileSync(path.join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
}
