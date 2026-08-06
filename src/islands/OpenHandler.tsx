import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match } from '@/lib/providers/types';
import { providerById, buildForRegistry } from '@/lib/providers/registry';
import { usePlatform } from './hooks/usePlatform';
import { usePreferences } from './hooks/usePreferences';
import { useSignedIn } from './hooks/useSignedIn';
import AppChooser, { type ChooserStrings } from './AppChooser';

export interface OpenStrings {
  openingIn: string;
  openNow: string;
  chooseDifferent: string;
  noLocation: string;
  savePlace: string;
  saved: string;
  chooser: ChooserStrings;
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
    return (
      <div className="panel p-6 text-center text-text-2">{strings.noLocation}</div>
    );
  }

  const defaultProvider = prefs.defaultProviderId ? providerById(prefs.defaultProviderId) : null;

  return (
    <div className="flex flex-col gap-6">
      {willAutoOpen && defaultOption?.href ? (
        <div className="panel flex flex-col gap-4 p-6 text-center" style={{ animation: 'var(--animate-scale-in)' }}>
          <p className="text-lg font-semibold text-text">
            {strings.openingIn.replace('{{app}}', defaultProvider?.name ?? '')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href={defaultOption.href} className="btn btn-primary">
              {strings.openNow}
            </a>
            <button type="button" onClick={() => setOverride(true)} className="btn btn-glass">
              {strings.chooseDifferent}
            </button>
          </div>
        </div>
      ) : (
        <div className="panel p-4 sm:p-5" style={{ animation: 'var(--animate-slide-up)' }}>
          <AppChooser match={match} platform={platform} strings={strings.chooser} variant="open" />
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
          className="btn btn-glass self-start"
        >
          {saved ? `✓ ${strings.saved}` : `💾 ${strings.savePlace}`}
        </button>
      )}
    </div>
  );
}
