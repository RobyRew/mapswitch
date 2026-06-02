import type { Provider } from './types';
import { hostMatches } from './util';
import { isValidLatLng, roundCoord } from '../parse/coords';

// ⚠ Yandex uses LON,LAT order in `pt` and `ll` — swapped vs everyone else.
export const yandex: Provider = {
  id: 'yandex',
  name: 'Yandex Maps',
  color: '#ff3333',
  platforms: ['ios', 'android', 'web'],
  hosts: ['yandex.com', 'yandex.ru'],

  parse(url) {
    if (!hostMatches(url, ['yandex.com', 'yandex.ru'])) return null;
    const raw = url.searchParams.get('pt') ?? url.searchParams.get('ll');
    if (!raw) return null;
    const parts = raw.split(',');
    const lng = Number(parts[0]); // ← lon first
    const lat = Number(parts[1]);
    if (!isValidLatLng(lat, lng)) return null;
    const text = url.searchParams.get('text') ?? undefined;
    return { lat: roundCoord(lat), lng: roundCoord(lng), label: text, source: 'yandex' };
  },

  link(t) {
    const z = Math.round(t.zoom ?? 16);
    return `https://yandex.com/maps/?ll=${t.lng},${t.lat}&z=${z}&pt=${t.lng},${t.lat}`;
  },
};
