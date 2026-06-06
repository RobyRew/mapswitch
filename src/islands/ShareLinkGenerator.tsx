import { useState, useEffect } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import { parseLatLngPair } from '@/lib/parse/coords';
import { getAnonId } from './hooks/useAnonId';

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
  expiryLabel: string;
  expiryIndefinite: string;
  expiry7d: string;
  expiry30d: string;
  expiry1y: string;
  anonNote: string;
  weeklyLimit: string;
  accountLimit: string;
  error: string;
}

type Expiry = 'indefinite' | '7' | '30' | '365';

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent';

export default function ShareLinkGenerator({ baseUrl, strings }: { baseUrl: string; strings: ShareStrings }) {
  // Static page → learn signed-in state from a tiny server probe (tokens are
  // server-side; there's no client-readable session).
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { signedIn?: boolean }) => {
        if (alive) setSignedIn(!!d.signedIn);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [coords, setCoords] = useState('');
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('indefinite');
  const [link, setLink] = useState<string | null>(null);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortNote, setShortNote] = useState<string | null>(null);
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
    setShortLink(null);
    setShortNote(null);
    const pair = parseLatLngPair(coords);
    if (!pair) {
      setError(strings.invalid);
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { lat: pair.lat, lng: pair.lng, label: label.trim() || undefined };
      if (signedIn) {
        if (expiry === 'indefinite') body.indefinite = true;
        else body.expiresInDays = Number(expiry);
      } else {
        body.anonId = getAnonId();
      }
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) {
        setShortLink(data.url);
        if (!signedIn) setShortNote(strings.anonNote);
      } else if (res.status === 429) setError(strings.weeklyLimit);
      else if (res.status === 409) setError(strings.accountLimit);
      else setError(strings.error);
    } catch {
      setError(strings.error);
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

      {/* Save & shorten — available to everyone */}
      <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
        {signedIn ? (
          <label className="flex items-center gap-2 text-sm text-text-2">
            {strings.expiryLabel}
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as Expiry)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
            >
              <option value="indefinite">{strings.expiryIndefinite}</option>
              <option value="7">{strings.expiry7d}</option>
              <option value="30">{strings.expiry30d}</option>
              <option value="365">{strings.expiry1y}</option>
            </select>
          </label>
        ) : (
          <p className="text-xs text-text-3">{strings.anonNote}</p>
        )}
        <button
          type="button"
          onClick={saveShorten}
          disabled={saving}
          className="self-start rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2 disabled:opacity-60"
        >
          🔗 {strings.saveShorten}
        </button>
      </div>

      {shortLink && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4">
          <span className="text-xs text-text-3">{strings.yourShortLink}</span>
          <code className="block break-all text-sm text-text">{shortLink}</code>
          {shortNote && <span className="text-xs text-text-3">{shortNote}</span>}
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
