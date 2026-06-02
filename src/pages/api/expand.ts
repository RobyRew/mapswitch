import type { APIRoute } from 'astro';
import { z } from 'zod';
import { safeExpand, ExpandError } from '@/lib/expand/safeExpand';

export const prerender = false;

const Body = z.object({ url: z.string().url().max(2048) });

const EXPAND_MAX_HOPS = Number(process.env.EXPAND_MAX_HOPS) || 5;
const EXPAND_TIMEOUT_MS = Number(process.env.EXPAND_TIMEOUT_MS) || 4000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Thin public surface over the SSRF-hardened expander: short URL → final URL.
export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);

  try {
    const finalUrl = await safeExpand(parsed.data.url, {
      maxHops: EXPAND_MAX_HOPS,
      timeoutMs: EXPAND_TIMEOUT_MS,
    });
    return json({ url: finalUrl });
  } catch (err) {
    return json({ error: 'expand_failed' }, err instanceof ExpandError ? 422 : 500);
  }
};
