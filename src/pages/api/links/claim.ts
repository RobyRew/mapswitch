import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';

export const prerender = false;

const Body = z.object({ anonId: z.string().min(8).max(64) });

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// Move a browser's anonymous links into the signed-in account (called right after
// login/signup). claimAnon clears the token + expiry, making them permanent.
export const POST: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
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

  const claimed = await store.links.claimAnon(parsed.data.anonId, user.id);
  return json({ claimed });
};
