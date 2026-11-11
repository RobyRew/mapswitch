import { THEME_KEY } from '@robyrew/ui/theme.js';

/** Key this app stored the theme under before it moved to @robyrew/ui's shared
 *  `theme` key. */
export const LEGACY_THEME_KEY = 'mapswitch.theme';

/** Carries a choice stored under the old key over to the shared key once, then
 *  drops the old key. Runs after load, so a migrated visitor sees the stamped
 *  default for the first paint of that one visit only. */
export function migrateLegacyTheme(): void {
  try {
    const old = localStorage.getItem(LEGACY_THEME_KEY);
    if (old === null) return;
    localStorage.removeItem(LEGACY_THEME_KEY);
    if ((old === 'light' || old === 'dark') && localStorage.getItem(THEME_KEY) === null) {
      localStorage.setItem(THEME_KEY, old);
      document.documentElement.setAttribute('data-theme', old);
    }
  } catch {
    /* storage unavailable */
  }
}
