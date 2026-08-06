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
    <div className="panel-2 flex items-center justify-between gap-4 p-4">
      <p className="min-w-0 text-sm text-text-2">
        {strings.signedInAs} <strong className="break-all text-text">{email}</strong>
      </p>
      <a href={signOutPath} className="btn btn-glass btn-sm shrink-0">
        {strings.signOut}
      </a>
    </div>
  );
}
