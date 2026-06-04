import type { APIRoute } from 'astro';
import { pickSharedInput, detectLocale } from '@/lib/share/shareTarget';
import { path } from '@/i18n/utils';

export const prerender = false;

// Web Share Target receiver. Android delivers shared content here (title/text/url)
// when MapSwitch is installed as a PWA; an iOS Shortcut can call it too. We pull
// the best value out and hand it to the home resolver via ?s=… (read client-side
// so the home page stays static). No logging of shared content.
export const GET: APIRoute = ({ url, request }) => {
  const shared = pickSharedInput(url.searchParams);
  const home = path(detectLocale(request.headers.get('accept-language')));
  const location = shared ? `${home}?s=${encodeURIComponent(shared)}` : home;
  return new Response(null, { status: 302, headers: { location } });
};
