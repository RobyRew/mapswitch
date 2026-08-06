// Expiry options for saved short links. Stored as a token; converted to minutes
// when creating a link (the DB keeps an absolute expiresAt timestamp, so no
// schema change is needed for finer-grained durations). The special 'once' token
// is usage-based, not time-based: the link self-deletes on first open.
export type ExpiryToken = 'once' | '1h' | '8h' | '1d' | '7d' | '30d' | '6mo' | '1y' | '2y' | 'never';

export const EXPIRY_TOKENS = ['once', '1h', '8h', '1d', '7d', '30d', '6mo', '1y', '2y', 'never'] as const;

// Custom account links default to one year (long-lived but not immortal).
export const DEFAULT_EXPIRY: ExpiryToken = '1y';

// A one-time link still carries a safety expiry so an unopened one can't live
// forever; 'once' behaviour is enforced by the oneTime flag on the link.
const ONCE_SAFETY_MINUTES = 525600; // 1 year

const MINUTES: Record<Exclude<ExpiryToken, 'never' | 'once'>, number> = {
  '1h': 60,
  '8h': 480,
  '1d': 1440,
  '7d': 10080,
  '30d': 43200,
  '6mo': 259200, // 180 days
  '1y': 525600, // 365 days
  '2y': 1051200, // 730 days
};

/** True for the usage-based "delete after first open" token. */
export function isOneTime(token: string): boolean {
  return token === 'once';
}

/** Minutes for a token, or null for "never". 'once' → a 1y safety cap. */
export function expiryMinutes(token: string): number | null {
  if (token === 'never') return null;
  if (token === 'once') return ONCE_SAFETY_MINUTES;
  return MINUTES[token as Exclude<ExpiryToken, 'never' | 'once'>] ?? MINUTES['1y'];
}

export function isExpiryToken(v: unknown): v is ExpiryToken {
  return typeof v === 'string' && (EXPIRY_TOKENS as readonly string[]).includes(v);
}
