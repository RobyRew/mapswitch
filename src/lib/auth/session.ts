import { makeLogtoClient, resolveAppUser, SID_COOKIE, type LogtoIdClaims } from './logto';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  username: string | null;
  emailVerified: boolean;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/**
 * Resolve the current user from the session cookie, or null. Runtime-only.
 * Unchanged public contract from the better-auth era — every consumer
 * (api/links, api/preferences, the account page) still calls getUser(request).
 */
export async function getUser(request: Request): Promise<SessionUser | null> {
  const sid = readCookie(request.headers.get('cookie'), SID_COOKIE);
  if (!sid) return null;
  try {
    const client = makeLogtoClient(sid, () => {});
    const { isAuthenticated, claims } = await client.getContext();
    if (!isAuthenticated || !claims) return null;
    const u = resolveAppUser(claims as LogtoIdClaims);
    return {
      id: u.id,
      email: u.email ?? '',
      name: u.name ?? '',
      username: u.username ?? null,
      emailVerified: !!u.emailVerified,
    };
  } catch (err) {
    console.error('[auth/session] getUser failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
