import type { ImageAsset } from "@/lib/assets";

import type { PublishedGalleryMedia } from "./public";

export type DisplayGalleryMedia = {
  alt: string;
  blurDataURL: string;
  desktopObjectPosition: string;
  desktopScale: number;
  fallbackSrc?: string;
  height: number;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  placeholderColor: string;
  seriesId: string;
  src: string;
  width: number;
};

export function galleryImageUrl(item: Pick<PublishedGalleryMedia, "assetVersion" | "id">, variant: "desktop" | "mobile" = "desktop") {
  return `/api/galerias/imagem/${item.id}?variant=${variant}&v=${item.assetVersion}`;
}

export function displayMediaFromPublished(item: PublishedGalleryMedia, fallback?: ImageAsset): DisplayGalleryMedia {
  return {
    alt: item.altText,
    blurDataURL: item.blurDataUrl ?? "",
    desktopObjectPosition: item.desktopObjectPosition,
    desktopScale: item.desktopScale,
    fallbackSrc: fallback?.src,
    height: item.height,
    id: item.id,
    mobileObjectPosition: item.mobileObjectPosition,
    mobileScale: item.mobileScale,
    placeholderColor: item.backgroundColor,
    seriesId: item.seriesId,
    src: galleryImageUrl(item),
    width: item.width,
  };
}

export function displayMediaFromLocal(item: ImageAsset): DisplayGalleryMedia {
  return {
    alt: item.alt,
    blurDataURL: item.blurDataURL,
    desktopObjectPosition: item.objectPosition,
    desktopScale: 1,
    height: item.height,
    id: item.src,
    mobileObjectPosition: item.objectPosition,
    mobileScale: 1,
    placeholderColor: item.placeholderColor,
    seriesId: item.seriesId,
    src: item.src,
    width: item.width,
  };
}

export function displayMediaFromLocalList(items: readonly ImageAsset[]) {
  return items.map(displayMediaFromLocal);
}
