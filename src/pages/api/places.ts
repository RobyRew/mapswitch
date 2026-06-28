import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';
import { isValidLatLng, roundCoord } from '@/lib/parse/coords';

export const prerender = false;

const OPENED_KEEP = 50; // cap the auto "recently opened" list per user

const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().max(120).optional(),
  kind: z.enum(['saved', 'opened']),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// GET → the user's { saved, opened } places. POST → record a saved/opened place.
export const GET: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ saved: [], opened: [] });
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  const [saved, opened] = await Promise.all([
    store.places.listByUser(user.id, 'saved'),
    store.places.listByUser(user.id, 'opened'),
  ]);
  return json({ saved, opened });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ ok: false }); // anon: no-op (no collection)
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const { lat, lng, label, kind } = parsed.data;
  if (!isValidLatLng(lat, lng)) return json({ error: 'invalid_coords' }, 400);

  const place = await store.places.add({
    userId: user.id,
    lat: roundCoord(lat),
    lng: roundCoord(lng),
    label,
    kind,
  });
  if (kind === 'opened') await store.places.pruneOpened(user.id, OPENED_KEEP);

  return json({ ok: true, place });
};
