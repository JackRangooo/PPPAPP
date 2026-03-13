const CACHE_NAME = 'pingproprivate-shell-v3';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

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

const isCacheableAsset = (request) =>
  ['document', 'font', 'image', 'script', 'style', 'worker'].includes(request.destination);

const updateCache = async (request) => {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      return response;
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return null;
  }
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

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
          return response;
        } catch (error) {
          return (await caches.match(request)) || (await caches.match('/'));
        }
      })(),
    );
    return;
  }

  if (!isCacheableAsset(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        void updateCache(request);
        return cached;
      }

      return (await updateCache(request)) || Response.error();
    })(),
  );
});

