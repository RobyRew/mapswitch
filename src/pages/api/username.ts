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

// GET → { username | null }. GET ?check=<name> → { username, valid, available }
// (live availability while typing; excludes the caller's own current handle).
export const GET: APIRoute = async ({ request, url }) => {
  const user = await getUser(request);
  const check = url.searchParams.get('check');
  if (check !== null) {
    if (!user) return json({ error: 'unauthorized' }, 401);
    const store = getStore();
    if (!store) return json({ error: 'unavailable' }, 503);
    const username = normalizeUsername(check);
    if (!isValidUsername(username)) return json({ username, valid: false, available: false });
    const taken = await store.users.usernameTaken(username, user.id);
    return json({ username, valid: true, available: !taken });
  }
  return json({ username: user?.username ?? null });
};

// POST { username } → claim it, or CHANGE to it if you already have one. The old
// handle is retired into an alias so previously-shared links still resolve.
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

  const username = normalizeUsername(parsed.data.username);
  if (!isValidUsername(username)) return json({ error: 'invalid_username' }, 400);
  if (username === user.username) return json({ ok: true, username }); // no-op
  if (await store.users.usernameTaken(username, user.id)) return json({ error: 'username_taken' }, 409);

  try {
    await store.users.setUsername(user.id, username);
  } catch {
    return json({ error: 'username_taken' }, 409); // unique-index race
  }
  return json({ ok: true, username, previous: user.username ?? null });
};
