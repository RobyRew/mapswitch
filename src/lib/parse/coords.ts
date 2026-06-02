// Coordinate helpers — pure & isomorphic (no Node/browser APIs).

export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return isValidLat(lat) && isValidLng(lng);
}

/**
 * Round to ~6 decimal places (~11 cm). Keeps share URLs tidy and trims
 * needless precision from the location we pass around (a small privacy win).
 */
export function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Parse a "lat,lng" string (optional surrounding spaces). null if invalid. */
export function parseLatLngPair(input: string): LatLng | null {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!isValidLatLng(lat, lng)) return null;
  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}
