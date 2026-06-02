import { useState } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import { parseLatLngPair } from '@/lib/parse/coords';

export interface ShareStrings {
  latlngPlaceholder: string;
  labelPlaceholder: string;
  useLocation: string;
  locating: string;
  generate: string;
  copy: string;
  copied: string;
  invalid: string;
  yourLink: string;
}

export default function ShareLinkGenerator({ baseUrl, strings }: { baseUrl: string; strings: ShareStrings }) {
  const [coords, setCoords] = useState('');
  const [label, setLabel] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : baseUrl;

  function generate() {
    setError(null);
    setCopied(false);
    const pair = parseLatLngPair(coords);
    if (!pair) {
      setError(strings.invalid);
      setLink(null);
      return;
    }
    setLink(buildShareUrl(origin, { ...pair, label: label.trim() || undefined }));
  }

  function useLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(strings.invalid);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(strings.invalid);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={coords}
        onChange={(e) => setCoords(e.target.value)}
        placeholder={strings.latlngPlaceholder}
        inputMode="text"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={strings.labelPlaceholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent"
      />

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

      {link && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4">
          <span className="text-xs text-text-3">{strings.yourLink}</span>
          <code className="block break-all text-sm text-text">{link}</code>
          <button
            type="button"
            onClick={copy}
            className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {copied ? strings.copied : strings.copy}
          </button>
        </div>
      )}
    </div>
  );
}
