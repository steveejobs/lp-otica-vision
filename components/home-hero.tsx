import { visionTakeoverMedia } from "@/lib/assets";

import { VisionEditorialTakeover } from "./vision-editorial-takeover";

const kineticWallMedia = visionTakeoverMedia.map((item, index) => ({
  alt: item.alt,
  height: item.height,
  id: `kinetic-wall-${index}`,
  objectPosition: item.objectPosition,
  src: item.src,
  width: item.width,
}));

/** Temporary local-art direction study. The published ADM binding is intentionally not read here. */
export function HomeHero() {
  return <VisionEditorialTakeover media={kineticWallMedia} />;
}
