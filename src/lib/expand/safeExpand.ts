import { lookup } from 'node:dns/promises';
import { isAllowedHost } from './allowlist';
import { isBlockedIp } from './ipGuard';

export class ExpandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpandError';
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
type LookupLike = (host: string) => Promise<Array<{ address: string }>>;

export interface ExpandOptions {
  maxHops?: number;
  timeoutMs?: number;
  /** Injectable for tests — keeps the suite hermetic (no real network/DNS). */
  fetchImpl?: FetchLike;
  lookupImpl?: LookupLike;
}

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

// A real browser UA + consent cookie so EU Google short links resolve to their
// destination instead of being served a consent.google.com interstitial.
const BROWSER_HEADERS: Record<string, string> = {
  accept: '*/*',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  cookie: 'CONSENT=YES+; SOCS=CAISEwgDEgk',
};

function toHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ExpandError('invalid url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExpandError('unsupported scheme');
  }
  return url;
}

function isConsentHost(url: URL): boolean {
  return url.hostname === 'consent.google.com' || url.hostname.endsWith('.consent.google.com');
}

/**
 * SSRF guard per hop: host must be allow-listed (only map domains — which an
 * attacker cannot repoint at private IPs), and the resolved IP(s) must not be
 * private/internal. The allow-list is the primary control; the IP check is
 * defense-in-depth.
 */
async function assertSafeHost(url: URL, doLookup: LookupLike): Promise<void> {
  if (!isAllowedHost(url.hostname)) throw new ExpandError('host not allowed');
  let addrs: Array<{ address: string }>;
  try {
    addrs = await doLookup(url.hostname);
  } catch {
    throw new ExpandError('dns failure');
  }
  if (!addrs.length) throw new ExpandError('no address');
  for (const a of addrs) {
    if (isBlockedIp(a.address)) throw new ExpandError('blocked address');
  }
}

const defaultLookup: LookupLike = (host) => lookup(host, { all: true });

/**
 * Follow redirects for a SHORT map link and return the final URL — safely.
 * Per hop: handle EU consent interstitials via `continue`; otherwise http(s)-only
 * + host allow-listed + non-private resolved IP, capped hops + wall-clock budget,
 * HEAD-only (no body), no credentials. Throws ExpandError on any breach.
 */
export async function safeExpand(rawUrl: string, opts: ExpandOptions = {}): Promise<string> {
  const maxHops = opts.maxHops ?? 5;
  const timeoutMs = opts.timeoutMs ?? 4000;
  const doLookup = opts.lookupImpl ?? defaultLookup;
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, init) => fetch(u, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = toHttpUrl(rawUrl);

    for (let hop = 0; hop <= maxHops; hop++) {
      // EU consent interstitial: never fetch it — take the real URL from `continue`.
      if (isConsentHost(current)) {
        const cont = current.searchParams.get('continue');
        if (!cont) throw new ExpandError('consent without continue');
        current = toHttpUrl(cont);
        continue;
      }

      await assertSafeHost(current, doLookup);

      let res: Response;
      try {
        res = await doFetch(current.href, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: BROWSER_HEADERS,
        });
        if (res.status === 405 || res.status === 501) {
          res = await doFetch(current.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { ...BROWSER_HEADERS, range: 'bytes=0-0' },
          });
        }
      } catch (err) {
        if (err instanceof ExpandError) throw err;
        throw new ExpandError('fetch failed');
      }

      if (REDIRECT_STATUS.has(res.status)) {
        const loc = res.headers.get('location');
        if (!loc) throw new ExpandError('redirect without location');
        current = toHttpUrl(new URL(loc, current).href);
        continue;
      }

      return current.href;
    }

    throw new ExpandError('too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
