// FUTURE accounts schema — DORMANT. Documented here so the Store interfaces have
// a concrete target and the migration shape is reviewable. Intentionally NOT
// using drizzle-orm yet (zero new runtime deps until the accounts phase).

export interface UserRow {
  id: string;
  email: string;
  createdAt: number;
}

export interface PreferenceRow {
  userId: string;
  defaultProviderId: string | null;
  autoOpen: boolean;
  updatedAt: number;
}

export interface SavedLinkRow {
  slug: string;
  userId: string | null; // null = anonymous link
  lat: number;
  lng: number;
  label: string | null;
  createdAt: number;
}

/*
 When the accounts phase lands, replace the interfaces above with real tables:

   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
   export const users = sqliteTable('users', {
     id: text('id').primaryKey(),
     email: text('email').notNull().unique(),
     createdAt: integer('created_at').notNull(),
   });
   export const preferences = sqliteTable('preferences', { ... });
   export const savedLinks = sqliteTable('saved_links', { ... });
*/
