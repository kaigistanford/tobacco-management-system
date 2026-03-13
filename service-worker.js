// =============================================
// TEMS — Service Worker
// Cache-first strategy for static assets,
// network-first for API calls
// =============================================

const CACHE_NAME    = 'tems-v1.0.0';
const API_CACHE     = 'tems-api-v1';
const CDN_CACHE     = 'tems-cdn-v1';

// Static assets to cache on install
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
  './assets/icons/icon-512.png',
];

// CDN resources to cache
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ---- Install: cache static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Some static assets failed to cache:', err);
        });
      }),
      caches.open(CDN_CACHE).then(cache => {
        return Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)));
      })
    ]).then(() => self.skipWaiting())
  );
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, API_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !validCaches.includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: routing strategy ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and Chrome extensions
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Google Apps Script API calls — network-only (POST handled by app, GET here)
  if (url.host === 'script.google.com') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ success: false, offline: true, message: 'Offline — request queued.' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Google Fonts — cache-first
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(res => {
            cache.put(request, res.clone()); return res;
          })
        )
      )
    );
    return;
  }

  // CDN assets (Chart.js, SheetJS) — cache-first
  if (url.host === 'cdn.jsdelivr.net' || url.host === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached || new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // App HTML/CSS/JS — cache-first with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => null);
          return cached || networkFetch || new Response(
            '<h1>TEMS — Offline</h1><p>Please connect to the internet to load this page.</p>',
            { headers: { 'Content-Type': 'text/html' }, status: 503 }
          );
        })
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request)
    )
  );
});

// ---- Background sync (if supported) ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'tems-sync') {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  // The main sync logic is in offline-sync.js in the page context.
  // Notify all clients to trigger sync.
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_REQUESTED' }));
}

// ---- Push notifications placeholder ----
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'TEMS', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TEMS', {
      body: data.body,
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-72.png',
      tag: 'tems-notification'
    })
  );
});
