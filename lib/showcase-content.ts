import {
  brandLogos,
  editorialGalleryImages,
  type BrandAsset,
  type ImageAsset,
} from "./assets";
import { LINKS } from "./links";

export type ShowcaseAction = {
  label: string;
  ariaLabel: string;
  href: string;
  external: boolean;
};

export type FeaturedCollectionContent = {
  sectionId: string;
  eyebrow: string;
  title: string;
  description: string;
  galleryLabel: string;
  action: ShowcaseAction;
  images: readonly ImageAsset[];
};

export type FeaturedBrandsContent = {
  sectionId: string;
  eyebrow: string;
  title: string;
  description: string;
  action: ShowcaseAction;
  initialBrandName: string;
  brands: readonly BrandAsset[];
};

/**
 * Fonte central da seção editorial. Uma futura integração de CMS deve adaptar
 * o conteúdo publicado para este contrato, mantendo o componente desacoplado
 * do provedor de administração escolhido.
 */
export const featuredCollection = {
  sectionId: "colecao-em-destaque",
  eyebrow: "Coleção em destaque",
  title: "A escolha ganha contorno.",
  description: "Linhas, proporções e acabamentos reunidos pela Vision.",
  galleryLabel: "Coleção de armações em destaque da Ótica Vision",
  action: {
    label: "Ver Instagram",
    ariaLabel: "Ver Instagram",
    href: LINKS.instagram,
    external: true,
  },
  images: editorialGalleryImages,
} as const satisfies FeaturedCollectionContent;

export const featuredBrands = {
  sectionId: "marcas-em-destaque",
  eyebrow: "Marcas em destaque",
  title: "Marcas premium. Seleção Vision.",
  description: "Consulte os modelos pelo WhatsApp.",
  action: {
    label: "Falar no WhatsApp",
    ariaLabel: "Falar no WhatsApp",
    href: LINKS.whatsapp,
    external: true,
  },
  initialBrandName: "Ray-Ban",
  brands: brandLogos,
} as const satisfies FeaturedBrandsContent;
