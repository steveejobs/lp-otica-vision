import { CACHE_SECONDS, fetchExameNews } from "../lib/exame-news.js";

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);

  const items = await fetchExameNews();
  response.status(200).json({ items });
}
