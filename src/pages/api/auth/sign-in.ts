import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { makeLogtoClient, publicOrigin, pruneExpiredSessions, SID_COOKIE } from '@/lib/auth/logto';

export const prerender = false;

// Only allow local-path returnTo values — blocks open-redirect via ?returnTo=.
function sanitizeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const secure = url.protocol === 'https:' || !!process.env.PUBLIC_SITE_URL?.startsWith('https');

  // Opaque server-session id. Must exist before the redirect so the callback can
  // find the PKCE/state Logto stores under it.
  let sid = cookies.get(SID_COOKIE)?.value;
  if (!sid) {
    sid = randomBytes(18).toString('base64url');
    cookies.set(SID_COOKIE, sid, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 });
  }
  cookies.set('ms_rt', sanitizeReturnTo(url.searchParams.get('returnTo')), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  pruneExpiredSessions();

  let target = '/';
  const client = makeLogtoClient(sid, (u) => {
    target = u;
  });
  await client.signIn({ redirectUri: `${publicOrigin(url.origin)}/api/auth/callback` });
  return redirect(target, 302);
};
