import type { Provider } from './types';
import { isValidLatLng, parseLatLngPair, roundCoord } from '../parse/coords';

function isGoogleHost(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  // google.com, www.google.com, maps.google.com, google.es, google.co.uk, …
  return /(^|\.)google\.[a-z.]+$/.test(h);
}

/** /maps/place/<Name>/… → "Name" */
function placeLabel(url: URL): string | undefined {
  const m = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (m && m[1]) {
    try {
      return decodeURIComponent(m[1].replace(/\+/g, ' '));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const google: Provider = {
  id: 'google',
  name: 'Google Maps',
  color: '#1a73e8',
  platforms: ['ios', 'android', 'web'],
  hosts: ['google.com', 'maps.google.com'],
  shortLinkHosts: ['maps.app.goo.gl', 'goo.gl', 'app.goo.gl', 'g.co'],

  parse(url) {
    if (!isGoogleHost(url)) return null;
    const sp = url.searchParams;

    // 1. Explicit coordinate params (api=1 `query`, plus q/ll/destination/…).
    for (const key of ['query', 'q', 'll', 'viewpoint', 'destination', 'center']) {
      const v = sp.get(key);
      const pair = v ? parseLatLngPair(v) : null;
      if (pair) {
        const q = sp.get('q');
        const label = q && !parseLatLngPair(q) ? q : placeLabel(url);
        return { ...pair, label, source: 'google' };
      }
    }

    // 2. !3d<lat>!4d<lng> data params — the precise place pin (beats @viewport).
    const d = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (d) {
      const lat = Number(d[1]);
      const lng = Number(d[2]);
      if (isValidLatLng(lat, lng)) {
        return { lat: roundCoord(lat), lng: roundCoord(lng), label: placeLabel(url), source: 'google' };
      }
    }

    // 3. /@lat,lng,zoom — viewport-centre fallback.
    const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/);
    if (at) {
      const lat = Number(at[1]);
      const lng = Number(at[2]);
      if (isValidLatLng(lat, lng)) {
        return {
          lat: roundCoord(lat),
          lng: roundCoord(lng),
          zoom: at[3] ? Number(at[3]) : undefined,
          label: placeLabel(url),
          source: 'google',
        };
      }
    }

    // 4. Fallback: coordinates anywhere in the decoded path/search — covers
    //    expanded short links like /maps/search/41.225531,+1.148071.
    let decoded: string;
    try {
      decoded = decodeURIComponent(url.pathname + url.search).replace(/\+/g, ' ');
    } catch {
      decoded = (url.pathname + url.search).replace(/\+/g, ' ');
    }
    const g = decoded.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (g) {
      const lat = Number(g[1]);
      const lng = Number(g[2]);
      if (isValidLatLng(lat, lng)) {
        return { lat: roundCoord(lat), lng: roundCoord(lng), label: placeLabel(url), source: 'google' };
      }
    }

    return null;
  },

  link(t) {
    // Universal cross-platform URL — opens the native app on mobile.
    return `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`;
  },
};
