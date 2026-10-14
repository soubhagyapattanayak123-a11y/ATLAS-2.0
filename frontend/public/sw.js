// ATLAS 2.0 - High Performance Service Worker for Offline & Online Caching
const CACHE_NAME = 'atlas-cache-v2.1';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/atlas-logo.png',
  '/favicon.svg',
  '/manifest.webmanifest'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ATLAS SW] Pre-caching static app shell...');
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[ATLAS SW] Partial pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[ATLAS SW] Removing outdated cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart Caching for Online & Offline Dual Mode
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests (e.g. POST/PUT to backend)
  if (req.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // 2. API requests (/api/*)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        // Safe offline JSON fallback
        if (url.pathname.includes('/health')) {
          return new Response(
            JSON.stringify({
              status: 'ok',
              database: 'Local Browser Storage (Offline Cached)',
              items_count: 5,
              version: '2.0.0-offline',
              timestamp: new Date().toISOString()
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Offline Mode Active', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 3. Static assets: Cache-First with Network fallback & background refresh
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Fetch in background to keep cache fresh
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
            }
          })
          .catch(() => {/* Offline, cached version served */});
        return cachedRes;
      }

      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200 && (url.protocol === 'http:' || url.protocol === 'https:')) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          // If asset not in cache, fallback gracefully
          return new Response('', { status: 404, statusText: 'Offline - Resource Not Cached' });
        });
    })
  );
});

// Message listener for Manual Full Offline Caching
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_ALL_ASSETS') {
    const urlsToCache = event.data.urls || [];
    caches.open(CACHE_NAME).then(async (cache) => {
      let count = 0;
      for (const u of urlsToCache) {
        try {
          await cache.add(u);
          count++;
        } catch (e) {
          // Ignore individual fetch failure
        }
      }
      if (event.source) {
        event.source.postMessage({ type: 'CACHE_COMPLETED', cachedCount: count });
      }
    });
  }
});
