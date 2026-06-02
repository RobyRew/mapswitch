// In-memory token bucket keyed by client id (IP). Fine for a single VPS; the
// RateResult shape lets a SQLite/Redis impl drop in later without callers changing.

const RPM = Number(process.env.RATE_LIMIT_RPM) || 60;
const BURST = Number(process.env.RATE_LIMIT_BURST) || 20;
const REFILL_PER_MS = RPM / 60000;

interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, cost = 1): RateResult {
  const now = Date.now();

  // Occasional sweep of idle buckets to bound memory.
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) {
      if (now - b.updated > 300_000) buckets.delete(k);
    }
    lastSweep = now;
  }

  let b = buckets.get(key);
  if (!b) {
    b = { tokens: BURST, updated: now };
    buckets.set(key, b);
  }
  b.tokens = Math.min(BURST, b.tokens + (now - b.updated) * REFILL_PER_MS);
  b.updated = now;

  if (b.tokens >= cost) {
    b.tokens -= cost;
    return { ok: true, retryAfter: 0 };
  }
  const needed = cost - b.tokens;
  return { ok: false, retryAfter: Math.max(1, Math.ceil(needed / REFILL_PER_MS / 1000)) };
}
