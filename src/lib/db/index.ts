import type { Store } from './store';
import { createDrizzleStore } from './drizzleStore';
import { ensureSweep } from './sweep';

let cached: Store | null | undefined;

/**
 * The persistence seam. Returns a Drizzle+SQLite store when DB_URL is set,
 * else null (callers must handle null → feature unavailable). Also starts the
 * hourly expired-link sweep on first real store.
 */
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  cached = process.env.DB_URL ? createDrizzleStore() : null;
  if (cached) ensureSweep(cached);
  return cached;
}

export type { Store } from './store';
