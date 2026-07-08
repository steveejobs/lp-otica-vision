import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9339;
const outDir = ".tmp/screenshots";
const url = "file:///C:/Users/jarde/Downloads/oticas%20vision/index.html";
const sizes = [
  [360, 800],
  [375, 812],
  [390, 844],
  [430, 932]
];

mkdirSync(outDir, { recursive: true });

const child = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  "--user-data-dir=C:\\tmp\\vision-cdp-profile",
  "about:blank"
], { stdio: "ignore" });

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const pages = await getJson("/json/list");
      if (pages[0]?.webSocketDebuggerUrl) return pages[0].webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome CDP did not start");
}

const wsUrl = await waitForChrome();
const ws = new WebSocket(wsUrl);
const pending = new Map();
let id = 0;

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(data.error.message));
    else resolve(data.result);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  id += 1;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function waitForLoad() {
  await send("Runtime.evaluate", {
    expression: "document.readyState === 'complete'",
    returnByValue: true
  });
  for (let i = 0; i < 50; i += 1) {
    const result = await send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true
    });
    if (result.result.value === "complete") return;
    await delay(100);
  }
}

await send("Page.enable");
const metrics = [];

for (const [width, height] of sizes) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Page.navigate", { url });
  await waitForLoad();
  await delay(300);

  const layout = await send("Runtime.evaluate", {
    expression: `(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      h1: document.querySelector('h1')?.getBoundingClientRect().toJSON(),
      primary: document.querySelector('.button-primary')?.getBoundingClientRect().toJSON(),
      header: document.querySelector('.header-shell')?.getBoundingClientRect().toJSON()
    }))()`,
    returnByValue: true
  });
  metrics.push({ size: `${width}x${height}`, ...layout.result.value });

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true
  });
  writeFileSync(`${outDir}/home-${width}x${height}.png`, Buffer.from(screenshot.data, "base64"));
}

writeFileSync(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2));
ws.close();
child.kill();
