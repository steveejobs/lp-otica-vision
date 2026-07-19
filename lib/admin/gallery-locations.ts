export type GalleryDevice = "both" | "desktop" | "mobile";

export type GalleryLocation = {
  component: string;
  device: GalleryDevice;
  href: string;
  key: string;
  pageLabel: string;
  position: string;
  preview: {
    desktopAspectRatio: string;
    mobileAspectRatio: string;
    surroundingItems: boolean;
  };
  routeKey: string;
  placementKey: string;
  route: "/" | "/instagram";
  sectionId: string;
  sectionLabel: string;
};

export const GALLERY_LOCATIONS = [
  {
    component: "HomeHero",
    device: "both",
    href: "/#hero",
    key: "home.hero",
    routeKey: "home",
    placementKey: "hero",
    pageLabel: "Home",
    position: "No início da página, depois do cabeçalho e antes dos vídeos",
    preview: { desktopAspectRatio: "1440 / 900", mobileAspectRatio: "390 / 844", surroundingItems: false },
    route: "/",
    sectionId: "hero",
    sectionLabel: "Hero",
  },
  {
    component: "EditorialGallery",
    device: "both",
    href: "/#colecao-em-destaque",
    key: "home.featured_collection",
    routeKey: "home",
    placementKey: "featured_collection",
    pageLabel: "Home",
    position: "Depois dos vídeos e antes das marcas em destaque",
    preview: { desktopAspectRatio: "3 / 4", mobileAspectRatio: "3 / 4", surroundingItems: true },
    route: "/",
    sectionId: "colecao-em-destaque",
    sectionLabel: "Coleção em destaque",
  },
  {
    component: "CatalogPreview",
    device: "both",
    href: "/#preview-catalogo",
    key: "home.catalog_preview",
    routeKey: "home",
    placementKey: "catalog_preview",
    pageLabel: "Home",
    position: "Depois das marcas em destaque e antes do LAB. DIGITAL; aparece quando a vitrine está ativa",
    preview: { desktopAspectRatio: "4 / 5", mobileAspectRatio: "4 / 5", surroundingItems: true },
    route: "/",
    sectionId: "preview-catalogo",
    sectionLabel: "Preview do catálogo",
  },
  {
    component: "LabSection",
    device: "both",
    href: "/#lab-digital",
    key: "home.lab_digital",
    routeKey: "home",
    placementKey: "lab_digital",
    pageLabel: "Home",
    position: "Depois do preview do catálogo e antes das notícias",
    preview: { desktopAspectRatio: "4 / 5", mobileAspectRatio: "4 / 5", surroundingItems: true },
    route: "/",
    sectionId: "lab-digital",
    sectionLabel: "LAB. DIGITAL",
  },
  {
    component: "VideoComposition",
    device: "both",
    href: "/instagram#hero-instagram",
    key: "instagram.hero",
    routeKey: "instagram",
    placementKey: "hero",
    pageLabel: "Instagram",
    position: "No início da página, depois da identidade e junto da bio",
    preview: { desktopAspectRatio: "9 / 16", mobileAspectRatio: "9 / 16", surroundingItems: true },
    route: "/instagram",
    sectionId: "hero-instagram",
    sectionLabel: "Hero em movimento",
  },
  {
    component: "InstagramImageRail",
    device: "both",
    href: "/instagram#selecao-editorial",
    key: "instagram.editorial_selection",
    routeKey: "instagram",
    placementKey: "editorial_selection",
    pageLabel: "Instagram",
    position: "Depois do vídeo completo e antes das marcas",
    preview: { desktopAspectRatio: "3 / 4", mobileAspectRatio: "3 / 4", surroundingItems: true },
    route: "/instagram",
    sectionId: "selecao-editorial",
    sectionLabel: "Seleção editorial",
  },
] as const satisfies readonly GalleryLocation[];

export type GalleryLocationKey = (typeof GALLERY_LOCATIONS)[number]["key"];

export function getGalleryLocation(routeKey: string, placementKey?: string) {
  return GALLERY_LOCATIONS.find((location) => placementKey
    ? location.routeKey === routeKey && location.placementKey === placementKey
    : location.key === routeKey) ?? null;
}

export function isGalleryLocationKey(value: string): value is GalleryLocationKey {
  return GALLERY_LOCATIONS.some((location) => location.key === value);
}

export function getGalleryLocationByKey(value: string) {
  return GALLERY_LOCATIONS.find((location) => location.key === value) ?? null;
}

export const galleryDeviceLabels: Record<GalleryDevice, string> = {
  both: "Desktop e mobile",
  desktop: "Somente desktop",
  mobile: "Somente mobile",
};
