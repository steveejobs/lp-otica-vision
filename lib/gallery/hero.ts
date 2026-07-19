import "server-only";

import { getPublishedGalleryMedia, type PublishedGalleryMedia } from "./public";

export type HeroEditorialRole = "primary" | "secondary" | "detail";
export type HeroMedia = PublishedGalleryMedia & { fallbackSrc?: string; localSrc?: string };

export function getHomeHeroMedia() {
  return getPublishedGalleryMedia("home", "hero");
}
