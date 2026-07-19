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

const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = path.resolve("docs/qa/hero-editorial-stage");
const videoDir = path.resolve(".tmp/hero-editorial-stage/admin-video");
const credentialsPath = path.resolve(".tmp-hero-admin.json");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });
if (!fs.existsSync(credentialsPath)) throw new Error("Credencial temporaria da validacao nao encontrada.");
const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
const admin = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const { data: gallery, error: galleryError } = await admin.from("galleries").select("id").eq("route_key", "home").eq("placement_key", "hero").single();
if (galleryError) throw galleryError;

const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
const consoleErrors = [];
const pageErrors = [];

function observe(page) {
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300)); });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));
}

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail").fill(credentials.email);
  await page.getByLabel("Senha").fill(credentials.password);
  await Promise.all([page.waitForURL(`${baseUrl}/admin`, { timeout: 90_000 }), page.getByRole("button", { name: "Entrar no ADM" }).click()]);
}

async function adminPage(page) {
  await page.goto(`${baseUrl}/admin/galerias/${gallery.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Home › Hero principal" }).waitFor();
}

async function articleByRole(page, role) {
  const articles = page.locator("article");
  for (let index = 0; index < await articles.count(); index += 1) {
    const article = articles.nth(index);
    if (await article.locator('[name="editorial_role"]').inputValue() === role) return article;
  }
  throw new Error(`Item ${role} nao encontrado.`);
}

async function waitNavigation(page, action) {
  await Promise.all([page.waitForNavigation({ timeout: 120_000, waitUntil: "domcontentloaded" }), action()]);
}

async function replaceRole(page, role, filename) {
  const article = await articleByRole(page, role);
  const form = article.locator("form").filter({ hasText: "Substituir arquivo" });
  await form.locator('[name="file"]').setInputFiles(path.resolve("public/media/photos", filename));
  await waitNavigation(page, () => form.getByRole("button", { name: "Substituir arquivo" }).click());
  if (new URL(page.url()).searchParams.get("status") !== "uploaded") throw new Error(`Substituicao de ${role} falhou.`);
}

async function setPublished(page, role, published) {
  const article = await articleByRole(page, role);
  const form = article.locator("form").filter({ hasText: "Salvar item" });
  const checkbox = form.locator('[name="published"]');
  if (published) await checkbox.check(); else await checkbox.uncheck();
  await waitNavigation(page, () => form.getByRole("button", { name: "Salvar item" }).click());
  if (new URL(page.url()).searchParams.get("status") !== "saved") throw new Error(`Mudanca de publicacao de ${role} falhou.`);
}

async function publish(page) {
  const section = page.getByRole("heading", { name: "Publicação segura" }).locator("xpath=ancestor::section[1]");
  await waitNavigation(page, () => section.getByRole("button", { name: "Publicar revisão" }).click());
  if (new URL(page.url()).searchParams.get("status") !== "published") throw new Error("Publicacao da hero falhou.");
}

async function waitHero(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const field = page.locator("[data-vision-media-field]");
  await field.waitFor({ state: "visible", timeout: 90_000 });
  const image = field.locator("img").first();
  await image.waitFor({ state: "attached", timeout: 90_000 });
  await image.evaluate(async (element) => { if (!element.complete) await new Promise((resolve) => element.addEventListener("load", resolve, { once: true })); await element.decode?.(); });
}

async function saveVideo(context, video, filename) {
  await context.close();
  await video.saveAs(path.join(outputDir, filename));
}

let swappedRevision;
let oneImageRevision;
let finalRevision;

try {
  const publicationContext = await browser.newContext({ recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } }, viewport: { width: 1440, height: 900 } });
  const publicationPage = await publicationContext.newPage();
  observe(publicationPage);
  const publicationVideo = publicationPage.video();
  await login(publicationPage);
  await adminPage(publicationPage);
  await publicationPage.screenshot({ fullPage: true, path: path.join(outputDir, "hero-admin-desktop.png") });
  await publicationPage.getByRole("button", { name: "Mobile 390×844" }).click();
  await publicationPage.screenshot({ fullPage: true, path: path.join(outputDir, "hero-admin-mobile.png") });
  await replaceRole(publicationPage, "primary", "7 (1).jpg");
  await publish(publicationPage);
  ({ data: swappedRevision } = await admin.from("gallery_publications").select("id, revision").eq("gallery_id", gallery.id).eq("active", true).single());
  await waitHero(publicationPage);
  await publicationPage.screenshot({ path: path.join(outputDir, "hero-admin-swapped-public.png") });
  await publicationPage.waitForTimeout(8_500);
  await publicationPage.locator("#video-story-title").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await publicationPage.waitForTimeout(900);
  await publicationPage.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await publicationPage.waitForTimeout(900);
  await saveVideo(publicationContext, publicationVideo, "hero-admin-publication.webm");

  const singleContext = await browser.newContext({ hasTouch: true, isMobile: true, recordVideo: { dir: videoDir, size: { width: 390, height: 844 } }, viewport: { width: 390, height: 844 } });
  const singlePage = await singleContext.newPage();
  observe(singlePage);
  const singleVideo = singlePage.video();
  await login(singlePage);
  await adminPage(singlePage);
  await setPublished(singlePage, "secondary", false);
  await setPublished(singlePage, "detail", false);
  await publish(singlePage);
  ({ data: oneImageRevision } = await admin.from("gallery_publications").select("id, revision").eq("gallery_id", gallery.id).eq("active", true).single());
  await waitHero(singlePage);
  await singlePage.screenshot({ path: path.join(outputDir, "hero-single-image.png") });
  await singlePage.waitForTimeout(4_000);
  await singlePage.locator("#video-story-title").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await singlePage.waitForTimeout(900);
  await singlePage.locator("#hero").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await singlePage.waitForTimeout(900);
  await saveVideo(singleContext, singleVideo, "hero-single-image.webm");

  const restoreContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const restorePage = await restoreContext.newPage();
  observe(restorePage);
  await login(restorePage);
  await adminPage(restorePage);
  await setPublished(restorePage, "secondary", true);
  await setPublished(restorePage, "detail", true);
  await replaceRole(restorePage, "primary", "6 (1).jpg");
  await publish(restorePage);
  ({ data: finalRevision } = await admin.from("gallery_publications").select("id, revision").eq("gallery_id", gallery.id).eq("active", true).single());
  await waitHero(restorePage);
  await restorePage.waitForTimeout(8_200);
  await restorePage.screenshot({ path: path.join(outputDir, "hero-final-restored.png") });
  await restoreContext.close();

  const { data: audit } = await admin.from("audit_logs").select("actor_id, action, entity_type, created_at").in("entity_type", ["gallery_items", "gallery_publications", "gallery_publication_items"]).order("created_at", { ascending: false }).limit(30);
  const { data: draftItems } = await admin.from("gallery_items").select("media_manifest").eq("gallery_id", gallery.id);
  const { data: activeItems } = await admin.from("gallery_publication_items").select("media_manifest").eq("publication_id", finalRevision.id);
  const retained = new Set([...draftItems, ...activeItems].flatMap((item) => Object.values(item.media_manifest ?? {}).map((file) => file.path)));
  const { data: inactivePublications } = await admin.from("gallery_publications").select("id").eq("gallery_id", gallery.id).eq("active", false);
  if (inactivePublications?.length) {
    const { data: inactiveItems } = await admin.from("gallery_publication_items").select("media_manifest").in("publication_id", inactivePublications.map((item) => item.id));
    const stale = [...new Set((inactiveItems ?? []).flatMap((item) => Object.values(item.media_manifest ?? {}).map((file) => file.path)).filter((item) => !retained.has(item)))];
    if (stale.length) await admin.storage.from("site-galleries").remove(stale);
  }

  const report = {
    auditEventsWithActor: (audit ?? []).filter((item) => item.actor_id).length,
    consoleErrors,
    finalRevision,
    oneImageRevision,
    pageErrors,
    swappedRevision,
  };
  fs.writeFileSync(path.join(outputDir, "hero-admin-publication-results.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

if (consoleErrors.length || pageErrors.length) process.exitCode = 1;
