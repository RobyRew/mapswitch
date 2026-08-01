import type { APIRoute } from 'astro';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { normalizeSlug, isValidSlug } from '@/lib/share/slug';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// Live availability for a vanity slug as the user types: GET ?slug=<raw> →
// { slug: <normalized>, valid, available }. Custom slugs only exist for a
// signed-in account with a claimed username, so both are required.
export const GET: APIRoute = async ({ request, url }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (!user.username) return json({ error: 'username_required' }, 409);
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);

  const slug = normalizeSlug(url.searchParams.get('slug') ?? '');
  if (!slug || !isValidSlug(slug)) return json({ slug, valid: false, available: false });

  const taken = await store.links.customSlugTaken(user.id, slug);
  return json({ slug, valid: true, available: !taken });
};
