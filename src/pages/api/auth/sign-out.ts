import type { APIRoute } from 'astro';
import { dropSession, makeLogtoClient, publicOrigin, SID_COOKIE } from '@/lib/auth/logto';

export const prerender = false;

// Always sign out AT Logto (end-session), not just locally — otherwise the SSO
// session survives and "sign out" wouldn't actually log the user out.
const handler: APIRoute = async ({ cookies, url, redirect }) => {
  const sid = cookies.get(SID_COOKIE)?.value;
  let target = `${publicOrigin(url.origin)}/`;
  if (sid) {
    try {
      const client = makeLogtoClient(sid, (u) => {
        target = u;
      });
      await client.signOut(`${publicOrigin(url.origin)}/`);
    } catch {
      /* fall through to local cleanup even if Logto is unreachable */
    }
    dropSession(sid);
    cookies.delete(SID_COOKIE, { path: '/' });
  }
  return redirect(target, 302);
};

export const GET = handler;
export const POST = handler;
