import type { CityActivity } from "./geo-types";

export const MAP_TILE_SIZE = 256;
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 8;
export const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;

export type MapSize = { height: number; width: number };
export type MapView = { latitude: number; longitude: number; zoom: number };
export type ProjectedPoint = { x: number; y: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function projectCoordinates(latitude: number, longitude: number, zoom: number): ProjectedPoint {
  const scale = MAP_TILE_SIZE * 2 ** zoom;
  const safeLatitude = clamp(latitude, -WEB_MERCATOR_MAX_LATITUDE, WEB_MERCATOR_MAX_LATITUDE);
  const sin = Math.sin((safeLatitude * Math.PI) / 180);
  return {
    x: ((normalizeLongitude(longitude) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function unprojectCoordinates(x: number, y: number, zoom: number): Omit<MapView, "zoom"> {
  const scale = MAP_TILE_SIZE * 2 ** zoom;
  const longitude = normalizeLongitude((x / scale) * 360 - 180);
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI;
  return { latitude: clamp(latitude, -WEB_MERCATOR_MAX_LATITUDE, WEB_MERCATOR_MAX_LATITUDE), longitude };
}

export function defaultMapView(): MapView {
  return { latitude: 10, longitude: -20, zoom: MAP_MIN_ZOOM };
}

export function fitMapView(cities: CityActivity[], size: MapSize, padding = 92): MapView {
  const mapped = cities.filter((city) => city.coordinates !== null);
  if (!mapped.length || size.width < 1 || size.height < 1) return defaultMapView();
  if (mapped.length === 1) {
    return {
      latitude: mapped[0].coordinates?.latitude ?? 0,
      longitude: mapped[0].coordinates?.longitude ?? 0,
      zoom: Math.min(MAP_MAX_ZOOM, size.width < 520 ? 5 : 6),
    };
  }

  for (let zoom = MAP_MAX_ZOOM; zoom >= MAP_MIN_ZOOM; zoom -= 1) {
    const points = mapped.map((city) => projectCoordinates(
      city.coordinates?.latitude ?? 0,
      city.coordinates?.longitude ?? 0,
      zoom,
    ));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX <= Math.max(1, size.width - padding * 2) && maxY - minY <= Math.max(1, size.height - padding * 2)) {
      const center = unprojectCoordinates((minX + maxX) / 2, (minY + maxY) / 2, zoom);
      return { ...center, zoom };
    }
  }
  return defaultMapView();
}

export function mapScreenPoint(city: CityActivity, view: MapView, size: MapSize): ProjectedPoint | null {
  if (!city.coordinates) return null;
  const center = projectCoordinates(view.latitude, view.longitude, view.zoom);
  const point = projectCoordinates(city.coordinates.latitude, city.coordinates.longitude, view.zoom);
  const worldSize = MAP_TILE_SIZE * 2 ** view.zoom;
  let deltaX = point.x - center.x;
  if (deltaX > worldSize / 2) deltaX -= worldSize;
  if (deltaX < -worldSize / 2) deltaX += worldSize;
  return { x: size.width / 2 + deltaX, y: size.height / 2 + point.y - center.y };
}
