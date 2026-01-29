// Service Worker para Gavinho Obras PWA
const CACHE_NAME = 'gavinho-obras-v1';
const OFFLINE_URL = '/obra-app/offline';

// Recursos para cache inicial
const PRECACHE_URLS = [
  '/obra-app',
  '/obra-app/login',
  '/offline.html'
];

// Instalação - fazer cache dos recursos essenciais
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignorar requests não-GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests para API do Supabase (sempre online)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, guardar em cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Se offline, tentar cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Se for navegação, mostrar página offline
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = { title: 'Gavinho Obras', body: 'Nova notificação' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/obra-app',
      dateOfArrival: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    tag: data.tag || 'default',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/obra-app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes('/obra-app') && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Sync em background (para enviar mensagens offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'send-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Implementar sincronização de mensagens pendentes
  console.log('[SW] Syncing pending messages...');
}
