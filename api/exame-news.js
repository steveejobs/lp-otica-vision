const EXAME_URL = "https://exame.com/noticias-sobre/oculos/";
const MAX_ITEMS = 4;
const BLOCKED_TERMS = ["galeria"];

function decodeEntities(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function clean(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function absoluteUrl(url = "") {
  if (!url) return EXAME_URL;
  if (url.startsWith("http")) return url;
  return new URL(url, EXAME_URL).toString();
}

function parseItems(html) {
  const blocks = html.split(/<h3[^>]*>/i).slice(1);
  const items = [];

  for (const block of blocks) {
    const anchor = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;

    const start = html.indexOf(block);
    const before = html.slice(Math.max(0, start - 500), start);
    const meta = clean(before).split(/\n| {2,}/).map((part) => part.trim()).filter(Boolean);
    const title = clean(anchor[2]);
    const lowered = title.toLowerCase();

    if (!title || BLOCKED_TERMS.some((term) => lowered.includes(term))) continue;
    if (items.some((item) => item.title === title)) continue;

    const category = meta.find((part) => part.length <= 34 && !/continua|image|publicidade/i.test(part)) || "Exame";
    const date = meta.find((part) => /há|min de leitura|\d{1,2}\/\d{1,2}|202\d/i.test(part)) || "Exame";

    items.push({
      title,
      category,
      date,
      url: absoluteUrl(anchor[1])
    });

    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");

  try {
    const upstream = await fetch(EXAME_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 OticaVision/1.0"
      }
    });

    if (!upstream.ok) {
      response.status(200).json({ items: [] });
      return;
    }

    const html = await upstream.text();
    response.status(200).json({ items: parseItems(html) });
  } catch {
    response.status(200).json({ items: [] });
  }
}
