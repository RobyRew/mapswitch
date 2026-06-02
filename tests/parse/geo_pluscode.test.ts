import { describe, it, expect } from 'vitest';
import { geo } from '@/lib/providers/geo';
import { decodePlusCode, isFullPlusCode } from '@/lib/parse/pluscode';
import { parsePure } from '@/lib/parse/pipeline';

describe('geo: URI', () => {
  it('parses geo:lat,lng', () => {
    expect(geo.parse!(new URL('geo:48.8584,2.2945'))).toMatchObject({ lat: 48.8584, lng: 2.2945 });
  });

  it('parses geo:0,0?q=lat,lng(Label)', () => {
    const m = geo.parse!(new URL('geo:0,0?q=40.7484,-73.9857(Empire State)'));
    expect(m).toMatchObject({ lat: 40.7484, lng: -73.9857, label: 'Empire State' });
  });

  it('builds an android geo: link', () => {
    expect(geo.link!({ lat: 1, lng: 2 }, 'android')).toContain('geo:1,2');
  });
});

describe('plus codes', () => {
  it('detects a full code', () => {
    expect(isFullPlusCode('8FW4V75V+8Q')).toBe(true);
    expect(isFullPlusCode('not a code')).toBe(false);
  });

  it('decodes the Eiffel Tower code to ~48.8583, 2.2944', () => {
    const p = decodePlusCode('8FW4V75V+8Q')!;
    expect(p.lat).toBeCloseTo(48.8583, 3);
    expect(p.lng).toBeCloseTo(2.2944, 3);
  });
});

describe('parsePure dispatch', () => {
  it('handles a bare "lat, lng"', () => {
    expect(parsePure('41.3851, 2.1734')).toMatchObject({ lat: 41.3851, lng: 2.1734, source: 'coords' });
  });

  it('routes a google url', () => {
    expect(parsePure('https://www.google.com/maps/@48.8584,2.2945,17z')).toMatchObject({ source: 'google' });
  });

  it('returns null for unrecognised text', () => {
    expect(parsePure('hello world')).toBeNull();
  });
});
