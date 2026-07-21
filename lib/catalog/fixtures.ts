import type { CatalogFilterOptions, CatalogProductCard } from "./types";

export function generateMockProducts(count: number, highlightedCount = 0): CatalogProductCard[] {
  return Array.from({ length: count }).map((_, i) => ({
    availability: "available",
    brand: { id: "b1", name: "Vision", slug: "vision" },
    category: { id: "c1", name: "Óculos de Grau", slug: "grau" },
    color: "Tartaruga",
    cover: {
      altText: `Óculos ${i + 1}`,
      blurDataUrl: null,
      height: 600,
      id: `img-${i}`,
      isCover: true,
      objectPosition: "center",
      updatedAt: new Date().toISOString(),
      width: 800,
    },
    displayOrder: i,
    featured: i < highlightedCount,
    id: `prod-${i}`,
    model: `Model ${i + 1}`,
    name: `Óculos Vision ${i + 1}`,
    price: 399 + (i * 10),
    priceVisibility: "visible",
    shortDescription: "Óculos de acetato premium.",
    sku: `VSN-${String(i).padStart(4, "0")}`,
    slug: `oculos-vision-${i}`,
    updatedAt: new Date().toISOString(),
  }));
}

export function generateMockFilterOptions(): CatalogFilterOptions {
  return {
    availability: [
      { count: 100, key: "available", name: "Disponível", order: 1 },
    ],
    brands: [
      { count: 100, key: "vision", name: "Vision", order: 1 },
    ],
    categories: [
      { count: 100, key: "grau", name: "Óculos de Grau", order: 1 },
    ],
    collections: [],
  };
}
