import { NextResponse, type NextRequest } from "next/server";
import { getCatalogPage } from "@/lib/catalog/data";

import { parseCatalogQuery } from "@/lib/catalog/query";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = parseCatalogQuery({
    busca: searchParams.get("q") ?? searchParams.get("search") ?? searchParams.get("busca") ?? undefined,
    marca: searchParams.get("brand") ?? searchParams.get("marca") ?? undefined,
    categoria: searchParams.get("category") ?? searchParams.get("categoria") ?? undefined,
    disponibilidade: searchParams.get("availability") ?? searchParams.get("disponibilidade") ?? undefined,
    colecao: searchParams.get("collection") ?? searchParams.get("colecao") ?? undefined,
    estilo: searchParams.get("style") ?? searchParams.get("estilo") ?? undefined,
    pagina: searchParams.get("page") ?? searchParams.get("pagina") ?? "1",
    produto: searchParams.get("produto") ?? undefined,
  });

  try {
    const result = await getCatalogPage(query);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível buscar produtos no momento." },
      { status: 500 }
    );
  }
}
