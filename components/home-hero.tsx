import { getHomeHeroMedia, type HeroMedia } from "@/lib/gallery/hero";
import { visionTakeoverMedia } from "@/lib/assets";

import { VisionEditorialTakeover } from "./vision-editorial-takeover";

export async function HomeHero() {
  const published = await getHomeHeroMedia();
  const media: HeroMedia[] = published.length
    ? published.map((item, index) => ({
      ...item,
      fallbackSrc: visionTakeoverMedia[index]?.src ?? visionTakeoverMedia[0].src,
    }))
    : visionTakeoverMedia.map<HeroMedia>((item, index) => ({
      altText: item.alt,
      assetVersion: "local-fallback",
      backgroundColor: item.placeholderColor,
      blurDataUrl: null,
      desktopObjectPosition: item.objectPosition,
      desktopScale: 1,
      height: item.height,
      id: `local-hero-${index}`,
      localSrc: item.src,
      mobileObjectPosition: item.objectPosition,
      mobileScale: 1,
      role: index === 0 ? "primary" : "secondary",
      seriesId: item.seriesId,
      width: item.width,
    }));
  return (
    <VisionEditorialTakeover media={media} />
  );
}
