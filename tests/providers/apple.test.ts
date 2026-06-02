import { describe, it, expect } from 'vitest';
import { apple } from '@/lib/providers/apple';

describe('apple provider', () => {
  it('parses ?ll with a label', () => {
    const m = apple.parse!(new URL('https://maps.apple.com/?ll=48.8584,2.2945&q=Eiffel%20Tower'));
    expect(m).toMatchObject({ lat: 48.8584, lng: 2.2945, label: 'Eiffel Tower' });
  });

  it('parses ?q coordinates', () => {
    const m = apple.parse!(new URL('https://maps.apple.com/?q=40.7484,-73.9857'));
    expect(m).toMatchObject({ lat: 40.7484, lng: -73.9857 });
  });

  it('rejects foreign hosts', () => {
    expect(apple.parse!(new URL('https://example.com/?ll=1,2'))).toBeNull();
  });

  it('builds a maps.apple.com link', () => {
    const href = apple.link!({ lat: 48.8584, lng: 2.2945, label: 'Eiffel' }, 'ios');
    expect(href).toContain('https://maps.apple.com/?ll=48.8584,2.2945');
    expect(href).toContain('q=Eiffel');
  });
});
