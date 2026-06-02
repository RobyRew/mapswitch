import type { Match } from '../providers/types';
import { parseWithRegistry, SHORT_LINK_HOSTS } from '../providers/registry';
import { normalizeInput } from './normalize';
import { parseLatLngPair } from './coords';
import { decodePlusCode } from './pluscode';

/**
 * Parse a raw input WITHOUT any network — safe to run in the browser.
 * Returns null when the input is unrecognised OR is a short link that first
 * needs server-side expansion (check `isExpandable`).
 */
export function parsePure(raw: string): Match | null {
  const n = normalizeInput(raw);
  switch (n.kind) {
    case 'coords': {
      const pair = parseLatLngPair(n.raw);
      return pair ? { ...pair, source: 'coords' } : null;
    }
    case 'pluscode': {
      const pair = decodePlusCode(n.code);
      return pair ? { ...pair, source: 'pluscode' } : null;
    }
    case 'url':
      return parseWithRegistry(n.url);
    default:
      return null;
  }
}

/** True when the input is a known short link that must be expanded server-side. */
export function isExpandable(raw: string): boolean {
  const n = normalizeInput(raw);
  if (n.kind !== 'url') return false;
  const h = n.url.hostname.toLowerCase();
  return SHORT_LINK_HOSTS.some((s) => h === s || h.endsWith('.' + s));
}

/** The http(s) URL string to hand the server expander, if the input is one. */
export function urlForExpansion(raw: string): string | null {
  const n = normalizeInput(raw);
  if (n.kind !== 'url') return null;
  if (n.url.protocol !== 'http:' && n.url.protocol !== 'https:') return null;
  return n.url.href;
}
