import type { CatalogProductCard } from "@/lib/catalog/types";

export type CurationStyle = {
  description: string;
  displayOrder: number;
  id: string;
  label: string;
  productCount: number;
  slug: string;
};

export type CurationCategory = {
  displayOrder: number;
  id: string;
  label: string;
  productCount: number;
  slug: string;
};

export type CuratedProduct = CatalogProductCard & {
  fixture?: boolean;
  fixtureImageSrc?: string;
  styleDisplayOrder: number;
  styleFeatured: boolean;
  styleId: string;
  styleLabel: string;
  styleSlug: string;
};

export type CurationSelection = {
  categories: CurationCategory[];
  categorySlug: string | null;
  products: CuratedProduct[];
  styleSlug: string;
  styles: CurationStyle[];
  total: number;
};

