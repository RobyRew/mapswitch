import type { APIRoute } from 'astro';
import { normalizeUsername, normalizeSlug } from '@/lib/share/slug';

export const prerender = false;

// Legacy vanity path. Canonical is now /@<username>/<slug>; 301 old links to it.
export const GET: APIRoute = ({ params, url }) => {
  const username = normalizeUsername(params.username ?? '');
  const slug = normalizeSlug(params.slug ?? '');
  const lang = url.searchParams.get('lang');
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return new Response(null, { status: 301, headers: { location: `/@${username}/${slug}${q}` } });
};
