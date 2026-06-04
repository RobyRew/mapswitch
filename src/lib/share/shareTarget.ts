// Helpers for the Web Share Target endpoint (/share-target). Kept separate from
// the Astro route so the selection logic is unit-testable.
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n/utils';

const URL_RE = /https?:\/\/[^\s]+/i;

/**
 * Choose the most resolvable value from a share. Prefers a real URL — even one
 * buried in prose (e.g. Waze shares "…watch my drive: https://waze.com/ul?…") —
 * across the url → text → title params, then falls back to plain text (a place
 * name). Returns null when nothing usable was shared.
 */
export function pickSharedInput(params: URLSearchParams): string | null {
  const candidates = [params.get('url'), params.get('text'), params.get('title')];
  for (const c of candidates) {
    const m = c?.match(URL_RE);
    if (m) return m[0];
  }
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return null;
}

/** Best-effort UI locale from an Accept-Language header. */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase().split('-')[0];
    const hit = LOCALES.find((l) => l === tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
