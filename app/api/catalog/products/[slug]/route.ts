import { NextResponse } from "next/server";
import { getPublishedCatalogProduct } from "@/lib/catalog/data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  
  // Validation: simple alphanumeric with dashes
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const product = await getPublishedCatalogProduct(slug);
    
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Retorna apenas dados públicos estritos necessários (o getPublishedCatalogProduct já é público).
    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
