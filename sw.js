// TravelMap Service Worker (stable v26)
// Same-origin only. External CDN assets (Leaflet) are not cached.
const CACHE_NAME = 'travel-map-v29-20260106';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './cities.json',
  './manifest.json',
  './icon.png',
  './js/extensions.js',
  './js/draggable-ui.js',
  './countries.geojson',
  './countries.geo.json',
  './js/fix-lineweight.js',
  './js/draggable-routeoverlay.js',
  './js/overlay-fontsize.all.js',
  './js/overlay-readability.js',
  './js/mobile-compact.js',
  './js/mobile-icons.js',
  './sw.js'

 './js/fix-currentlocation-drag.js',
 './js/error-banner.js',
 './vendor/leaflet/leaflet.css',
 './vendor/leaflet/leaflet.js',
 './vendor/leaflet/images/layers.png',
 './vendor/leaflet/images/layers-2x.png',
 './vendor/leaflet/images/marker-icon.png',
 './vendor/leaflet/images/marker-icon-2x.png',
 './vendor/leaflet/images/marker-shadow.png',];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Add files one-by-one so missing optional files won't break install
    await Promise.all(FILES.map(async (p) => {
      try { await cache.add(p); } catch(_) { /* ignore */ }
    }));
  })();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })();
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
  })();
});
