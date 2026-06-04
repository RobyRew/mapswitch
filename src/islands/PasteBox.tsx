import { useState } from 'react';
import { parsePure } from '@/lib/parse/pipeline';
import type { Match } from '@/lib/providers/types';
import { usePlatform } from './hooks/usePlatform';
import AppChooser, { type ChooserStrings } from './AppChooser';

export interface PasteStrings {
  placeholder: string;
  resolve: string;
  resolving: string;
  paste: string;
  error: string;
  chooser: ChooserStrings;
}

export default function PasteBox({ strings }: { strings: PasteStrings }) {
  const platform = usePlatform();
  const [value, setValue] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(input: string) {
    setError(null);
    setMatch(null);
    const trimmed = input.trim();
    if (!trimmed) return;

    // Try locally first (zero network for links that already carry coordinates).
    const direct = parsePure(trimmed);
    if (direct) {
      setMatch(direct);
      return;
    }

    // Otherwise let the server resolve it — short-link expansion, named-place
    // geocoding, or a pasted address/place name.
    setBusy(true);
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });
      const data = (await res.json()) as { match?: Match; error?: string; message?: string };
      if (res.ok && data.match) setMatch(data.match);
      else setError(data.message || strings.error);
    } catch {
      setError(strings.error);
    } finally {
      setBusy(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      await resolve(text);
    } catch {
      /* clipboard permission denied — user can paste manually */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(value);
        }}
        className="flex flex-col gap-3"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={strings.placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? strings.resolving : strings.resolve}
          </button>
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-lg border border-border px-4 py-2.5 font-medium text-text hover:bg-surface-2"
          >
            {strings.paste}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {match && (
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <AppChooser match={match} platform={platform} strings={strings.chooser} />
        </div>
      )}
    </div>
  );
}
