// =====================================================
// USE NOTIFICATIONS HOOK
// In-app notifications for tasks and materials
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

const STORAGE_KEY = 'obra_app_notifications'
const MAX_NOTIFICATIONS = 50

// Notification types
export const NOTIFICATION_TYPES = {
  TAREFA_ATRIBUIDA: 'TAREFA_ATRIBUIDA',
  TAREFA_ATUALIZADA: 'TAREFA_ATUALIZADA',
  TAREFA_CONCLUIDA: 'TAREFA_CONCLUIDA',
  MATERIAL_APROVADO: 'MATERIAL_APROVADO',
  MATERIAL_ENTREGUE: 'MATERIAL_ENTREGUE',
  MATERIAL_REJEITADO: 'MATERIAL_REJEITADO',
  MENSAGEM_NOVA: 'MENSAGEM_NOVA',
  DIARIO_CRIADO: 'DIARIO_CRIADO'
}

// Notification configs
const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.TAREFA_ATRIBUIDA]: {
    title: 'Nova tarefa atribuída',
    icon: '📋',
    color: '#3b82f6'
  },
  [NOTIFICATION_TYPES.TAREFA_ATUALIZADA]: {
    title: 'Tarefa atualizada',
    icon: '📝',
    color: '#f59e0b'
  },
  [NOTIFICATION_TYPES.TAREFA_CONCLUIDA]: {
    title: 'Tarefa concluída',
    icon: '✅',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.MATERIAL_APROVADO]: {
    title: 'Material aprovado',
    icon: '✓',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.MATERIAL_ENTREGUE]: {
    title: 'Material entregue',
    icon: '📦',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.MATERIAL_REJEITADO]: {
    title: 'Material rejeitado',
    icon: '❌',
    color: '#ef4444'
  },
  [NOTIFICATION_TYPES.MENSAGEM_NOVA]: {
    title: 'Nova mensagem',
    icon: '💬',
    color: '#6366f1'
  },
  [NOTIFICATION_TYPES.DIARIO_CRIADO]: {
    title: 'Diário atualizado',
    icon: '📖',
    color: '#8b5cf6'
  }
}

export default function useNotifications(obra, user) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showToast, setShowToast] = useState(null)

  // Load notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${user?.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setNotifications(parsed)
        setUnreadCount(parsed.filter(n => !n.read).length)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }, [user?.id])

  // Save notifications to localStorage
  useEffect(() => {
    if (user?.id && notifications.length > 0) {
      try {
        localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(notifications))
      } catch (err) {
        console.error('Error saving notifications:', err)
      }
    }
  }, [notifications, user?.id])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!obra || !user) return

    // Subscribe to task changes
    const taskChannel = supabase
      .channel(`obra_tarefas_notif_${obra.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tarefas',
        filter: `obra_id=eq.${obra.id}`
      }, (payload) => {
        handleTaskChange(payload)
      })
      .subscribe()

    // Subscribe to material requisition changes
    const materialChannel = supabase
      .channel(`obra_materiais_notif_${obra.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requisicoes_materiais',
        filter: `obra_id=eq.${obra.id}`
      }, (payload) => {
        handleMaterialChange(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(materialChannel)
    }
  }, [obra, user])

  // Handle task changes
  const handleTaskChange = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Only notify if user is the assignee
    if (newRecord?.responsavel_id !== user?.id) return

    if (eventType === 'INSERT') {
      addNotification({
        type: NOTIFICATION_TYPES.TAREFA_ATRIBUIDA,
        message: newRecord.titulo,
        data: { tarefaId: newRecord.id }
      })
    } else if (eventType === 'UPDATE') {
      if (newRecord.estado === 'concluida' && oldRecord?.estado !== 'concluida') {
        addNotification({
          type: NOTIFICATION_TYPES.TAREFA_CONCLUIDA,
          message: newRecord.titulo,
          data: { tarefaId: newRecord.id }
        })
      } else if (oldRecord?.estado !== newRecord.estado) {
        addNotification({
          type: NOTIFICATION_TYPES.TAREFA_ATUALIZADA,
          message: `${newRecord.titulo} - ${newRecord.estado}`,
          data: { tarefaId: newRecord.id }
        })
      }
    }
  }, [user?.id])

  // Handle material changes
  const handleMaterialChange = useCallback((payload) => {
    const { new: newRecord, old: oldRecord } = payload

    // Only notify if user created the request
    if (newRecord?.solicitante_id !== user?.id) return

    if (newRecord.estado === 'aprovado' && oldRecord?.estado === 'pendente') {
      addNotification({
        type: NOTIFICATION_TYPES.MATERIAL_APROVADO,
        message: `Pedido de ${newRecord.material} aprovado`,
        data: { requisicaoId: newRecord.id }
      })
    } else if (newRecord.estado === 'entregue') {
      addNotification({
        type: NOTIFICATION_TYPES.MATERIAL_ENTREGUE,
        message: `${newRecord.material} entregue`,
        data: { requisicaoId: newRecord.id }
      })
    } else if (newRecord.estado === 'rejeitado') {
      addNotification({
        type: NOTIFICATION_TYPES.MATERIAL_REJEITADO,
        message: `Pedido de ${newRecord.material} rejeitado`,
        data: { requisicaoId: newRecord.id }
      })
    }
  }, [user?.id])

  // Add notification
  const addNotification = useCallback((notif) => {
    const config = NOTIFICATION_CONFIG[notif.type] || {}

    const newNotification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notif.type,
      title: config.title || 'Notificação',
      message: notif.message,
      icon: config.icon || '🔔',
      color: config.color || '#6b7280',
      data: notif.data || {},
      read: false,
      createdAt: new Date().toISOString()
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS)
      return updated
    })

    setUnreadCount(prev => prev + 1)

    // Show toast
    setShowToast(newNotification)
    setTimeout(() => setShowToast(null), 4000)

    // Try to show push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/icons/icon-192x192.png'
      })
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setShowToast(null)
  }, [])

  return {
    notifications,
    unreadCount,
    showToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissToast
  }
}
