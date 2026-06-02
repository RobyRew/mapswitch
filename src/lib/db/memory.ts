import type {
  Store,
  PreferenceStore,
  LinkStore,
  DevicePreferences,
  SavedLink,
} from './store';

// In-memory reference implementation of the Store contract. Not wired in by
// default (getStore() returns null today); handy for the future accounts work
// and for tests of code that targets the Store interface.

class MemoryPreferenceStore implements PreferenceStore {
  private map = new Map<string, DevicePreferences>();
  async get(userId: string): Promise<DevicePreferences | null> {
    return this.map.get(userId) ?? null;
  }
  async set(userId: string, prefs: DevicePreferences): Promise<void> {
    this.map.set(userId, prefs);
  }
}

class MemoryLinkStore implements LinkStore {
  private map = new Map<string, SavedLink>();
  async create(link: Omit<SavedLink, 'createdAt'>): Promise<SavedLink> {
    const full: SavedLink = { ...link, createdAt: Date.now() };
    this.map.set(full.slug, full);
    return full;
  }
  async get(slug: string): Promise<SavedLink | null> {
    return this.map.get(slug) ?? null;
  }
}

export function createMemoryStore(): Store {
  return {
    preferences: new MemoryPreferenceStore(),
    links: new MemoryLinkStore(),
  };
}
