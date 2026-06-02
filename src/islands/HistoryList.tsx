import { useEffect, useState } from 'react';

export interface HistoryStrings {
  history: string;
  historyEmpty: string;
  copy: string;
  copied: string;
  delete: string;
}

interface Item {
  slug: string;
  label: string | null;
  lat: number;
  lng: number;
  createdAt: number;
  hitCount: number;
}

export default function HistoryList({ strings, baseUrl }: { strings: HistoryStrings; baseUrl: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : baseUrl;

  useEffect(() => {
    fetch('/api/links')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { links?: Item[] } | null) => setItems(d?.links ?? []))
      .catch(() => setItems([]));
  }, []);

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/x/${slug}`);
      setCopied(slug);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  async function remove(slug: string) {
    await fetch(`/api/links/${slug}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
    setItems((x) => (x ? x.filter((i) => i.slug !== slug) : x));
  }

  if (items === null) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">{strings.history}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-3">{strings.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.slug}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text">
                  {it.label || `${it.lat}, ${it.lng}`}
                </div>
                <div className="truncate text-xs text-text-3">
                  /x/{it.slug} · {it.hitCount}×
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => copy(it.slug)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-3"
                >
                  {copied === it.slug ? strings.copied : strings.copy}
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.slug)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-danger hover:bg-surface-3"
                >
                  {strings.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
