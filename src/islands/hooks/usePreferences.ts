import { useCallback, useEffect, useState } from 'react';
import type { Platform } from '@/lib/providers/types';

const KEY = 'mapswitch.prefs.v1';

export interface Preferences {
  v: 1;
  defaultProviderId: string | null;
  autoOpen: boolean;
  openInNewTab: boolean;
  hiddenApps: string[];
  appOrder: string[];
  lastPlatform?: Platform;
}

const DEFAULTS: Preferences = {
  v: 1,
  defaultProviderId: null,
  autoOpen: true,
  openInNewTab: true,
  hiddenApps: [],
  appOrder: [],
};

const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

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
      openInNewTab: parsed.openInNewTab !== false,
      hiddenApps: strs(parsed.hiddenApps),
      appOrder: strs(parsed.appOrder),
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
// Returns null for anonymous users — no-op then. Only the synced fields live
// server-side; UI prefs (new-tab, app order/visibility) stay per-browser.
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
    // If signed in, let the account's stored preference win for the synced
    // fields — but keep local-only UI prefs intact.
    void pullServerPrefs().then((server) => {
      if (!server) return;
      setPrefs((prev) => {
        const merged: Preferences = { ...prev, ...server, v: 1 };
        write(merged);
        return merged;
      });
    });
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    // Merge onto the latest persisted prefs (not this island's snapshot) so
    // concurrent islands — settings panels, the chooser — don't clobber each
    // other's fields when they each write back the whole object.
    const next: Preferences = { ...read(), ...patch, v: 1 };
    write(next);
    setPrefs(next);
    // Best-effort server sync of the account-backed fields (anon → no-op).
    void fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ defaultProviderId: next.defaultProviderId, autoOpen: next.autoOpen }),
    }).catch(() => {});
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
