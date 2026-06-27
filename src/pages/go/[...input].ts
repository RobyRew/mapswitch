import type { APIRoute } from 'astro';
import { resolveInput } from '@/lib/resolve/resolve';
import { buildShareUrl } from '@/lib/share/encode';

export const prerender = false;

// Mutable-headers redirect — Response.redirect() is immutable and the security
// middleware can't append to it.
function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

// Quick-open entrypoint: resolve any link/coords and bounce to the app chooser.
//   /go?to=<link-or-coords>   ·   /go/41.1151,1.21836   ·   /go/<plus+code>
// On success → /o?ll=…  (chooser, auto-opens your default app if you set one).
// On failure → home with the input prefilled so you can see why / retry.
export const GET: APIRoute = async ({ params, url }) => {
  const raw = (params.input || url.searchParams.get('to') || url.searchParams.get('q') || '').trim();
  if (!raw) return redirect('/');

  let input = raw;
  try {
    input = decodeURIComponent(raw);
  } catch {
    /* keep raw if it isn't valid percent-encoding */
  }
  if (input.length > 2048) return redirect('/');

  const r = await resolveInput(input);
  if (!r.ok) return redirect(`/?to=${encodeURIComponent(input)}`);
  return redirect(buildShareUrl('', r.match)); // relative /o?ll=…
};
