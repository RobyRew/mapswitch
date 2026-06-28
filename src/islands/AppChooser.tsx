import { useMemo, useState } from 'react';
import type { Match, Platform } from '@/lib/providers/types';
import { buildForRegistry } from '@/lib/providers/registry';
import { usePreferences } from './hooks/usePreferences';
import ShareActions, { type ShareActionsStrings } from './ShareActions';

export interface ChooserStrings {
  openIn: string;
  remember: string;
  unavailable: string;
  copyAppLink: string;
  copied: string;
  radarbotSetup: string;
  radarbotSetupLink: string;
  shareActions: ShareActionsStrings;
}

interface Props {
  match: Match;
  platform: Platform;
  strings: ChooserStrings;
}

// One-time Apple Shortcut setup for Radarbot (no public URL scheme on iOS).
const RADARBOT_HELP = 'https://github.com/RobyRew/mapswitch#radarbot-on-ios';

export default function AppChooser({ match, platform, strings }: Props) {
  const { prefs, update } = usePreferences();
  const [remember, setRemember] = useState(true);
  const [copiedApp, setCopiedApp] = useState<string | null>(null);

  // Respect the user's app visibility + ordering (Settings → "Your map apps").
  const options = useMemo(() => {
    const hidden = new Set(prefs.hiddenApps);
    const order = prefs.appOrder;
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return buildForRegistry(match, platform)
      .filter((o) => !hidden.has(o.id))
      .sort((a, b) => rank(a.id) - rank(b.id));
  }, [match, platform, prefs.hiddenApps, prefs.appOrder]);

  const newTab = prefs.openInNewTab;
  const showRadarbotHint = platform === 'ios' && options.some((o) => o.id === 'radarbot' && o.available);

  function remembered(id: string) {
    if (remember) update({ defaultProviderId: id, autoOpen: true });
  }

  async function copyApp(id: string, href: string) {
    try {
      await navigator.clipboard.writeText(href);
      setCopiedApp(id);
    } catch {
      /* ignore */
    }
  }

  const placeName = match.label?.trim();

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-baseline gap-2 text-text">
        <span aria-hidden="true">📍</span>
        <span className="min-w-0">
          {placeName && <span className="font-medium">{placeName}</span>}
          <span className={`block text-xs text-text-3 ${placeName ? '' : 'text-sm text-text'}`}>
            {match.lat}, {match.lng}
          </span>
        </span>
      </p>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text-2">{strings.openIn}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <div key={o.id} className="relative">
              {o.href ? (
                <a
                  href={o.href}
                  target={newTab ? '_blank' : '_self'}
                  rel={newTab ? 'noopener noreferrer' : undefined}
                  onClick={() => remembered(o.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-sm font-medium transition hover:bg-surface-2 active:scale-[0.98]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color ?? '#8e8e93' }} />
                  <span className="truncate">{o.name}</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-medium opacity-40"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color ?? '#8e8e93' }} />
                  <span className="truncate">{o.name}</span>
                  <span className="text-[10px] text-text-3">{strings.unavailable}</span>
                </button>
              )}
              {o.href && (
                <button
                  type="button"
                  title={strings.copyAppLink}
                  aria-label={`${strings.copyAppLink}: ${o.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyApp(o.id, o.href!);
                  }}
                  className="absolute right-1 top-1 rounded px-1 text-[11px] leading-none text-text-3 hover:bg-surface-3 hover:text-text"
                >
                  {copiedApp === o.id ? '✓' : '⧉'}
                </button>
              )}
            </div>
          ))}
        </div>

        {showRadarbotHint && (
          <p className="text-xs text-text-3">
            {strings.radarbotSetup}{' '}
            <a href={RADARBOT_HELP} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {strings.radarbotSetupLink}
            </a>
          </p>
        )}

        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {strings.remember}
        </label>
      </div>

      <div className="border-t border-border pt-3">
        <ShareActions target={match} strings={strings.shareActions} />
      </div>
    </div>
  );
}
