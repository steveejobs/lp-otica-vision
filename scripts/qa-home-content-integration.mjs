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
  if (!executable) throw new Error("Chrome ou Edge não encontrado.");
  return executable;
}

const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDirectory = path.resolve("docs/qa/home-content-integration");
const videoDirectory = path.resolve(".tmp/home-content-integration-video");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(videoDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
const failures = [];

async function waitForImage(locator) {
  await locator.evaluate(async (image) => {
    if (!(image instanceof HTMLImageElement)) throw new Error("Elemento não é imagem.");
    if (!image.complete || image.naturalWidth < 1) {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", reject, { once: true });
      });
    }
  });
}

async function capture({ label, width, height, record = false }) {
  const context = await browser.newContext({
    colorScheme: "light",
    hasTouch: width <= 720,
    isMobile: width <= 720,
    recordVideo: record ? { dir: videoDirectory, size: { width, height } } : undefined,
    viewport: { width, height },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/`, { timeout: 90_000, waitUntil: "domcontentloaded" });
  await page.locator("#hero").waitFor({ state: "visible" });
  await waitForImage(page.locator("#hero [data-vision-media] img").first());
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDirectory, `home-${label}-start.png`), fullPage: false });
  const collectionImage = page.locator("#colecao-em-destaque img").first();
  await collectionImage.scrollIntoViewIfNeeded();
  await waitForImage(collectionImage);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDirectory, `home-${label}-collection.png`), fullPage: false });
  const state = await page.evaluate(() => ({
    catalogPreviewVisible: Boolean(document.querySelector("#preview-catalogo")),
    collectionImageSource: document.querySelector("#colecao-em-destaque img")?.getAttribute("src") ?? null,
    heroImageSource: document.querySelector("#hero [data-vision-media] img")?.getAttribute("src") ?? null,
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
  }));
  if (!state.collectionImageSource?.includes("/api/colecoes/imagem/") && !state.collectionImageSource?.includes("/api/galerias/imagem/")) {
    failures.push(`${label}: coleção não usa um proxy oficial de mídia.`);
  }
  if (!state.heroImageSource?.includes("/api/galerias/imagem/")) failures.push(`${label}: hero não usa o proxy de galeria.`);
  if (state.catalogPreviewVisible) failures.push(`${label}: catálogo vazio não foi ocultado.`);
  if (state.overflow) failures.push(`${label}: overflow horizontal detectado.`);

  if (record) {
    await page.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(6_000);
    await page.locator("#colecao-em-destaque").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(7_000);
    await page.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(7_000);
  }

  const video = page.video();
  await context.close();
  if (video) await video.saveAs(path.join(outputDirectory, `home-${label}-integration.webm`));
  return { errors, state };
}

const record = process.env.QA_RECORD === "1";
const requestedViewport = process.env.QA_VIEWPORT;
const mobile = requestedViewport === "desktop" ? null : await capture({ height: 844, label: "mobile", record, width: 390 });
const desktop = requestedViewport === "mobile" ? null : await capture({ height: 900, label: "desktop", record, width: 1440 });

const instagramErrors = [];
if (!requestedViewport) {
  const instagramContext = await browser.newContext({ colorScheme: "light", hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const instagram = await instagramContext.newPage();
  instagram.on("console", (message) => { if (message.type() === "error") instagramErrors.push(message.text()); });
  instagram.on("pageerror", (error) => instagramErrors.push(error.message));
  await instagram.goto(`${baseUrl}/bio`, { timeout: 90_000, waitUntil: "domcontentloaded" });
  const instagramImage = instagram.locator("#selecao-editorial img").first();
  await instagramImage.scrollIntoViewIfNeeded();
  await waitForImage(instagramImage);
  await instagram.screenshot({ path: path.join(outputDirectory, "instagram-mobile-selection.png"), fullPage: false });
  const instagramSource = await instagramImage.getAttribute("src");
  if (!instagramSource?.includes("/api/galerias/imagem/")) failures.push("instagram: seleção não usa o proxy de galeria.");
  await instagramContext.close();
}
void browser.close();

const report = { baseUrl, desktop, failures, instagramErrors, mobile, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length || mobile?.errors.length || desktop?.errors.length || instagramErrors.length ? 1 : 0);
