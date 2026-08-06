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
    <div className="panel-2 flex flex-col gap-2 p-4 text-sm">
      <span className="text-text-2">{strings.label}</span>
      {username ? (
        <strong className="font-mono text-text">@{username}</strong>
      ) : (
        <>
          <p className="text-xs text-text-3">{strings.help}</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={strings.placeholder}
              className="field min-w-0 flex-1 !py-2"
            />
            <button
              type="button"
              onClick={claim}
              disabled={saving || value.trim().length < 3}
              className="btn btn-primary btn-sm"
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
