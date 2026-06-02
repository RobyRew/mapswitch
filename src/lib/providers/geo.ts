import type { Provider } from './types';
import { isValidLatLng, roundCoord } from '../parse/coords';

// The RFC 5870 geo: URI. On Android this opens the system app-chooser, which is
// the only realistic way to reach apps without their own scheme (incl. Radarbot,
// OsmAnd, Organic Maps…). iOS has no geo: equivalent, so it's Android-only.
export const geo: Provider = {
  id: 'geo',
  name: 'More apps…',
  color: '#8e8e93',
  platforms: ['android'],

  parse(url) {
    if (url.protocol !== 'geo:') return null;
    const path = url.pathname || url.href.replace(/^geo:/, '').split('?')[0] || '';
    const [latS, lngS] = path.split(',');
    let lat = Number(latS);
    let lng = Number(lngS);

    let label: string | undefined;
    const q = url.searchParams.get('q');
    if (q) {
      const qm = q.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\(([^)]*)\))?/);
      if (qm) {
        // geo:0,0?q=<lat>,<lng>(Label) — the q coords win when the path is 0,0/blank.
        if (lat === 0 && lng === 0) {
          lat = Number(qm[1]);
          lng = Number(qm[2]);
        }
        label = qm[3] || undefined;
      } else {
        label = q;
      }
    }

    if (!isValidLatLng(lat, lng)) return null;
    return { lat: roundCoord(lat), lng: roundCoord(lng), label, source: 'geo' };
  },

  link(t) {
    const label = t.label ? `(${encodeURIComponent(t.label)})` : '';
    return `geo:${t.lat},${t.lng}?q=${t.lat},${t.lng}${label}`;
  },
};
