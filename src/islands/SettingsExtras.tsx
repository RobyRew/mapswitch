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
      <div className="rw-card ms-card-sm flex flex-col gap-3 p-4 text-sm">
        <span className="text-text-2">{strings.theme}</span>
        <div className="rw-seg max-w-xs">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              aria-checked={mode === o.id}
              role="radio"
              className="rw-seg__item"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rw-card ms-card-sm flex flex-col gap-2 p-4 text-sm">
        <span className="text-text-2">{strings.clearData}</span>
        <p className="text-xs text-text-3">{strings.clearDataDesc}</p>
        <button type="button" onClick={clearData} className="rw-btn rw-btn--sm rw-btn--danger mt-1 self-start">
          {cleared ? strings.cleared : strings.clearData}
        </button>
      </div>
    </div>
  );
}
