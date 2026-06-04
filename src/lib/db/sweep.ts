import type { Store } from './store';

let started = false;

/** Start a single hourly prune of expired links. Idempotent; never blocks. */
export function ensureSweep(store: Store): void {
  if (started) return;
  started = true;
  const run = () => void store.links.pruneExpired(Date.now()).catch(() => {});
  const t = setInterval(run, 3_600_000) as { unref?: () => void };
  t.unref?.(); // don't keep the process alive for the timer
  run();
}
