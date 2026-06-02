import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { passkey } from '@better-auth/passkey';
import { getDb } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { sendVerificationEmail, sendResetPasswordEmail } from './email';

const ORIGIN = process.env.PUBLIC_SITE_URL || 'https://maps.robyrew.com';
const RP_ID = new URL(ORIGIN).hostname; // passkey relying-party id (no scheme/port)
const SECURE = ORIGIN.startsWith('https'); // dev on http://localhost can't use Secure cookies

type BetterAuthOptions = Parameters<typeof betterAuth>[0];

// Only enable a provider when BOTH its env vars are present, so dev (and any
// deployment that hasn't set them) doesn't fail to construct the auth instance.
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const p: NonNullable<BetterAuthOptions['socialProviders']> = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    p.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    p.github = { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET };
  }
  // Apple's clientSecret is an ES256 JWT — generate it with scripts/apple-secret.mjs
  // and set APPLE_CLIENT_SECRET (regenerate before its ~180-day expiry).
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    p.apple = { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET };
  }
  return p;
}

function buildAuth() {
  return betterAuth({
    appName: 'MapSwitch',
    baseURL: ORIGIN,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'sqlite', schema }),
    trustedOrigins: [ORIGIN, 'https://appleid.apple.com'],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 10,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(user.email, url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user.email, url);
      },
    },
    socialProviders: socialProviders(),
    plugins: [passkey({ rpID: RP_ID, rpName: 'MapSwitch', origin: ORIGIN })],
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 10, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/forget-password': { window: 60, max: 3 },
        '/verify-email': { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: SECURE,
      defaultCookieAttributes: { httpOnly: true, secure: SECURE, sameSite: 'lax', path: '/' },
    },
  });
}

let cached: ReturnType<typeof buildAuth> | null = null;

/**
 * Lazily build the better-auth instance. Lazy on purpose: it opens the SQLite DB
 * (getDb), so we must NOT touch it at build time — only at runtime, when a route
 * actually needs auth. The catch-all route and on-demand account pages/APIs call
 * this; nothing prerendered does.
 */
export function getAuth(): ReturnType<typeof buildAuth> {
  cached ??= buildAuth();
  return cached;
}

export type Auth = ReturnType<typeof buildAuth>;
