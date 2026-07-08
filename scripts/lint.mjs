import { readFileSync } from "node:fs";

const routes = ["index.html", "instagram/index.html"];
const css = readFileSync("styles.css", "utf8");
const missing = [];

const forbiddenVisibleTerms = [
  "viewport",
  "loop",
  "autoplay",
  "muted",
  "preload",
  "performance",
  "animação",
  "componente",
  "galeria alternando",
  "vídeos rodando",
  "mobile-first",
  "bem encaixado",
  "ui/ux pro max",
  "skill",
  "codex",
  "briefing",
  "sem áudio",
  "intersectionobserver",
  "melhor ótica",
  "mais bem avaliada",
  "depoimento",
  "depoimentos",
  "avaliações",
  "revendedor autorizado",
  "coleção completa",
  "marcas exclusivas"
];

for (const route of routes) {
  const html = readFileSync(route, "utf8");
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  for (const term of forbiddenVisibleTerms) {
    if (visibleText.includes(term)) {
      missing.push(`${route}: termo proibido visível: ${term}`);
    }
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) {
    missing.push(`${route}: esperado exatamente 1 h1, encontrado ${h1Count}`);
  }

  if (/<video[\s>]/i.test(html)) {
    missing.push(`${route}: vídeo não deve ser usado nesta rodada`);
  }

  for (const href of [
    "https://api.whatsapp.com/send/?phone=5563992231522",
    "https://maps.app.goo.gl/4WeumQSuU4hg6yuv6"
  ]) {
    if (!html.includes(href)) {
      missing.push(`${route}: link obrigatório ausente: ${href}`);
    }
  }
}

for (const required of [
  "--vision-bg: #b19475",
  "--vision-bg-soft: #f4eee6",
  "--vision-ink: #151312",
  "--vision-muted: #6f6258",
  "--vision-steel: #d9dde1",
  "--vision-steel-dark: #8f969d",
  "--vision-line: rgba(21, 19, 18, 0.12)",
  "--vision-card: rgba(255, 255, 255, 0.72)"
]) {
  if (!css.includes(required)) {
    missing.push(`Token ausente: ${required}`);
  }
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log("lint ok");
