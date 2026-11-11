import { useEffect, useState } from 'react';
import { initThemeControls, THEME_KEY } from '@robyrew/ui/theme.js';
import { LEGACY_THEME_KEY, migrateLegacyTheme } from '@/lib/theme';

export interface SettingsExtrasStrings {
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  clearData: string;
  clearDataDesc: string;
  cleared: string;
}

// localStorage keys this app owns (cleared by "Clear local data"). `theme` is
// the shared @robyrew/ui key; the legacy one is listed for visitors who never
// loaded a page that migrated it.
const LOCAL_KEYS = ['mapswitch.prefs.v1', 'mapswitch.anon.id', THEME_KEY, LEGACY_THEME_KEY];

type ThemeMode = 'system' | 'light' | 'dark';

export default function SettingsExtras({ strings }: { strings: SettingsExtrasStrings }) {
  const [cleared, setCleared] = useState(false);

  // @robyrew/ui binds the [data-rw-theme-set] buttons: stores the choice,
  // reflects it as aria-checked, and follows the OS while it is "system".
  useEffect(() => {
    migrateLegacyTheme();
    initThemeControls();
  }, []);

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
              data-rw-theme-set={o.id}
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
