import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { buildShareUrl } from '@/lib/share/encode';
import { EXPIRY_TOKENS, expiryMinutes, isOneTime, DEFAULT_EXPIRY, type ExpiryToken } from '@/lib/share/expiry';
import { normalizeSlug, isValidSlug } from '@/lib/share/slug';
import type { BuildTarget } from '@/lib/providers/types';
import type { ExpiryStrings } from '@/i18n/strings';
import { getAnonId } from './hooks/useAnonId';
import { useSignedIn } from './hooks/useSignedIn';
import { usePreferences } from './hooks/usePreferences';
import QrCode from './QrCode';

export interface ShareActionsStrings {
  neutralTitle: string;
  namePlaceholder: string;
  linkType: string;
  modeNeutral: string;
  modeShort: string;
  yourLink: string;
  yourShortLink: string;
  copy: string;
  copied: string;
  shareButton: string;
  downloadQr: string;
  customSlugPlaceholder: string;
  customSlugClaim: string;
  slugChecking: string;
  slugAvailable: string;
  slugTaken: string;
  slugInvalid: string;
  accountHref: string;
  saveShorten: string;
  expiry: ExpiryStrings;
  anonNote: string;
  weeklyLimit: string;
  accountLimit: string;
  error: string;
}

type Mode = 'neutral' | 'short';
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * One unified share panel for a resolved place: name it, pick the link type
 * (neutral /o or a saved short /x), and the chosen link shows once with Copy ·
 * Share and an auto-rendered QR (with a download link).
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
  const [mode, setMode] = useState<Mode>('neutral');
  const [name, setName] = useState(target.label ?? '');
  const [expiry, setExpiry] = useState<ExpiryToken>(DEFAULT_EXPIRY);
  const [customSlug, setCustomSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [username, setUsername] = useState<string | null>(null);
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [shortNote, setShortNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const modeRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ neutral: null, short: null });

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
  const normalizedSlug = normalizeSlug(customSlug);

  // Live availability of the vanity slug as it's typed (debounced).
  useEffect(() => {
    if (!username || !customSlug.trim()) {
      setSlugStatus('idle');
      return;
    }
    if (!isValidSlug(normalizedSlug)) {
      setSlugStatus('invalid');
      return;
    }
    setSlugStatus('checking');
    let alive = true;
    const id = setTimeout(() => {
      fetch(`/api/links/check?slug=${encodeURIComponent(normalizedSlug)}`)
        .then((r) => r.json())
        .then((d: { valid?: boolean; available?: boolean }) => {
          if (!alive) return;
          setSlugStatus(d.valid ? (d.available ? 'available' : 'taken') : 'invalid');
        })
        .catch(() => {
          if (alive) setSlugStatus('idle');
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [customSlug, username, normalizedSlug]);

  const slugBlocking =
    !!customSlug.trim() && (slugStatus === 'checking' || slugStatus === 'taken' || slugStatus === 'invalid');

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
        if (isOneTime(expiry)) body.oneTime = true;
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
      <div className="panel-2 flex flex-col gap-3 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-text-3">{label}</span>
        <code className="block break-all font-mono text-sm text-text">{url}</code>
        <div className="flex justify-center py-1">
          <QrCode value={url} downloadLabel={strings.downloadQr} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => copy(url)} className="btn btn-primary btn-sm flex-1">
            {copied ? `✓ ${strings.copied}` : strings.copy}
          </button>
          {canShare() && (
            <button type="button" onClick={() => share(url)} className="btn btn-glass btn-sm">
              {strings.shareButton}
            </button>
          )}
        </div>
      </div>
    );
  }

  function selectMode(value: Mode) {
    setMode(value);
    modeRefs.current[value]?.focus();
  }

  function onGroupKey(e: ReactKeyboardEvent) {
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      selectMode(mode === 'neutral' ? 'short' : 'neutral');
    }
  }

  const tab = (value: Mode, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      tabIndex={mode === value ? 0 : -1}
      ref={(el) => {
        modeRefs.current[value] = el;
      }}
      onClick={() => selectMode(value)}
      className="seg-item"
    >
      {text}
    </button>
  );

  const slugHint = () => {
    if (slugStatus === 'checking') return <span className="text-text-3">{strings.slugChecking}</span>;
    if (slugStatus === 'available') return <span className="text-success">{strings.slugAvailable}</span>;
    if (slugStatus === 'taken') return <span className="text-danger">{strings.slugTaken}</span>;
    if (slugStatus === 'invalid') return <span className="text-danger">{strings.slugInvalid}</span>;
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <p className="text-sm font-medium text-text-2">{strings.neutralTitle}</p>}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={strings.namePlaceholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />

      <div role="radiogroup" aria-label={strings.linkType} onKeyDown={onGroupKey} className="seg">
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
        <div className="panel-2 flex flex-col gap-3 p-4">
          {signedIn ? (
            <>
              {username ? (
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1 text-sm text-text-2">
                    <span className="shrink-0 font-mono text-text-3">/x/{username}/</span>
                    <input
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder={strings.customSlugPlaceholder}
                      className="field min-w-0 flex-1 !py-1.5 text-sm"
                    />
                  </label>
                  {customSlug.trim() && (
                    <p className="break-all text-xs">
                      <span className="text-text-3">
                        {origin}/x/{username}/
                      </span>
                      <span className="text-text">{normalizedSlug}</span> {slugHint()}
                    </p>
                  )}
                </div>
              ) : (
                <a href={strings.accountHref} className="link-accent text-xs">
                  {strings.customSlugClaim}
                </a>
              )}
              <label className="flex items-center gap-2 text-sm text-text-2">
                {strings.expiry.label}
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as ExpiryToken)}
                  className="field w-auto !py-1.5 text-sm"
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
            disabled={saving || slugBlocking}
            className="btn btn-primary self-start"
          >
            🔗 {strings.saveShorten}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
