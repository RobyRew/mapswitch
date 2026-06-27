import { useEffect, useState } from 'react';

export interface SettingsExtrasStrings {
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  clearData: string;
  clearDataDesc: string;
  cleared: string;
}

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'mapswitch.theme';
// localStorage keys this app owns (cleared by "Clear local data").
const LOCAL_KEYS = ['mapswitch.prefs.v1', 'mapswitch.anon.id', 'mapswitch.theme'];

function currentMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(mode: ThemeMode) {
  try {
    if (mode === 'system') {
      localStorage.removeItem(THEME_KEY);
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', sys);
    } else {
      localStorage.setItem(THEME_KEY, mode);
      document.documentElement.setAttribute('data-theme', mode);
    }
  } catch {
    /* storage unavailable */
  }
}

export default function SettingsExtras({ strings }: { strings: SettingsExtrasStrings }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [cleared, setCleared] = useState(false);

  useEffect(() => setMode(currentMode()), []);

  function choose(m: ThemeMode) {
    setMode(m);
    applyTheme(m);
  }

  function clearData() {
    try {
      for (const k of LOCAL_KEYS) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    setCleared(true);
    setTimeout(() => window.location.reload(), 700);
  }

  const opts: { id: ThemeMode; label: string }[] = [
    { id: 'system', label: strings.themeSystem },
    { id: 'light', label: strings.themeLight },
    { id: 'dark', label: strings.themeDark },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm">
        <span className="text-text-2">{strings.theme}</span>
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              className={`rounded-md border px-3 py-1.5 transition ${
                mode === o.id
                  ? 'border-accent bg-accent text-accent-text'
                  : 'border-border text-text hover:bg-surface-3'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
        <span className="text-text-2">{strings.clearData}</span>
        <p className="text-xs text-text-3">{strings.clearDataDesc}</p>
        <button
          type="button"
          onClick={clearData}
          className="self-start rounded-md border border-border px-3 py-1.5 text-danger hover:bg-surface-3"
        >
          {cleared ? strings.cleared : strings.clearData}
        </button>
      </div>
    </div>
  );
}
