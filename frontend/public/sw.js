// FocusForge Progressive Web App Service Worker
const CACHE_NAME = 'focusforge-v5';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/logo.png'
];

// Message listener to trigger immediate skip waiting from client
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Install: Pre-cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up any outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Safe caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Never cache dynamic backend/API requests or chrome extensions
  if (url.pathname.startsWith('/api/') || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 3. In dev or for Next.js internal dynamic bundles, bypass cache to avoid chunk mismatch
  if (url.pathname.startsWith('/_next/') || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // 4. Static Assets (Icons, images, fonts)
  const isStaticAsset = 
    url.pathname.startsWith('/icons/') || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. HTML Navigation: Instant offline fallback or fast network race
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        if (typeof self.navigator !== 'undefined' && self.navigator.onLine === false) {
          const cachedOffline = (await caches.match('/')) || (await caches.match(request));
          if (cachedOffline) return cachedOffline;
        }

        try {
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Navigation timeout')), 2500)
          );
          const networkResponse = await Promise.race([networkPromise, timeoutPromise]);

          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
            return networkResponse;
          }
        } catch {
          // Network failed or timed out: fall back to cached shell
        }

        const cached = (await caches.match('/')) || (await caches.match(request));
        if (cached) return cached;

        return fetch(request);
      })()
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ==================== Notification & Push Listeners ====================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'FocusForge', body: event.data.text() };
    }
  }

  const title = data.title || 'FocusForge Notification';
  const options = {
    body: data.body || 'You have an update.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || 'focusforge-push',
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
