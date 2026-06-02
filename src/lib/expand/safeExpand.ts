import { lookup } from 'node:dns/promises';
import { Agent, fetch as undiciFetch } from 'undici';
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

/** Allow-list + DNS-resolve + private-IP check. Returns the vetted IP list. */
async function resolveAndVet(url: URL, doLookup: LookupLike): Promise<string[]> {
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
  return addrs.map((a) => a.address);
}

const defaultLookup: LookupLike = (host) => lookup(host, { all: true });

/**
 * Production fetch that PINS the socket to an already-vetted IP. `fetch`/undici
 * would otherwise re-resolve DNS itself, so a rebinding attacker could pass our
 * check with a public IP and connect to a private one (TOCTOU). Pinning makes
 * "the IP we validated" === "the IP we connect to", per hop, while keeping the
 * hostname for TLS SNI / cert validation.
 */
function pinnedFetch(pinnedIp: string): FetchLike {
  const family = pinnedIp.includes(':') ? 6 : 4;
  const agent = new Agent({
    connect: {
      // dns.lookup-style signature; ignore the host, return the pinned IP only.
      lookup: ((_hostname: string, _options: unknown, cb: (e: Error | null, a: string, f: number) => void) =>
        cb(null, pinnedIp, family)) as never,
    },
  });
  return (url, init) =>
    undiciFetch(url, { ...init, dispatcher: agent } as never) as unknown as Promise<Response>;
}

/**
 * Follow redirects for a SHORT map link and return the final URL — safely.
 * On the initial URL and EVERY hop: http(s)-only, host allow-listed, resolved
 * IP(s) not private/internal, socket pinned to the vetted IP, capped hops +
 * wall-clock budget, HEAD-only (no body), no cookies. Throws on any breach.
 */
export async function safeExpand(rawUrl: string, opts: ExpandOptions = {}): Promise<string> {
  const maxHops = opts.maxHops ?? 5;
  const timeoutMs = opts.timeoutMs ?? 4000;
  const doLookup = opts.lookupImpl ?? defaultLookup;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = toHttpUrl(rawUrl);

    for (let hop = 0; hop <= maxHops; hop++) {
      const ips = await resolveAndVet(current, doLookup);
      const doFetch: FetchLike = opts.fetchImpl ?? pinnedFetch(ips[0]!);

      let res: Response;
      try {
        res = await doFetch(current.href, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: { accept: '*/*' },
        });
        if (res.status === 405 || res.status === 501) {
          res = await doFetch(current.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
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

      return current.href;
    }

    throw new ExpandError('too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
