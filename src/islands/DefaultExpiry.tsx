import { EXPIRY_TOKENS, type ExpiryToken } from '@/lib/share/expiry';
import type { ExpiryStrings } from '@/i18n/strings';
import { usePreferences } from './hooks/usePreferences';

/** Settings control: the expiry preselected when you save a short link. */
export default function DefaultExpiry({ strings }: { strings: ExpiryStrings }) {
  const { prefs, loaded, update } = usePreferences();
  if (!loaded) return null;

  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-2">
      {strings.label}
      <select
        value={prefs.defaultExpiry}
        onChange={(e) => update({ defaultExpiry: e.target.value as ExpiryToken })}
        className="rounded-md border border-border bg-surface px-2 py-1 text-text"
      >
        {EXPIRY_TOKENS.map((tk) => (
          <option key={tk} value={tk}>
            {strings.options[tk]}
          </option>
        ))}
      </select>
    </label>
  );
}
