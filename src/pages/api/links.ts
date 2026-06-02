import type { APIRoute } from 'astro';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';
import { rateLimit } from '@/lib/ratelimit/tokenBucket';
import { isValidLatLng, roundCoord } from '@/lib/parse/coords';

export const prerender = false;

const MAX_SLUGS = Number(process.env.MAX_SLUGS_PER_USER) || 500;

const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().max(120).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// GET = list the signed-in user's saved short links.
export const GET: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  const links = await store.links.listByUser(user.id);
  return json({
    links: links.map((l) => ({
      slug: l.slug,
      label: l.label ?? null,
      lat: l.lat,
      lng: l.lng,
      createdAt: l.createdAt,
      hitCount: l.hitCount,
    })),
  });
};

// POST = create a short slug for a place (auth required). Privacy: never logged.
export const POST: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);

  const rl = rateLimit(`links:${user.id}`);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) },
    });
  }

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const { lat, lng, label, expiresInDays } = parsed.data;
  if (!isValidLatLng(lat, lng)) return json({ error: 'invalid_coords' }, 400);

  if ((await store.links.countByUser(user.id)) >= MAX_SLUGS) {
    return json({ error: 'limit_reached' }, 409);
  }

  let slug = '';
  for (let i = 0; i < 3; i++) {
    const candidate = nanoid(8);
    if (!(await store.links.get(candidate))) {
      slug = candidate;
      break;
    }
  }
  if (!slug) return json({ error: 'try_again' }, 500);

  const expiresAt = expiresInDays ? Date.now() + expiresInDays * 86_400_000 : null;
  await store.links.create({ slug, userId: user.id, lat: roundCoord(lat), lng: roundCoord(lng), label, expiresAt });
  await store.history.add(user.id, slug);

  const origin = process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  return json({ slug, url: `${origin}/x/${slug}` });
};
