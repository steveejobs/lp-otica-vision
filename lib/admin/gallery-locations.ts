import {
  getGalleryPlacements,
  getPublicPlacement,
  getPublicPlacementByKey,
  type PlacementDevice,
  type PublicPlacement,
} from "@/lib/content-placements";

export type GalleryDevice = PlacementDevice;
export type GalleryLocation = PublicPlacement;

/** @deprecated Import the central registry from lib/content-placements in new code. */
export const GALLERY_LOCATIONS = getGalleryPlacements();

export type GalleryLocationKey = (typeof GALLERY_LOCATIONS)[number]["key"];

export function getGalleryLocation(routeKey: string, placementKey?: string) {
  if (placementKey) {
    const placement = getPublicPlacement(routeKey, placementKey);
    return placement?.galleryMedia ? placement : null;
  }
  const placement = getPublicPlacementByKey(routeKey);
  return placement?.galleryMedia ? placement : null;
}

export function isGalleryLocationKey(value: string): value is GalleryLocationKey {
  return GALLERY_LOCATIONS.some((location) => location.key === value);
}

export function getGalleryLocationByKey(value: string) {
  const placement = getPublicPlacementByKey(value);
  return placement?.galleryMedia && placement.status === "implemented" ? placement : null;
}

export const galleryDeviceLabels: Record<GalleryDevice, string> = {
  both: "Desktop e mobile",
  desktop: "Somente desktop",
  mobile: "Somente mobile",
};
