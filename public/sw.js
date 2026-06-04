// MapSwitch service worker — minimal + privacy-preserving.
// We cache ONLY the static app shell (hashed assets + a tiny offline page) and
// never touch /api/* or auth. Bump CACHE on any shell change.
const CACHE = 'mapswitch-shell-v1';
const PRECACHE = ['/offline', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never proxy cross-origin
  if (url.pathname.startsWith('/api/')) return; // API + auth: always live, never cached
  if (url.pathname === '/share-target') return; // share entrypoint must hit the server

  // Hashed, immutable build assets → cache-first.
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Page navigations → network-first, fall back to the offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')));
  }
});
