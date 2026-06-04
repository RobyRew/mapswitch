import type { Platform } from '../providers/types';

// The persistence CONTRACT. Implemented by drizzleStore.ts when DB_URL is set.

export interface DevicePreferences {
  defaultProviderId: string | null;
  autoOpen: boolean;
  lastPlatform?: Platform;
}

export interface PreferenceStore {
  get(userId: string): Promise<DevicePreferences | null>;
  set(userId: string, prefs: DevicePreferences): Promise<void>;
}

export interface SavedLink {
  slug: string;
  userId: string | null; // null = anonymous
  ownerToken?: string | null; // anonymous owner (localStorage id)
  ipHash?: string | null; // salted hash of creator IP (anon quota)
  lat: number;
  lng: number;
  label?: string;
  createdAt: number;
  expiresAt?: number | null; // null = indefinite
  hitCount: number;
}

export interface NewLink {
  slug: string;
  userId: string | null;
  ownerToken?: string | null;
  ipHash?: string | null;
  lat: number;
  lng: number;
  label?: string;
  expiresAt?: number | null;
}

export interface LinkStore {
  create(link: NewLink): Promise<SavedLink>;
  get(slug: string): Promise<SavedLink | null>;
  listByUser(userId: string): Promise<SavedLink[]>;
  deleteOwned(slug: string, userId: string): Promise<boolean>; // logged-in owner
  deleteAnon(slug: string, ownerToken: string): Promise<boolean>; // anonymous owner
  incrementHit(slug: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
  /** Anonymous links created since `sinceMs`, matched by token OR ipHash. */
  countRecentByAnon(ownerToken: string, ipHash: string, sinceMs: number): Promise<number>;
  /** Reassign anon links with `ownerToken` to `userId` (clears token + expiry). Returns count. */
  claimAnon(ownerToken: string, userId: string): Promise<number>;
  /** Delete links whose expiresAt has passed. Returns count. */
  pruneExpired(nowMs: number): Promise<number>;
}

export interface HistoryEntry {
  slug: string | null;
  openedAt: number;
}

export interface HistoryStore {
  add(userId: string, slug: string): Promise<void>;
  listByUser(userId: string, limit?: number): Promise<HistoryEntry[]>;
}

export interface Store {
  preferences: PreferenceStore;
  links: LinkStore;
  history: HistoryStore;
}
