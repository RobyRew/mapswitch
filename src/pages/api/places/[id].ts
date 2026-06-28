import type { APIRoute } from 'astro';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// Remove one of the current user's saved/opened places.
export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  const id = params.id ?? '';
  const ok = await store.places.delete(id, user.id);
  return json({ ok }, ok ? 200 : 404);
};
