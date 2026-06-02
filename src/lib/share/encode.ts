import type { Match, BuildTarget } from '../providers/types';
import { isValidLatLng, roundCoord } from '../parse/coords';

// Stateless share links: the place lives entirely in the /o query string, so
// nothing is persisted server-side. (DB-backed short slugs are a later phase.)

export function encodeShareParams(t: BuildTarget): string {
  const p = new URLSearchParams();
  p.set('ll', `${t.lat},${t.lng}`);
  if (t.label) p.set('q', t.label);
  if (t.zoom) p.set('z', String(Math.round(t.zoom)));
  return p.toString();
}

export function buildShareUrl(base: string, t: BuildTarget): string {
  return `${base.replace(/\/$/, '')}/o?${encodeShareParams(t)}`;
}

/** Decode /o params back into a Match. null if missing/invalid. */
export function decodeShareParams(params: URLSearchParams): Match | null {
  const ll = params.get('ll');
  if (!ll) return null;
  const [latS, lngS] = ll.split(',');
  const lat = Number(latS);
  const lng = Number(lngS);
  if (!isValidLatLng(lat, lng)) return null;
  const label = params.get('q') ?? undefined;
  const zRaw = params.get('z');
  const zoom = zRaw && Number.isFinite(Number(zRaw)) ? Number(zRaw) : undefined;
  return { lat: roundCoord(lat), lng: roundCoord(lng), label, zoom, source: 'share' };
}
