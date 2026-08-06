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
  makeYourOwn: string;
  shareActions: ShareActionsStrings;
}

interface Props {
  match: Match;
  platform: Platform;
  strings: ChooserStrings;
  // 'full' (home): share panel always shown. 'open' (a shared link): collapsed
  // behind a "Make your own link" toggle so the open view stays clean.
  variant?: 'full' | 'open';
}

// One-time Apple Shortcut setup for Radarbot (no public URL scheme on iOS).
const RADARBOT_HELP = 'https://github.com/RobyRew/mapswitch#radarbot-on-ios';

export default function AppChooser({ match, platform, strings, variant = 'full' }: Props) {
  const { prefs, update } = usePreferences();
  const [remember, setRemember] = useState(true);
  const [copiedApp, setCopiedApp] = useState<string | null>(null);
  const [makeOwn, setMakeOwn] = useState(false);

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
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)' }}
          aria-hidden="true"
        >
          📍
        </span>
        <span className="min-w-0">
          {placeName && <span className="block truncate font-semibold text-text">{placeName}</span>}
          <span className={`block font-mono text-xs ${placeName ? 'text-text-3' : 'text-sm text-text'}`}>
            {match.lat}, {match.lng}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-3">{strings.openIn}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {options.map((o) => (
            <div key={o.id} className="relative">
              {o.href ? (
                <a
                  href={o.href}
                  target={newTab ? '_blank' : '_self'}
                  rel={newTab ? 'noopener noreferrer' : undefined}
                  onClick={() => remembered(o.id)}
                  className="app-tile"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/40"
                    style={{ backgroundColor: o.color ?? '#8e8e93' }}
                  />
                  <span className="truncate">{o.name}</span>
                </a>
              ) : (
                <div className="app-tile app-tile-off">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color ?? '#8e8e93' }}
                  />
                  <span className="truncate">{o.name}</span>
                  <span className="ml-auto text-[10px] text-text-3">{strings.unavailable}</span>
                </div>
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
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-[11px] leading-none text-text-3 transition hover:bg-surface-3 hover:text-text"
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
            <a href={RADARBOT_HELP} target="_blank" rel="noreferrer" className="link-accent">
              {strings.radarbotSetupLink}
            </a>
          </p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          {strings.remember}
        </label>
      </div>

      {variant === 'open' ? (
        <div className="border-t border-border pt-4">
          {makeOwn ? (
            <ShareActions target={match} strings={strings.shareActions} />
          ) : (
            <button
              type="button"
              onClick={() => setMakeOwn(true)}
              className="btn btn-glass w-full justify-center"
            >
              <span aria-hidden="true">✨</span> {strings.makeYourOwn}
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-border pt-4">
          <ShareActions target={match} strings={strings.shareActions} />
        </div>
      )}
    </div>
  );
}
