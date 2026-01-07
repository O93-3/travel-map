// TravelMap Service Worker (stable)
const CACHE_NAME = 'travel-map-v49-20260107';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './cities.json',
  './cities-ATS.json',
  './manifest.json',
  './icon.png',
  './countries.geojson',
  './countries.geo.json',
  './js/extensions.js',
  './js/selfcheck.js',
  './js/custom-blink.js',
  './js/draggable-ui.js',
  './js/fix-lineweight.js',
  './js/draggable-routeoverlay.js',
  './js/overlay-fontsize.all.js',
  './js/overlay-readability.js',
  './js/location-readability.js',
  './js/ui-drawer.js',
  './js/fix-currentlocation-drag.js',
  './sw.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(FILES.map(async (p) => {
      try { await cache.add(p); } catch(_) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetched = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await fetched) || cached;
  })());
});
