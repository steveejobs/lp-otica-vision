export const ANALYTICS_GEO_SOURCES = {
  baseMap: {
    license: "Public domain",
    name: "Natural Earth Admin 0 Countries",
    scale: "1:110m",
    version: "5.1.1",
    url: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/",
  },
  cityCoordinates: {
    coverage: "Cidades com mais de 5.000 habitantes ou sedes administrativas PPLA no extrato GeoNames.",
    license: "CC BY 4.0",
    name: "GeoNames cities5000",
    url: "https://download.geonames.org/export/dump/",
  },
  cityIdentifiers: {
    name: "Google Ads Geo Targets",
    version: "2026-07-06",
    url: "https://developers.google.com/google-ads/api/data/geotargets",
  },
} as const;
