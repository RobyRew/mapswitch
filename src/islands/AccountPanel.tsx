import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { claimAnonLinks } from './hooks/useAnonId';

export interface AccountStrings {
  signedInAs: string;
  registerPasskey: string;
  passkeyAdded: string;
  signOut: string;
  genericError: string;
}

interface Props {
  email: string;
  strings: AccountStrings;
  loginPath: string;
}

export default function AccountPanel({ email, strings, loginPath }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Claim anonymous links created in this browser before signing in.
  useEffect(() => {
    void claimAnonLinks();
  }, []);

  async function addPasskey() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await authClient.passkey.addPasskey({ name: 'This device' });
      setMsg(error ? strings.genericError : strings.passkeyAdded);
    } catch {
      setMsg(strings.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = loginPath;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm text-text-2">
        {strings.signedInAs} <strong className="text-text">{email}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addPasskey}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-60"
        >
          🔑 {strings.registerPasskey}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-3"
        >
          {strings.signOut}
        </button>
      </div>
      {msg && <p className="text-sm text-text-2">{msg}</p>}
    </div>
  );
}
