// =====================================================
// Service Worker — GAVINHO Platform + Obras PWA
// Handles: caching, offline, push notifications
// =====================================================
const CACHE_NAME = 'gavinho-v3';

// Precache app shell
const PRECACHE_URLS = [
  '/',
  '/obra-app'
];

// Install — cache essentials
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — Network First, cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Only cache http(s) requests — skip chrome-extension://, etc.
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Never cache Supabase API or auth calls
  if (url.includes('supabase.co') || url.includes('/auth/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // SPA fallback: serve cached index for navigation requests
        if (event.request.mode === 'navigate') {
          const isObra = event.request.url.includes('/obra-app');
          const fallback = await caches.match(isObra ? '/obra-app' : '/');
          if (fallback) return fallback;
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// =====================================================
// Push Notifications
// =====================================================
self.addEventListener('push', (event) => {
  let data = { title: 'GAVINHO', body: 'Nova notificação' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    tag: data.tag || 'gavinho',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (url && client.url !== url) {
              client.navigate(url);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message handler — respond to postMessage from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (for offline messages)
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
}
