import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';
import { normalizeUsername, isValidUsername } from '@/lib/share/slug';

export const prerender = false;

const Body = z.object({ username: z.string().min(1).max(40) });

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// GET → { username | null }. POST { username } → claim it (one-time per account).
export const GET: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  return json({ username: user?.username ?? null });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);

  // Claim-once: changing a username would break existing vanity links.
  if (user.username) return json({ error: 'already_set', username: user.username }, 409);

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);

  const username = normalizeUsername(parsed.data.username);
  if (!isValidUsername(username)) return json({ error: 'invalid_username' }, 400);
  if (await store.users.usernameTaken(username)) return json({ error: 'username_taken' }, 409);

  try {
    await store.users.setUsername(user.id, username);
  } catch {
    return json({ error: 'username_taken' }, 409); // unique-index race
  }
  return json({ ok: true, username });
};
