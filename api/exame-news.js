const EXAME_URL = "https://exame.com/noticias-sobre/oculos/";
const MAX_ITEMS = 10;
const BLOCKED_TERMS = ["galeria"];
const FALLBACK_IMAGE = "galeria/8%20(3).jpg";

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

function attr(tag = "", name = "") {
  const pattern = new RegExp(name + "=[\\\"']([^\\\"']+)[\\\"']", "i");
  return decodeEntities(tag.match(pattern)?.[1] || "");
}

function chooseSrcset(srcset = "") {
  const candidates = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .filter((url) => !url.startsWith("data:"));

  if (candidates.length === 0) return "";
  return candidates[Math.min(1, candidates.length - 1)];
}

function imageFromBlock(block = "") {
  const imgTags = [...block.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const noscriptImg = block.match(/<noscript>[\s\S]*?(<img\b[^>]*>)[\s\S]*?<\/noscript>/i)?.[1];
  const ordered = noscriptImg ? [noscriptImg, ...imgTags] : imgTags;

  for (const tag of ordered) {
    const srcset = attr(tag, "srcset");
    const src = attr(tag, "src");
    const chosen = chooseSrcset(srcset) || src;
    if (chosen && !chosen.startsWith("data:")) {
      return {
        image: absoluteUrl(chosen),
        imageAlt: clean(attr(tag, "alt"))
      };
    }
  }

  return { image: FALLBACK_IMAGE, imageAlt: "Imagem editorial da Otica Vision" };
}

function parseJsonLd(html = "") {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  for (const [, raw] of scripts) {
    try {
      const data = JSON.parse(decodeEntities(raw.trim()));
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const list = node?.itemListElement || node?.['@graph'] || [];
        for (const entry of Array.isArray(list) ? list : []) {
          const item = entry.item || entry;
          const title = clean(item.headline || item.name || "");
          const url = absoluteUrl(item.url || "");
          const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
          const image = typeof imageValue === "string" ? absoluteUrl(imageValue) : absoluteUrl(imageValue?.url || "");
          if (title && url && image) {
            items.push({ title, url, image, imageAlt: title, category: "Exame", date: clean(item.datePublished || "Exame") });
          }
          if (items.length >= MAX_ITEMS) return items;
        }
      }
    } catch {
      continue;
    }
  }

  return items;
}

function parseCardBlocks(html = "") {
  const parts = html.split(/<div class=["']pb-4["']>/i).slice(1);
  const items = [];

  for (const part of parts) {
    const block = part.split(/<div class=["']pb-4["']>|<nav|<footer|<aside/i)[0];
    const anchor = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
    if (!anchor) continue;

    const title = clean(anchor[2]);
    const lowered = title.toLowerCase();
    if (!title || BLOCKED_TERMS.some((term) => lowered.includes(term))) continue;
    if (items.some((item) => item.title === title)) continue;

    const category = clean(block.match(/<span[^>]*label-small[^>]*>([\s\S]*?)<\/span>/i)?.[1] || "Exame");
    const date = clean(block.match(/<p[^>]*title-small[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "Exame");
    const imageData = imageFromBlock(block);

    items.push({
      title,
      category: category || "Exame",
      date: date || "Exame",
      url: absoluteUrl(anchor[1]),
      image: imageData.image,
      imageAlt: imageData.imageAlt || title
    });

    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

function parseItems(html) {
  const structured = parseJsonLd(html).filter((item) => item.image);
  if (structured.length >= 4) return structured.slice(0, MAX_ITEMS);
  return parseCardBlocks(html);
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
