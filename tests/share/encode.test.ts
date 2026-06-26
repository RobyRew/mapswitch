import { describe, it, expect } from 'vitest';
import { buildShareUrl, decodeShareParams } from '@/lib/share/encode';

describe('neutral /o share links', () => {
  it('builds a /o?ll= link with an encoded label', () => {
    expect(buildShareUrl('https://maps.robyrew.com', { lat: 41.23, lng: 1.15, label: 'Café' })).toBe(
      'https://maps.robyrew.com/o?ll=41.23%2C1.15&q=Caf%C3%A9',
    );
  });

  it('drops a trailing slash on the base', () => {
    expect(buildShareUrl('https://x.test/', { lat: 1, lng: 2 })).toBe('https://x.test/o?ll=1%2C2');
  });

  it('round-trips through decodeShareParams', () => {
    const url = buildShareUrl('https://x.test', { lat: 48.8584, lng: 2.2945, label: 'Tower' });
    expect(decodeShareParams(new URL(url).searchParams)).toMatchObject({
      lat: 48.8584,
      lng: 2.2945,
      label: 'Tower',
      source: 'share',
    });
  });
});
