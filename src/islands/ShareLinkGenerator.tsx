import { useState } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import { parseLatLngPair } from '@/lib/parse/coords';
import { authClient } from '@/lib/auth/client';

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
  saveShorten: string;
  yourShortLink: string;
  loginRequired: string;
  signIn: string;
}

export default function ShareLinkGenerator({
  baseUrl,
  loginPath,
  strings,
}: {
  baseUrl: string;
  loginPath: string;
  strings: ShareStrings;
}) {
  const { data: session } = authClient.useSession();
  const [coords, setCoords] = useState('');
  const [label, setLabel] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'long' | 'short' | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : baseUrl;

  function generate() {
    setError(null);
    setCopied(null);
    const pair = parseLatLngPair(coords);
    if (!pair) {
      setError(strings.invalid);
      setLink(null);
      return;
    }
    setLink(buildShareUrl(origin, { ...pair, label: label.trim() || undefined }));
  }

  async function saveShorten() {
    setError(null);
    setCopied(null);
    const pair = parseLatLngPair(coords);
    if (!pair) {
      setError(strings.invalid);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lat: pair.lat, lng: pair.lng, label: label.trim() || undefined }),
      });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) setShortLink(data.url);
      else setError(strings.invalid);
    } catch {
      setError(strings.invalid);
    } finally {
      setSaving(false);
    }
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

  async function copy(value: string, which: 'long' | 'short') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
    } catch {
      /* ignore */
    }
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent';

  return (
    <div className="flex flex-col gap-3">
      <input
        value={coords}
        onChange={(e) => setCoords(e.target.value)}
        placeholder={strings.latlngPlaceholder}
        className={inputCls}
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={strings.labelPlaceholder}
        className={inputCls}
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
            onClick={() => copy(link, 'long')}
            className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {copied === 'long' ? strings.copied : strings.copy}
          </button>
        </div>
      )}

      {/* Save & shorten — signed-in only */}
      {session?.user ? (
        <button
          type="button"
          onClick={saveShorten}
          disabled={saving}
          className="rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2 disabled:opacity-60"
        >
          {strings.saveShorten}
        </button>
      ) : (
        <p className="text-xs text-text-3">
          {strings.loginRequired}{' '}
          <a href={loginPath} className="text-accent hover:text-accent-hover">
            {strings.signIn}
          </a>
        </p>
      )}

      {shortLink && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4">
          <span className="text-xs text-text-3">{strings.yourShortLink}</span>
          <code className="block break-all text-sm text-text">{shortLink}</code>
          <button
            type="button"
            onClick={() => copy(shortLink, 'short')}
            className="self-start rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {copied === 'short' ? strings.copied : strings.copy}
          </button>
        </div>
      )}
    </div>
  );
}
