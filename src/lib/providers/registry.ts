import type { Provider, Match, BuildTarget, Platform } from './types';
import { ALL_PLATFORMS } from './types';
import { apple } from './apple';
import { google } from './google';
import { waze } from './waze';
import { yandex } from './yandex';
import { osm } from './osm';
import { geo } from './geo';
import { radarbot } from './radarbot';

// Order here = display order in the chooser. Add a new app: import + append.
export const PROVIDERS: readonly Provider[] = [apple, google, waze, yandex, osm, geo, radarbot];

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** INPUT — first provider to recognise the URL wins. */
export function parseWithRegistry(url: URL): Match | null {
  for (const p of PROVIDERS) {
    const m = p.parse?.(url);
    if (m) return m;
  }
  return null;
}

/** Hosts across all providers whose links must be expanded server-side first. */
export const SHORT_LINK_HOSTS: readonly string[] = PROVIDERS.flatMap((p) => p.shortLinkHosts ?? []);

export interface ProviderOption {
  id: string;
  name: string;
  color: string | undefined;
  href: string | null; // null = recognised provider, unavailable on this platform
  available: boolean;
}

/** OUTPUT — the ordered "open in…" options for a place on a given platform. */
export function buildForRegistry(target: BuildTarget, platform: Platform): ProviderOption[] {
  const out: ProviderOption[] = [];
  for (const p of PROVIDERS) {
    const platforms = p.platforms ?? ALL_PLATFORMS;
    if (!platforms.includes(platform)) continue;
    const href = p.link ? p.link(target, platform) : null;
    if (href === null && !p.showWhenUnavailable) continue;
    out.push({ id: p.id, name: p.name, color: p.color, href, available: href !== null });
  }
  return out;
}
