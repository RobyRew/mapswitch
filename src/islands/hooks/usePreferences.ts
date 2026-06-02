import { useCallback, useEffect, useState } from 'react';
import type { Platform } from '@/lib/providers/types';

const KEY = 'mapswitch.prefs.v1';

export interface Preferences {
  v: 1;
  defaultProviderId: string | null;
  autoOpen: boolean;
  lastPlatform?: Platform;
}

const DEFAULTS: Preferences = { v: 1, defaultProviderId: null, autoOpen: true };

function read(): Preferences {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    if (parsed.v !== 1) return DEFAULTS;
    return {
      v: 1,
      defaultProviderId: typeof parsed.defaultProviderId === 'string' ? parsed.defaultProviderId : null,
      autoOpen: parsed.autoOpen !== false,
      lastPlatform: parsed.lastPlatform,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(p: Preferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

// One cached pull of server-side prefs per page load (shared across islands).
// Returns null for anonymous users (the API answers 401) — no-op then.
let serverPull: Promise<Pick<Preferences, 'defaultProviderId' | 'autoOpen'> | null> | undefined;
function pullServerPrefs() {
  if (serverPull) return serverPull;
  serverPull = fetch('/api/preferences')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { preferences?: { defaultProviderId: string | null; autoOpen: boolean } } | null) =>
      d?.preferences
        ? { defaultProviderId: d.preferences.defaultProviderId ?? null, autoOpen: d.preferences.autoOpen !== false }
        : null,
    )
    .catch(() => null);
  return serverPull;
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const local = read();
    setPrefs(local);
    setLoaded(true);
    // If signed in, let the account's stored preference win (cross-device).
    void pullServerPrefs().then((server) => {
      if (server) {
        const merged: Preferences = { v: 1, ...server };
        write(merged);
        setPrefs(merged);
      }
    });
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next: Preferences = { ...prev, ...patch, v: 1 };
      write(next);
      // Best-effort server sync for signed-in users; anonymous → 401 (ignored).
      void fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ defaultProviderId: next.defaultProviderId, autoOpen: next.autoOpen }),
      }).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setPrefs(DEFAULTS);
    void fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ defaultProviderId: null, autoOpen: true }),
    }).catch(() => {});
  }, []);

  return { prefs, loaded, update, reset };
}
