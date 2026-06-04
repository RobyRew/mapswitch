import type { APIRoute } from 'astro';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// DELETE a slug owned by the caller — by account (userId) or, for anonymous
// links, by the matching anonId (?anonId=…). Ownership enforced in the WHERE.
export const DELETE: APIRoute = async ({ request, params, url }) => {
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  const slug = params.slug;
  if (!slug || !/^[A-Za-z0-9_-]{1,32}$/.test(slug)) return json({ error: 'invalid' }, 400);

  const user = await getUser(request);
  if (user) {
    const ok = await store.links.deleteOwned(slug, user.id);
    return ok ? new Response(null, { status: 204 }) : json({ error: 'not_found' }, 404);
  }

  const anonId = url.searchParams.get('anonId');
  if (anonId) {
    const ok = await store.links.deleteAnon(slug, anonId);
    return ok ? new Response(null, { status: 204 }) : json({ error: 'not_found' }, 404);
  }

  return json({ error: 'unauthorized' }, 401);
};
