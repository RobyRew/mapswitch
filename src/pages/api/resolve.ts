import type { APIRoute } from 'astro';
import { z } from 'zod';
import { parsePure, isExpandable, urlForExpansion } from '@/lib/parse/pipeline';
import { parseWithRegistry } from '@/lib/providers/registry';
import { safeExpand, ExpandError } from '@/lib/expand/safeExpand';

export const prerender = false;

const Body = z.object({ input: z.string().min(1).max(2048) });

const EXPAND_MAX_HOPS = Number(process.env.EXPAND_MAX_HOPS) || 5;
const EXPAND_TIMEOUT_MS = Number(process.env.EXPAND_TIMEOUT_MS) || 4000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Resolve ANY pasted map link/coords into a neutral { lat, lng, label? }.
// Privacy: we never log the input, the expanded URL, or the coordinates.
export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const input = parsed.data.input;

  // 1. Pure parse first — zero network for links that already carry coordinates.
  const direct = parsePure(input);
  if (direct) return json({ match: direct });

  // 2. Known short link → expand server-side (SSRF-hardened), then parse.
  if (isExpandable(input)) {
    const target = urlForExpansion(input);
    if (target) {
      try {
        const finalUrl = await safeExpand(target, {
          maxHops: EXPAND_MAX_HOPS,
          timeoutMs: EXPAND_TIMEOUT_MS,
        });
        const match = parseWithRegistry(new URL(finalUrl));
        return match ? json({ match }) : json({ error: 'no_location_found' }, 422);
      } catch (err) {
        // Typed error → clean 422, no internal detail leaked.
        if (err instanceof ExpandError) return json({ error: 'expand_failed' }, 422);
        return json({ error: 'expand_failed' }, 422);
      }
    }
  }

  return json({ error: 'unrecognised' }, 422);
};
