// TravelMap Service Worker (stable)
// Notes: external CDN assets (Leaflet) are not cached; same-origin only.
const CACHE_NAME = 'travel-map-v21';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './cities.json',
  './manifest.json',
  './icon.png',
  './extensions.js',
  './sw.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(FILES).catch((err) => {
        console.warn('[SW] cache addAll failed', err);
      })
    )
  );
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
  if (url.origin !== self.location.origin) {
    return; // let browser handle
  }

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
