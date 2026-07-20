import { NextResponse } from "next/server";

import { getCurationSelection } from "@/lib/curation/data";
import { getCurationProductWhatsappUrls } from "@/lib/curation/product-whatsapp";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const styleSlug = params.get("estilo")?.trim().toLowerCase() ?? "";
  const categoryValue = params.get("categoria")?.trim().toLowerCase() ?? "";
  if (!slugPattern.test(styleSlug) || (categoryValue && !slugPattern.test(categoryValue))) {
    return NextResponse.json({ selection: null }, { status: 400 });
  }
  const selection = await getCurationSelection({
    categorySlug: categoryValue || null,
    limit: 8,
    styleSlug,
  });
  const productWhatsappUrls = selection
    ? await getCurationProductWhatsappUrls(selection.products, new URL(request.url))
    : {};
  return NextResponse.json(
    { productWhatsappUrls, selection },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
