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
  await db.insert(schema.users).values([
    { id: 'u1', logtoSub: 'sub-1', name: 'One', email: 'one@example.com', emailVerified: true, createdAt: Date.now() },
    { id: 'u2', logtoSub: 'sub-2', name: 'Two', email: 'two@example.com', emailVerified: true, createdAt: Date.now() },
  ]);
  store = createDrizzleStore(db);
});

describe('drizzle store — links (account)', () => {
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
    expect(await store.links.deleteOwned('abc123', 'u2')).toBe(false);
    expect(await store.links.get('abc123')).not.toBeNull();
    expect(await store.links.deleteOwned('abc123', 'u1')).toBe(true);
    expect(await store.links.get('abc123')).toBeNull();
  });
});

describe('drizzle store — anonymous links & lifecycle', () => {
  it('counts recent anon links by token OR ipHash', async () => {
    const now = Date.now();
    await store.links.create({ slug: 'an1', userId: null, ownerToken: 'tokA', ipHash: 'ipA', lat: 1, lng: 1, expiresAt: now + 7 * 86_400_000 });
    await store.links.create({ slug: 'an2', userId: null, ownerToken: 'tokA', ipHash: 'ipZ', lat: 2, lng: 2 });
    await store.links.create({ slug: 'an3', userId: null, ownerToken: 'tokB', ipHash: 'ipA', lat: 3, lng: 3 });
    expect(await store.links.countRecentByAnon('tokA', 'ipA', now - 86_400_000)).toBe(3); // an1,an2 (tokA) + an3 (ipA)
    expect(await store.links.countRecentByAnon('tokB', 'ipZ', now - 86_400_000)).toBe(2); // an3 (tokB) + an2 (ipZ)
    expect(await store.links.countRecentByAnon('tokA', 'ipA', now + 86_400_000)).toBe(0); // window in the future
  });

  it('claims anon links into an account (clears token + expiry)', async () => {
    expect(await store.links.claimAnon('tokA', 'u1')).toBe(2); // an1, an2
    expect((await store.links.get('an1'))?.userId).toBe('u1');
    expect((await store.links.get('an1'))?.expiresAt).toBeNull();
    expect(await store.links.countRecentByAnon('tokA', 'nope', Date.now() - 86_400_000)).toBe(0);
  });

  it('anon owner can delete only their own', async () => {
    await store.links.create({ slug: 'an4', userId: null, ownerToken: 'tokC', lat: 4, lng: 4 });
    expect(await store.links.deleteAnon('an4', 'wrong')).toBe(false);
    expect(await store.links.deleteAnon('an4', 'tokC')).toBe(true);
    expect(await store.links.get('an4')).toBeNull();
  });

  it('prunes expired links only', async () => {
    await store.links.create({ slug: 'exp1', userId: null, ownerToken: 'tokD', lat: 5, lng: 5, expiresAt: Date.now() - 1000 });
    await store.links.create({ slug: 'keep1', userId: null, ownerToken: 'tokD', lat: 6, lng: 6, expiresAt: Date.now() + 86_400_000 });
    expect(await store.links.pruneExpired(Date.now())).toBeGreaterThanOrEqual(1);
    expect(await store.links.get('exp1')).toBeNull();
    expect(await store.links.get('keep1')).not.toBeNull();
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
