// Single source of truth for security headers + CSP. Mirrors the portfolio's
// nginx.conf, adapted for the Node runtime (set in src/middleware.ts).

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
  const script = ["'self'", "'unsafe-inline'", umami].filter(Boolean).join(' ');
  const connect = ["'self'", umami].filter(Boolean).join(' ');
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'", // Astro inlines critical CSS
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
  return pathname.startsWith('/api') || pathname === '/o' || /\/resolve$/.test(pathname);
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
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}
