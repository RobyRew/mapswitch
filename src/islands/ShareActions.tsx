import { useEffect, useState } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import { EXPIRY_TOKENS, expiryMinutes, DEFAULT_EXPIRY, type ExpiryToken } from '@/lib/share/expiry';
import type { BuildTarget } from '@/lib/providers/types';
import type { ExpiryStrings } from '@/i18n/strings';
import { getAnonId } from './hooks/useAnonId';
import { useSignedIn } from './hooks/useSignedIn';
import { usePreferences } from './hooks/usePreferences';
import QrCode from './QrCode';

export interface ShareActionsStrings {
  neutralTitle: string;
  namePlaceholder: string;
  yourLink: string;
  copyNeutral: string;
  shareButton: string;
  qr: string;
  copy: string;
  copied: string;
  saveShorten: string;
  yourShortLink: string;
  expiry: ExpiryStrings;
  anonNote: string;
  weeklyLimit: string;
  accountLimit: string;
  error: string;
}

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Share toolkit for a resolved place: copy/share/QR the neutral /o link, and
 * save a DB-backed short slug (with a chosen expiry for signed-in users, weekly
 * quota for anonymous).
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
  const { prefs, loaded } = usePreferences();
  const [expiry, setExpiry] = useState<ExpiryToken>(DEFAULT_EXPIRY);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortNote, setShortNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'neutral' | 'short' | null>(null);
  const [qrOf, setQrOf] = useState<'neutral' | 'short' | null>(null);
  const [name, setName] = useState(target.label ?? '');

  // Preselect the user's default expiry once prefs load.
  useEffect(() => {
    if (loaded) setExpiry(prefs.defaultExpiry);
  }, [loaded, prefs.defaultExpiry]);

  // Re-sync the editable name when a different place is resolved.
  useEffect(() => setName(target.label ?? ''), [target.lat, target.lng, target.label]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const effective = { ...target, label: name.trim() || undefined };
  const neutralLink = buildShareUrl(origin, effective);

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
      await navigator.share({ url: value, title: effective.label || 'MapSwitch' });
    } catch {
      /* user cancelled or unsupported */
    }
  }

  async function saveShorten() {
    setError(null);
    setCopied(null);
    setShortLink(null);
    setShortNote(null);
    setQrOf(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { lat: target.lat, lng: target.lng, label: effective.label };
      if (signedIn) {
        const mins = expiryMinutes(expiry);
        if (mins === null) body.indefinite = true;
        else body.expiresInMinutes = mins;
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

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={strings.namePlaceholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />

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
          <button
            type="button"
            onClick={() => setQrOf((q) => (q === 'neutral' ? null : 'neutral'))}
            aria-pressed={qrOf === 'neutral'}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-3"
          >
            {strings.qr}
          </button>
        </div>
        {qrOf === 'neutral' && <QrCode value={neutralLink} />}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {signedIn ? (
          <label className="flex items-center gap-2 text-sm text-text-2">
            {strings.expiry.label}
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ExpiryToken)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
            >
              {EXPIRY_TOKENS.map((tk) => (
                <option key={tk} value={tk}>
                  {strings.expiry.options[tk]}
                </option>
              ))}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(shortLink, 'short')}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
            >
              {copied === 'short' ? strings.copied : strings.copy}
            </button>
            <button
              type="button"
              onClick={() => setQrOf((q) => (q === 'short' ? null : 'short'))}
              aria-pressed={qrOf === 'short'}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-3"
            >
              {strings.qr}
            </button>
          </div>
          {qrOf === 'short' && <QrCode value={shortLink} />}
        </div>
      )}
    </div>
  );
}
