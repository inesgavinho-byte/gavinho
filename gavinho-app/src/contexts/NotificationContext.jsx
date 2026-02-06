// =====================================================
// NOTIFICATION CONTEXT - Teams-like notification system
// =====================================================

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

// Notification types
export const NOTIFICATION_TYPES = {
  MENTION: 'mention',           // @menções
  MESSAGE: 'message',           // Novas mensagens
  COMMENT: 'comment',           // Comentários em atas/documentos
  TASK: 'task',                 // Tarefas atribuídas
  PROJECT: 'project',           // Atualizações de projeto
  APPROVAL: 'approval',         // Aprovações pendentes
  SYSTEM: 'system'              // Notificações do sistema
}

// Filter options
export const NOTIFICATION_FILTERS = {
  ALL: 'all',
  UNREAD: 'unread',
  MENTIONS: 'mentions'
}

// Provider Component
export function NotificationProvider({ children }) {
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [filter, setFilter] = useState(NOTIFICATION_FILTERS.ALL)

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length
  const mentionsCount = notifications.filter(n => n.type === NOTIFICATION_TYPES.MENTION && !n.read).length

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          *,
          sender:sender_id(id, nome, email, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.warn('Error fetching notifications:', error)
        // Use mock data if table doesn't exist yet
        setNotifications(generateMockNotifications())
      } else {
        setNotifications(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      // Fallback to mock data
      setNotifications(generateMockNotifications())
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Generate mock notifications for development
  const generateMockNotifications = () => {
    const now = new Date()
    return [
      {
        id: 1,
        type: NOTIFICATION_TYPES.MENTION,
        title: '@Menção em ata',
        message: 'Maria mencionou-te na ata do projeto 413_OEIRAS',
        read: false,
        created_at: new Date(now - 5 * 60000).toISOString(),
        sender: { nome: 'Maria Gavinho', email: 'maria@gavinho.pt', avatar_url: null },
        context: { project: '413_414 OEIRAS', channel: 'Atas' },
        link: '/projetos/413'
      },
      {
        id: 2,
        type: NOTIFICATION_TYPES.MESSAGE,
        title: 'Nova mensagem',
        message: 'Armando enviou uma mensagem no Team Chat',
        read: false,
        created_at: new Date(now - 15 * 60000).toISOString(),
        sender: { nome: 'Armando Felix', email: 'armando@gavinho.pt', avatar_url: null },
        context: { project: 'GAVINHO ARCH BIM TEAM', channel: 'Team Chat' },
        link: '/workspace'
      },
      {
        id: 3,
        type: NOTIFICATION_TYPES.TASK,
        title: 'Tarefa atribuída',
        message: 'Tens uma nova tarefa: Revisão de imagens finais',
        read: false,
        created_at: new Date(now - 30 * 60000).toISOString(),
        sender: { nome: 'Sistema', email: null, avatar_url: null },
        context: { project: '420_VILA REAL', channel: null },
        link: '/projetos/420'
      },
      {
        id: 4,
        type: NOTIFICATION_TYPES.COMMENT,
        title: 'Novo comentário',
        message: 'Carolina comentou na ata de reunião',
        read: true,
        created_at: new Date(now - 2 * 3600000).toISOString(),
        sender: { nome: 'Carolina Roda', email: 'carolina@gavinho.pt', avatar_url: null },
        context: { project: '464_APARTAMENTO', channel: 'Atas' },
        link: '/projetos/464'
      },
      {
        id: 5,
        type: NOTIFICATION_TYPES.PROJECT,
        title: 'Atualização de projeto',
        message: 'O projeto 480_MORADIA foi atualizado para fase "Em Execução"',
        read: true,
        created_at: new Date(now - 24 * 3600000).toISOString(),
        sender: { nome: 'Sistema', email: null, avatar_url: null },
        context: { project: '480_MORADIA', channel: null },
        link: '/projetos/480'
      },
      {
        id: 6,
        type: NOTIFICATION_TYPES.MENTION,
        message: 'Ana mencionou-te: "ponto de situação: estrutura d..."',
        read: true,
        created_at: new Date(now - 48 * 3600000).toISOString(),
        sender: { nome: 'Ana Miranda', email: 'ana@gavinho.pt', avatar_url: null },
        context: { project: 'GAVINHO Signature', channel: 'Geral' },
        link: '/workspace'
      }
    ]
  }

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id])

  // Add notification
  const addNotification = useCallback(async (notification) => {
    if (!user?.id) return

    const newNotification = {
      user_id: user.id,
      type: notification.type || NOTIFICATION_TYPES.SYSTEM,
      title: notification.title,
      message: notification.message,
      read: false,
      sender_id: notification.senderId,
      context: notification.context || {},
      link: notification.link,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert(newNotification)
        .select()
        .single()

      if (error) throw error
      setNotifications(prev => [data, ...prev])
    } catch (err) {
      // Fallback for local state
      const mockNotification = {
        ...newNotification,
        id: Date.now(),
        sender: { nome: 'Sistema', email: null }
      }
      setNotifications(prev => [mockNotification, ...prev])
    }
  }, [user?.id])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )

    try {
      await supabase
        .from('notificacoes')
        .update({ read: true })
        .eq('id', notificationId)
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

    if (!user?.id) return

    try {
      await supabase
        .from('notificacoes')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }, [user?.id])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    try {
      await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificationId)
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }, [])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    setNotifications([])

    if (!user?.id) return

    try {
      await supabase
        .from('notificacoes')
        .delete()
        .eq('user_id', user.id)
    } catch (err) {
      console.error('Failed to clear notifications:', err)
    }
  }, [user?.id])

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev)
  }, [])

  // Close panel
  const closePanel = useCallback(() => {
    setIsPanelOpen(false)
  }, [])

  // Get filtered notifications
  const getFilteredNotifications = useCallback(() => {
    switch (filter) {
      case NOTIFICATION_FILTERS.UNREAD:
        return notifications.filter(n => !n.read)
      case NOTIFICATION_FILTERS.MENTIONS:
        return notifications.filter(n => n.type === NOTIFICATION_TYPES.MENTION)
      default:
        return notifications
    }
  }, [notifications, filter])

  const value = {
    notifications,
    filteredNotifications: getFilteredNotifications(),
    unreadCount,
    mentionsCount,
    isLoading,
    isPanelOpen,
    filter,
    setFilter,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    togglePanel,
    closePanel,
    refresh: fetchNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationProvider
