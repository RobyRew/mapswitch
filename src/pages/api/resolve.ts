import type { APIRoute } from 'astro';
import { z } from 'zod';
import { readJson, HttpError } from '@/lib/http/guard';
import { resolveInput, type ResolveResult } from '@/lib/resolve/resolve';

export const prerender = false;

const InputStr = z.string().min(1).max(2048);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function toResponse(r: ResolveResult): Response {
  if (r.ok) return json({ match: r.match });
  return json(r.message ? { error: r.error, message: r.message } : { error: r.error }, r.status);
}

// JSON API. POST {"input": "..."} or GET ?input=... (alias ?to=). Returns
// { match: { lat, lng, label?, source } } or { error, message? }.
export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = z.object({ input: InputStr }).safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  return toResponse(await resolveInput(parsed.data.input));
};

export const GET: APIRoute = async ({ url }) => {
  const parsed = InputStr.safeParse(url.searchParams.get('input') ?? url.searchParams.get('to') ?? '');
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  return toResponse(await resolveInput(parsed.data));
};
