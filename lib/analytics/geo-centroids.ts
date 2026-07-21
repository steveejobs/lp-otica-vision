import "server-only";

import { CITY_COORDINATES } from "./data/city-coordinates";
import type { CityActivity, GeoCoordinates } from "./geo-types";

export function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function resolveCityCoordinates(cityId: string, city: string): GeoCoordinates | null {
  const normalizedCity = normalizeLocation(city);
  if (normalizedCity === "not set") return null;

  if (normalizedCity === "araguaina") {
    return {
      latitude: -7.1911,
      longitude: -48.2078,
      region: "BR-TO",
      resolvedName: city,
      source: "manual-fallback",
    };
  }

  if (!/^\d+$/.test(cityId)) return null;
  
  const match = CITY_COORDINATES[cityId];
  if (!match) return null;
  return {
    latitude: match[0],
    longitude: match[1],
    region: match[2] || null,
    resolvedName: city,
    source: "google-geotargets-geonames",
  };
}

export function resolveCityActivities(
  cities: Array<Omit<CityActivity, "coordinates">>,
): CityActivity[] {
  return cities.map((city) => ({
    ...city,
    coordinates: resolveCityCoordinates(city.cityId, city.city),
  }));
}

export function buildActivityMapModel(cities: CityActivity[]) {
  return {
    mapped: cities.filter((city) => city.coordinates !== null),
    unavailableUsers: cities.filter((city) => city.coordinates === null).reduce((sum, city) => sum + city.activeUsers, 0),
  };
}

export type { CityActivity } from "./geo-types";
