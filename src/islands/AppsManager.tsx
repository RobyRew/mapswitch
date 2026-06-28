import { PROVIDERS } from '@/lib/providers/registry';
import { usePreferences } from './hooks/usePreferences';

export interface AppsManagerStrings {
  title: string;
  hint: string;
  moveUp: string;
  moveDown: string;
}

export default function AppsManager({ strings }: { strings: AppsManagerStrings }) {
  const { prefs, loaded, update } = usePreferences();

  const all = PROVIDERS.map((p) => ({ id: p.id, name: p.name, color: p.color }));
  const byId = new Map(all.map((a) => [a.id, a]));
  // Saved order first (still-existing ids), then any new providers in registry order.
  const orderedIds = [
    ...prefs.appOrder.filter((id) => byId.has(id)),
    ...all.map((a) => a.id).filter((id) => !prefs.appOrder.includes(id)),
  ];
  const ordered = orderedIds.map((id) => byId.get(id)!);
  const hidden = new Set(prefs.hiddenApps);

  function toggle(id: string) {
    const next = new Set(prefs.hiddenApps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update({ hiddenApps: [...next] });
  }

  function move(index: number, dir: -1 | 1) {
    const ids = ordered.map((a) => a.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    update({ appOrder: ids });
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm">
      <span className="text-text-2">{strings.title}</span>
      <p className="text-xs text-text-3">{strings.hint}</p>
      <ul className="flex flex-col gap-1">
        {ordered.map((a, index) => {
          const isHidden = hidden.has(a.id);
          return (
            <li key={a.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-surface-3">
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => toggle(a.id)}
                aria-label={a.name}
              />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color ?? '#8e8e93' }} />
              <span className={`flex-1 ${isHidden ? 'text-text-3 line-through' : 'text-text'}`}>{a.name}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={strings.moveUp}
                className="rounded px-2 py-0.5 text-text-2 hover:bg-surface-2 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === ordered.length - 1}
                aria-label={strings.moveDown}
                className="rounded px-2 py-0.5 text-text-2 hover:bg-surface-2 disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
