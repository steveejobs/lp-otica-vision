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

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3010";
const outputDir = path.resolve("artifacts/curation-qa");
fs.mkdirSync(outputDir, { recursive: true });
const failures = [];
const observations = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${label}: console ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`${label}: pageerror ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.request().resourceType() === "image") {
      failures.push(`${label}: imagem ${response.status()} ${response.url()}`);
    }
  });
  page.on("request", (request) => {
    if (request.url().includes("/api/analytics")) failures.push(`${label}: analytics ativo na rota isolada`);
  });
}

async function waitImages(page) {
  await page.waitForFunction(() => [...document.images].every((image) => {
    const rect = image.getBoundingClientRect();
    const nearViewport = rect.bottom >= -window.innerHeight && rect.top <= window.innerHeight * 2
      && rect.right >= -window.innerWidth && rect.left <= window.innerWidth * 1.5;
    return !nearViewport || (image.complete && image.naturalWidth > 0);
  }));
}

async function productState(page) {
  return page.locator("#curation-products article").evaluateAll((nodes) => ({
    count: nodes.length,
    ids: nodes.map((node) => node.querySelector("a")?.getAttribute("data-catalog-product-id")),
  }));
}

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });

try {
  const desktop = await browser.newContext({
    colorScheme: "light",
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(outputDir, "video-desktop"), size: { height: 900, width: 1440 } },
    reducedMotion: "no-preference",
    viewport: { height: 900, width: 1440 },
  });
  const page = await desktop.newPage();
  page.setDefaultNavigationTimeout(90_000);
  page.setDefaultTimeout(60_000);
  observe(page, "desktop");
  await page.goto(`${baseUrl}/preview/curadoria`, { waitUntil: "networkidle" });
  await waitImages(page);
  await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "desktop-inicial.png") });
  let state = await productState(page);
  assert(state.count === 8, `desktop inicial esperava 8 produtos, recebeu ${state.count}`);
  assert(new Set(state.ids).size === state.ids.length, "desktop inicial contém produto duplicado");
  assert(await page.getByRole("tab").count() === 4, "faltam as quatro direções de estilo");

  await page.getByRole("tab", { name: /Marcante/ }).click();
  await page.waitForTimeout(90);
  await page.screenshot({ fullPage: true, path: path.join(outputDir, "desktop-motion.png") });
  await page.waitForFunction(() => document.querySelector("#curadoria")?.getAttribute("data-style") === "marcante");
  state = await productState(page);
  assert(state.count === 6, `Marcante esperava 6 fixtures, recebeu ${state.count}`);
  await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "desktop-marcante.png") });

  await page.getByRole("tab", { name: /Clássica/ }).focus();
  await page.keyboard.press("ArrowRight");
  assert(await page.getByRole("tab", { name: /Marcante/ }).getAttribute("aria-selected") === "true", "setas não selecionam tabs");
  await page.getByRole("tab", { name: /Clássica/ }).click();
  await page.getByRole("radio", { name: "Grupo QA A" }).click();
  state = await productState(page);
  assert(state.count === 4, `categoria QA A esperava 4 produtos, recebeu ${state.count}`);
  await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "desktop-categoria.png") });
  await page.getByRole("radio", { name: "Todos" }).click();

  await Promise.all([
    page.waitForURL(/\/preview\/curadoria\/catalogo/),
    page.getByRole("link", { name: /Ver seleção completa/ }).click(),
  ]);
  assert(new URL(page.url()).searchParams.get("estilo") === "classica", "catálogo não preservou estilo na URL");
  await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "desktop-catalogo.png") });
  const catalogUrl = page.url();
  await page.close();

  const productFlow = await desktop.newPage();
  observe(productFlow, "desktop-product-flow");
  productFlow.setDefaultNavigationTimeout(90_000);
  productFlow.setDefaultTimeout(60_000);
  await productFlow.goto(catalogUrl, { waitUntil: "networkidle" });
  await productFlow.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight / 3)));
  const beforeOpenScroll = await productFlow.evaluate(() => window.scrollY);
  await productFlow.locator("#curation-products article a").first().click();
  assert(/\/produto\/item-qa-/.test(productFlow.url()), `produto não abriu: ${productFlow.url()}`);
  if (!/\/produto\/item-qa-/.test(productFlow.url())) throw new Error(`Produto não abriu: ${productFlow.url()}`);
  await productFlow.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "desktop-produto.png") });
  await productFlow.getByRole("link", { name: /Voltar ao catálogo/ }).click();
  await productFlow.waitForURL(/\/preview\/curadoria\/catalogo/);
  await productFlow.waitForTimeout(500);
  const afterReturnScroll = await productFlow.evaluate(() => window.scrollY);
  assert(Math.abs(beforeOpenScroll - afterReturnScroll) < 80, `scroll não foi restaurado: ${beforeOpenScroll} -> ${afterReturnScroll}`);
  observations.push(`desktop-scroll:${beforeOpenScroll}->${afterReturnScroll}`);
  await productFlow.close();
  await desktop.close();

  const mobile = await browser.newContext({
    colorScheme: "light",
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: path.join(outputDir, "video-mobile"), size: { height: 844, width: 390 } },
    reducedMotion: "no-preference",
    viewport: { height: 844, width: 390 },
  });
  const mobilePage = await mobile.newPage();
  mobilePage.setDefaultNavigationTimeout(90_000);
  mobilePage.setDefaultTimeout(60_000);
  observe(mobilePage, "mobile");
  await mobilePage.goto(`${baseUrl}/preview/curadoria`, { waitUntil: "networkidle" });
  await waitImages(mobilePage);
  await mobilePage.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "mobile-inicial.png") });
  const rail = mobilePage.locator("#curation-products > div");
  const beforeSwipe = await rail.evaluate((element) => element.scrollLeft);
  await rail.evaluate((element) => element.scrollBy({ left: element.clientWidth * 0.8, behavior: "instant" }));
  const afterSwipe = await rail.evaluate((element) => element.scrollLeft);
  assert(afterSwipe > beforeSwipe, "rail mobile não responde ao swipe/scroll horizontal");
  const bodyOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(bodyOverflow <= 1, `mobile possui overflow horizontal de ${bodyOverflow}px`);
  await mobilePage.getByRole("tab", { name: /Contemporânea/ }).click();
  await mobilePage.getByRole("radio", { name: "Grupo QA B" }).click();
  await mobilePage.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "mobile-filtro.png") });
  await Promise.all([
    mobilePage.waitForURL(/\/preview\/curadoria\/catalogo/),
    mobilePage.getByRole("link", { name: /Ver seleção completa/ }).click(),
  ]);
  const mobileCatalogUrl = mobilePage.url();
  await mobilePage.close();
  const mobileProductFlow = await mobile.newPage();
  observe(mobileProductFlow, "mobile-product-flow");
  mobileProductFlow.setDefaultNavigationTimeout(90_000);
  await mobileProductFlow.goto(mobileCatalogUrl, { waitUntil: "networkidle" });
  await mobileProductFlow.locator("#curation-products article a").first().click();
  assert(/\/produto\/item-qa-/.test(mobileProductFlow.url()), `produto mobile não abriu: ${mobileProductFlow.url()}`);
  if (!/\/produto\/item-qa-/.test(mobileProductFlow.url())) throw new Error(`Produto mobile não abriu: ${mobileProductFlow.url()}`);
  await mobileProductFlow.getByRole("link", { name: /Voltar ao catálogo/ }).click();
  await mobileProductFlow.waitForURL(/\/preview\/curadoria\/catalogo/);
  await mobileProductFlow.close();
  await mobile.close();

  for (const viewport of [
    { height: 800, width: 360 }, { height: 812, width: 375 }, { height: 915, width: 412 },
    { height: 932, width: 430 }, { height: 768, width: 1366 }, { height: 1080, width: 1920 },
  ]) {
    const context = await browser.newContext({ deviceScaleFactor: viewport.width < 500 ? 2 : 1, viewport });
    const viewportPage = await context.newPage();
    observe(viewportPage, `${viewport.width}x${viewport.height}`);
    await viewportPage.goto(`${baseUrl}/preview/curadoria`, { waitUntil: "domcontentloaded" });
    await waitImages(viewportPage);
    const overflow = await viewportPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `${viewport.width}x${viewport.height} possui overflow horizontal de ${overflow}px`);
    assert((await productState(viewportPage)).count === 8, `${viewport.width}x${viewport.height} não renderizou oito produtos`);
    await context.close();
  }

  for (const [scenario, expected] of [["0", 0], ["1", 1], ["3", 3], ["7", 7], ["8", 8], ["mais-8", 8]]) {
    const context = await browser.newContext({ viewport: { height: 900, width: 1440 } });
    const scenarioPage = await context.newPage();
    observe(scenarioPage, `scenario-${scenario}`);
    await scenarioPage.goto(`${baseUrl}/preview/curadoria?cenario=${scenario}`, { waitUntil: "domcontentloaded" });
    assert((await productState(scenarioPage)).count === expected, `cenário ${scenario} não respeitou o limite ${expected}`);
    await context.close();
  }

  const reduced = await browser.newContext({ reducedMotion: "reduce", viewport: { height: 900, width: 1440 } });
  const reducedPage = await reduced.newPage();
  observe(reducedPage, "reduced");
  await reducedPage.goto(`${baseUrl}/preview/curadoria`, { waitUntil: "networkidle" });
  await reducedPage.getByRole("tab", { name: /Esportiva/ }).click();
  const animations = await reducedPage.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(animations === 0, `reduced motion manteve ${animations} animações em execução`);
  await reducedPage.screenshot({ animations: "disabled", fullPage: true, path: path.join(outputDir, "reduced-motion.png") });
  await reduced.close();
} finally {
  await browser.close();
}

const result = { failures, observations, passed: failures.length === 0 };
fs.writeFileSync(path.join(outputDir, "results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
