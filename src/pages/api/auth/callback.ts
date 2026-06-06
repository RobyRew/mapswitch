import type { APIRoute } from 'astro';
import { makeLogtoClient, publicOrigin, resolveAppUser, SID_COOKIE, type LogtoIdClaims } from '@/lib/auth/logto';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const sid = cookies.get(SID_COOKIE)?.value;
  if (!sid) return redirect('/api/auth/sign-in', 302);

  // Rebuild the callback URL from the public origin (Traefik terminates TLS, so
  // the internal request origin may be http://…). Keep the ?code&state query.
  const callbackUrl = `${publicOrigin(url.origin)}${url.pathname}${url.search}`;

  const client = makeLogtoClient(sid, () => {});
  try {
    await client.handleSignInCallback(callbackUrl);
    const { claims } = await client.getContext();
    if (claims) resolveAppUser(claims as LogtoIdClaims); // create the local user row now
  } catch {
    return redirect('/api/auth/sign-in', 302);
  }

  const returnTo = cookies.get('ms_rt')?.value || '/';
  cookies.delete('ms_rt', { path: '/' });
  return redirect(returnTo, 302);
};
