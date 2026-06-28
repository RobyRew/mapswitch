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
  modeNeutral: string;
  modeShort: string;
  yourLink: string;
  yourShortLink: string;
  copy: string;
  copied: string;
  shareButton: string;
  customSlugPlaceholder: string;
  customSlugClaim: string;
  accountHref: string;
  saveShorten: string;
  expiry: ExpiryStrings;
  anonNote: string;
  weeklyLimit: string;
  accountLimit: string;
  error: string;
}

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * One unified share panel for a resolved place: name it, pick the link type
 * (neutral /o or a saved short /x), and the chosen link shows once with Copy ·
 * Share and an auto-rendered QR.
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
  const [mode, setMode] = useState<'neutral' | 'short'>('neutral');
  const [name, setName] = useState(target.label ?? '');
  const [expiry, setExpiry] = useState<ExpiryToken>(DEFAULT_EXPIRY);
  const [customSlug, setCustomSlug] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortNote, setShortNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loaded) setExpiry(prefs.defaultExpiry);
  }, [loaded, prefs.defaultExpiry]);

  useEffect(() => setName(target.label ?? ''), [target.lat, target.lng, target.label]);
  useEffect(() => setCopied(false), [mode, shortLink]);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch('/api/username')
      .then((r) => r.json())
      .then((d: { username?: string | null }) => {
        if (alive) setUsername(d.username ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const effective = { ...target, label: name.trim() || undefined };
  const neutralLink = buildShareUrl(origin, effective);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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

  async function createShort() {
    setError(null);
    setShortLink(null);
    setShortNote(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { lat: target.lat, lng: target.lng, label: effective.label };
      if (signedIn) {
        const mins = expiryMinutes(expiry);
        if (mins === null) body.indefinite = true;
        else body.expiresInMinutes = mins;
        if (username && customSlug.trim()) body.customSlug = customSlug.trim();
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

  function linkPanel(url: string, label: string) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
        <span className="text-xs text-text-3">{label}</span>
        <code className="block break-all text-sm text-text">{url}</code>
        <div className="flex justify-center">
          <QrCode value={url} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(url)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {copied ? strings.copied : strings.copy}
          </button>
          {canShare() && (
            <button
              type="button"
              onClick={() => share(url)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-3"
            >
              {strings.shareButton}
            </button>
          )}
        </div>
      </div>
    );
  }

  const tab = (value: 'neutral' | 'short', text: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        mode === value ? 'bg-accent text-accent-text' : 'text-text-2 hover:bg-surface-3'
      }`}
    >
      {text}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <p className="text-sm font-medium text-text-2">{strings.neutralTitle}</p>}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={strings.namePlaceholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />

      <div className="flex gap-1 rounded-lg border border-border p-1">
        {tab('neutral', strings.modeNeutral)}
        {tab('short', strings.modeShort)}
      </div>

      {mode === 'neutral' ? (
        linkPanel(neutralLink, strings.yourLink)
      ) : shortLink ? (
        <>
          {linkPanel(shortLink, strings.yourShortLink)}
          {shortNote && <p className="text-xs text-text-3">{shortNote}</p>}
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
          {signedIn ? (
            <>
              {username ? (
                <label className="flex items-center gap-1 text-sm text-text-2">
                  <span className="shrink-0 text-text-3">/x/{username}/</span>
                  <input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder={strings.customSlugPlaceholder}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text outline-none focus:border-accent"
                  />
                </label>
              ) : (
                <a href={strings.accountHref} className="text-xs text-accent hover:underline">
                  {strings.customSlugClaim}
                </a>
              )}
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
            </>
          ) : (
            <p className="text-xs text-text-3">{strings.anonNote}</p>
          )}
          <button
            type="button"
            onClick={createShort}
            disabled={saving}
            className="self-start rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-60"
          >
            🔗 {strings.saveShorten}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
