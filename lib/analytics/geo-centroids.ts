export type MapCentroid = { x: number; y: number };
export type CityActivity = { activeUsers: number; city: string; country: string; countryCode: string; eventCount: number };

const cityCentroids: Record<string, MapCentroid> = {
  "araguaina|br": { x: 36.7, y: 63.2 },
  "belem|br": { x: 38.5, y: 59.4 },
  "belo horizonte|br": { x: 37.2, y: 67.6 },
  "brasilia|br": { x: 36.1, y: 65.5 },
  "curitiba|br": { x: 36.5, y: 71.3 },
  "fortaleza|br": { x: 40.1, y: 60.8 },
  "goiania|br": { x: 35.6, y: 66.3 },
  "manaus|br": { x: 33.1, y: 59.2 },
  "palmas|br": { x: 36.6, y: 63.8 },
  "porto alegre|br": { x: 35.6, y: 74.4 },
  "recife|br": { x: 41.1, y: 63.5 },
  "rio de janeiro|br": { x: 38.1, y: 69.1 },
  "salvador|br": { x: 39.9, y: 65.1 },
  "sao paulo|br": { x: 37.0, y: 69.6 },
  "buenos aires|ar": { x: 34.3, y: 76.1 },
  "mexico city|mx": { x: 18.7, y: 49.9 },
  "new york|us": { x: 24.4, y: 35.4 },
  "san francisco|us": { x: 13.2, y: 37.4 },
  "toronto|ca": { x: 22.7, y: 32.2 },
  "lisbon|pt": { x: 46.6, y: 39.9 },
  "london|gb": { x: 48.8, y: 34.8 },
  "madrid|es": { x: 47.7, y: 40.2 },
  "paris|fr": { x: 49.7, y: 37.7 },
  "berlin|de": { x: 52.3, y: 35.7 },
  "cape town|za": { x: 54.2, y: 76.9 },
  "cairo|eg": { x: 57.4, y: 47.4 },
  "nairobi|ke": { x: 59.3, y: 62.1 },
  "dubai|ae": { x: 65.0, y: 50.3 },
  "mumbai|in": { x: 70.8, y: 54.8 },
  "singapore|sg": { x: 79.8, y: 65.8 },
  "tokyo|jp": { x: 89.3, y: 43.7 },
  "sydney|au": { x: 91.1, y: 76.3 },
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("en-US");
}

export function resolveCityCentroid(city: string, countryCode: string) {
  const normalizedCity = normalized(city);
  const normalizedCountry = normalized(countryCode);
  if (!normalizedCity || !normalizedCountry || normalizedCity === "(not set)" || normalizedCountry === "(not set)") return null;
  return cityCentroids[`${normalizedCity}|${normalizedCountry}`] ?? null;
}

export function buildActivityMapModel(cities: CityActivity[]) {
  const resolved = cities.map((city) => ({ ...city, point: resolveCityCentroid(city.city, city.countryCode) }));
  return {
    mapped: resolved.filter((city): city is typeof city & { point: MapCentroid } => city.point !== null),
    unavailableUsers: resolved.filter((city) => city.point === null).reduce((sum, city) => sum + city.activeUsers, 0),
  };
}
