import { randomBytes, randomUUID } from "node:crypto";
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
  if (!executable) throw new Error("Chrome ou Edge nao encontrado para QA visual.");
  return executable;
}

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://localhost:3100";
const outputDir = path.resolve(".tmp/admin-qa");
fs.mkdirSync(outputDir, { recursive: true });

const admin = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
);
const email = `qa-${randomUUID()}@example.invalid`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
let userId;
let browser;
const consoleErrors = [];
const pageErrors = [];
const notFoundResponses = [];

function observe(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(true);
  });
  page.on("pageerror", () => pageErrors.push(true));
  page.on("response", (response) => {
    if (response.status() === 404) notFoundResponses.push(true);
  });
}

try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Visual" },
  });
  if (error || !data.user) throw new Error("Falha ao criar usuario visual temporario.");
  userId = data.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ active: true, name: "QA Visual", role: "admin" })
    .eq("id", userId);
  if (profileError) throw new Error("Falha ao ativar usuario visual temporario.");

  browser = await chromium.launch({
    executablePath: findBrowser(),
    headless: true,
  });

  const desktop = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "no-preference",
    viewport: { height: 1000, width: 1440 },
  });
  const desktopPage = await desktop.newPage();
  observe(desktopPage);
  await desktopPage.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await desktopPage.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(outputDir, "login-desktop.png"),
  });

  await desktopPage.locator('input[name="email"]').fill(email);
  await desktopPage.locator('input[name="password"]').fill(password);
  await Promise.all([
    desktopPage.waitForURL(`${baseUrl}/admin`, { timeout: 20_000 }),
    desktopPage.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);
  await desktopPage.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(outputDir, "dashboard-desktop.png"),
  });

  const sessionCookies = (await desktop.cookies()).filter((cookie) =>
    cookie.name.includes("auth-token"),
  );
  await desktop.addCookies(
    sessionCookies.map((cookie) => ({
      ...cookie,
      expires: Math.floor(Date.now() / 1000) - 60,
    })),
  );
  await desktopPage.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  const expiredSessionProtected = desktopPage.url().startsWith(`${baseUrl}/admin/login`);

  await desktopPage.locator('input[name="email"]').fill(email);
  await desktopPage.locator('input[name="password"]').fill(password);
  await Promise.all([
    desktopPage.waitForURL(`${baseUrl}/admin`, { timeout: 20_000 }),
    desktopPage.getByRole("button", { name: "Entrar no ADM" }).click(),
  ]);

  const mobile = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { height: 844, width: 390 },
  });
  const mobilePage = await mobile.newPage();
  observe(mobilePage);
  await mobilePage.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(outputDir, "login-mobile.png"),
  });
  const mobileOverflow = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  await desktopPage.getByRole("button", { name: "Sair" }).click();
  await desktopPage.waitForURL(`${baseUrl}/admin/login`, { timeout: 20_000 });
  await desktopPage.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  const logoutProtected = desktopPage.url().startsWith(`${baseUrl}/admin/login`);

  await mobile.close();
  await desktop.close();

  const report = {
    console_errors: consoleErrors.length,
    dashboard_screenshot: true,
    expired_session_protects_admin: expiredSessionProtected,
    login_desktop_screenshot: true,
    login_mobile_screenshot: true,
    logout_protects_admin: logoutProtected,
    mobile_overflow: mobileOverflow,
    not_found_responses: notFoundResponses.length,
    temporary_admin_removed: true,
  };
  fs.writeFileSync(path.join(outputDir, "ui-results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (
    consoleErrors.length ||
    pageErrors.length ||
    notFoundResponses.length ||
    mobileOverflow ||
    !logoutProtected
    || !expiredSessionProtected
  ) {
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("audit_logs").delete().eq("entity_id", userId);
  }
}
