// =====================================================
// Service Worker — GAVINHO Platform + Obras PWA
// Handles: caching, offline, push notifications,
//          background sync for offline queue
// =====================================================
const CACHE_NAME = 'gavinho-v2';

// Supabase config for background sync (REST API)
const SUPABASE_URL = 'https://vctcppuvqjstscbzdykn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdGNwcHV2cWpzdHNjYnpkeWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzM5MTQsImV4cCI6MjA4MTYwOTkxNH0.013iN76cfweIznJbWYu5ntalrNHW7Ib-IV_-jBIVHhI';

// IndexedDB config (must match offlineDb.js)
const DB_NAME = 'gavinho_offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';

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

// =====================================================
// Background Sync — process offline queue
// =====================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

// Table mapping for action types → Supabase REST endpoints
const ACTION_TABLE_MAP = {
  SEND_MESSAGE: { table: 'obra_mensagens', method: 'POST' },
  CREATE_PRESENCA: { table: 'presencas', method: 'POST' },
  UPDATE_PRESENCA: { table: 'presencas', method: 'PATCH' },
  CREATE_REQUISICAO: { table: 'requisicoes_materiais', method: 'POST' },
  UPDATE_TAREFA: { table: 'tarefas', method: 'PATCH' },
  CREATE_DIARIO: { table: 'diario_obra', method: 'POST' }
};

/**
 * Open IndexedDB directly from the service worker (no React wrapper).
 */
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function idbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

function idbPut(db, storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Execute a Supabase REST API call for an offline action.
 */
async function executeAction(action) {
  const mapping = ACTION_TABLE_MAP[action.type];
  if (!mapping) return false;

  const { table, method } = mapping;
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  let body = action.payload;

  // For PATCH (updates), extract id and set the query param
  if (method === 'PATCH') {
    const { id, ...data } = action.payload;
    url += `?id=eq.${id}`;
    body = data;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': method === 'POST' ? 'return=minimal' : 'return=minimal'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Supabase ${method} ${table} failed: ${response.status}`);
  }

  return true;
}

/**
 * Process all queued offline actions from IndexedDB.
 */
async function syncOfflineQueue() {
  let db;
  try {
    db = await openIDB();
  } catch (err) {
    console.error('[SW] Failed to open IndexedDB:', err);
    return;
  }

  let items;
  try {
    items = await idbGetAll(db, QUEUE_STORE);
  } catch (err) {
    console.error('[SW] Failed to read offline queue:', err);
    return;
  }

  if (items.length === 0) return;

  console.log(`[SW] Background sync: processing ${items.length} offline actions`);

  for (const action of items) {
    try {
      await executeAction(action);
      await idbDelete(db, QUEUE_STORE, action.id);
    } catch (err) {
      console.error(`[SW] Failed to sync action ${action.type}:`, err);
      const newRetries = (action.retries || 0) + 1;
      if (newRetries >= 3) {
        // Give up after 3 retries
        await idbDelete(db, QUEUE_STORE, action.id);
        console.error(`[SW] Removed action after 3 failed retries:`, action.type);
      } else {
        action.retries = newRetries;
        await idbPut(db, QUEUE_STORE, action);
      }
    }
  }

  // Notify any open clients that sync completed
  const allClients = await clients.matchAll({ type: 'window' });
  allClients.forEach((client) => {
    client.postMessage({ type: 'OFFLINE_SYNC_COMPLETE' });
  });
}
