import type { Platform } from '../providers/types';

// The persistence CONTRACT. The app targets these interfaces; today there is no
// implementation (getStore() returns null) and everything falls back to the
// browser's localStorage. The accounts phase supplies a real Drizzle+SQLite impl.

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
  lat: number;
  lng: number;
  label?: string;
  createdAt: number;
}

export interface LinkStore {
  create(link: Omit<SavedLink, 'createdAt'>): Promise<SavedLink>;
  get(slug: string): Promise<SavedLink | null>;
}

export interface Store {
  preferences: PreferenceStore;
  links: LinkStore;
}
