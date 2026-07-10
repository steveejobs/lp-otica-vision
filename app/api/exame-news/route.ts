import { getExameNews } from "@/lib/exame-news";

export const revalidate = 28_800;

export async function GET() {
  const items = await getExameNews(3);

  return Response.json(
    { source: "Exame", items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=28800, stale-while-revalidate=3600",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
