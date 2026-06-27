import { parsePure, isExpandable, urlForExpansion } from '@/lib/parse/pipeline';
import { parseWithRegistry } from '@/lib/providers/registry';
import { safeExpand } from '@/lib/expand/safeExpand';
import { geocode, extractQuery } from '@/lib/geocode';
import { normalizeInput } from '@/lib/parse/normalize';
import { roundCoord } from '@/lib/parse/coords';
import type { Match } from '@/lib/providers/types';

const EXPAND_MAX_HOPS = Number(process.env.EXPAND_MAX_HOPS) || 5;
const EXPAND_TIMEOUT_MS = Number(process.env.EXPAND_TIMEOUT_MS) || 4000;

export type ResolveResult =
  | { ok: true; match: Match }
  | { ok: false; error: string; message?: string; status: number };

/**
 * Turn ANY input — a map link (short or full), "lat,lng", a Plus Code, our own
 * /o link, or a place name — into a neutral { lat, lng, label }. Shared by the
 * JSON API, the /go redirect entrypoint and the paste box.
 * Privacy: never logs the input, the expanded URL or the coordinates.
 */
export async function resolveInput(input: string): Promise<ResolveResult> {
  // 1. Pure parse — coords, Plus Code, provider link, or our own /o?ll= link.
  const direct = parsePure(input);
  if (direct) return { ok: true, match: direct };

  // 2. Short link → expand server-side (SSRF-hardened) → parse.
  let finalUrl: string | null = null;
  if (isExpandable(input)) {
    const target = urlForExpansion(input);
    if (target) {
      try {
        finalUrl = await safeExpand(target, { maxHops: EXPAND_MAX_HOPS, timeoutMs: EXPAND_TIMEOUT_MS });
      } catch {
        return { ok: false, error: 'expand_failed', status: 422 };
      }
      const match = parseWithRegistry(new URL(finalUrl));
      if (match) return { ok: true, match };
    }
  }

  // 3. Named place (no coordinates) — geocode the address/name (Nominatim/OSM).
  const n = normalizeInput(input);
  let query: string | null = null;
  if (finalUrl) {
    query = extractQuery(new URL(finalUrl));
  } else if (n.kind === 'url') {
    if (n.url.searchParams.get('a') === 'share_drive') {
      return {
        ok: false,
        error: 'live_location',
        message: 'This is a live Waze drive — it has no fixed location to open.',
        status: 422,
      };
    }
    query = extractQuery(n.url);
  } else if (n.kind === 'unknown') {
    query = input.trim(); // a pasted place name / address
  }

  if (query) {
    let g = await geocode(query);
    if (!g && query.includes(',')) {
      const parts = query
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // 1) drop a leading business name → geocode the address
      if (parts.length > 1) g = await geocode(parts.slice(1).join(', '));
      // 2) last resort → town + region (approximate town centre)
      if (!g && parts.length >= 2) g = await geocode(parts.slice(-2).join(', '));
    }
    if (g) {
      const label = query.length > 80 ? query.slice(0, 79) + '…' : query;
      return { ok: true, match: { lat: roundCoord(g.lat), lng: roundCoord(g.lng), label, source: 'geocoded' } };
    }
  }

  return { ok: false, error: 'unrecognised', status: 422 };
}
