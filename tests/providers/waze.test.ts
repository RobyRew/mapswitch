import { describe, it, expect } from 'vitest';
import { waze } from '@/lib/providers/waze';

describe('waze provider', () => {
  it('parses ?ll', () => {
    expect(waze.parse!(new URL('https://waze.com/ul?ll=40.75889,-73.98513&navigate=yes'))).toMatchObject({
      lat: 40.75889,
      lng: -73.98513,
    });
  });

  it('parses ?to=ll.<coords>', () => {
    expect(waze.parse!(new URL('https://www.waze.com/live-map/directions?to=ll.45.4642,9.19'))).toMatchObject({
      lat: 45.4642,
      lng: 9.19,
    });
  });

  it('builds a waze.com/ul link', () => {
    expect(waze.link!({ lat: 1, lng: 2 }, 'ios')).toBe('https://waze.com/ul?ll=1,2&navigate=yes');
  });
});
