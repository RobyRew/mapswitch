import { describe, it, expect } from 'vitest';
import { parsePure, isExpandable } from '@/lib/parse/pipeline';
import { extractQuery } from '@/lib/geocode';
import { apple } from '@/lib/providers/apple';

describe('our own /o?ll= links parse', () => {
  it('reads ll + q from a /o share link', () => {
    expect(parsePure('https://maps.robyrew.com/o?ll=41.22285,1.153526&q=gg')).toMatchObject({
      lat: 41.22285,
      lng: 1.153526,
      source: 'share',
    });
  });
});

describe('extractQuery (for geocoding named places)', () => {
  it('returns the place name and skips coord-valued params', () => {
    expect(extractQuery(new URL('https://maps.google.com/?q=THE-ARE, Valencia&ftid=0x123'))).toBe('THE-ARE, Valencia');
    expect(extractQuery(new URL('https://maps.google.com/maps/place/Sagrada+Familia/@1,2'))).toBe('Sagrada Familia');
    expect(extractQuery(new URL('https://maps.google.com/?q=41.2,1.1'))).toBeNull();
  });
});

describe('apple short links', () => {
  it('flags maps.apple/p as expandable', () => {
    expect(isExpandable('https://maps.apple/p/CqyZyzmRLCuhrP')).toBe(true);
  });
  it('parses an expanded apple place URL (coordinate= + name=)', () => {
    expect(
      apple.parse!(new URL('https://maps.apple.com/place?coordinate=41.211327,1.144046&name=La%20Selva')),
    ).toMatchObject({ lat: 41.211327, lng: 1.144046, label: 'La Selva' });
  });
});
