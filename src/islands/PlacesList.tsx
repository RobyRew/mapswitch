import { useEffect, useState } from 'react';
import { buildShareUrl } from '@/lib/share/encode';

interface Place {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface PlacesStrings {
  savedTitle: string;
  openedTitle: string;
  empty: string;
  open: string;
  delete: string;
}

export default function PlacesList({ strings }: { strings: PlacesStrings }) {
  const [saved, setSaved] = useState<Place[]>([]);
  const [opened, setOpened] = useState<Place[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/places')
      .then((r) => r.json())
      .then((d: { saved?: Place[]; opened?: Place[] }) => {
        setSaved(d.saved ?? []);
        setOpened(d.opened ?? []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function remove(id: string, kind: 'saved' | 'opened') {
    await fetch('/api/places/' + id, { method: 'DELETE' }).catch(() => {});
    if (kind === 'saved') setSaved((s) => s.filter((p) => p.id !== id));
    else setOpened((s) => s.filter((p) => p.id !== id));
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const href = (p: Place) => buildShareUrl(origin, { lat: p.lat, lng: p.lng, label: p.label });

  function section(title: string, items: Place[], kind: 'saved' | 'opened') {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
        <span className="text-text-2">{title}</span>
        {items.length === 0 ? (
          <p className="text-xs text-text-3">{strings.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <a href={href(p)} className="min-w-0 flex-1 truncate text-text hover:text-accent">
                  {p.label || `${p.lat}, ${p.lng}`}
                </a>
                <a href={href(p)} className="shrink-0 text-xs text-accent hover:underline">
                  {strings.open}
                </a>
                <button
                  type="button"
                  onClick={() => remove(p.id, kind)}
                  className="shrink-0 text-xs text-danger hover:underline"
                >
                  {strings.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!loaded) return null;
  return (
    <div className="flex flex-col gap-4">
      {section(strings.savedTitle, saved, 'saved')}
      {section(strings.openedTitle, opened, 'opened')}
    </div>
  );
}
