import 'dotenv/config';
import LogtoClient, { type LogtoConfig } from '@logto/node';
import { nanoid } from 'nanoid';
import { eq, lt } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users, logtoSessions } from '@/lib/db/schema';

// Logto is the identity provider. This module is the ONLY place that talks to it.
// Auth flow (Traditional Web / confidential client):
//   /api/auth/sign-in  → redirect to Logto
//   /api/auth/callback → exchange code, persist tokens server-side
//   /api/auth/sign-out → end the Logto session
// Tokens live in the `logto_sessions` table (server-side); the browser only ever
// holds the opaque `ms_sid` cookie. See docs/auth-logto.md.

export const SID_COOKIE = 'ms_sid';
const SESSION_TTL_MS = 14 * 86_400_000; // 14 days

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — required for Logto auth`);
  return v;
}

export const logtoConfig: LogtoConfig = {
  endpoint: requireEnv('LOGTO_ENDPOINT'),
  appId: requireEnv('LOGTO_APP_ID'),
  appSecret: requireEnv('LOGTO_APP_SECRET'),
  // Request the claims we cache locally. Logto maps these to ID-token claims.
  scopes: ['email', 'profile'],
};

/** Public origin. Behind Traefik, trust PUBLIC_SITE_URL over the internal request origin. */
export function publicOrigin(fallback: string): string {
  return (process.env.PUBLIC_SITE_URL || fallback).replace(/\/+$/, '');
}

// ── DB-backed Logto storage (one row per session id) ────────────────────────
type StorageKV = Record<string, string>;

function loadSession(sid: string): StorageKV {
  const row = getDb().select().from(logtoSessions).where(eq(logtoSessions.id, sid)).get();
  if (!row?.data) return {};
  try {
    return JSON.parse(row.data) as StorageKV;
  } catch {
    return {};
  }
}

function saveSession(sid: string, data: StorageKV): void {
  const now = Date.now();
  const json = JSON.stringify(data);
  getDb()
    .insert(logtoSessions)
    .values({ id: sid, data: json, createdAt: now, expiresAt: now + SESSION_TTL_MS })
    .onConflictDoUpdate({ target: logtoSessions.id, set: { data: json, expiresAt: now + SESSION_TTL_MS } })
    .run();
}

export function dropSession(sid: string): void {
  getDb().delete(logtoSessions).where(eq(logtoSessions.id, sid)).run();
}

export function pruneExpiredSessions(): void {
  getDb().delete(logtoSessions).where(lt(logtoSessions.expiresAt, Date.now())).run();
}

// @logto/client Storage interface: getItem / setItem / removeItem.
function dbStorage(sid: string) {
  const data = loadSession(sid);
  return {
    async getItem(key: string) {
      return data[key] ?? null;
    },
    async setItem(key: string, value: string) {
      data[key] = value;
      saveSession(sid, data);
    },
    async removeItem(key: string) {
      delete data[key];
      saveSession(sid, data);
    },
  };
}

/** Per-request Logto client bound to a session id. `navigate` captures redirect URLs. */
export function makeLogtoClient(sid: string, navigate: (url: string) => void) {
  return new LogtoClient(logtoConfig, { navigate, storage: dbStorage(sid) });
}

export interface LogtoIdClaims {
  sub: string;
  email?: string;
  name?: string;
  username?: string;
  email_verified?: boolean;
}

/** Get-or-create the local user row for a set of verified Logto claims. */
export function resolveAppUser(claims: LogtoIdClaims) {
  const db = getDb();
  const existing = db.select().from(users).where(eq(users.logtoSub, claims.sub)).get();
  if (existing) return existing;
  db.insert(users)
    .values({
      id: nanoid(),
      logtoSub: claims.sub,
      email: claims.email ?? null,
      name: claims.name ?? claims.username ?? claims.email ?? 'User',
      emailVerified: claims.email_verified ?? false,
      createdAt: Date.now(),
    })
    .onConflictDoNothing({ target: users.logtoSub })
    .run();
  return db.select().from(users).where(eq(users.logtoSub, claims.sub)).get()!;
}
