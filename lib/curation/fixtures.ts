import type { CurationCategory, CurationSelection, CurationStyle, CuratedProduct } from "./types";

const styles: CurationStyle[] = [
  { description: "Linhas equilibradas e presença discreta.", displayOrder: 0, id: "10000000-0000-4000-8000-000000000001", label: "Clássica", productCount: 8, slug: "classica" },
  { description: "Volumes e proporções de maior impacto visual.", displayOrder: 1, id: "10000000-0000-4000-8000-000000000002", label: "Marcante", productCount: 6, slug: "marcante" },
  { description: "Forma atual com acabamento preciso.", displayOrder: 2, id: "10000000-0000-4000-8000-000000000003", label: "Contemporânea", productCount: 7, slug: "contemporanea" },
  { description: "Desenho funcional e presença dinâmica.", displayOrder: 3, id: "10000000-0000-4000-8000-000000000004", label: "Esportiva", productCount: 4, slug: "esportiva" },
];

const categories: CurationCategory[] = [
  { displayOrder: 0, id: "20000000-0000-4000-8000-000000000001", label: "Grupo QA A", productCount: 4, slug: "grupo-qa-a" },
  { displayOrder: 1, id: "20000000-0000-4000-8000-000000000002", label: "Grupo QA B", productCount: 4, slug: "grupo-qa-b" },
];

const images = [
  "/media/photos/1%20(1).jpg",
  "/media/photos/1%20(2).jpg",
  "/media/photos/1%20(3).jpg",
  "/media/photos/3%20(1).jpg",
  "/media/photos/3%20(2).jpg",
  "/media/photos/4%20(1).jpg",
  "/media/photos/4%20(2).jpg",
  "/media/photos/6%20(1).jpg",
] as const;

const memberships: Record<string, number[]> = {
  classica: [0, 1, 2, 3, 4, 5, 6, 7],
  marcante: [1, 2, 4, 5, 6, 7],
  contemporanea: [0, 1, 2, 3, 5, 6, 7],
  esportiva: [0, 3, 4, 6],
};

function productsFor(styleSlug: string, categorySlug: string | null): CuratedProduct[] {
  const style = styles.find((item) => item.slug === styleSlug) ?? styles[0];
  return (memberships[style.slug] ?? memberships.classica)
    .filter((index) => !categorySlug || (categorySlug === "grupo-qa-a" ? index < 4 : index >= 4))
    .map((index, order) => ({
      availability: "consultation",
      brand: null,
      category: {
        id: index < 4 ? categories[0].id : categories[1].id,
        name: index < 4 ? categories[0].label : categories[1].label,
        slug: index < 4 ? categories[0].slug : categories[1].slug,
      },
      color: null,
      cover: {
        altText: `Fixture visual ${index + 1} para validar a curadoria`,
        blurDataUrl: null,
        height: 1919,
        id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        isCover: true,
        objectPosition: "50% 42%",
        updatedAt: "2026-07-19T00:00:00.000Z",
        width: 1440,
      },
      displayOrder: index,
      featured: false,
      fixture: true,
      fixtureImageSrc: images[index],
      id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      model: null,
      name: `Item QA ${String(index + 1).padStart(2, "0")}`,
      price: null,
      priceVisibility: "hidden",
      shortDescription: null,
      sku: `QA-${String(index + 1).padStart(2, "0")}`,
      slug: `item-qa-${String(index + 1).padStart(2, "0")}`,
      styleDisplayOrder: order,
      styleFeatured: order === 0,
      styleId: style.id,
      styleLabel: style.label,
      styleSlug: style.slug,
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));
}

export function fixtureCurationSelection(styleSlug = "classica", categorySlug: string | null = null): CurationSelection {
  const validStyle = styles.some((style) => style.slug === styleSlug) ? styleSlug : "classica";
  const validCategory = categories.some((category) => category.slug === categorySlug) ? categorySlug : null;
  const products = productsFor(validStyle, validCategory);
  return {
    categories,
    categorySlug: validCategory,
    products,
    styleSlug: validStyle,
    styles,
    total: products.length,
  };
}

export function fixtureCurationScenario(scenario: string | undefined) {
  const selection = fixtureCurationSelection();
  const size = scenario === "0" ? 0
    : scenario === "1" ? 1
      : scenario === "3" ? 3
        : scenario === "7" ? 7
          : 8;
  return {
    ...selection,
    products: selection.products.slice(0, size),
    total: scenario === "mais-8" ? 12 : size,
  };
}

export function fixtureProduct(slug: string) {
  return productsFor("classica", null).find((product) => product.slug === slug) ?? null;
}
