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

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(read());
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next: Preferences = { ...prev, ...patch, v: 1 };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in-memory */
      }
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
  }, []);

  return { prefs, loaded, update, reset };
}
