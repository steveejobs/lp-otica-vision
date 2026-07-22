import type { Database } from "@/types/supabase";

export type CatalogAvailability = Exclude<Database["public"]["Enums"]["availability_status"], "consultation">;
export type CatalogPriceVisibility = Database["public"]["Enums"]["price_visibility"];

export type CatalogTaxonomy = {
  id: string;
  name: string;
  slug: string;
};

export type CatalogImage = {
  altText: string;
  blurDataUrl: string | null;
  height: number;
  id: string;
  isCover: boolean;
  objectPosition: string;
  updatedAt: string;
  width: number;
};

export type EditorialBadgeType = "featured" | "new" | null;

export type CatalogProductCard = {
  availability: CatalogAvailability;
  brand: CatalogTaxonomy | null;
  category: CatalogTaxonomy | null;
  color: string | null;
  cover: CatalogImage;
  displayOrder: number;
  featured: boolean;
  editorialBadge?: EditorialBadgeType;
  id: string;
  model: string | null;
  name: string;
  price: number | null;
  priceVisibility: CatalogPriceVisibility;
  shortDescription: string | null;
  sku: string;
  slug: string;
  updatedAt: string;
};

export type CatalogProduct = Omit<CatalogProductCard, "cover"> & {
  cover: CatalogImage;
  images: CatalogImage[];
};

export type CatalogFilterOption = {
  count: number;
  key: string;
  name: string;
  order: number;
};

export type CatalogFilterOptions = {
  availability: CatalogFilterOption[];
  brands: CatalogFilterOption[];
  categories: CatalogFilterOption[];
  collections: CatalogFilterOption[];
};

export type CatalogQuery = {
  availability: CatalogAvailability | null;
  brand: string | null;
  category: string | null;
  collection: string | null;
  page: number;
  search: string;
  style: string | null;
  product: string | null;
};

export type CatalogPageResult = {
  page: number;
  pageSize: number;
  products: CatalogProductCard[];
  total: number;
  totalPages: number;
};
