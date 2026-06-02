import type { Store } from './store';
import { createDrizzleStore } from './drizzleStore';

let cached: Store | null | undefined;

/**
 * The persistence seam. Returns a Drizzle+SQLite store when DB_URL is set,
 * else null (callers must handle null → feature unavailable). Anonymous flows
 * never call this; only the authenticated preferences/links/history APIs do.
 */
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  cached = process.env.DB_URL ? createDrizzleStore() : null;
  return cached;
}

export type { Store } from './store';
