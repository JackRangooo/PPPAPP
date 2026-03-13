const CACHE_NAME = 'pingproprivate-shell-v4';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

const CACHEABLE_DESTINATIONS = new Set(['document', 'font', 'image', 'script', 'style', 'worker']);
const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style', 'worker']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

const shouldHandleRequest = (request) => CACHEABLE_DESTINATIONS.has(request.destination);

const shouldUseNetworkFirst = (request, url) =>
  request.mode === 'navigate' ||
  NETWORK_FIRST_DESTINATIONS.has(request.destination) ||
  url.pathname.endsWith('.webmanifest');

const fetchAndCache = async (request) => {
  const response = await fetch(request);
  if (!response.ok) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener('fetch', (event) => {
  const {request} = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (!shouldHandleRequest(request) && request.mode !== 'navigate' && !url.pathname.endsWith('.webmanifest')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (shouldUseNetworkFirst(request, url)) {
        try {
          const response = await fetchAndCache(request);
          if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/', response.clone());
          }
          return response;
        } catch (error) {
          return cached || (request.mode === 'navigate' ? await caches.match('/') : Response.error());
        }
      }

      if (cached) {
        void fetchAndCache(request).catch(() => null);
        return cached;
      }

      try {
        return await fetchAndCache(request);
      } catch (error) {
        return Response.error();
      }
    })(),
  );
});
