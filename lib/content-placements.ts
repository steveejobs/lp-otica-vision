export type PlacementRoute = "/" | "/instagram";
export type PlacementSource = "catalog" | "collection" | "gallery" | "static";
export type PlacementStatus = "implemented" | "unavailable";
export type PlacementDevice = "both" | "desktop" | "mobile";

export const COLLECTION_HOME_VARIANT_VALUES = [
  "editorial-protagonist",
  "split-diptych",
  "product-rail",
  "cinematic-cover",
] as const;

export type CollectionHomeVariant = (typeof COLLECTION_HOME_VARIANT_VALUES)[number];

export const COLLECTION_HOME_VARIANT_LABELS: Record<CollectionHomeVariant, string> = {
  "cinematic-cover": "Capa cinematográfica",
  "editorial-protagonist": "Editorial protagonista",
  "product-rail": "Rail de produtos",
  "split-diptych": "Díptico",
};

export type PublicPlacement = {
  component: string;
  description: string;
  device: PlacementDevice;
  galleryMedia: boolean;
  href: string;
  key: string;
  label: string;
  maxItems: number | null;
  minItems: number;
  placementKey: string;
  preview: {
    desktopAspectRatio: string;
    mobileAspectRatio: string;
    surroundingItems: boolean;
  };
  route: PlacementRoute;
  routeKey: string;
  sectionId: string;
  source: PlacementSource;
  status: PlacementStatus;
  variants: readonly string[];
};

/**
 * Registro único das posições públicas. O ADM deriva as opções daqui e cada
 * componente público consulta esta mesma chave antes de aceitar mídia remota.
 */
export const PUBLIC_PLACEMENTS = [
  {
    component: "HomeHero",
    description: "Primeira seção da página inicial, depois do cabeçalho e antes dos vídeos.",
    device: "both",
    galleryMedia: true,
    href: "/#hero",
    key: "home.hero",
    label: "Home › Hero principal",
    maxItems: 3,
    minItems: 1,
    placementKey: "hero",
    preview: { desktopAspectRatio: "1440 / 900", mobileAspectRatio: "390 / 844", surroundingItems: false },
    route: "/",
    routeKey: "home",
    sectionId: "hero",
    source: "gallery",
    status: "implemented",
    variants: ["editorial-stage"],
  },
  {
    component: "HomeFeaturedCollection",
    description: "A coleção em destaque existente, depois dos vídeos e antes das marcas.",
    device: "both",
    galleryMedia: true,
    href: "/#colecao-em-destaque",
    key: "home.featured_collection",
    label: "Home › Coleção em destaque",
    maxItems: 8,
    minItems: 0,
    placementKey: "featured_collection",
    preview: { desktopAspectRatio: "1440 / 900", mobileAspectRatio: "390 / 844", surroundingItems: true },
    route: "/",
    routeKey: "home",
    sectionId: "colecao-em-destaque",
    source: "collection",
    status: "implemented",
    variants: COLLECTION_HOME_VARIANT_VALUES,
  },
  {
    component: "CatalogPreview",
    description: "Vitrine pública derivada apenas de produtos publicados; não aceita uma galeria própria.",
    device: "both",
    galleryMedia: false,
    href: "/#preview-catalogo",
    key: "home.catalog_preview",
    label: "Home › Preview do catálogo",
    maxItems: 6,
    minItems: 0,
    placementKey: "catalog_preview",
    preview: { desktopAspectRatio: "1440 / 900", mobileAspectRatio: "390 / 844", surroundingItems: true },
    route: "/",
    routeKey: "home",
    sectionId: "preview-catalogo",
    source: "catalog",
    status: "implemented",
    variants: ["protagonist", "diptych", "editorial-composition", "rail"],
  },
  {
    component: "LabSection",
    description: "Capítulo LAB. DIGITAL, depois da vitrine e antes das notícias.",
    device: "both",
    galleryMedia: true,
    href: "/#lab-digital",
    key: "home.lab_digital",
    label: "Home › LAB. DIGITAL",
    maxItems: 2,
    minItems: 2,
    placementKey: "lab_digital",
    preview: { desktopAspectRatio: "4 / 5", mobileAspectRatio: "4 / 5", surroundingItems: true },
    route: "/",
    routeKey: "home",
    sectionId: "lab-digital",
    source: "gallery",
    status: "implemented",
    variants: ["diptych"],
  },
  {
    component: "VideoComposition",
    description: "Vídeos editoriais fixos da página Instagram. Esta posição ainda não possui um editor de vídeo no ADM.",
    device: "both",
    galleryMedia: false,
    href: "/instagram#hero-instagram",
    key: "instagram.hero",
    label: "Instagram › Hero em movimento",
    maxItems: 0,
    minItems: 0,
    placementKey: "hero",
    preview: { desktopAspectRatio: "9 / 16", mobileAspectRatio: "9 / 16", surroundingItems: true },
    route: "/instagram",
    routeKey: "instagram",
    sectionId: "hero-instagram",
    source: "static",
    status: "unavailable",
    variants: [],
  },
  {
    component: "InstagramImageRail",
    description: "Seleção editorial de imagens da rota Instagram, depois do vídeo completo e antes das marcas.",
    device: "both",
    galleryMedia: true,
    href: "/instagram#selecao-editorial",
    key: "instagram.editorial_selection",
    label: "Instagram › Seleção editorial",
    maxItems: 6,
    minItems: 1,
    placementKey: "editorial_selection",
    preview: { desktopAspectRatio: "3 / 4", mobileAspectRatio: "3 / 4", surroundingItems: true },
    route: "/instagram",
    routeKey: "instagram",
    sectionId: "selecao-editorial",
    source: "gallery",
    status: "implemented",
    variants: ["editorial-rail"],
  },
] as const satisfies readonly PublicPlacement[];

export type PublicPlacementKey = (typeof PUBLIC_PLACEMENTS)[number]["key"];

export function getPublicPlacement(routeKey: string, placementKey: string) {
  return PUBLIC_PLACEMENTS.find((placement) =>
    placement.routeKey === routeKey && placement.placementKey === placementKey,
  ) ?? null;
}

export function getPublicPlacementByKey(key: string) {
  return PUBLIC_PLACEMENTS.find((placement) => placement.key === key) ?? null;
}

export function getGalleryPlacements() {
  return PUBLIC_PLACEMENTS.filter(
    (placement) => placement.galleryMedia && placement.status === "implemented",
  );
}

export function isPublishedGalleryPlacement(routeKey: string, placementKey: string) {
  const placement = getPublicPlacement(routeKey, placementKey);
  return placement?.status === "implemented" && placement.galleryMedia;
}

export function getCollectionPlacement(placementKey: string) {
  return PUBLIC_PLACEMENTS.find(
    (placement) => placement.source === "collection" && placement.placementKey === placementKey && placement.status === "implemented",
  ) ?? null;
}
