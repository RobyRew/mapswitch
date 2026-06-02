import 'dotenv/config';

export type OAuthProvider = 'google' | 'github' | 'apple';

/** Which social providers are configured (both id + secret present) at runtime. */
export function enabledOAuthProviders(): OAuthProvider[] {
  const out: OAuthProvider[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) out.push('google');
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) out.push('github');
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) out.push('apple');
  return out;
}
