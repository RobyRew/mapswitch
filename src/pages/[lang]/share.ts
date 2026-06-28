import type { APIRoute } from 'astro';
import { isLocale, DEFAULT_LOCALE } from '@/i18n/utils';

export const prerender = false;

// Sharing is now part of the home page result. Keep this path as a
// compatibility redirect for old links / bookmarks.
export const GET: APIRoute = ({ params }) => {
  const locale = isLocale(params.lang) ? params.lang : DEFAULT_LOCALE;
  return new Response(null, { status: 302, headers: { location: `/${locale}` } });
};
