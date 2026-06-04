import { createHash } from 'node:crypto';

/** Best client IP behind Traefik (X-Forwarded-For first hop), else X-Real-IP. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Salted, truncated hash of an IP — we never store raw IPs (privacy). */
export function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? 'mapswitch';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 32);
}
