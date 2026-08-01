import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { APIRoute } from 'astro';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/lib/db/schema';
import { createDrizzleStore } from '@/lib/db/drizzleStore';
import type { Store } from '@/lib/db/store';
import type { SessionUser } from '@/lib/auth/session';

// Mutable holders the mocks read at call time (hoisted above the mock factories).
const H = vi.hoisted(() => ({
  store: null as unknown as Store,
  user: null as SessionUser | null,
}));

vi.mock('@/lib/db', () => ({ getStore: () => H.store }));
vi.mock('@/lib/auth/session', () => ({ getUser: async () => H.user }));

// Route handlers — imported after the mocks are registered (vi.mock is hoisted).
import { GET as usernameGET, POST as usernamePOST } from '@/pages/api/username';
import { GET as placesGET, POST as placesPOST } from '@/pages/api/places';
import { DELETE as placeDELETE } from '@/pages/api/places/[id]';
import { GET as linksGET, POST as linksPOST } from '@/pages/api/links';

type CtxOpts = { method?: string; body?: unknown; params?: Record<string, string>; url?: string };

function ctx(opts: CtxOpts = {}) {
  const init: RequestInit = { method: opts.method ?? 'GET' };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { 'content-type': 'application/json' };
  }
  return {
    request: new Request(opts.url ?? 'https://maps.robyrew.com/api/x', init),
    params: opts.params ?? {},
  };
}

async function call(handler: APIRoute, opts?: CtxOpts) {
  // Only `request`/`params` are used by these routes; the rest of APIContext is
  // irrelevant here, so we build a minimal one and cast.
  const res = await handler(ctx(opts) as unknown as Parameters<APIRoute>[0]);
  const body = await res.clone().json().catch(() => ({}));
  return { status: res.status, body: body as Record<string, unknown> };
}

const asUser = (id: string, username: string | null = null): SessionUser => ({
  id,
  email: `${id}@example.com`,
  name: id,
  username,
  emailVerified: true,
});

beforeAll(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: './drizzle' });
  const now = Date.now();
  db.insert(schema.users)
    .values(
      ['u1', 'u2', 'u3', 'u4'].map((id) => ({
        id,
        logtoSub: `sub-${id}`,
        name: id,
        email: `${id}@example.com`,
        emailVerified: true,
        createdAt: now,
      })),
    )
    .run();
  H.store = createDrizzleStore(db);
});

beforeEach(() => {
  H.user = null; // default: anonymous; each test opts in
});

describe('POST /api/username — claim a handle', () => {
  it('rejects anonymous callers', async () => {
    const { status, body } = await call(usernamePOST, { method: 'POST', body: { username: 'anon' } });
    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('claims a valid username and reflects it back', async () => {
    H.user = asUser('u1');
    const { status, body } = await call(usernamePOST, { method: 'POST', body: { username: 'RobyRew' } });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, username: 'robyrew' }); // normalized lowercase
    expect(await H.store.users.getUsername('u1')).toBe('robyrew');
  });

  it('refuses an already-taken username', async () => {
    H.user = asUser('u2'); // different account, session has no username
    const { status, body } = await call(usernamePOST, { method: 'POST', body: { username: 'robyrew' } });
    expect(status).toBe(409);
    expect(body.error).toBe('username_taken');
    expect(await H.store.users.getUsername('u2')).toBeNull();
  });

  it('is claim-once (session already has one)', async () => {
    H.user = asUser('u1', 'robyrew');
    const { status, body } = await call(usernamePOST, { method: 'POST', body: { username: 'newname' } });
    expect(status).toBe(409);
    expect(body).toMatchObject({ error: 'already_set', username: 'robyrew' });
  });

  it('rejects an invalid handle', async () => {
    H.user = asUser('u3');
    const { status, body } = await call(usernamePOST, { method: 'POST', body: { username: 'ab' } }); // too short
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_username');
  });

  it('GET returns the session username', async () => {
    H.user = asUser('u1', 'robyrew');
    expect((await call(usernameGET)).body).toEqual({ username: 'robyrew' });
    H.user = null;
    expect((await call(usernameGET)).body).toEqual({ username: null });
  });
});

