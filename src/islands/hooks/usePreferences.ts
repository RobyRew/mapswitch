import { useCallback, useSyncExternalStore } from 'react';
import type { Platform } from '@/lib/providers/types';
import { DEFAULT_EXPIRY, isExpiryToken, type ExpiryToken } from '@/lib/share/expiry';

const KEY = 'mapswitch.prefs.v1';

export interface Preferences {
  v: 1;
  defaultProviderId: string | null;
  autoOpen: boolean;
  openInNewTab: boolean;
  hiddenApps: string[];
  appOrder: string[];
  defaultExpiry: ExpiryToken;
  lastPlatform?: Platform;
}

const DEFAULTS: Preferences = {
  v: 1,
  defaultProviderId: null,
  autoOpen: true,
  openInNewTab: true,
  hiddenApps: [],
  appOrder: [],
  defaultExpiry: DEFAULT_EXPIRY,
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
      defaultExpiry: isExpiryToken(parsed.defaultExpiry) ? parsed.defaultExpiry : DEFAULT_EXPIRY,
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

// ── One module-level store shared by every island ────────────────────────────
// Previously each island held its own useState copy and wrote the whole object
// back, so concurrent panels (settings + chooser) clobbered each other's fields.
// A single source of truth + useSyncExternalStore means every island sees the
// same object and re-renders together — no read()-merge dance needed.
let state: Preferences = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: Preferences): void {
  state = next;
  write(next);
  emit();
}

/** Sync the account-backed fields (anonymous → the PUT is a no-op server-side). */
function syncServer(p: Preferences): void {
  void fetch('/api/preferences', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ defaultProviderId: p.defaultProviderId, autoOpen: p.autoOpen }),
  }).catch(() => {});
}

// First hook to mount hydrates from localStorage, then (once) pulls the account's
// synced fields and lets them win — keeping local-only UI prefs intact.
function hydrateOnce(): void {
  if (hydrated) return;
  hydrated = true;
  state = read();
  emit();
  fetch('/api/preferences')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { preferences?: { defaultProviderId: string | null; autoOpen: boolean } } | null) => {
      const server = d?.preferences;
      if (!server) return;
      setState({
        ...state,
        defaultProviderId: server.defaultProviderId ?? null,
        autoOpen: server.autoOpen !== false,
        v: 1,
      });
    })
    .catch(() => {});
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  hydrateOnce();
  return () => listeners.delete(cb);
}

export function usePreferences() {
  const prefs = useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULTS,
  );
  const loaded = useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );

  const update = useCallback((patch: Partial<Preferences>) => {
    const next: Preferences = { ...state, ...patch, v: 1 };
    setState(next);
    syncServer(next);
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    state = DEFAULTS;
    emit();
    syncServer({ ...DEFAULTS, defaultProviderId: null, autoOpen: true });
  }, []);

  return { prefs, loaded, update, reset };
}
