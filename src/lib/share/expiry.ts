// Expiry options for saved short links. Stored as a token; converted to minutes
// when creating a link (the DB keeps an absolute expiresAt timestamp, so no
// schema change is needed for finer-grained durations).
export type ExpiryToken = '1h' | '8h' | '1d' | '7d' | '30d' | '6mo' | '1y' | '2y' | 'never';

export const EXPIRY_TOKENS = ['1h', '8h', '1d', '7d', '30d', '6mo', '1y', '2y', 'never'] as const;

export const DEFAULT_EXPIRY: ExpiryToken = '7d';

const MINUTES: Record<Exclude<ExpiryToken, 'never'>, number> = {
  '1h': 60,
  '8h': 480,
  '1d': 1440,
  '7d': 10080,
  '30d': 43200,
  '6mo': 259200, // 180 days
  '1y': 525600, // 365 days
  '2y': 1051200, // 730 days
};

/** Minutes for a token, or null for "never". Unknown tokens fall back to 7d. */
export function expiryMinutes(token: string): number | null {
  if (token === 'never') return null;
  return MINUTES[token as Exclude<ExpiryToken, 'never'>] ?? MINUTES['7d'];
}

export function isExpiryToken(v: unknown): v is ExpiryToken {
  return typeof v === 'string' && (EXPIRY_TOKENS as readonly string[]).includes(v);
}