describe('/api/places — saved & opened collection', () => {
  it('anonymous GET returns empty collections; POST is a no-op', async () => {
    expect((await call(placesGET)).body).toEqual({ saved: [], opened: [] });
    const post = await call(placesPOST, { method: 'POST', body: { lat: 1, lng: 2, kind: 'saved' } });
    expect(post.body).toEqual({ ok: false });
  });

  it('saves a place and lists it back', async () => {
    H.user = asUser('u2');
    const post = await call(placesPOST, {
      method: 'POST',
      body: { lat: 41.3874, lng: 2.1686, label: 'Barcelona', kind: 'saved' },
    });
    expect(post.status).toBe(200);
    expect(post.body.ok).toBe(true);
    const list = await call(placesGET);
    expect((list.body.saved as unknown[]).length).toBe(1);
    expect((list.body.saved as Array<{ label: string }>)[0]!.label).toBe('Barcelona');
  });

  it('rejects invalid coordinates', async () => {
    H.user = asUser('u2');
    const { status, body } = await call(placesPOST, {
      method: 'POST',
      body: { lat: 999, lng: 0, kind: 'saved' },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_coords');
  });

  it('DELETE enforces ownership', async () => {
    H.user = asUser('u3');
    const created = await call(placesPOST, { method: 'POST', body: { lat: 5, lng: 6, kind: 'saved' } });
    const id = (created.body.place as { id: string }).id;

    H.user = asUser('u2'); // not the owner
    expect((await call(placeDELETE, { method: 'DELETE', params: { id } })).status).toBe(404);

    H.user = asUser('u3'); // the owner
    expect((await call(placeDELETE, { method: 'DELETE', params: { id } })).status).toBe(200);
  });
});

describe('/api/links — short-link creation', () => {
  it('GET requires auth', async () => {
    expect((await call(linksGET)).status).toBe(401);
    H.user = asUser('u4');
    expect((await call(linksGET)).body).toHaveProperty('links');
  });

  it('signed-in create returns a random /x/<slug> link', async () => {
    H.user = asUser('u4');
    const { status, body } = await call(linksPOST, {
      url: 'https://maps.robyrew.com/api/links',
      method: 'POST',
      body: { lat: 48.8584, lng: 2.2945, label: 'Eiffel', indefinite: true },
    });
    expect(status).toBe(200);
    expect(body.slug).toBeTruthy();
    expect(String(body.url)).toMatch(/\/x\/[A-Za-z0-9_-]{8}$/);
    expect(body.expiresAt).toBeNull();
  });

  it('custom slug needs a claimed username', async () => {
    H.user = asUser('u4'); // session has no username
    const { status, body } = await call(linksPOST, {
      method: 'POST',
      body: { lat: 1, lng: 1, customSlug: 'casa', indefinite: true },
    });
    expect(status).toBe(409);
    expect(body.error).toBe('username_required');
  });

  it('custom slug builds a vanity /x/<username>/<slug> link', async () => {
    H.user = asUser('u4', 'roby4');
    const { status, body } = await call(linksPOST, {
      url: 'https://maps.robyrew.com/api/links',
      method: 'POST',
      body: { lat: 41.1, lng: 1.2, label: 'La Casa', customSlug: 'la casa!', indefinite: true },
    });
    expect(status).toBe(200);
    expect(String(body.url)).toMatch(/\/x\/roby4\/la-casa$/); // slugified
  });

  it('anonymous create requires an anonId', async () => {
    const { status, body } = await call(linksPOST, {
      method: 'POST',
      body: { lat: 2, lng: 3 },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('anon_id_required');
  });

  it('anonymous create with an anonId gets a 7-day expiry', async () => {
    const before = Date.now();
    const { status, body } = await call(linksPOST, {
      url: 'https://maps.robyrew.com/api/links',
      method: 'POST',
      body: { lat: 2, lng: 3, anonId: 'anon-abcdefgh' },
    });
    expect(status).toBe(200);
    expect(Number(body.expiresAt)).toBeGreaterThan(before + 6 * 86_400_000);
  });
});
