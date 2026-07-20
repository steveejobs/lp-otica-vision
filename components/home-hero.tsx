import { heroMedia } from "@/lib/assets";
import { galleryImageUrl } from "@/lib/gallery/display-media";
import { getHomeHeroMedia } from "@/lib/gallery/hero";

import type { HeroWallMedia } from "./hero/hero-types";
import { VisionEditorialTakeover } from "./vision-editorial-takeover";

function localHeroMedia(): HeroWallMedia {
  return {
    alt: heroMedia.alt,
    desktopScale: 1,
    desktopObjectPosition: heroMedia.objectPosition,
    height: heroMedia.height,
    id: "local-hero",
    mobileObjectPosition: heroMedia.objectPosition,
    mobileScale: 1,
    src: heroMedia.src,
    width: heroMedia.width,
  };
}

function publishedHeroMedia(
  item: Awaited<ReturnType<typeof getHomeHeroMedia>>[number],
): HeroWallMedia {
  return {
    alt: item.altText,
    desktopScale: item.desktopScale,
    desktopObjectPosition: item.desktopObjectPosition,
    fallbackSrc: heroMedia.src,
    height: item.height,
    id: item.id,
    mobileObjectPosition: item.mobileObjectPosition,
    mobileScale: item.mobileScale,
    mobileSrc: galleryImageUrl(item, "mobile"),
    src: galleryImageUrl(item, "desktop"),
    width: item.width,
  };
}

/** The first published image can replace the documented local hero without turning it into a slideshow. */
export async function HomeHero() {
  const [published] = await getHomeHeroMedia();
  const media = published ? publishedHeroMedia(published) : localHeroMedia();

  return <VisionEditorialTakeover media={media} />;
}
