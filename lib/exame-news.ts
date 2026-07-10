import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import { LINKS } from "@/lib/links";

export const EXAME_REVALIDATE_SECONDS = 28_800;

export type ExameArticle = {
  title: string;
  url: string;
  image: string | null;
  category: string;
  meta: string;
  source: "Exame";
};

const REQUEST_HEADERS = {
  accept: "text/html,application/xhtml+xml",
  "accept-language": "pt-BR,pt;q=0.9",
  "user-agent":
    "Mozilla/5.0 (compatible; OticaVision/2.0; +https://www.instagram.com/oticavisionaraguaina/)",
};

const cleanText = (value: string | undefined) =>
  (value ?? "")
    .replace(/Â·/g, "·")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeArticleUrl = (value: string | undefined) => {
  if (!value) return null;

  try {
    const url = new URL(value, LINKS.exame);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "exame.com" && url.hostname !== "www.exame.com") return null;
    return url.href;
  } catch {
    return null;
  }
};

const normalizeImageUrl = (value: string | undefined, baseUrl: string) => {
  const candidate = cleanText(value);
  if (!candidate || candidate.startsWith("data:") || candidate.startsWith("blob:")) return null;

  try {
    const url = new URL(candidate, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.protocol === "http:") url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
};

const imageFromSrcset = (value: string | undefined, baseUrl: string) => {
  if (!value) return null;

  const candidates = value
    .split(",")
    .map((entry) => {
      const [url, descriptor = "0"] = entry.trim().split(/\s+/);
      const score = Number.parseFloat(descriptor) || 0;
      return { url: normalizeImageUrl(url, baseUrl), score };
    })
    .filter((entry): entry is { url: string; score: number } => Boolean(entry.url))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.url ?? null;
};

const nestedNoscriptImages = ($: CheerioAPI, scope: Cheerio<AnyNode>) => {
  const images: Cheerio<AnyNode>[] = [];

  scope.find("noscript").each((_, element) => {
    const markup = $(element).text() || $(element).html() || "";
    if (!markup) return;
    const nested = load(markup);
    nested("img").each((__, image) => {
      images.push(nested(image));
    });
  });

  return images;
};

const extractImage = ($: CheerioAPI, scope: Cheerio<AnyNode>, baseUrl: string) => {
  const images = [
    ...scope.find("img").toArray().map((element) => $(element)),
    ...nestedNoscriptImages($, scope),
  ];

  for (const image of images) {
    const src = normalizeImageUrl(image.attr("src"), baseUrl);
    if (src) return src;
  }

  for (const image of images) {
    const srcset = imageFromSrcset(image.attr("srcset"), baseUrl);
    if (srcset) return srcset;
  }

  for (const source of scope.find("source").toArray()) {
    const srcset = imageFromSrcset($(source).attr("srcset"), baseUrl);
    if (srcset) return srcset;
  }

  for (const image of images) {
    const dataSrc = normalizeImageUrl(image.attr("data-src"), baseUrl);
    if (dataSrc) return dataSrc;
  }

  for (const image of images) {
    const lazySrc = normalizeImageUrl(image.attr("data-lazy-src"), baseUrl);
    if (lazySrc) return lazySrc;
  }

  return null;
};

const findCard = ($: CheerioAPI, heading: Cheerio<AnyNode>) => {
  let candidate = heading.parent();

  for (let depth = 0; depth < 5 && candidate.length; depth += 1) {
    if (candidate.find("img, noscript").length && candidate.find("p").length) {
      return candidate;
    }
    candidate = candidate.parent();
  }

  return heading.parent().parent();
};

export function parseExameTopic(html: string, limit = 3): ExameArticle[] {
  const $ = load(html);
  const articles: ExameArticle[] = [];
  const seen = new Set<string>();

  $("h3 a[href], h2 a[href]").each((_, anchor) => {
    if (articles.length >= limit) return false;

    const link = $(anchor);
    const title = cleanText(link.text());
    const url = normalizeArticleUrl(link.attr("href"));
    if (!url || title.length < 20 || seen.has(url)) return;

    const heading = link.closest("h2, h3");
    const card = findCard($, heading);
    const category =
      card
        .find("span")
        .toArray()
        .map((element) => cleanText($(element).text()))
        .find((text) => text.length >= 2 && text.length <= 40 && !/salvar/i.test(text)) ?? "Óculos";
    const meta =
      card
        .find("time, p")
        .toArray()
        .map((element) => cleanText($(element).text()))
        .find((text) => /leitura|há\s|publicado|atualizado/i.test(text)) ?? "";

    seen.add(url);
    articles.push({
      title,
      url,
      image: extractImage($, card, url),
      category,
      meta,
      source: "Exame",
    });
  });

  return articles;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    next: { revalidate: EXAME_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Exame respondeu com status ${response.status}.`);
  }

  return response.text();
}

async function fetchArticleMetaImage(url: string) {
  try {
    const html = await fetchHtml(url);
    const $ = load(html);
    return (
      normalizeImageUrl($("meta[property='og:image']").attr("content"), url) ??
      normalizeImageUrl($("meta[name='twitter:image']").attr("content"), url) ??
      normalizeImageUrl($("meta[property='twitter:image']").attr("content"), url)
    );
  } catch {
    return null;
  }
}

export async function getExameNews(limit = 3): Promise<ExameArticle[]> {
  try {
    const html = await fetchHtml(LINKS.exame);
    const articles = parseExameTopic(html, limit);

    return Promise.all(
      articles.map(async (article) =>
        article.image
          ? article
          : { ...article, image: await fetchArticleMetaImage(article.url) },
      ),
    );
  } catch {
    return [];
  }
}
