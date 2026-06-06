import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ── Identity ────────────────────────────────────────────────────────────────
// Logto owns authentication (passwords, social, passkeys, MFA, email). The app
// keeps only a thin local row keyed by the Logto subject (`sub`) — the canonical
// user id across every service. App data FKs to `users.id`, never to an email or
// provider id. See docs/auth-logto.md.
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // app-side id (nanoid)
  logtoSub: text('logto_sub').notNull().unique(), // Logto subject — the link to identity
  email: text('email'), // cached from the ID token; may go stale
  name: text('name'),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt').notNull(), // Date.now() ms
});

// Server-side Logto session store. The browser holds only an opaque `ms_sid`
// cookie; the OIDC tokens live here (never in browser JS). `data` is the JSON
// Logto storage map for that session id.
export const logtoSessions = sqliteTable('logto_sessions', {
  id: text('id').primaryKey(), // opaque session id (cookie value)
  data: text('data').notNull(), // JSON: { [logtoStorageKey]: string }
  createdAt: integer('createdAt').notNull(), // Date.now() ms
  expiresAt: integer('expiresAt').notNull(), // Date.now() ms
});

// ── app tables ──────────────────────────────────────────────────────────────
export const preferences = sqliteTable('preferences', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  defaultProviderId: text('defaultProviderId'),
  autoOpen: integer('autoOpen', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const savedLinks = sqliteTable(
  'saved_links',
  {
    slug: text('slug').primaryKey(),
    userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), // null = anonymous
    ownerToken: text('ownerToken'), // anonymous owner (localStorage id) — quota + claim
    ipHash: text('ipHash'), // salted hash of creator IP (anon quota)
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    label: text('label'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }),
    hitCount: integer('hitCount').notNull().default(0),
  },
  (t) => [
    index('saved_links_user_idx').on(t.userId),
    index('saved_links_owner_idx').on(t.ownerToken),
    index('saved_links_iphash_idx').on(t.ipHash),
  ],
);

export const linkHistory = sqliteTable(
  'link_history',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').references(() => savedLinks.slug, { onDelete: 'set null' }),
    openedAt: integer('openedAt', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('link_history_user_idx').on(t.userId, t.openedAt)],
);
