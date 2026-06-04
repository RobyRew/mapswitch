// Forward geocoding via Nominatim (OpenStreetMap) — self-hostable; set NOMINATIM_URL
// to your own instance for scale/privacy. Used as a fallback when a link points to
// a place by NAME with no coordinates (common for Google/Apple/Waze share links).

const NOMINATIM = (process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const COORD_RE = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;

export interface GeocodeResult {
  lat: number;
  lng: number;
  label?: string;
}

export async function geocode(query: string, timeoutMs = 4500): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  const url = `${NOMINATIM}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'MapSwitch/1.0 (+https://maps.robyrew.com)', accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: hit.display_name };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a human place name/address out of a map URL (skipping coord-valued params). */
export function extractQuery(url: URL): string | null {
  for (const key of ['q', 'query', 'address', 'name', 'destination', 'daddr']) {
    const v = url.searchParams.get(key);
    if (v && !COORD_RE.test(v.trim())) return v;
  }
  const m = url.pathname.match(/\/(?:maps\/place|maps\/search|place|search)\/([^/@?]+)/);
  if (m && m[1]) {
    try {
      const name = decodeURIComponent(m[1].replace(/\+/g, ' '));
      if (!COORD_RE.test(name)) return name;
    } catch {
      /* ignore */
    }
  }
  return null;
}
