import { useMemo, useState } from 'react';
import type { Match, Platform } from '@/lib/providers/types';
import { buildForRegistry } from '@/lib/providers/registry';
import { usePreferences } from './hooks/usePreferences';

export interface ChooserStrings {
  openIn: string;
  remember: string;
  unavailable: string;
}

interface Props {
  match: Match;
  platform: Platform;
  strings: ChooserStrings;
}

export default function AppChooser({ match, platform, strings }: Props) {
  const { update } = usePreferences();
  const [remember, setRemember] = useState(true);
  const options = useMemo(() => buildForRegistry(match, platform), [match, platform]);

  function pick(id: string, href: string | null) {
    if (!href) return;
    if (remember) update({ defaultProviderId: id, autoOpen: true });
    window.location.href = href;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text-2">{strings.openIn}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={!o.available}
            onClick={() => pick(o.id, o.href)}
            className={`flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-medium transition ${
              o.available ? 'bg-surface hover:bg-surface-2 active:scale-[0.98]' : 'cursor-not-allowed opacity-40'
            }`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color ?? '#8e8e93' }} />
            <span className="truncate">{o.name}</span>
            {!o.available && <span className="text-[10px] text-text-3">{strings.unavailable}</span>}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {strings.remember}
      </label>
    </div>
  );
}
