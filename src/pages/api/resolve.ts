import type { APIRoute } from 'astro';
import { z } from 'zod';
import { parsePure, isExpandable, urlForExpansion } from '@/lib/parse/pipeline';
import { parseWithRegistry } from '@/lib/providers/registry';
import { safeExpand } from '@/lib/expand/safeExpand';
import { readJson, HttpError } from '@/lib/http/guard';
import { geocode, extractQuery } from '@/lib/geocode';
import { normalizeInput } from '@/lib/parse/normalize';
import { roundCoord } from '@/lib/parse/coords';

export const prerender = false;

const Body = z.object({ input: z.string().min(1).max(2048) });

const EXPAND_MAX_HOPS = Number(process.env.EXPAND_MAX_HOPS) || 5;
const EXPAND_TIMEOUT_MS = Number(process.env.EXPAND_TIMEOUT_MS) || 4000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// Resolve ANY pasted map link/coords/address into a neutral { lat, lng, label? }.
// Privacy: we never log the input, the expanded URL, or the coordinates.
export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const input = parsed.data.input;

  // 1. Pure parse — coords, Plus Code, provider link, or our own /o?ll= link.
  const direct = parsePure(input);
  if (direct) return json({ match: direct });

  // 2. Short link → expand server-side (SSRF-hardened) → parse.
  let finalUrl: string | null = null;
  if (isExpandable(input)) {
    const target = urlForExpansion(input);
    if (target) {
      try {
        finalUrl = await safeExpand(target, { maxHops: EXPAND_MAX_HOPS, timeoutMs: EXPAND_TIMEOUT_MS });
      } catch {
        return json({ error: 'expand_failed' }, 422);
      }
      const match = parseWithRegistry(new URL(finalUrl));
      if (match) return json({ match });
    }
  }

  // 3. Named place (no coordinates) — geocode the address/name (Nominatim/OSM).
  const n = normalizeInput(input);
  let query: string | null = null;
  if (finalUrl) {
    query = extractQuery(new URL(finalUrl));
  } else if (n.kind === 'url') {
    if (n.url.searchParams.get('a') === 'share_drive') {
      return json({ error: 'live_location', message: 'This is a live Waze drive — it has no fixed location to open.' }, 422);
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
      return json({ match: { lat: roundCoord(g.lat), lng: roundCoord(g.lng), label, source: 'geocoded' } });
    }
  }

  return json({ error: 'unrecognised' }, 422);
};
