// Username + custom-slug rules for /x/<username>/<customSlug> vanity links.

// Reserved top-level paths a username must never shadow.
const RESERVED = new Set([
  'api', 'x', 'o', 'go', 'en', 'es', 'ca', 'ro', 'account', 'settings', 'use',
  'privacy', 'about', 'share', 'admin', 'www', 'app', 'assets', 'favicon',
  'robots', 'manifest', 'sw', 'offline', 'null', 'undefined',
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 3–30 chars, a–z 0–9 _ - , not a reserved word. */
export function isValidUsername(u: string): boolean {
  return /^[a-z0-9_-]{3,30}$/.test(u) && !RESERVED.has(u);
}

/** Slugify a label/title into a custom-slug candidate. */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/** 1–40 chars, a–z 0–9 - (no leading/trailing/double dashes enforced by normalize). */
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 40;
}
