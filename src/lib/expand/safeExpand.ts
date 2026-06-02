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
 * On the initial URL and EVERY hop: http(s)-only, host must be allow-listed,
 * resolved IP(s) must not be private/internal. Capped hops + wall-clock budget,
 * HEAD-only (no body), no cookies/credentials. Throws ExpandError on any breach.
 */
export async function safeExpand(rawUrl: string, opts: ExpandOptions = {}): Promise<string> {
  const maxHops = opts.maxHops ?? 5;
  const timeoutMs = opts.timeoutMs ?? 4000;
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const doLookup = opts.lookupImpl ?? defaultLookup;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = toHttpUrl(rawUrl);

    for (let hop = 0; hop <= maxHops; hop++) {
      await assertSafeHost(current, doLookup);

      let res: Response;
      try {
        res = await doFetch(current.href, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          credentials: 'omit',
          headers: { accept: '*/*' },
        });
        // Some endpoints reject HEAD — retry once with a tiny ranged GET.
        if (res.status === 405 || res.status === 501) {
          res = await doFetch(current.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            credentials: 'omit',
            headers: { accept: '*/*', range: 'bytes=0-0' },
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

      // Not a redirect → final, allow-listed URL.
      return current.href;
    }

    throw new ExpandError('too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
