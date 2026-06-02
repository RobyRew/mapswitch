import type { LatLng } from '../parse/coords';

export type Platform = 'ios' | 'android' | 'web';
export const ALL_PLATFORMS: readonly Platform[] = ['ios', 'android', 'web'];

/** The canonical, provider-neutral location produced by parsing any link. */
export interface Match extends LatLng {
  label?: string;
  zoom?: number;
  /** Provider id that matched — for debugging only, NEVER logged with coords. */
  source: string;
}

/** What we hand a provider to build an "open in" link. */
export interface BuildTarget extends LatLng {
  label?: string;
  zoom?: number;
}

/**
 * A map app. Adding a new one is a single new file + one line in registry.ts.
 *  - `parse`  reads a location OUT of one of this provider's links (INPUT side).
 *  - `link`   builds a link that opens this app at a location (OUTPUT side).
 * Both are pure and isomorphic — only the short-link expander is server-only.
 */
export interface Provider {
  id: string;
  name: string;
  color?: string;
  /** Platforms where this provider is offered as a target. Default: all. */
  platforms?: readonly Platform[];
  /** Keep showing as a disabled option where link() returns null (e.g. Radarbot/iOS). */
  showWhenUnavailable?: boolean;
  /** INPUT — extract a location from a URL. null = not this provider's link. */
  parse?(url: URL): Match | null;
  /** OUTPUT — href for this provider's button. null = unavailable on this platform. */
  link?(target: BuildTarget, platform: Platform): string | null;
  /** Hosts whose links are SHORT and must be expanded server-side first. */
  shortLinkHosts?: string[];
  /** Hosts this provider's parse() recognises (post-expansion). */
  hosts?: string[];
}
