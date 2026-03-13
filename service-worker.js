// =============================================
// TEMS Service Worker — Cache v1.0.3
// Updated cache name forces fresh download
// =============================================

const CACHE_NAME = 'tems-v1.0.3';  // <-- bumped version clears old cache

const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './products.html',
  './suppliers.html',
  './purchases.html',
  './shipments.html',
  './sales.html',
  './inventory.html',
  './users.html',
  './reports.html',
  './settings.html',
  './css/main.css',
  './js/config.js',
  './js/app.js',
  './js/api.js',
  './js/auth.js',
  './js/ui.js',
  './js/offline-sync.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Install — cache all static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      }))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// Activate — delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())  // take control of all tabs immediately
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache Apps Script API calls
  if (url.host === 'script.google.com' || url.host === 'script.googleusercontent.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Network first for app files so updates are picked up immediately
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Update cache with fresh response
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() =>
          // Offline fallback — serve from cache
          caches.match(event.request).then(cached =>
            cached || new Response(
              '<h1>TEMS — Offline</h1><p>Please connect to the internet.</p>',
              { headers: { 'Content-Type': 'text/html' }, status: 503 }
            )
          )
        )
    );
    return;
  }

  // CDN assets — cache first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      })
    )
  );
});

// Listen for message to skip waiting (sent by app after update detected)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
