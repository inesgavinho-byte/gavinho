// =====================================================
// OFFLINE DATABASE — IndexedDB wrapper
// Replaces localStorage for offline queue persistence
// =====================================================

const DB_NAME = 'gavinho_offline'
const DB_VERSION = 1
const QUEUE_STORE = 'offline_queue'
const META_STORE = 'sync_metadata'
const LEGACY_KEY = 'obra_app_offline_queue'

let dbInstance = null

/**
 * Open (or create) the IndexedDB database.
 * Returns a cached instance after the first call.
 */
export function openDb() {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
        store.createIndex('by_createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      resolve(dbInstance)
    }

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error)
      reject(event.target.error)
    }
  })
}

// =====================================================
// Queue operations
// =====================================================

/**
 * Add an action to the offline queue.
 */
export async function addToQueue(action) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).put(action)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Get all queued actions, ordered by createdAt (oldest first).
 */
export async function getQueue() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const index = tx.objectStore(QUEUE_STORE).index('by_createdAt')
    const request = index.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Remove a single action from the queue by id.
 */
export async function removeFromQueue(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Update the retry count for an action.
 */
export async function updateRetries(id, retries) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const action = getReq.result
      if (action) {
        action.retries = retries
        store.put(action)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Clear the entire offline queue.
 */
export async function clearQueue() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Get the count of queued actions.
 */
export async function getQueueCount() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const request = tx.objectStore(QUEUE_STORE).count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

// =====================================================
// Sync metadata
// =====================================================

export async function getSyncMeta(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly')
    const request = tx.objectStore(META_STORE).get(key)
    request.onsuccess = () => resolve(request.result?.value ?? null)
    request.onerror = (e) => reject(e.target.error)
  })
}

export async function setSyncMeta(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).put({ key, value })
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// =====================================================
// Migration: localStorage → IndexedDB
// =====================================================

/**
 * Migrate any existing localStorage queue into IndexedDB.
 * Runs once on first openDb() call and cleans up localStorage.
 */
export async function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return 0

    const items = JSON.parse(raw)
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.removeItem(LEGACY_KEY)
      return 0
    }

    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      items.forEach(item => store.put(item))
      tx.oncomplete = () => {
        localStorage.removeItem(LEGACY_KEY)
        console.log(`Migrated ${items.length} offline actions from localStorage to IndexedDB`)
        resolve(items.length)
      }
      tx.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Migration from localStorage failed:', err)
    return 0
  }
}
