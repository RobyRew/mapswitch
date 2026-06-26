import { useState } from 'react';
import { parseLatLngPair } from '@/lib/parse/coords';
import type { BuildTarget } from '@/lib/providers/types';
import ShareActions, { type ShareActionsStrings } from './ShareActions';

export interface ShareStrings {
  latlngPlaceholder: string;
  labelPlaceholder: string;
  useLocation: string;
  locating: string;
  generate: string;
  invalid: string;
  locationDenied: string;
  locationUnavailable: string;
  locationTimeout: string;
  locationUnsupported: string;
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent';

export default function ShareLinkGenerator({
  strings,
  shareActions,
}: {
  strings: ShareStrings;
  shareActions: ShareActionsStrings;
}) {
  const [coords, setCoords] = useState('');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState<BuildTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function generate() {
    setError(null);
    const pair = parseLatLngPair(coords);
    if (!pair) {
      setError(strings.invalid);
      setTarget(null);
      return;
    }
    setTarget({ ...pair, label: label.trim() || undefined });
  }

  function useLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(strings.locationUnsupported);
      return;
    }
    setError(null);
    setLocating(true);

    const onOk = (pos: GeolocationPosition) => {
      setCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      setLocating(false);
    };
    const onErr = (err: GeolocationPositionError, retried: boolean) => {
      // High-accuracy can stall on desktop Wi-Fi/IP geolocation — fall back once.
      if (!retried && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
        navigator.geolocation.getCurrentPosition(onOk, (e) => onErr(e, true), {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 60000,
        });
        return;
      }
      setLocating(false);
      setError(
        err.code === err.PERMISSION_DENIED
          ? strings.locationDenied
          : err.code === err.POSITION_UNAVAILABLE
            ? strings.locationUnavailable
            : strings.locationTimeout,
      );
    };

    navigator.geolocation.getCurrentPosition(onOk, (e) => onErr(e, false), {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder={strings.latlngPlaceholder} className={inputCls} />
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={strings.labelPlaceholder} className={inputCls} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useLocation}
          disabled={locating}
          className="rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2 disabled:opacity-60"
        >
          {locating ? strings.locating : strings.useLocation}
        </button>
        <button
          type="button"
          onClick={generate}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover"
        >
          {strings.generate}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {target && (
        <div className="mt-1 border-t border-border pt-3">
          <ShareActions target={target} strings={shareActions} showTitle={false} />
        </div>
      )}
    </div>
  );
}
