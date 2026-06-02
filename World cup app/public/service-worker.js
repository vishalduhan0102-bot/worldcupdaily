// World Cup Daily Service Worker (PWA Offline Engine)
const CACHE_NAME = 'wcdaily-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/robots.txt',
  '/sitemap.xml',
  '/data/matches.json',
  '/data/groups.json',
  '/data/stadiums.json',
  '/data/teams.json',
  '/data/knockout.json'
];

// On install, populate precache with critical app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core App Shell and Data...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up stale caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Purging stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Dynamic Cache-First / Network-Fallback Cache strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip cross-origin chrome-extension protocols, etc.
  if (req.method !== 'GET') return;

  // Let browser-sync / dev-server websockets pass-through
  if (url.pathname.includes('ws') || url.pathname.includes('socket.io') || url.hostname === 'localhost' && url.port !== '3000') {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached answer but fetch a fresh version in the background (stale-while-revalidate)
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => { /* silent fallback when offline */ });
        return cachedResponse;
      }

      // Fallback to network
      return fetch(req)
        .then((networkResponse) => {
          // Cache dynamic files such as JS/CSS bundles and stadiums photos on demand
          if (
            networkResponse.status === 200 &&
            (url.origin === self.location.origin || url.href.includes('picsum.photos') || url.href.includes('unsplash.com'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and accessing navigation page (HTML shell), return index.html
          if (req.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          // Return generic offline fallback if image
          if (req.destination === 'image') {
            return caches.match('/icon.svg');
          }
        });
    })
  );
});
