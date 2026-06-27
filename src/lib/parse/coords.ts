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
  // Tolerate optional wrapping parentheses, e.g. "(41.22, 1.15)".
  const m = input.trim().match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!isValidLatLng(lat, lng)) return null;
  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}

/**
 * Parse directional coordinates embedded in free text, e.g. the address string
 * Google puts in business/hotel links: "… N: 41.1151 - E: 1.21836 …" (also
 * "S 12.34 W 56.78"). Both numbers must carry decimals so house numbers like
 * "N: 206" can't false-match. null if a N/S + E/W pair isn't found.
 */
export function parseDirectionalLatLng(text: string): LatLng | null {
  const ns = text.match(/(?:^|[^A-Za-z])([NS])\s*:?\s*(\d{1,2}\.\d+)/i);
  const ew = text.match(/(?:^|[^A-Za-z])([EW])\s*:?\s*(\d{1,3}\.\d+)/i);
  if (!ns || !ew) return null;
  const lat = (ns[1]!.toUpperCase() === 'S' ? -1 : 1) * Number(ns[2]);
  const lng = (ew[1]!.toUpperCase() === 'W' ? -1 : 1) * Number(ew[2]);
  if (!isValidLatLng(lat, lng)) return null;
  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}
