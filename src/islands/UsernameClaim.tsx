import { useEffect, useState } from 'react';

export interface UsernameStrings {
  label: string;
  help: string;
  placeholder: string;
  claim: string;
  taken: string;
  invalid: string;
  error: string;
}

export default function UsernameClaim({ strings }: { strings: UsernameStrings }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/username')
      .then((r) => r.json())
      .then((d: { username?: string | null }) => setUsername(d.username ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function claim() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });
      const d = (await res.json()) as { username?: string; error?: string };
      if (res.ok && d.username) setUsername(d.username);
      else if (d.error === 'already_set' && d.username) setUsername(d.username);
      else if (d.error === 'username_taken') setError(strings.taken);
      else if (d.error === 'invalid_username') setError(strings.invalid);
      else setError(strings.error);
    } catch {
      setError(strings.error);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
      <span className="text-text-2">{strings.label}</span>
      {username ? (
        <strong className="text-text">@{username}</strong>
      ) : (
        <>
          <p className="text-xs text-text-3">{strings.help}</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={strings.placeholder}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-text outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={claim}
              disabled={saving || value.trim().length < 3}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-60"
            >
              {strings.claim}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
