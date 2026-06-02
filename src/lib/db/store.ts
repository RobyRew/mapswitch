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
  userId: string;
  lat: number;
  lng: number;
  label?: string;
  createdAt: number;
  expiresAt?: number | null;
  hitCount: number;
}

export interface NewLink {
  slug: string;
  userId: string;
  lat: number;
  lng: number;
  label?: string;
  expiresAt?: number | null;
}

export interface LinkStore {
  create(link: NewLink): Promise<SavedLink>;
  get(slug: string): Promise<SavedLink | null>;
  listByUser(userId: string): Promise<SavedLink[]>;
  deleteOwned(slug: string, userId: string): Promise<boolean>; // ownership enforced in WHERE
  incrementHit(slug: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
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
