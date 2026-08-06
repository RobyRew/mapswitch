import { useEffect, useState } from 'react';
import { normalizeUsername, isValidUsername } from '@/lib/share/slug';

export interface UsernameStrings {
  label: string;
  help: string;
  placeholder: string;
  claim: string;
  change: string;
  save: string;
  cancel: string;
  checking: string;
  available: string;
  taken: string;
  invalid: string;
  error: string;
}

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function UsernameClaim({ strings }: { strings: UsernameStrings }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/username')
      .then((r) => r.json())
      .then((d: { username?: string | null }) => setUsername(d.username ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const normalized = normalizeUsername(value);
  const editingOrNew = editing || !username;

  // Live availability while typing (debounced; excludes your own current handle).
  useEffect(() => {
    if (!editingOrNew || !value.trim()) {
      setStatus('idle');
      return;
    }
    if (!isValidUsername(normalized)) {
      setStatus('invalid');
      return;
    }
    if (normalized === username) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    let alive = true;
    const id = setTimeout(() => {
      fetch(`/api/username?check=${encodeURIComponent(normalized)}`)
        .then((r) => r.json())
        .then((d: { valid?: boolean; available?: boolean }) => {
          if (!alive) return;
          setStatus(d.valid ? (d.available ? 'available' : 'taken') : 'invalid');
        })
        .catch(() => {
          if (alive) setStatus('idle');
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [value, normalized, username, editingOrNew]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: normalized }),
      });
      const d = (await res.json()) as { username?: string; error?: string };
      if (res.ok && d.username) {
        setUsername(d.username);
        setEditing(false);
        setValue('');
      } else if (d.error === 'username_taken') setStatus('taken');
      else if (d.error === 'invalid_username') setStatus('invalid');
      else setError(strings.error);
    } catch {
      setError(strings.error);
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setValue(username ?? '');
    setStatus('idle');
    setError(null);
    setEditing(true);
  }

  if (!loaded) return null;

  const hint = () => {
    if (status === 'checking') return <span className="text-text-3">{strings.checking}</span>;
    if (status === 'available') return <span className="text-success">{strings.available}</span>;
    if (status === 'taken') return <span className="text-danger">{strings.taken}</span>;
    if (status === 'invalid') return <span className="text-danger">{strings.invalid}</span>;
    return null;
  };

  const canSave = status === 'available' && !saving;

  return (
    <div className="panel-2 flex flex-col gap-2 p-4 text-sm">
      <span className="text-text-2">{strings.label}</span>

      {username && !editing ? (
        <div className="flex items-center justify-between gap-2">
          <strong className="font-mono text-text">@{username}</strong>
          <button type="button" onClick={startEdit} className="btn btn-glass btn-sm">
            {strings.change}
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-3">{strings.help}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-text-3">@</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={strings.placeholder}
              className="field min-w-0 flex-1 !py-2"
              autoFocus
            />
            <button type="button" onClick={save} disabled={!canSave} className="btn btn-primary btn-sm">
              {username ? strings.save : strings.claim}
            </button>
            {username && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setValue('');
                  setStatus('idle');
                }}
                className="btn btn-glass btn-sm"
              >
                {strings.cancel}
              </button>
            )}
          </div>
          {value.trim() && (
            <p className="text-xs">
              <span className="font-mono text-text-3">/@{normalized || '…'}/</span> {hint()}
            </p>
          )}
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
