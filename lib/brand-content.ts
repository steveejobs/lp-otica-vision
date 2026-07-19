import { brandLogos, type BrandAsset } from "./assets";
import { LINKS } from "./links";

export type FeaturedBrandsContent = {
  action: { ariaLabel: string; external: boolean; href: string; label: string };
  brands: readonly BrandAsset[];
  description: string;
  eyebrow: string;
  initialBrandName: string;
  sectionId: string;
  title: string;
};

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
