import type { APIRoute } from 'astro';
import { clientIp } from '@/lib/http/ip';

export const prerender = false;

// Thin, last-resort fallback for "use my current location" when the browser's
// Geolocation API can't get a fix (common on desktop Safari / Location Services
// off). City-level only. We resolve the request IP server-side so the visitor's
// IP never reaches a third party from the client, and we log nothing.
const GEOIP_URL = (process.env.GEOIP_URL || 'https://ipwho.is').replace(/\/$/, '');

function isPublicIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return false;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^(fc|fd|fe80)/i.test(ip)) return false;
  return true;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export const GET: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  // Public client IP → geolocate it; otherwise (local/dev) let the service read
  // the server's egress IP so the feature is still testable.
  const url = isPublicIp(ip) ? `${GEOIP_URL}/${encodeURIComponent(ip)}` : `${GEOIP_URL}/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'MapSwitch/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return json({ error: 'geoip_failed' }, 502);
    const d = (await res.json()) as {
      success?: boolean;
      latitude?: number;
      longitude?: number;
      city?: string;
      region?: string;
      country?: string;
    };
    if (d.success === false || typeof d.latitude !== 'number' || typeof d.longitude !== 'number') {
      return json({ error: 'geoip_failed' }, 502);
    }
    const label = [d.city, d.region, d.country].filter(Boolean).join(', ') || undefined;
    return json({ lat: d.latitude, lng: d.longitude, label, approximate: true });
  } catch {
    return json({ error: 'geoip_failed' }, 502);
  } finally {
    clearTimeout(timer);
  }
};
