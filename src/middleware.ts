import { defineMiddleware } from 'astro:middleware';
import { securityHeaders } from '@/lib/security/headers';
import { rateLimit } from '@/lib/ratelimit/tokenBucket';

function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  // Rate-limit the API surface (per client IP).
  if (url.pathname.startsWith('/api/')) {
    const { ok, retryAfter } = rateLimit(`api:${clientIp(request)}`);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': String(retryAfter) },
      });
    }
  }

  const response = await next();

  // Security headers + CSP on every response (mirrors the portfolio nginx.conf).
  for (const [key, value] of Object.entries(securityHeaders(url.pathname))) {
    response.headers.set(key, value);
  }
  return response;
});
