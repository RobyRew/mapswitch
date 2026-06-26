import { useEffect, useState } from 'react';

/**
 * Whether this browser has an active session. Static pages have no
 * server-rendered session state, so we learn it from a tiny `/api/auth/me`
 * probe (the session token is httpOnly — not readable client-side).
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { signedIn?: boolean }) => {
        if (alive) setSignedIn(!!d.signedIn);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return signedIn;
}
