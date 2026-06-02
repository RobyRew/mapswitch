// SSRF defense: reject addresses that point at private / internal / special
// ranges. Run this against the *resolved* IP(s) before connecting to a host.

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

interface Cidr {
  base: number;
  bits: number;
}

function cidr(ip: string, bits: number): Cidr {
  const base = ipv4ToLong(ip);
  return { base: base ?? 0, bits };
}

// RFC 1918 private, loopback, link-local (incl. 169.254.169.254 metadata),
// CGNAT, documentation/test, multicast, reserved, unspecified, broadcast.
const BLOCKED_V4: readonly Cidr[] = [
  cidr('0.0.0.0', 8),
  cidr('10.0.0.0', 8),
  cidr('100.64.0.0', 10),
  cidr('127.0.0.0', 8),
  cidr('169.254.0.0', 16),
  cidr('172.16.0.0', 12),
  cidr('192.0.0.0', 24),
  cidr('192.0.2.0', 24),
  cidr('192.88.99.0', 24),
  cidr('192.168.0.0', 16),
  cidr('198.18.0.0', 15),
  cidr('198.51.100.0', 24),
  cidr('203.0.113.0', 24),
  cidr('224.0.0.0', 4),
  cidr('240.0.0.0', 4),
];

function v4Blocked(long: number): boolean {
  return BLOCKED_V4.some(({ base, bits }) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (long & mask) === (base & mask);
  });
}

/** True if connecting to this IP literal would be unsafe. */
export function isBlockedIp(ip: string): boolean {
  const addr = ip.trim().toLowerCase();
  const noZone = addr.split('%')[0] ?? addr; // strip IPv6 zone id

  // Plain IPv4.
  const v4 = ipv4ToLong(noZone);
  if (v4 !== null) return v4Blocked(v4);

  // IPv6.
  if (noZone === '::' || noZone === '::1') return true; // unspecified / loopback

  // IPv4-mapped (::ffff:a.b.c.d, possibly fully expanded) — unwrap and re-check.
  const mapped = noZone.match(/:ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mapped && mapped[1]) {
    const m = ipv4ToLong(mapped[1]);
    return m === null ? true : v4Blocked(m);
  }
  // IPv4-mapped in hextet form (::ffff:7f00:1).
  const mappedHex = noZone.match(/:ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mappedHex && mappedHex[1] && mappedHex[2]) {
    const long = (((parseInt(mappedHex[1], 16) << 16) >>> 0) + parseInt(mappedHex[2], 16)) >>> 0;
    return v4Blocked(long);
  }

  if (/^f[cd][0-9a-f]*:/.test(noZone)) return true; // ULA  fc00::/7
  if (/^fe[89ab][0-9a-f]*:/.test(noZone)) return true; // link-local fe80::/10
  if (/^ff[0-9a-f]*:/.test(noZone)) return true; // multicast ff00::/8

  return false; // assume public/routable
}
