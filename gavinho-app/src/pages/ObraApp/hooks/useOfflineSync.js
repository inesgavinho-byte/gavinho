// =====================================================
// USE OFFLINE SYNC HOOK
// Queue actions when offline and sync when online
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

const STORAGE_KEY = 'obra_app_offline_queue'

// Action types
export const ACTION_TYPES = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  CREATE_PRESENCA: 'CREATE_PRESENCA',
  UPDATE_PRESENCA: 'UPDATE_PRESENCA',
  CREATE_REQUISICAO: 'CREATE_REQUISICAO',
  UPDATE_TAREFA: 'UPDATE_TAREFA',
  CREATE_DIARIO: 'CREATE_DIARIO'
}

// Action handlers
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

  [ACTION_TYPES.UPDATE_PRESENCA]: async (payload) => {
    const { id, ...data } = payload
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

  [ACTION_TYPES.UPDATE_TAREFA]: async (payload) => {
    const { id, ...data } = payload
    const { error } = await supabase
      .from('tarefas')
      .update(data)
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  [ACTION_TYPES.CREATE_DIARIO]: async (payload) => {
    const { data: existing } = await supabase
      .from('diario_obra')
      .select('id')
      .eq('obra_id', payload.obra_id)
      .eq('data', payload.data)
      .single()

    if (existing) {
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

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(STORAGE_KEY)
      if (savedQueue) {
        setQueue(JSON.parse(savedQueue))
      }
    } catch (err) {
      console.error('Error loading offline queue:', err)
    }
  }, [])

  // Save queue to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    } catch (err) {
      console.error('Error saving offline queue:', err)
    }
  }, [queue])

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      processQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queue])

  // Add action to queue
  const queueAction = useCallback((type, payload, metadata = {}) => {
    const action = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      metadata,
      createdAt: new Date().toISOString(),
      retries: 0
    }

    setQueue(prev => [...prev, action])

    // If online, try to process immediately
    if (navigator.onLine) {
      processQueue()
    }

    return action.id
  }, [])

  // Process the queue
  const processQueue = useCallback(async () => {
    if (syncing || queue.length === 0 || !navigator.onLine) return

    setSyncing(true)
    setLastSyncError(null)

    const newQueue = [...queue]
    const processedIds = []

    for (const action of newQueue) {
      try {
        const handler = actionHandlers[action.type]
        if (!handler) {
          console.error('Unknown action type:', action.type)
          processedIds.push(action.id)
          continue
        }

        await handler(action.payload)
        processedIds.push(action.id)
      } catch (err) {
        console.error('Error processing action:', action.type, err)

        // Increment retries
        action.retries += 1

        // Remove after 3 failed attempts
        if (action.retries >= 3) {
          console.error('Action failed after 3 retries, removing:', action)
          processedIds.push(action.id)
          setLastSyncError(`Falha ao sincronizar: ${action.type}`)
        }
      }
    }

    // Remove processed actions
    setQueue(prev => prev.filter(a => !processedIds.includes(a.id)))
    setSyncing(false)
  }, [queue, syncing])

  // Remove specific action from queue
  const removeFromQueue = useCallback((actionId) => {
    setQueue(prev => prev.filter(a => a.id !== actionId))
  }, [])

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  // Get pending count by type
  const getPendingCount = useCallback((type) => {
    if (type) {
      return queue.filter(a => a.type === type).length
    }
    return queue.length
  }, [queue])

  return {
    isOnline,
    queue,
    syncing,
    lastSyncError,
    pendingCount: queue.length,
    queueAction,
    processQueue,
    removeFromQueue,
    clearQueue,
    getPendingCount
  }
}
