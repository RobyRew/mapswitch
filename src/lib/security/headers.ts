// Thin Astro/SSR-side adapter over the runtime-safe security-headers module in
// scripts/. Kept as a separate file so the umami origin is resolved from the
// build-time `import.meta.env` here, while the production wrapper (server.mjs)
// resolves it from `process.env`. Both call the same pure function so the CSP
// (and every other header) stays identical across static and dynamic routes.
import {
  securityHeaders as buildHeaders,
  buildCSP as buildCsp,
} from '../../../scripts/security-headers.mjs';

const UMAMI = (import.meta.env.PUBLIC_UMAMI_SCRIPT_URL as string | undefined) ?? null;

export function buildCSP(): string {
  return buildCsp(UMAMI);
}

export function securityHeaders(pathname: string): Record<string, string> {
  return buildHeaders(pathname, UMAMI);
}
