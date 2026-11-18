const CACHE_NAME = 'commandatlas-v2';
const SHELL_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
];

// Install event — cache shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of SHELL_ASSETS) {
        try {
          await cache.add(asset);
        } catch {
          // Gracefully continue if an individual optional asset is missing during build
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate event — clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

// Fetch event — stale-while-revalidate for shell/assets, network-only for API, offline fallback for navigation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-only for API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests: network-first with graceful offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedPage = await caches.match(event.request);
        if (cachedPage) return cachedPage;

        const offlinePage = await caches.match('/offline');
        if (offlinePage) return offlinePage;

        const homePage = await caches.match('/');
        if (homePage) return homePage;

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Stale-while-revalidate for static assets, chunks, and content
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
