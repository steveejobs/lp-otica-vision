const EXAME_URL = "https://exame.com/noticias-sobre/oculos/";
const MAX_ITEMS = 8;
const COLLECT_LIMIT = 16;
const CACHE_SECONDS = 21600;

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
  return decodeEntities(String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function absoluteUrl(url = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, EXAME_URL).toString();
}

function attr(tag = "", name = "") {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  return decodeEntities(tag.match(pattern)?.[1] || "");
}

function isRemoteImage(url = "") {
  return /^https?:\/\//i.test(url) && !/^data:/i.test(url) && !/\.svg(?:\?|$)/i.test(url);
}

function chooseSrcset(srcset = "") {
  const candidates = srcset
    .split(",")
    .map((part) => {
      const [url, descriptor = ""] = part.trim().split(/\s+/);
      const width = Number(descriptor.replace(/[^\d]/g, "")) || 0;
      return { url: absoluteUrl(url), width };
    })
    .filter((candidate) => isRemoteImage(candidate.url));

  if (candidates.length === 0) return "";
  const ordered = candidates.sort((a, b) => a.width - b.width);
  const middle = ordered.find((candidate) => candidate.width >= 480 && candidate.width <= 900);
  return (middle || ordered[Math.min(1, ordered.length - 1)]).url;
}

function imageValueToUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return absoluteUrl(value);
  if (Array.isArray(value)) return imageValueToUrl(value[0]);
  return absoluteUrl(value.url || value.contentUrl || "");
}

function metaContent(html = "", names = []) {
  const wanted = names.map((name) => name.toLowerCase());
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);

  for (const tag of metas) {
    const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    if (!wanted.includes(key)) continue;

    const content = absoluteUrl(attr(tag, "content"));
    if (isRemoteImage(content)) return content;
  }

  return "";
}

function imageFromBlock(block = "") {
  const noscriptImg = block.match(/<noscript>[\s\S]*?(<img\b[^>]*>)[\s\S]*?<\/noscript>/i)?.[1];
  const imgTags = [...block.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const ordered = noscriptImg ? [noscriptImg, ...imgTags] : imgTags;

  for (const tag of ordered) {
    const chosen =
      chooseSrcset(attr(tag, "srcset")) ||
      chooseSrcset(attr(tag, "data-srcset")) ||
      absoluteUrl(attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "src"));

    if (isRemoteImage(chosen)) {
      return {
        image: chosen,
        imageAlt: clean(attr(tag, "alt"))
      };
    }
  }

  return null;
}

function collectJsonLdNodes(node, bucket = []) {
  if (!node || typeof node !== "object") return bucket;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectJsonLdNodes(entry, bucket));
    return bucket;
  }

  bucket.push(node);
  collectJsonLdNodes(node["@graph"], bucket);
  collectJsonLdNodes(node.itemListElement, bucket);
  collectJsonLdNodes(node.item, bucket);
  return bucket;
}

function itemFromJsonLd(node) {
  const title = clean(node.headline || node.name || "");
  const url = absoluteUrl(node.url || node["@id"] || "");
  const image = imageValueToUrl(node.image || node.thumbnailUrl || node.primaryImageOfPage);
  if (!title || !url) return null;

  return {
    title,
    url,
    image: isRemoteImage(image) ? image : "",
    imageAlt: title,
    category: clean(node.articleSection || node.genre || "Exame"),
    date: clean(node.datePublished || node.dateModified || "")
  };
}

function isAllowedTitle(title = "") {
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return !["galeria", "colecao"].some((term) => normalized.includes(term));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finalize(items) {
  return dedupe(items).filter((item) => isAllowedTitle(item.title)).slice(0, MAX_ITEMS);
}

function parseJsonLd(html = "") {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  for (const [, raw] of scripts) {
    try {
      const parsed = JSON.parse(decodeEntities(raw.trim()));
      for (const node of collectJsonLdNodes(parsed)) {
        const item = itemFromJsonLd(node);
        if (item) items.push(item);
      }
    } catch {
      continue;
    }
  }

  return finalize(items);
}

function parseCardBlocks(html = "") {
  const parts = html.split(/<div class=["']pb-4["']>/i).slice(1);
  const items = [];

  for (const part of parts) {
    const block = part.split(/<div class=["']pb-4["']>|<nav|<footer|<aside/i)[0];
    const anchor = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
    if (!anchor) continue;

    const title = clean(anchor[2]);
    const url = absoluteUrl(anchor[1]);
    if (!title || !url) continue;

    const imageData = imageFromBlock(block);

    items.push({
      title,
      url,
      image: imageData?.image || "",
      imageAlt: imageData?.imageAlt || title,
      category: clean(block.match(/<span[^>]*label-small[^>]*>([\s\S]*?)<\/span>/i)?.[1] || "Exame"),
      date: clean(block.match(/<p[^>]*title-small[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "")
    });

    if (dedupe(items).length >= COLLECT_LIMIT) break;
  }

  return finalize(items);
}

function parseItems(html = "") {
  const structured = parseJsonLd(html);
  if (structured.length >= 4) return structured;
  return parseCardBlocks(html);
}

async function imageFromArticle(url, fetchImpl) {
  try {
    const upstream = await fetchImpl(url, {
      headers: {
        "user-agent": "Mozilla/5.0 OticaVision/1.0"
      }
    });

    if (!upstream.ok) return "";
    const html = await upstream.text();
    return metaContent(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  } catch {
    return "";
  }
}

async function enrichMissingImages(items, fetchImpl) {
  return Promise.all(
    items.map(async (item) => {
      if (item.image) return item;
      const image = await imageFromArticle(item.url, fetchImpl);
      if (!image) return item;
      return { ...item, image, imageAlt: item.imageAlt || item.title };
    })
  );
}

async function fetchExameNews(fetchImpl = fetch) {
  try {
    const upstream = await fetchImpl(EXAME_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 OticaVision/1.0"
      }
    });

    if (!upstream.ok) return [];
    const items = parseItems(await upstream.text());
    return enrichMissingImages(items, fetchImpl);
  } catch {
    return [];
  }
}

export { CACHE_SECONDS, EXAME_URL, MAX_ITEMS, fetchExameNews, parseItems };
