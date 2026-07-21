export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  region: string | null;
  resolvedName: string;
  source: "google-geotargets-geonames";
};

export const GEO_SOURCE_COVERAGE = {
  googleActiveCities: 65_368,
  mappedCities: 26_706,
  percentage: 40.85,
  googleGeoTargetsVersion: "2026-07-06",
  geoNamesExtract: "cities5000",
} as const;

export type CityActivity = {
  activeUsers: number;
  city: string;
  cityId: string;
  coordinates: GeoCoordinates | null;
  country: string;
  countryCode: string;
  eventCount: number;
};
