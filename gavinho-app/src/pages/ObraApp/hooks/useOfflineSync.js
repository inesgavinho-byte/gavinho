// =====================================================
// USE OFFLINE SYNC HOOK
// Queue actions when offline and sync when online
// Persists to IndexedDB with last-write-wins conflict resolution
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  openDb,
  addToQueue as dbAdd,
  getQueue as dbGetQueue,
  removeFromQueue as dbRemove,
  updateRetries as dbUpdateRetries,
  clearQueue as dbClear,
  setSyncMeta,
  migrateFromLocalStorage
} from '../lib/offlineDb'

// Action types
export const ACTION_TYPES = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  CREATE_PRESENCA: 'CREATE_PRESENCA',
  UPDATE_PRESENCA: 'UPDATE_PRESENCA',
  CREATE_REQUISICAO: 'CREATE_REQUISICAO',
  UPDATE_TAREFA: 'UPDATE_TAREFA',
  CREATE_DIARIO: 'CREATE_DIARIO'
}

// Last-write-wins: check if server record was updated after our local action
async function serverUpdatedAfter(table, id, localTimestamp) {
  try {
    const { data } = await supabase
      .from(table)
      .select('updated_at')
      .eq('id', id)
      .single()
    if (!data?.updated_at) return false
    return new Date(data.updated_at) > new Date(localTimestamp)
  } catch {
    return false
  }
}

// Action handlers with conflict resolution
const actionHandlers = {
  [ACTION_TYPES.SEND_MESSAGE]: async (payload) => {
    const { error } = await supabase
      .from('obra_mensagens')
      .insert(payload)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.CREATE_PRESENCA]: async (payload) => {
    const { error } = await supabase
      .from('presencas')
      .insert(payload)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.UPDATE_PRESENCA]: async (payload, createdAt) => {
    const { id, ...data } = payload
    // Last-write-wins: if server updated after our local action, skip
    if (await serverUpdatedAfter('presencas', id, createdAt)) {
      return { success: true, conflict: true }
    }
    const { error } = await supabase
      .from('presencas')
      .update(data)
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.CREATE_REQUISICAO]: async (payload) => {
    const { error } = await supabase
      .from('requisicoes_materiais')
      .insert(payload)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.UPDATE_TAREFA]: async (payload, createdAt) => {
    const { id, ...data } = payload
    // Last-write-wins: if server updated after our local action, skip
    if (await serverUpdatedAfter('tarefas', id, createdAt)) {
      return { success: true, conflict: true }
    }
    const { error } = await supabase
      .from('tarefas')
      .update(data)
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.CREATE_DIARIO]: async (payload, createdAt) => {
    const { data: existing } = await supabase
      .from('diario_obra')
      .select('id, updated_at')
      .eq('obra_id', payload.obra_id)
      .eq('data', payload.data)
      .single()

    if (existing) {
      // Last-write-wins on existing diary entry
      if (existing.updated_at && new Date(existing.updated_at) > new Date(createdAt)) {
        return { success: true, conflict: true }
      }
      const { error } = await supabase
        .from('diario_obra')
        .update(payload)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('diario_obra')
        .insert(payload)
      if (error) throw error
    }
    return { success: true }
  }
}

export default function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState(null)
  const [conflictsResolved, setConflictsResolved] = useState([])
  const syncingRef = useRef(false)
  const initialized = useRef(false)

  // Initialize: open DB, migrate localStorage, load queue
  useEffect(() => {
    async function init() {
      try {
        await openDb()
        await migrateFromLocalStorage()
        const items = await dbGetQueue()
        setQueue(items)
      } catch (err) {
        console.error('Error initializing offline queue:', err)
      }
      initialized.current = true
    }
    init()
  }, [])

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online or queue changes while online
  useEffect(() => {
    if (isOnline && queue.length > 0 && initialized.current && !syncingRef.current) {
      processQueue()
    }
  }, [isOnline, queue.length])

  // Add action to queue
  const queueAction = useCallback(async (type, payload, metadata = {}) => {
    const action = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      metadata,
      createdAt: new Date().toISOString(),
      retries: 0
    }

    try {
      await dbAdd(action)
    } catch (err) {
      console.error('Error adding to IndexedDB queue:', err)
    }

    setQueue(prev => [...prev, action])

    // Register background sync as fallback
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.sync.register('sync-offline-queue')
      } catch {
        // Background sync not supported or failed — main sync will handle it
      }
    }

    return action.id
  }, [])

  // Process the queue
  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return

    let currentQueue
    try {
      currentQueue = await dbGetQueue()
    } catch {
      currentQueue = queue
    }

    if (currentQueue.length === 0) return

    syncingRef.current = true
    setSyncing(true)
    setLastSyncError(null)

    const processedIds = []
    const conflicts = []

    for (const action of currentQueue) {
      try {
        const handler = actionHandlers[action.type]
        if (!handler) {
          console.error('Unknown action type:', action.type)
          processedIds.push(action.id)
          continue
        }

        const result = await handler(action.payload, action.createdAt)
        processedIds.push(action.id)

        if (result.conflict) {
          conflicts.push({ type: action.type, id: action.id, payload: action.payload })
        }
      } catch (err) {
        console.error('Error processing action:', action.type, err)

        const newRetries = (action.retries || 0) + 1

        if (newRetries >= 3) {
          console.error('Action failed after 3 retries, removing:', action)
          processedIds.push(action.id)
          setLastSyncError(`Falha ao sincronizar: ${action.type}`)
        } else {
          try {
            await dbUpdateRetries(action.id, newRetries)
          } catch {
            // If IndexedDB update fails, continue
          }
        }
      }
    }

    // Remove processed actions from IndexedDB
    for (const id of processedIds) {
      try {
        await dbRemove(id)
      } catch {
        // Continue even if removal fails
      }
    }

    // Update sync metadata
    try {
      await setSyncMeta('lastSyncAt', new Date().toISOString())
    } catch {
      // Non-critical
    }

    // Refresh queue state from DB
    try {
      const remaining = await dbGetQueue()
      setQueue(remaining)
    } catch {
      setQueue(prev => prev.filter(a => !processedIds.includes(a.id)))
    }

    if (conflicts.length > 0) {
      setConflictsResolved(conflicts)
    }

    syncingRef.current = false
    setSyncing(false)
  }, [queue])

  // Remove specific action from queue
  const removeFromQueue = useCallback(async (actionId) => {
    try {
      await dbRemove(actionId)
    } catch {
      // Continue
    }
    setQueue(prev => prev.filter(a => a.id !== actionId))
  }, [])

  // Clear entire queue
  const clearQueue = useCallback(async () => {
    try {
      await dbClear()
    } catch {
      // Continue
    }
    setQueue([])
  }, [])

  // Get pending count by type
  const getPendingCount = useCallback((type) => {
    if (type) {
      return queue.filter(a => a.type === type).length
    }
    return queue.length
  }, [queue])

  // Dismiss conflicts
  const dismissConflicts = useCallback(() => {
    setConflictsResolved([])
  }, [])

  return {
    isOnline,
    queue,
    syncing,
    lastSyncError,
    pendingCount: queue.length,
    conflictsResolved,
    queueAction,
    processQueue,
    removeFromQueue,
    clearQueue,
    getPendingCount,
    dismissConflicts
  }
}
