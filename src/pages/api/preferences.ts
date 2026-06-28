import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getStore } from '@/lib/db';
import { getUser } from '@/lib/auth/session';
import { readJson, HttpError } from '@/lib/http/guard';

export const prerender = false;

const Body = z.object({
  defaultProviderId: z.string().max(40).nullable(),
  autoOpen: z.boolean(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  // Anonymous users keep prefs in localStorage only — answer 200 with no prefs
  // (a 401 here is harmless but shows up as a console error in the browser).
  if (!user) return json({ preferences: null });
  const store = getStore();
  if (!store) return json({ error: 'unavailable' }, 503);
  return json({ preferences: await store.preferences.get(user.id) });
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  if (!user) return json({ ok: false }); // anon: no-op (prefs stay local)
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

  await store.preferences.set(user.id, {
    defaultProviderId: parsed.data.defaultProviderId,
    autoOpen: parsed.data.autoOpen,
  });
  return json({ ok: true });
};
