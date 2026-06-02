import { getAuth } from './auth';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

/** Resolve the current user from request cookies, or null. Runtime-only. */
export async function getUser(request: Request): Promise<SessionUser | null> {
  try {
    const data = await getAuth().api.getSession({ headers: request.headers });
    if (!data?.user) return null;
    const u = data.user;
    return { id: u.id, email: u.email, name: u.name, emailVerified: u.emailVerified };
  } catch {
    return null;
  }
}
