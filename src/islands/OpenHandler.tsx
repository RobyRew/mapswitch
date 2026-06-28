import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match } from '@/lib/providers/types';
import { providerById, buildForRegistry } from '@/lib/providers/registry';
import { usePlatform } from './hooks/usePlatform';
import { usePreferences } from './hooks/usePreferences';
import { useSignedIn } from './hooks/useSignedIn';
import AppChooser, { type ChooserStrings } from './AppChooser';
import DefaultAppManager, { type ManagerStrings } from './DefaultAppManager';

export interface OpenStrings {
  openingIn: string;
  openNow: string;
  chooseDifferent: string;
  noLocation: string;
  savePlace: string;
  saved: string;
  chooser: ChooserStrings;
  manager: ManagerStrings;
}

function postPlace(match: Match, kind: 'saved' | 'opened') {
  return fetch('/api/places', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lat: match.lat, lng: match.lng, label: match.label, kind }),
  });
}

export default function OpenHandler({ match, strings }: { match: Match | null; strings: OpenStrings }) {
  const platform = usePlatform();
  const { prefs, loaded } = usePreferences();
  const [override, setOverride] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const signedIn = useSignedIn();
  const [saved, setSaved] = useState(false);
  const recorded = useRef(false);

  const defaultOption = useMemo(() => {
    if (!match || !prefs.defaultProviderId) return null;
    return (
      buildForRegistry(match, platform).find((o) => o.id === prefs.defaultProviderId && o.available) ?? null
    );
  }, [match, prefs.defaultProviderId, platform]);

  const willAutoOpen = loaded && !override && prefs.autoOpen && !!defaultOption;

  useEffect(() => {
    if (!willAutoOpen || !defaultOption?.href) return;
    if (countdown <= 0) {
      window.location.href = defaultOption.href;
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(timer);
  }, [willAutoOpen, countdown, defaultOption]);

  // Record this open into the account's "recently opened" list (signed-in, once).
  useEffect(() => {
    if (!signedIn || !match || recorded.current) return;
    recorded.current = true;
    void postPlace(match, 'opened').catch(() => {});
  }, [signedIn, match]);

  if (!match) {
    return <p className="text-text-2">{strings.noLocation}</p>;
  }

  const defaultProvider = prefs.defaultProviderId ? providerById(prefs.defaultProviderId) : null;

  return (
    <div className="flex flex-col gap-6">
      {willAutoOpen && defaultOption?.href ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-5 text-center">
          <p className="text-lg font-medium text-text">
            {strings.openingIn.replace('{{app}}', defaultProvider?.name ?? '')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={defaultOption.href}
              className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-text hover:bg-accent-hover"
            >
              {strings.openNow}
            </a>
            <button
              type="button"
              onClick={() => setOverride(true)}
              className="rounded-lg border border-border px-5 py-2.5 font-medium text-text hover:bg-surface-3"
            >
              {strings.chooseDifferent}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <AppChooser match={match} platform={platform} strings={strings.chooser} />
        </div>
      )}

      {signedIn && (
        <button
          type="button"
          onClick={() => {
            void postPlace(match, 'saved')
              .then(() => setSaved(true))
              .catch(() => {});
          }}
          disabled={saved}
          className="self-start rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-2 disabled:opacity-60"
        >
          {saved ? `✓ ${strings.saved}` : `💾 ${strings.savePlace}`}
        </button>
      )}

      <DefaultAppManager strings={strings.manager} />
    </div>
  );
}
