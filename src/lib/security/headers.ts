// Single source of truth for security headers + CSP. Mirrors the portfolio's
// nginx.conf, adapted for the Node runtime (set in src/middleware.ts).

// SHA-256 hashes of the STATIC inline scripts Astro renders: our theme bootstrap
// (BaseLayout) + Astro's two `client:load` hydration shims. Using hashes lets us
// drop `script-src 'unsafe-inline'` while still allowing exactly these scripts —
// and unlike a per-request nonce, hashes also work for prerendered pages.
// Regenerate after an Astro upgrade or after adding a new client:* directive:
//   npm run build && node scripts/csp-hashes.mjs
const INLINE_SCRIPT_HASHES = [
  "'sha256-YmRmj8JZSFEeMG2aZy0MxpRcOtpAiWGhtr4oMKryW50='", // theme bootstrap
  "'sha256-QzWFZi+FLIx23tnm9SBU4aEgx4x8DsuASP07mfqol/c='", // astro client:load shim
  "'sha256-U7a72oKuFFz8D7GUHLA1NZ0ciymHmDOc9T9aVDg2rWU='", // astro-island runtime
];

function umamiOrigin(): string | null {
  const url = import.meta.env.PUBLIC_UMAMI_SCRIPT_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCSP(): string {
  const umami = umamiOrigin();
  const script = ["'self'", ...INLINE_SCRIPT_HASHES, umami].filter(Boolean).join(' ');
  const connect = ["'self'", umami].filter(Boolean).join(' ');
  return [
    "default-src 'self'",
    `script-src ${script}`, // no 'unsafe-inline' — inline scripts allowed by hash only
    "style-src 'self' 'unsafe-inline'", // Astro inlines critical CSS (accepted residual)
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Routes that can carry coordinates in the URL — never leak them via Referer. */
function isSensitiveRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname === '/o' ||
    /\/resolve$/.test(pathname) ||
    pathname.startsWith('/x/')
  );
}

export function securityHeaders(pathname: string): Record<string, string> {
  return {
    'Content-Security-Policy': buildCSP(),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': isSensitiveRoute(pathname) ? 'no-referrer' : 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), payment=(), usb=(), midi=(), interest-cohort=(), geolocation=(self)',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}
