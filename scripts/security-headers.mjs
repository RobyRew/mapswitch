// Single source of truth for security headers + CSP. Imported by BOTH:
//   • the Astro middleware (SSR + dev) via src/lib/security/headers.ts, and
//   • the production server wrapper (server.mjs) — which also covers the
//     prerendered/static pages that Astro middleware never sees.
// Plain ESM, no Vite / import.meta — safe to run in the bare Node runtime.
//
// The umami origin is passed in (build-time via import.meta.env for the
// middleware, runtime via process.env for the wrapper) so this stays a pure
// function with no environment coupling.

// SHA-256 hashes of the STATIC inline scripts Astro renders: the house theme
// bootstrap (BaseLayout, from @robyrew/web-config) + Astro's two `client:load`
// hydration shims. Using hashes lets us
// drop `script-src 'unsafe-inline'` while still allowing exactly these scripts —
// and unlike a per-request nonce, hashes also work for prerendered pages.
// Regenerate after an Astro upgrade or after adding a new client:* directive:
//   npm run build && node scripts/csp-hashes.mjs
const INLINE_SCRIPT_HASHES = [
  "'sha256-iM9FQgYDc5UmXX6BFmgSgPMHM0/EfPCOavc3EhWdsV0='", // theme bootstrap (@robyrew/ui 0.4.0 themeBootstrap)
  "'sha256-1BvDVWLr3QCC20uHhUDi27eDFVJpk1uMQJGIWKUks2I='", // astro client:load shim (Astro 7.4)
  "'sha256-UIrFqcaitjA3OKa9mHKajg3N+0Y7tW9+y0o3QmMFeZQ='", // astro-island runtime (Astro 7.4)
];

/** Origin of a script URL (for allow-listing umami), or null if unset/invalid. */
function originOf(url) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCSP(umamiScriptUrl) {
  const umami = originOf(umamiScriptUrl);
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
    "worker-src 'self'", // service worker (PWA) — same-origin only
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Routes that can carry coordinates in the URL — never leak them via Referer. */
function isSensitiveRoute(pathname) {
  return (
    pathname.startsWith('/api') ||
    pathname === '/o' ||
    /\/resolve$/.test(pathname) ||
    pathname.startsWith('/x/')
  );
}

export function securityHeaders(pathname, umamiScriptUrl) {
  return {
    'Content-Security-Policy': buildCSP(umamiScriptUrl),
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
