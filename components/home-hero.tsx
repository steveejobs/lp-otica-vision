import { visionTakeoverMedia } from "@/lib/assets";
import { galleryImageUrl } from "@/lib/gallery/display-media";
import { getHomeHeroMedia } from "@/lib/gallery/hero";

import { VisionEditorialTakeover } from "./vision-editorial-takeover";

type HeroDisplayMedia = {
  alt: string;
  desktopScale: number;
  desktopObjectPosition: string;
  fallbackSrc?: string;
  height: number;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  mobileSrc?: string;
  src: string;
  width: number;
};

function localHeroMedia(): HeroDisplayMedia[] {
  return visionTakeoverMedia.map((item, index) => ({
    alt: item.alt,
    desktopScale: 1,
    desktopObjectPosition: item.objectPosition,
    height: item.height,
    id: `local-hero-${index}`,
    mobileObjectPosition: item.objectPosition,
    mobileScale: 1,
    src: item.src,
    width: item.width,
  }));
}

function publishedHeroMedia(items: Awaited<ReturnType<typeof getHomeHeroMedia>>): HeroDisplayMedia[] {
  return items.map((item, index) => ({
    alt: item.altText,
    desktopScale: item.desktopScale,
    desktopObjectPosition: item.desktopObjectPosition,
    fallbackSrc: visionTakeoverMedia[index % visionTakeoverMedia.length]?.src,
    height: item.height,
    id: item.id,
    mobileObjectPosition: item.mobileObjectPosition,
    mobileScale: item.mobileScale,
    mobileSrc: galleryImageUrl(item, "mobile"),
    src: galleryImageUrl(item, "desktop"),
    width: item.width,
  }));
}

/** The published hero snapshot is the source of truth; local media preserves a resilient public fallback. */
export async function HomeHero() {
  const published = await getHomeHeroMedia();
  const media = published.length ? publishedHeroMedia(published) : localHeroMedia();

  return <VisionEditorialTakeover media={media} />;
}
