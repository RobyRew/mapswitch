import { useEffect } from 'react';
import { claimAnonLinks } from './hooks/useAnonId';

export interface AccountStrings {
  signedInAs: string;
  signOut: string;
}

interface Props {
  email: string;
  strings: AccountStrings;
  signOutPath: string; // /api/auth/sign-out
}

// Identity (passwords, social, passkeys, MFA) is managed entirely by Logto.
// This panel just shows who's signed in and offers sign-out. Sign-out is a plain
// navigation to the server endpoint, which ends the Logto SSO session too.
export default function AccountPanel({ email, strings, signOutPath }: Props) {
  // Claim anonymous links created in this browser before signing in.
  useEffect(() => {
    void claimAnonLinks();
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm text-text-2">
        {strings.signedInAs} <strong className="text-text">{email}</strong>
      </p>
      <a
        href={signOutPath}
        className="self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-3"
      >
        {strings.signOut}
      </a>
    </div>
  );
}
