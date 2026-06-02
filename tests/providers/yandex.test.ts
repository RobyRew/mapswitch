import { describe, it, expect } from 'vitest';
import { yandex } from '@/lib/providers/yandex';

// Yandex stores coordinates as LON,LAT — the swap is the whole point of this test.
describe('yandex provider (lng,lat order)', () => {
  it('parses pt=lng,lat and swaps to lat,lng', () => {
    // Moscow ≈ lat 55.75, lng 37.62 → pt="37.62,55.75"
    expect(yandex.parse!(new URL('https://yandex.com/maps/?pt=37.62,55.75&z=12'))).toMatchObject({
      lat: 55.75,
      lng: 37.62,
    });
  });

  it('builds a link with lng,lat order', () => {
    const href = yandex.link!({ lat: 55.75, lng: 37.62 }, 'web');
    expect(href).toContain('ll=37.62,55.75');
    expect(href).toContain('pt=37.62,55.75');
  });
});
