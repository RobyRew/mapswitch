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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-2">{strings.defaultLabel}</span>
        <strong className="text-text">{current ? current.name : strings.none}</strong>
      </div>

      <label className="flex items-center gap-2 text-text-2">
        <input
          type="checkbox"
          checked={prefs.autoOpen}
          onChange={(e) => update({ autoOpen: e.target.checked })}
        />
        {strings.autoOpen}
      </label>

      <label className="flex items-center gap-2 text-text-2">
        <input
          type="checkbox"
          checked={prefs.openInNewTab}
          onChange={(e) => update({ openInNewTab: e.target.checked })}
        />
        {strings.openNewTab}
      </label>

      <div className="flex gap-2">
        {current && (
          <button
            type="button"
            onClick={() => update({ defaultProviderId: null })}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-3"
          >
            {strings.change}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border px-3 py-1.5 text-danger hover:bg-surface-3"
        >
          {strings.reset}
        </button>
      </div>
    </div>
  );
}
