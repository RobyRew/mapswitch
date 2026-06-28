import { useCallback, useEffect, useState } from 'react';
import { parsePure } from '@/lib/parse/pipeline';
import { roundCoord } from '@/lib/parse/coords';
import type { Match } from '@/lib/providers/types';
import { usePlatform } from './hooks/usePlatform';
import AppChooser, { type ChooserStrings } from './AppChooser';

export interface PasteStrings {
  placeholder: string;
  resolve: string;
  resolving: string;
  paste: string;
  error: string;
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
  const [approx, setApprox] = useState(false);

  const resolve = useCallback(
    async (input: string) => {
      setError(null);
      setApprox(false);
      setMatch(null);
      const trimmed = input.trim();
      if (!trimmed) return;

      // Try locally first (zero network for inputs that already carry coords).
      const direct = parsePure(trimmed);
      if (direct) {
        setMatch(direct);
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
        if (res.ok && data.match) setMatch(data.match);
        else setError(data.message || strings.error);
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

  // Approximate, city-level location from the request IP — only when the
  // browser's Geolocation API can't get a fix.
  async function ipFallback(): Promise<boolean> {
    try {
      const res = await fetch('/api/geoip');
      if (!res.ok) return false;
      const d = (await res.json()) as { lat?: number; lng?: number; label?: string };
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return false;
      setValue(`${d.lat.toFixed(6)}, ${d.lng.toFixed(6)}`);
      setApprox(true);
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
    setApprox(false);
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
      setApprox(false);
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
        className="flex flex-col gap-3"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={strings.placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-w-32 flex-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? strings.resolving : strings.resolve}
          </button>
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2"
          >
            {strings.paste}
          </button>
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className="rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2 disabled:opacity-60"
          >
            {locating ? strings.locating : `📍 ${strings.useLocation}`}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
      {approx && <p className="text-xs text-text-3">📍 {strings.approxLocation}</p>}

      {match && (
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <AppChooser match={match} platform={platform} strings={strings.chooser} />
        </div>
      )}
    </div>
  );
}
