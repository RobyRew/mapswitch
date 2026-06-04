import { useEffect, useState } from 'react';

const KEY = 'mapswitch.anon.id';

/** Stable per-browser anonymous id (for anon link ownership + weekly quota). */
export function getAnonId(): string {
  if (typeof localStorage === 'undefined') return '';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function useAnonId(): string {
  const [id, setId] = useState('');
  useEffect(() => setId(getAnonId()), []);
  return id;
}

/** After login/signup, move this browser's anonymous links into the account. */
export async function claimAnonLinks(): Promise<void> {
  const anonId = getAnonId();
  if (!anonId) return;
  try {
    await fetch('/api/links/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anonId }),
    });
  } catch {
    /* ignore */
  }
}
