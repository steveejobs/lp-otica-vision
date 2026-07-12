import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";

export const EXAME_TOPIC_URL = "https://exame.com/noticias-sobre/oculos/";
export const EXAME_REVALIDATE_SECONDS = 8 * 60 * 60;
const MAX_NEWS_ITEMS = 3;

export type ExameNewsItem = {
  title: string;
  url: string;
  category: string;
  timeLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  source: "Exame";
};

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
} as const;

const cleanText = (value: string | undefined) =>
  (value ?? "")
    .normalize("NFC")
    .replace(/Â(?=[\s·])/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeUrl = (value: string | undefined, baseUrl: string) => {
  const candidate = cleanText(value);
  if (!candidate || candidate.startsWith("data:")) return undefined;

  try {
    const url = new URL(candidate, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
};

const isExameUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "exame.com" || url.hostname.endsWith(".exame.com"))
    );
  } catch {
    return false;
  }
};

const imageLooksUsable = (value: string | undefined, baseUrl: string) => {
  const normalized = normalizeUrl(value, baseUrl);
  if (!normalized) return undefined;

  const lower = normalized.toLowerCase();
  if (/\b(?:spacer|transparent|blank|placeholder)\b/.test(lower)) return undefined;
  return normalized;
};

const largestSrcsetCandidate = (srcset: string | undefined) => {
  const candidates = cleanText(srcset)
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);

  return candidates.at(-1);
};

const collectImageCandidates = (
  $: cheerio.CheerioAPI,
  container: Cheerio<AnyNode>,
  baseUrl: string,
) => {
  const candidates: string[] = [];
  const add = (value: string | undefined) => {
    const normalized = imageLooksUsable(value, baseUrl);
    if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
  };

  container.find("source, img").each((_, element) => {
    const node = $(element);
    add(largestSrcsetCandidate(node.attr("srcset")));
    add(largestSrcsetCandidate(node.attr("data-srcset")));
    add(node.attr("data-lazy-src"));
    add(node.attr("data-src"));
    add(node.attr("src"));
  });

  container.find("noscript").each((_, element) => {
    const nested = cheerio.load($(element).text());
    nested("source, img").each((__, media) => {
      const node = nested(media);
      add(largestSrcsetCandidate(node.attr("srcset")));
      add(largestSrcsetCandidate(node.attr("data-srcset")));
      add(node.attr("data-lazy-src"));
      add(node.attr("data-src"));
      add(node.attr("src"));
    });
  });

  return candidates;
};

const findCardContainer = ($: cheerio.CheerioAPI, heading: AnyNode) => {
  let current = $(heading).parent();

  for (let depth = 0; depth < 7 && current.length; depth += 1) {
    const hasSingleHeading = current.find("h3").length === 1;
    const hasMediaCandidate = current.find("img, source, noscript").length > 0;

    if (hasSingleHeading && hasMediaCandidate) return current;
    current = current.parent();
  }

  return $(heading).parent();
};

const readCardMetadata = (container: Cheerio<AnyNode>) => {
  const copy = container.clone();
  copy.find("h3, img, source, picture, noscript, script, style").remove();
  const metadata = cleanText(copy.text());
  const timeMatch = metadata.match(/Há\s+.+$/i);
  const timeLabel = timeMatch
    ? cleanText(timeMatch[0]).replace(/\s*•\s*/g, " · ")
    : undefined;
  const category = cleanText(
    timeMatch?.index === undefined ? metadata : metadata.slice(0, timeMatch.index),
  );

  return {
    category: category || "Exame",
    timeLabel,
  };
};

const collectJsonImages = (value: unknown, output: string[]) => {
  if (!value) return;

  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectJsonImages(entry, output));
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const key of ["image", "thumbnailUrl", "contentUrl", "url"]) {
    if (key in record) collectJsonImages(record[key], output);
  }
};

const extractArticleImage = (html: string, articleUrl: string) => {
  const $ = cheerio.load(html);
  const candidates: string[] = [
    $("meta[property='og:image:secure_url']").attr("content") ?? "",
    $("meta[property='og:image']").attr("content") ?? "",
    $("meta[name='twitter:image']").attr("content") ?? "",
    $("meta[name='twitter:image:src']").attr("content") ?? "",
  ];

  $("script[type='application/ld+json']").each((_, script) => {
    try {
      const parsed = JSON.parse($(script).text()) as unknown;
      collectJsonImages(parsed, candidates);
    } catch {
      // JSON-LD de terceiros pode estar malformado; os metadados continuam válidos.
    }
  });

  return candidates
    .map((candidate) => imageLooksUsable(candidate, articleUrl))
    .find(Boolean);
};

export function extractExameNews(
  html: string,
  baseUrl = EXAME_TOPIC_URL,
): ExameNewsItem[] {
  const $ = cheerio.load(html);
  const seenUrls = new Set<string>();
  const seenImages = new Set<string>();
  const items: ExameNewsItem[] = [];

  $("h3").each((_, heading) => {
    if (items.length >= MAX_NEWS_ITEMS) return false;

    const headingNode = $(heading);
    const title = cleanText(headingNode.text());
    const anchor = headingNode.find("a[href]").first().length
      ? headingNode.find("a[href]").first()
      : headingNode.closest("a[href]");
    const url = normalizeUrl(anchor.attr("href"), baseUrl);

    if (!title || !url || seenUrls.has(url) || !isExameUrl(url)) return;

    const container = findCardContainer($, heading);
    const metadata = readCardMetadata(container);
    const imageUrl = collectImageCandidates($, container, baseUrl).find(
      (candidate) => !seenImages.has(candidate),
    );

    seenUrls.add(url);
    if (imageUrl) seenImages.add(imageUrl);
    items.push({
      title,
      url,
      category: metadata.category,
      timeLabel: metadata.timeLabel,
      imageUrl,
      imageAlt: imageUrl ? title : undefined,
      source: "Exame",
    });
  });

  return items;
}

const fetchHtml = async (url: string) => {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    next: { revalidate: EXAME_REVALIDATE_SECONDS },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Exame respondeu com status ${response.status}.`);
  return response.text();
};

export async function getExameNews(): Promise<ExameNewsItem[]> {
  try {
    const topicHtml = await fetchHtml(EXAME_TOPIC_URL);
    const items = extractExameNews(topicHtml);

    await Promise.all(
      items.map(async (item) => {
        if (item.imageUrl) return;

        try {
          const articleHtml = await fetchHtml(item.url);
          const imageUrl = extractArticleImage(articleHtml, item.url);
          if (imageUrl) {
            item.imageUrl = imageUrl;
            item.imageAlt = item.title;
          }
        } catch {
          // O card textual é o fallback correto para uma matéria sem mídia recuperável.
        }
      }),
    );

    return items;
  } catch {
    return [];
  }
}
