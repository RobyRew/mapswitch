import type { Provider } from './types';
import { hostMatches } from './util';
import { isValidLatLng, roundCoord } from '../parse/coords';

export const osm: Provider = {
  id: 'osm',
  name: 'OpenStreetMap',
  color: '#7ebc6f',
  platforms: ['ios', 'android', 'web'],
  hosts: ['openstreetmap.org', 'osm.org'],

  parse(url) {
    if (!hostMatches(url, ['openstreetmap.org', 'osm.org'])) return null;
    const mlat = url.searchParams.get('mlat');
    const mlon = url.searchParams.get('mlon');
    if (mlat && mlon) {
      const lat = Number(mlat);
      const lng = Number(mlon);
      if (isValidLatLng(lat, lng)) return { lat: roundCoord(lat), lng: roundCoord(lng), source: 'osm' };
    }
    // #map=zoom/lat/lng
    const hash = url.hash.match(/map=(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if (hash) {
      const lat = Number(hash[2]);
      const lng = Number(hash[3]);
      if (isValidLatLng(lat, lng)) {
        return { lat: roundCoord(lat), lng: roundCoord(lng), zoom: Number(hash[1]), source: 'osm' };
      }
    }
    return null;
  },

  link(t) {
    const z = Math.round(t.zoom ?? 16);
    return `https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=${z}/${t.lat}/${t.lng}`;
  },
};
