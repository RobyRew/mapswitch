import { describe, it, expect } from 'vitest';
import { parseLatLngPair, parseDirectionalLatLng } from '@/lib/parse/coords';
import { parsePure } from '@/lib/parse/pipeline';

describe('parseLatLngPair tolerance', () => {
  it('accepts parentheses and spaces', () => {
    // Coords are rounded to ~6 decimals (roundCoord) — that's expected.
    const a = parseLatLngPair('(41.2228496, 1.1535256)')!;
    expect(a.lat).toBeCloseTo(41.2228496, 5);
    expect(a.lng).toBeCloseTo(1.1535256, 5);
    expect(parseLatLngPair('41.22,1.15')).toMatchObject({ lat: 41.22, lng: 1.15 });
    expect(parseLatLngPair(' ( -0.5 , 2.0 ) ')).toMatchObject({ lat: -0.5, lng: 2 });
  });

  it('still rejects junk', () => {
    expect(parseLatLngPair('hello')).toBeNull();
    expect(parseLatLngPair('(1,2,3)')).toBeNull();
  });

  it('parsePure routes parenthesized coords', () => {
    const m = parsePure('(41.2228496, 1.1535256)')!;
    expect(m.source).toBe('coords');
    expect(m.lat).toBeCloseTo(41.2228496, 5);
  });
});

describe('parseDirectionalLatLng', () => {
  it('reads N/E directional coords from prose', () => {
    expect(parseDirectionalLatLng('… 206 / N: 41.1151 - E: 1.21836, Tarragona')).toMatchObject({
      lat: 41.1151,
      lng: 1.21836,
    });
  });

  it('applies S/W as negative', () => {
    expect(parseDirectionalLatLng('S 33.8688 W 151.2093')).toMatchObject({ lat: -33.8688, lng: -151.2093 });
  });

  it('ignores integer house numbers (no decimals)', () => {
    expect(parseDirectionalLatLng('Carrer N: 206, Nord 5, Entrada E')).toBeNull();
  });
});
