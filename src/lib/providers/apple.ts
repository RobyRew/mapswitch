import type { Provider } from './types';
import { hostMatches } from './util';
import { parseLatLngPair } from '../parse/coords';

export const apple: Provider = {
  id: 'apple',
  name: 'Apple Maps',
  color: '#34a1f0',
  // Apple Maps is meaningful on Apple platforms + the desktop web viewer.
  platforms: ['ios', 'web'],
  hosts: ['maps.apple.com'],

  parse(url) {
    if (!hostMatches(url, ['maps.apple.com'])) return null;
    const ll =
      url.searchParams.get('ll') ??
      url.searchParams.get('sll') ??
      url.searchParams.get('coordinate');
    const q = url.searchParams.get('q');
    const pair = (ll ? parseLatLngPair(ll) : null) ?? (q ? parseLatLngPair(q) : null);
    if (!pair) return null;
    const label = q && !parseLatLngPair(q) ? q : undefined;
    return { ...pair, label, source: 'apple' };
  },

  link(t) {
    const q = t.label ? `&q=${encodeURIComponent(t.label)}` : '';
    return `https://maps.apple.com/?ll=${t.lat},${t.lng}${q}`;
  },
};
