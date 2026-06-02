import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ── better-auth core tables ────────────────────────────────────────────────
// Column names match better-auth's field names (camelCase). Verified against
// better-auth / @better-auth/passkey schema definitions.
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

// ── passkey plugin table (@better-auth/passkey) ─────────────────────────────
export const passkey = sqliteTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('publicKey').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credentialID').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('deviceType').notNull(),
  backedUp: integer('backedUp', { mode: 'boolean' }).notNull(),
  transports: text('transports'),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  aaguid: text('aaguid'),
});

// ── app tables ──────────────────────────────────────────────────────────────
export const preferences = sqliteTable('preferences', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  defaultProviderId: text('defaultProviderId'),
  autoOpen: integer('autoOpen', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const savedLinks = sqliteTable(
  'saved_links',
  {
    slug: text('slug').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    label: text('label'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }),
    hitCount: integer('hitCount').notNull().default(0),
  },
  (t) => [index('saved_links_user_idx').on(t.userId)],
);

export const linkHistory = sqliteTable(
  'link_history',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').references(() => savedLinks.slug, { onDelete: 'set null' }),
    openedAt: integer('openedAt', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('link_history_user_idx').on(t.userId, t.openedAt)],
);
