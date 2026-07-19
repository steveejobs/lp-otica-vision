import { getHomeHeroMedia } from "@/lib/gallery/hero";

import { VisionEditorialTakeover } from "./vision-editorial-takeover";

export async function HomeHero() {
  const media = await getHomeHeroMedia();
  return <VisionEditorialTakeover media={media} />;
}
