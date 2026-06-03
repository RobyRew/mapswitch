import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { user as userTable } from '@/lib/db/schema';
import type { Auth } from './auth';

let done = false;

/**
 * Idempotently ensure the admin user from ADMIN_EMAIL / ADMIN_PASSWORD exists,
 * is verified, and has role 'admin'. Creates it (better-auth hashes the password)
 * if missing; otherwise just (re-)ensures verified+admin — which also self-heals a
 * previously interrupted seed. Runs once per process, fire-and-forget.
 */
export async function seedAdmin(auth: Auth): Promise<void> {
  if (done) return;
  done = true;

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const db = getDb();
    const existing = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (!existing.length) {
      await auth.api.signUpEmail({ body: { email, password, name: 'Admin' } });
    }
    // Ensure verified admin regardless of how the row got here (self-heals a
    // partial seed; promotes an existing account to admin).
    await db
      .update(userTable)
      .set({ role: 'admin', emailVerified: true })
      .where(eq(userTable.email, email));
    console.log(`seed: ensured admin ${email}`);
  } catch (err) {
    console.error('seed: admin failed —', (err as Error).message);
  }
}
