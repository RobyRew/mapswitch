import { parseLatLngPair } from './coords';
import { isFullPlusCode } from './pluscode';

export type NormalizedInput =
  | { kind: 'url'; url: URL }
  | { kind: 'pluscode'; code: string }
  | { kind: 'coords'; raw: string }
  | { kind: 'empty' }
  | { kind: 'unknown'; text: string };

/** Pull the first http(s)/geo URL out of a possibly-messy pasted string. */
function extractUrl(text: string): URL | null {
  const candidate = /^geo:/i.test(text)
    ? text
    : (text.match(/\bhttps?:\/\/[^\s<>"']+/i)?.[0] ?? text);
  try {
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'geo:') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/** Classify a raw pasted string. Pure & isomorphic. */
export function normalizeInput(raw: string): NormalizedInput {
  const text = raw.trim();
  if (!text) return { kind: 'empty' };
  if (parseLatLngPair(text)) return { kind: 'coords', raw: text };
  if (isFullPlusCode(text)) return { kind: 'pluscode', code: text };
  const url = extractUrl(text);
  if (url) return { kind: 'url', url };
  return { kind: 'unknown', text };
}
