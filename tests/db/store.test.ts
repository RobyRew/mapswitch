import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/lib/db/schema';
import { createDrizzleStore } from '@/lib/db/drizzleStore';
import type { Store } from '@/lib/db/store';

let store: Store;

beforeAll(async () => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: './drizzle' });
  // Two users for ownership tests (saved_links.userId FK → user.id).
  const now = new Date();
  await db.insert(schema.user).values([
    { id: 'u1', name: 'One', email: 'one@example.com', emailVerified: true, createdAt: now, updatedAt: now },
    { id: 'u2', name: 'Two', email: 'two@example.com', emailVerified: true, createdAt: now, updatedAt: now },
  ]);
  store = createDrizzleStore(db);
});

describe('drizzle store — links', () => {
  it('creates and reads a slug', async () => {
    await store.links.create({ slug: 'abc123', userId: 'u1', lat: 48.8584, lng: 2.2945, label: 'Eiffel' });
    const got = await store.links.get('abc123');
    expect(got).toMatchObject({ slug: 'abc123', userId: 'u1', lat: 48.8584, lng: 2.2945, label: 'Eiffel', hitCount: 0 });
  });

  it('lists by user and counts', async () => {
    await store.links.create({ slug: 'def456', userId: 'u1', lat: 1, lng: 2 });
    expect(await store.links.countByUser('u1')).toBe(2);
    expect((await store.links.listByUser('u1')).map((l) => l.slug).sort()).toEqual(['abc123', 'def456']);
  });

  it('increments hit count', async () => {
    await store.links.incrementHit('abc123');
    expect((await store.links.get('abc123'))?.hitCount).toBe(1);
  });

  it('enforces ownership on delete', async () => {
    expect(await store.links.deleteOwned('abc123', 'u2')).toBe(false); // not owner
    expect(await store.links.get('abc123')).not.toBeNull();
    expect(await store.links.deleteOwned('abc123', 'u1')).toBe(true); // owner
    expect(await store.links.get('abc123')).toBeNull();
  });
});

describe('drizzle store — preferences', () => {
  it('upserts and reads preferences', async () => {
    await store.preferences.set('u1', { defaultProviderId: 'apple', autoOpen: false });
    expect(await store.preferences.get('u1')).toEqual({ defaultProviderId: 'apple', autoOpen: false });
    await store.preferences.set('u1', { defaultProviderId: 'waze', autoOpen: true });
    expect(await store.preferences.get('u1')).toEqual({ defaultProviderId: 'waze', autoOpen: true });
  });
});
