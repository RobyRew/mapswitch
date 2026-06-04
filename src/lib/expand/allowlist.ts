// Only these hosts (and their subdomains) may be fetched by the expander.
// Adding a provider with short links = add its short + canonical hosts here.
export const ALLOWED_HOSTS: readonly string[] = [
  // Google (short + canonical)
  'maps.app.goo.gl',
  'goo.gl',
  'app.goo.gl',
  'g.co',
  'google.com',
  'maps.google.com',
  // Apple
  'apple.co',
  'maps.apple',
  'maps.apple.com',
  // Waze
  'waze.com',
  // Yandex
  'yandex.com',
  'yandex.ru',
  'maps.yandex.com',
  'maps.yandex.ru',
  // OpenStreetMap
  'openstreetmap.org',
  'osm.org',
  // Organic Maps
  'omaps.app',
];

/** Label-boundary suffix match: blocks 'maps.app.goo.gl.evil.com' and 'notgoo.gl'. */
export function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith('.' + a));
}
