import { describe, it, expect } from 'vitest';
import { osm } from '@/lib/providers/osm';

describe('osm provider', () => {
  it('parses ?mlat/?mlon', () => {
    expect(
      osm.parse!(new URL('https://www.openstreetmap.org/?mlat=51.5074&mlon=-0.1278#map=12/51.5074/-0.1278')),
    ).toMatchObject({ lat: 51.5074, lng: -0.1278 });
  });

  it('parses the #map=zoom/lat/lng hash alone', () => {
    expect(osm.parse!(new URL('https://www.openstreetmap.org/#map=16/48.8584/2.2945'))).toMatchObject({
      lat: 48.8584,
      lng: 2.2945,
      zoom: 16,
    });
  });

  it('builds an openstreetmap link', () => {
    expect(osm.link!({ lat: 1, lng: 2 }, 'web')).toContain('mlat=1&mlon=2');
  });
});
