import type { APIRoute } from 'astro';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';
import { rateLimit } from '@/lib/ratelimit/tokenBucket';
import { clientIp, hashIp } from '@/lib/http/ip';
import { isValidLatLng, roundCoord } from '@/lib/parse/coords';

export const prerender = false;

const MAX_SLUGS = Number(process.env.MAX_SLUGS_PER_USER) || 1000;
const ANON_WEEKLY = 20;
const WEEK_MS = 7 * 86_400_000;
const ANON_TTL_MS = 7 * 86_400_000;

const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().max(120).optional(),
  anonId: z.string().min(8).max(64).optional(),
  expiresInMinutes: z.number().int().min(1).max(1_051_200).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
  indefinite: z.boolean().optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// GET = the signed-in user's saved links (account history).
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
      expiresAt: l.expiresAt ?? null,
      hitCount: l.hitCount,
    })),
  });
};

// POST = create a short slug. Anonymous: ≤20 / rolling 7 days (by anonId + IP),
// each expires in 7 days. Signed-in: up to MAX_SLUGS, custom/indefinite expiry.
export const POST: APIRoute = async ({ request }) => {
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  const user = await getUser(request);

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const { lat, lng, label, anonId, expiresInMinutes, expiresInDays, indefinite } = parsed.data;
  if (!isValidLatLng(lat, lng)) return json({ error: 'invalid_coords' }, 400);

  await store.links.pruneExpired(Date.now()); // opportunistic cleanup

  let userId: string | null = null;
  let ownerToken: string | null = null;
  let ipHash: string | null = null;
  let expiresAt: number | null;

  if (user) {
    userId = user.id;
    if ((await store.links.countByUser(user.id)) >= MAX_SLUGS) return json({ error: 'limit_reached' }, 409);
    const rl = rateLimit(`links:${user.id}`);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) },
      });
    }
    expiresAt = indefinite
      ? null
      : expiresInMinutes
        ? Date.now() + expiresInMinutes * 60_000
        : expiresInDays
          ? Date.now() + expiresInDays * 86_400_000
          : null;
  } else {
    if (!anonId) return json({ error: 'anon_id_required' }, 400);
    ownerToken = anonId;
    ipHash = hashIp(clientIp(request));
    if ((await store.links.countRecentByAnon(anonId, ipHash, Date.now() - WEEK_MS)) >= ANON_WEEKLY) {
      return json({ error: 'weekly_limit' }, 429);
    }
    expiresAt = Date.now() + ANON_TTL_MS;
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

  await store.links.create({
    slug,
    userId,
    ownerToken,
    ipHash,
    lat: roundCoord(lat),
    lng: roundCoord(lng),
    label,
    expiresAt,
  });
  if (userId) await store.history.add(userId, slug);

  const origin = process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  return json({ slug, url: `${origin}/x/${slug}`, expiresAt });
};
