import { eq, and, or, gt, lt, desc, sql, isNull, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb, type DB } from './client';
import { preferences, savedLinks, linkHistory } from './schema';
import type { Store, SavedLink, NewLink } from './store';

type LinkRow = typeof savedLinks.$inferSelect;

function rowToLink(r: LinkRow): SavedLink {
  return {
    slug: r.slug,
    userId: r.userId,
    ownerToken: r.ownerToken,
    ipHash: r.ipHash,
    lat: r.lat,
    lng: r.lng,
    label: r.label ?? undefined,
    createdAt: r.createdAt.getTime(),
    expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
    hitCount: r.hitCount,
  };
}

// All queries go through Drizzle's builder (parameterized) — no string concatenation.
// `db` is injectable so the store can be unit-tested against an in-memory SQLite.
export function createDrizzleStore(db: DB = getDb()): Store {
  return {
    preferences: {
      async get(userId) {
        const [row] = await db
          .select()
          .from(preferences)
          .where(eq(preferences.userId, userId))
          .limit(1);
        if (!row) return null;
        return { defaultProviderId: row.defaultProviderId, autoOpen: row.autoOpen };
      },
      async set(userId, prefs) {
        const now = new Date();
        await db
          .insert(preferences)
          .values({
            userId,
            defaultProviderId: prefs.defaultProviderId,
            autoOpen: prefs.autoOpen,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: preferences.userId,
            set: { defaultProviderId: prefs.defaultProviderId, autoOpen: prefs.autoOpen, updatedAt: now },
          });
      },
    },

    links: {
      async create(link: NewLink) {
        const row: LinkRow = {
          slug: link.slug,
          userId: link.userId,
          ownerToken: link.ownerToken ?? null,
          ipHash: link.ipHash ?? null,
          lat: link.lat,
          lng: link.lng,
          label: link.label ?? null,
          createdAt: new Date(),
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
          hitCount: 0,
        };
        await db.insert(savedLinks).values(row);
        return rowToLink(row);
      },
      async get(slug) {
        const [row] = await db.select().from(savedLinks).where(eq(savedLinks.slug, slug)).limit(1);
        return row ? rowToLink(row) : null;
      },
      async listByUser(userId) {
        const rows = await db
          .select()
          .from(savedLinks)
          .where(eq(savedLinks.userId, userId))
          .orderBy(desc(savedLinks.createdAt));
        return rows.map(rowToLink);
      },
      async deleteOwned(slug, userId) {
        const res = await db
          .delete(savedLinks)
          .where(and(eq(savedLinks.slug, slug), eq(savedLinks.userId, userId)));
        return (res.changes ?? 0) > 0;
      },
      async deleteAnon(slug, ownerToken) {
        const res = await db
          .delete(savedLinks)
          .where(and(eq(savedLinks.slug, slug), eq(savedLinks.ownerToken, ownerToken)));
        return (res.changes ?? 0) > 0;
      },
      async incrementHit(slug) {
        await db
          .update(savedLinks)
          .set({ hitCount: sql`${savedLinks.hitCount} + 1` })
          .where(eq(savedLinks.slug, slug));
      },
      async countByUser(userId) {
        const [row] = await db
          .select({ c: sql<number>`count(*)` })
          .from(savedLinks)
          .where(eq(savedLinks.userId, userId));
        return row?.c ?? 0;
      },
      async countRecentByAnon(ownerToken, ipHash, sinceMs) {
        const [row] = await db
          .select({ c: sql<number>`count(*)` })
          .from(savedLinks)
          .where(
            and(
              isNull(savedLinks.userId),
              gt(savedLinks.createdAt, new Date(sinceMs)),
              or(eq(savedLinks.ownerToken, ownerToken), eq(savedLinks.ipHash, ipHash)),
            ),
          );
        return row?.c ?? 0;
      },
      async claimAnon(ownerToken, userId) {
        const res = await db
          .update(savedLinks)
          .set({ userId, ownerToken: null, expiresAt: null })
          .where(and(eq(savedLinks.ownerToken, ownerToken), isNull(savedLinks.userId)));
        return res.changes ?? 0;
      },
      async pruneExpired(nowMs) {
        const res = await db
          .delete(savedLinks)
          .where(and(isNotNull(savedLinks.expiresAt), lt(savedLinks.expiresAt, new Date(nowMs))));
        return res.changes ?? 0;
      },
    },

    history: {
      async add(userId, slug) {
        await db.insert(linkHistory).values({ id: nanoid(), userId, slug, openedAt: new Date() });
      },
      async listByUser(userId, limit = 50) {
        const rows = await db
          .select({ slug: linkHistory.slug, openedAt: linkHistory.openedAt })
          .from(linkHistory)
          .where(eq(linkHistory.userId, userId))
          .orderBy(desc(linkHistory.openedAt))
          .limit(limit);
        return rows.map((r) => ({ slug: r.slug, openedAt: r.openedAt.getTime() }));
      },
    },
  };
}
