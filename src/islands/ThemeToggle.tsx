import { useEffect, useState } from 'react';
import { resolveTheme, setTheme } from '@robyrew/ui/theme.js';
import { migrateLegacyTheme } from '@/lib/theme';

/** Header light/dark toggle. Stores an explicit choice through @robyrew/ui's
 *  setTheme (localStorage.theme), the same key the settings switch and the
 *  pre-paint stamp read. */
export default function ThemeToggle({ label }: { label: string }) {
  const [theme, setLocal] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    migrateLegacyTheme();
    setLocal(resolveTheme());
    const onChange = (e: DocumentEventMap['rw:themechange']) => setLocal(e.detail.theme);
    document.addEventListener('rw:themechange', onChange);
    return () => document.removeEventListener('rw:themechange', onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  );
}
