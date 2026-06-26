import { useState } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import type { BuildTarget } from '@/lib/providers/types';
import { getAnonId } from './hooks/useAnonId';
import { useSignedIn } from './hooks/useSignedIn';

export interface ShareActionsStrings {
  neutralTitle: string;
  yourLink: string;
  copyNeutral: string;
  shareButton: string;
  copy: string;
  copied: string;
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

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Share toolkit for a resolved place: copy/share the neutral /o link, and save
 * a DB-backed short slug (with expiry for signed-in users, weekly quota for
 * anonymous). Reused by the home result (AppChooser) and the Share page.
 */
export default function ShareActions({
  target,
  strings,
  showTitle = true,
}: {
  target: BuildTarget;
  strings: ShareActionsStrings;
  showTitle?: boolean;
}) {
  const signedIn = useSignedIn();
  const [expiry, setExpiry] = useState<Expiry>('indefinite');
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortNote, setShortNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'neutral' | 'short' | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const neutralLink = buildShareUrl(origin, target);

  async function copy(value: string, which: 'neutral' | 'short') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
    } catch {
      /* ignore */
    }
  }

  async function share(value: string) {
    try {
      await navigator.share({ url: value, title: target.label || 'MapSwitch' });
    } catch {
      /* user cancelled or unsupported */
    }
  }

  async function saveShorten() {
    setError(null);
    setCopied(null);
    setShortLink(null);
    setShortNote(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { lat: target.lat, lng: target.lng, label: target.label };
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

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <p className="text-sm font-medium text-text-2">{strings.neutralTitle}</p>}

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4">
        <span className="text-xs text-text-3">{strings.yourLink}</span>
        <code className="block break-all text-sm text-text">{neutralLink}</code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(neutralLink, 'neutral')}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {copied === 'neutral' ? strings.copied : strings.copyNeutral}
          </button>
          {canShare() && (
            <button
              type="button"
              onClick={() => share(neutralLink)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-3"
            >
              {strings.shareButton}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
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

      {error && <p className="text-sm text-danger">{error}</p>}

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
