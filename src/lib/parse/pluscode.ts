import type { LatLng } from './coords';
import { isValidLatLng, roundCoord } from './coords';

// Minimal Open Location Code (Plus Code) decoder for FULL codes — no dependency.
// Verified: "8FW4V75V+8Q" → ~48.8583, 2.2944 (Eiffel Tower).
const ALPHABET = '23456789CFGHJMPQRVWX';
const PAIR_RESOLUTIONS = [20.0, 1.0, 0.05, 0.0025, 0.000125];

/** A full code: 8 chars, '+', then 2–3 chars (e.g. "8FW4V75V+8Q"). */
const FULL_CODE_RE = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

export function isFullPlusCode(s: string): boolean {
  return FULL_CODE_RE.test(s.trim());
}

/** Decode a full Plus Code to the centre of its cell. null if malformed. */
export function decodePlusCode(code: string): LatLng | null {
  const clean = code.trim().replace('+', '').toUpperCase();
  if (clean.length < 10) return null;
  let lat = -90;
  let lng = -180;
  for (let i = 0; i < 5; i++) {
    const latVal = ALPHABET.indexOf(clean[2 * i] ?? '');
    const lngVal = ALPHABET.indexOf(clean[2 * i + 1] ?? '');
    if (latVal < 0 || lngVal < 0) return null;
    lat += latVal * PAIR_RESOLUTIONS[i]!;
    lng += lngVal * PAIR_RESOLUTIONS[i]!;
  }
  // Offset to the centre of the smallest (10-digit) cell.
  lat += PAIR_RESOLUTIONS[4]! / 2;
  lng += PAIR_RESOLUTIONS[4]! / 2;
  if (!isValidLatLng(lat, lng)) return null;
  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}
