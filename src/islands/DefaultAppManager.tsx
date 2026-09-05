import { providerById } from '@/lib/providers/registry';
import { usePreferences } from './hooks/usePreferences';

export interface ManagerStrings {
  defaultLabel: string;
  none: string;
  change: string;
  reset: string;
  autoOpen: string;
  openNewTab: string;
}

export default function DefaultAppManager({ strings }: { strings: ManagerStrings }) {
  const { prefs, loaded, update, reset } = usePreferences();
  if (!loaded) return null;

  const current = prefs.defaultProviderId ? providerById(prefs.defaultProviderId) : null;

  return (
    <div className="rw-card ms-card-sm flex flex-col gap-3 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-2">{strings.defaultLabel}</span>
        <strong className="text-text">{current ? current.name : strings.none}</strong>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-text-2">
        <input
          type="checkbox"
          checked={prefs.autoOpen}
          onChange={(e) => update({ autoOpen: e.target.checked })}
          className="h-4 w-4 accent-accent"
        />
        {strings.autoOpen}
      </label>

      <label className="flex cursor-pointer items-center gap-2.5 text-text-2">
        <input
          type="checkbox"
          checked={prefs.openInNewTab}
          onChange={(e) => update({ openInNewTab: e.target.checked })}
          className="h-4 w-4 accent-accent"
        />
        {strings.openNewTab}
      </label>

      <div className="flex gap-2 pt-1">
        {current && (
          <button
            type="button"
            onClick={() => update({ defaultProviderId: null })}
            className="rw-btn rw-btn--sm"
          >
            {strings.change}
          </button>
        )}
        <button type="button" onClick={reset} className="rw-btn rw-btn--sm rw-btn--danger">
          {strings.reset}
        </button>
      </div>
    </div>
  );
}
