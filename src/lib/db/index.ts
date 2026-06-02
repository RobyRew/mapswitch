import type { Store } from './store';

let cached: Store | null | undefined;

/**
 * The persistence seam. Returns null when no DB is configured (the default
 * today) — callers MUST handle null and fall back to client-side localStorage.
 *
 * Turning on accounts later means only this function changes: read DB_URL,
 * build a Drizzle+SQLite Store, and return it. No caller has to be rewritten.
 */
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    cached = null;
    return cached;
  }
  // Future: cached = createSqliteStore(dbUrl);
  cached = null;
  return cached;
}

export type { Store } from './store';
