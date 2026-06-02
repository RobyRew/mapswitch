import { createAuthClient } from 'better-auth/react';
import { passkeyClient } from '@better-auth/passkey/client';

// Browser-safe auth client — the ONLY auth module an island may import.
// baseURL defaults to the current origin (same-origin API).
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
