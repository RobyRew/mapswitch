import { useCallback, useEffect, useState } from 'react';
import { parsePure } from '@/lib/parse/pipeline';
import { roundCoord } from '@/lib/parse/coords';
import type { Match } from '@/lib/providers/types';
import { usePlatform } from './hooks/usePlatform';
import AppChooser, { type ChooserStrings } from './AppChooser';

/** How the current result was obtained — surfaced to the user for transparency. */
export type Via = 'browser' | 'expand' | 'geocode' | 'device' | 'ip';

export interface ViaStrings {
  browser: string;
  expand: string;
  geocode: string;
  device: string;
  ip: string;
}

export interface PasteStrings {
  placeholder: string;
  resolve: string;
  resolving: string;
  paste: string;
  try: string;
  error: string;
  via: ViaStrings;
  useLocation: string;
  locating: string;
  locationDenied: string;
  locationUnavailable: string;
  locationTimeout: string;
  locationUnsupported: string;
  approxLocation: string;
  chooser: ChooserStrings;
}

export default function PasteBox({ strings }: { strings: PasteStrings }) {
  const platform = usePlatform();
  const [value, setValue] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [via, setVia] = useState<Via | null>(null);

  const resolve = useCallback(
    async (input: string) => {
      setError(null);
      setVia(null);
      setMatch(null);
      const trimmed = input.trim();
      if (!trimmed) return;

      // Try locally first (zero network for inputs that already carry coords).
      const direct = parsePure(trimmed);
      if (direct) {
        setMatch(direct);
        setVia('browser');
        return;
      }

      // Otherwise let the server resolve it — short-link expansion, named-place
      // geocoding, or a pasted address/place name.
      setBusy(true);
      try {
        const res = await fetch('/api/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ input: trimmed }),
        });
        const data = (await res.json()) as { match?: Match; error?: string; message?: string };
        if (res.ok && data.match) {
          setMatch(data.match);
          // The client already tried parsePure, so a server hit is either a
          // short-link expansion or a place-name geocode.
          setVia(data.match.source === 'geocoded' ? 'geocode' : 'expand');
        } else setError(data.message || strings.error);
      } catch {
        setError(strings.error);
      } finally {
        setBusy(false);
      }
    },
    [strings],
  );

  // Ingest a shared/quick-open link once on mount: /go bounces here with ?to=…,
  // the Web Share Target with ?s=…; also accept raw ?url=/?text=/?title=/?q=.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const shared =
      sp.get('to') ?? sp.get('q') ?? sp.get('s') ?? sp.get('url') ?? sp.get('text') ?? sp.get('title');
    if (!shared) return;
    setValue(shared);
    void resolve(shared);
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }, [resolve]);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      await resolve(text);
    } catch {
      /* clipboard permission denied — user can paste manually */
    }
  }

  // Example inputs that showcase what MapSwitch accepts (coords / Plus Code / place).
  const EXAMPLES = ['48.8584, 2.2945', '8FVC9G8F+5W', 'Sagrada Família'];
  function fillExample(v: string) {
    setValue(v);
    void resolve(v);
  }

  // Approximate, city-level location from the request IP — only when the
  // browser's Geolocation API can't get a fix.
  async function ipFallback(): Promise<boolean> {
    try {
      const res = await fetch('/api/geoip');
      if (!res.ok) return false;
      const d = (await res.json()) as { lat?: number; lng?: number; label?: string };
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return false;
      setValue(`${d.lat.toFixed(6)}, ${d.lng.toFixed(6)}`);
      setVia('ip');
      setError(null);
      setMatch({ lat: roundCoord(d.lat), lng: roundCoord(d.lng), label: d.label, source: 'coords' });
      setLocating(false);
      return true;
    } catch {
      return false;
    }
  }

  function detectLocation() {
    setError(null);
    setVia(null);
    setMatch(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocating(true);
      void ipFallback().then((ok) => {
        if (ok) return;
        setLocating(false);
        setError(strings.locationUnsupported);
      });
      return;
    }
    setLocating(true);

    const onOk = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      setValue(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setVia('device');
      setMatch({ lat: roundCoord(latitude), lng: roundCoord(longitude), source: 'coords' });
      setLocating(false);
    };
    const onErr = (err: GeolocationPositionError, retried: boolean) => {
      if (!retried && err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(onOk, (e) => onErr(e, true), {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 60000,
        });
        return;
      }
      // Browser couldn't get a fix → approximate IP-based fallback.
      void ipFallback().then((ok) => {
        if (ok) return;
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? strings.locationDenied
            : err.code === err.POSITION_UNAVAILABLE
              ? strings.locationUnavailable
              : strings.locationTimeout,
        );
      });
    };

    navigator.geolocation.getCurrentPosition(onOk, (e) => onErr(e, false), {
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 0,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(value);
        }}
        className="rw-card flex flex-col gap-4 p-4 sm:p-5"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits (the common case: one pasted link); Shift+Enter for a newline.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void resolve(value);
            }
          }}
          placeholder={strings.placeholder}
          rows={2}
          className="rw-field resize-y text-base"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={busy} className="rw-btn rw-btn--primary min-w-36 flex-1">
            {busy ? (
              strings.resolving
            ) : (
              <>
                <span aria-hidden="true">🔍</span> {strings.resolve}
              </>
            )}
          </button>
          <button type="button" onClick={pasteFromClipboard} className="rw-btn">
            <span aria-hidden="true">📋</span> {strings.paste}
          </button>
          <button type="button" onClick={detectLocation} disabled={locating} className="rw-btn">
            <span aria-hidden="true">📍</span> {locating ? strings.locating : strings.useLocation}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="text-xs font-medium text-text-3">{strings.try}</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => fillExample(ex)} className="rw-chip">
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {match && via && (
        <p className="flex items-start gap-1.5 px-1 text-xs text-text-3">
          <span aria-hidden="true">{via === 'browser' || via === 'device' ? '🔒' : '☁️'}</span>
          <span>{strings.via[via]}</span>
        </p>
      )}

      {match && (
        <div className="rw-card p-4 sm:p-5" style={{ animation: 'var(--animate-slide-up)' }}>
          <AppChooser match={match} platform={platform} strings={strings.chooser} />
        </div>
      )}
    </div>
  );
}
