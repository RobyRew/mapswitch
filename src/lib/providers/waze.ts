import type { Provider } from './types';
import { hostMatches } from './util';
import { parseLatLngPair } from '../parse/coords';

export const waze: Provider = {
  id: 'waze',
  name: 'Waze',
  color: '#05c8f7',
  platforms: ['ios', 'android', 'web'],
  hosts: ['waze.com'],

  parse(url) {
    if (!hostMatches(url, ['waze.com'])) return null;
    const to = url.searchParams.get('to');
    const ll =
      url.searchParams.get('ll') ??
      url.searchParams.get('latlng') ??
      (to ? to.replace(/^ll\./, '') : null);
    const pair = ll ? parseLatLngPair(ll) : null;
    if (!pair) return null;
    return { ...pair, source: 'waze' };
  },

  link(t) {
    return `https://waze.com/ul?ll=${t.lat},${t.lng}&navigate=yes`;
  },
};
