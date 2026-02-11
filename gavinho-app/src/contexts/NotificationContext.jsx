// =====================================================
// NOTIFICATION CONTEXT - Sistema unificado de notificações
// Combina notificacoes (Teams) + app_notificacoes (Obras)
// Suporta: Agrupamento, Ações inline, Paginação
// =====================================================

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

// Notification types (consolidated)
export const NOTIFICATION_TYPES = {
  // Teams/Workspace
  MENTION: 'mention',
  MESSAGE: 'message',
  COMMENT: 'comment',
  TASK: 'task',
  PROJECT: 'project',
  APPROVAL: 'approval',
  SYSTEM: 'system',

  // Obras/App
  TAREFA_ATRIBUIDA: 'tarefa_atribuida',
  TAREFA_CONCLUIDA: 'tarefa_concluida',
  TAREFA_ATUALIZADA: 'tarefa_atualizada',
  REQUISICAO_NOVA: 'requisicao_nova',
  MATERIAL_APROVADO: 'material_aprovado',
  MATERIAL_REJEITADO: 'material_rejeitado',
  MATERIAL_ENTREGUE: 'material_entregue',
  APROVACAO_PENDENTE: 'aprovacao_pendente'
}

// Filter options
export const NOTIFICATION_FILTERS = {
  ALL: 'all',
  UNREAD: 'unread',
  MENTIONS: 'mentions',
  WORKSPACE: 'workspace',
  APP: 'app',
  URGENT: 'urgent'
}

// Notification config with icons and colors
export const NOTIFICATION_CONFIG = {
  // Teams/Workspace
  mention: { icon: '@', color: '#3b82f6', label: 'Menção' },
  message: { icon: '💬', color: '#6366f1', label: 'Mensagem' },
  comment: { icon: '💬', color: '#6366f1', label: 'Comentário' },
  task: { icon: '📋', color: '#f59e0b', label: 'Tarefa' },
  project: { icon: '📁', color: '#8b5cf6', label: 'Projeto' },
  approval: { icon: '⏳', color: '#f59e0b', label: 'Aprovação' },
  system: { icon: '🔔', color: '#6b7280', label: 'Sistema' },

  // Obras/App
  tarefa_atribuida: { icon: '📋', color: '#3b82f6', label: 'Tarefa atribuída' },
  tarefa_concluida: { icon: '✅', color: '#10b981', label: 'Tarefa concluída' },
  tarefa_atualizada: { icon: '📝', color: '#f59e0b', label: 'Tarefa atualizada' },
  requisicao_nova: { icon: '📦', color: '#8b5cf6', label: 'Nova requisição' },
  material_aprovado: { icon: '✓', color: '#10b981', label: 'Material aprovado' },
  material_rejeitado: { icon: '❌', color: '#ef4444', label: 'Material rejeitado' },
  material_entregue: { icon: '🚚', color: '#10b981', label: 'Material entregue' },
  aprovacao_pendente: { icon: '⏳', color: '#f59e0b', label: 'Aprovação pendente' },

  // Default
  default: { icon: '🔔', color: '#6b7280', label: 'Notificação' }
}

const PAGE_SIZE = 20

// Provider Component
export function NotificationProvider({ children }) {
  const { user } = useAuth()

  // State
  const [notifications, setNotifications] = useState([])
  const [groupedNotifications, setGroupedNotifications] = useState([])
  const [counts, setCounts] = useState({ total: 0, app: 0, workspace: 0, urgentes: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [filter, setFilter] = useState(NOTIFICATION_FILTERS.ALL)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grouped'

  // Toast
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  // Calculate counts from local state
  const unreadCount = counts.total
  const mentionsCount = notifications.filter(n =>
    (n.type === 'mention' || n.type === NOTIFICATION_TYPES.MENTION) && !n.read
  ).length

  // ========== FETCH NOTIFICATIONS (Unified) ==========
  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user?.id) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      if (reset) {
        setIsLoading(true)
        setOffset(0)
      } else {
        setIsLoadingMore(true)
      }

      const currentOffset = reset ? 0 : offset

      // Try to use the unified function
      const { data, error } = await supabase.rpc('get_notificacoes_unificadas', {
        p_user_id: user.id,
        p_user_email: user.email || null,
        p_limit: PAGE_SIZE + 1,
        p_offset: currentOffset,
        p_apenas_nao_lidas: false,
        p_tipo: null,
        p_origem: null
      })

      if (error) {
        // Fallback to direct query if function doesn't exist
        console.warn('Unified function not available, falling back to direct query:', error.message)
        await fetchNotificationsFallback(reset)
        return
      }

      const hasMoreResults = data?.length > PAGE_SIZE
      const results = hasMoreResults ? data.slice(0, PAGE_SIZE) : (data || [])

      // Add config to each notification
      const formatted = results.map(n => ({
        ...n,
        config: NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.default
      }))

      if (reset) {
        setNotifications(formatted)
      } else {
        setNotifications(prev => [...prev, ...formatted])
      }

      setHasMore(hasMoreResults)
      setOffset(currentOffset + results.length)

    } catch (err) {
      console.error('Error fetching notifications:', err)
      await fetchNotificationsFallback(reset)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.id, user?.email, offset])

  // Fallback: Direct query to both tables
  const fetchNotificationsFallback = async (reset = false) => {
    if (!user?.id) return

    const currentOffset = reset ? 0 : offset

    // Fetch from both tables
    const [workspaceRes, appRes] = await Promise.all([
      supabase
        .from('notificacoes')
        .select(`*, sender:sender_id(id, nome, email, avatar_url)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE),

      supabase
        .from('app_notificacoes')
        .select('*')
        .or(`utilizador_id.eq.${user.id},utilizador_email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE)
    ])

    // Normalize workspace notifications
    const workspaceNotifs = (workspaceRes.data || []).map(n => ({
      id: n.id,
      origem: 'workspace',
      user_id: n.user_id,
      sender_id: n.sender_id,
      sender_nome: n.sender?.nome,
      sender_avatar: n.sender?.avatar_url,
      type: n.type,
      title: n.title,
      message: n.message,
      context: n.context,
      link: n.link,
      read: n.read,
      read_at: n.read_at,
      urgent: false,
      actions: n.acoes || [],
      created_at: n.created_at,
      config: NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.default
    }))

    // Normalize app notifications
    const appNotifs = (appRes.data || []).map(n => ({
      id: n.id,
      origem: 'app',
      user_id: n.utilizador_id,
      user_email: n.utilizador_email,
      type: n.tipo,
      title: n.titulo,
      message: n.mensagem,
      context: {
        obra_id: n.obra_id,
        requisicao_id: n.requisicao_id,
        tarefa_id: n.tarefa_id,
        ...n.dados
      },
      link: n.obra_id ? `/obras/${n.obra_id}` : null,
      read: n.lida,
      read_at: n.data_leitura,
      urgent: n.urgente,
      actions: n.acoes || [],
      created_at: n.created_at,
      config: NOTIFICATION_CONFIG[n.tipo] || NOTIFICATION_CONFIG.default
    }))

    // Combine and sort
    const combined = [...workspaceNotifs, ...appNotifs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, PAGE_SIZE)

    if (reset) {
      setNotifications(combined)
    } else {
      setNotifications(prev => [...prev, ...combined])
    }

    setHasMore(combined.length === PAGE_SIZE)
    setOffset(currentOffset + combined.length)
  }

  // ========== FETCH COUNTS ==========
  const fetchCounts = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase.rpc('contar_notificacoes_unificadas_nao_lidas', {
        p_user_id: user.id,
        p_user_email: user.email || null
      })

      if (!error && data && data.length > 0) {
        setCounts(data[0])
      } else {
        // Fallback count
        const unreadApp = notifications.filter(n => n.origem === 'app' && !n.read).length
        const unreadWorkspace = notifications.filter(n => n.origem === 'workspace' && !n.read).length
        setCounts({
          total: unreadApp + unreadWorkspace,
          app: unreadApp,
          workspace: unreadWorkspace,
          urgentes: notifications.filter(n => n.urgent && !n.read).length
        })
      }
    } catch (err) {
      console.warn('Error fetching counts:', err)
    }
  }, [user?.id, user?.email, notifications])

  // ========== FETCH GROUPED NOTIFICATIONS ==========
  const fetchGroupedNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase.rpc('get_notificacoes_agrupadas', {
        p_user_id: user.id,
        p_user_email: user.email || null,
        p_limit: PAGE_SIZE,
        p_offset: 0
      })

      if (!error && data) {
        const formatted = data.map(g => ({
          ...g,
          config: NOTIFICATION_CONFIG[g.type] || NOTIFICATION_CONFIG.default
        }))
        setGroupedNotifications(formatted)
      }
    } catch (err) {
      console.warn('Grouped notifications not available:', err)
    }
  }, [user?.id, user?.email])

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(true)
      fetchCounts()
    }
  }, [user?.id])

  // ========== REALTIME SUBSCRIPTION ==========
  useEffect(() => {
    if (!user?.id) return

    // Subscribe to app_notificacoes
    const appChannel = supabase
      .channel(`ctx_notif_app_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notificacoes',
        filter: `utilizador_id=eq.${user.id}`
      }, (payload) => {
        const n = payload.new
        const newNotif = {
          id: n.id,
          origem: 'app',
          user_id: n.utilizador_id,
          type: n.tipo,
          title: n.titulo,
          message: n.mensagem,
          context: n.dados || {},
          link: n.obra_id ? `/obras/${n.obra_id}` : null,
          read: n.lida,
          urgent: n.urgente,
          actions: n.acoes || [],
          created_at: n.created_at,
          config: NOTIFICATION_CONFIG[n.tipo] || NOTIFICATION_CONFIG.default
        }

        setNotifications(prev => [newNotif, ...prev])
        setCounts(prev => ({ ...prev, total: prev.total + 1, app: prev.app + 1 }))
        showToast({ type: 'info', title: newNotif.title, message: newNotif.message })
      })
      .subscribe()

    // Subscribe to notificacoes (workspace)
    const workspaceChannel = supabase
      .channel(`ctx_notif_ws_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const n = payload.new
        const newNotif = {
          id: n.id,
          origem: 'workspace',
          user_id: n.user_id,
          sender_id: n.sender_id,
          type: n.type,
          title: n.title,
          message: n.message,
          context: n.context || {},
          link: n.link,
          read: n.read,
          urgent: false,
          actions: n.acoes || [],
          created_at: n.created_at,
          config: NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.default
        }

        setNotifications(prev => [newNotif, ...prev])
        setCounts(prev => ({ ...prev, total: prev.total + 1, workspace: prev.workspace + 1 }))
        showToast({ type: 'info', title: newNotif.title, message: newNotif.message })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(appChannel)
      supabase.removeChannel(workspaceChannel)
    }
  }, [user?.id])

  // ========== MARK AS READ ==========
  const markAsRead = useCallback(async (notificationId, origem = null) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
    )
    setCounts(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }))

    try {
      // Try unified function first
      const { error } = await supabase.rpc('marcar_notificacao_lida', {
        p_notification_id: notificationId,
        p_origem: origem
      })

      if (error) {
        // Fallback: try both tables
        await Promise.all([
          supabase.from('notificacoes').update({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId),
          supabase.from('app_notificacoes').update({ lida: true, data_leitura: new Date().toISOString() }).eq('id', notificationId)
        ])
      }
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }, [])

  // ========== MARK ALL AS READ ==========
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
    setCounts({ total: 0, app: 0, workspace: 0, urgentes: 0 })

    if (!user?.id) return

    try {
      const { error } = await supabase.rpc('marcar_todas_notificacoes_lidas_unificado', {
        p_user_id: user.id,
        p_user_email: user.email || null
      })

      if (error) {
        // Fallback
        await Promise.all([
          supabase.from('notificacoes').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('read', false),
          supabase.from('app_notificacoes').update({ lida: true, data_leitura: new Date().toISOString() }).or(`utilizador_id.eq.${user.id},utilizador_email.eq.${user.email}`).eq('lida', false)
        ])
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [user?.id, user?.email])

  // ========== EXECUTE ACTION ==========
  const executeAction = useCallback(async (notificationId, actionId) => {
    if (!user?.id) return { success: false, error: 'Não autenticado' }

    try {
      const { data, error } = await supabase.rpc('executar_acao_notificacao', {
        p_notification_id: notificationId,
        p_acao_id: actionId,
        p_user_id: user.id
      })

      if (error) throw error

      if (data?.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => {
            if (n.id === notificationId && n.actions) {
              return {
                ...n,
                actions: n.actions.map(a =>
                  a.id === actionId ? { ...a, executada: true } : a
                )
              }
            }
            return n
          })
        )

        showToast({ type: 'success', message: data.message || 'Ação executada' })
      }

      return data
    } catch (err) {
      console.error('Error executing action:', err)
      showToast({ type: 'error', message: 'Erro ao executar ação' })
      return { success: false, error: err.message }
    }
  }, [user?.id])

  // ========== DELETE NOTIFICATION ==========
  const deleteNotification = useCallback(async (notificationId) => {
    // Optimistic update
    const notif = notifications.find(n => n.id === notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (notif && !notif.read) {
      setCounts(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }))
    }

    try {
      await Promise.all([
        supabase.from('notificacoes').delete().eq('id', notificationId),
        supabase.from('app_notificacoes').delete().eq('id', notificationId)
      ])
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [notifications])

  // ========== LOAD MORE (Pagination) ==========
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchNotifications(false)
    }
  }, [isLoadingMore, hasMore, fetchNotifications])

  // ========== REFRESH ==========
  const refresh = useCallback(() => {
    fetchNotifications(true)
    fetchCounts()
    if (viewMode === 'grouped') {
      fetchGroupedNotifications()
    }
  }, [fetchNotifications, fetchCounts, fetchGroupedNotifications, viewMode])

  // ========== TOAST ==========
  const showToast = useCallback((toastData) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast(toastData)
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 4000)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast(null)
  }, [])

  // ========== UI ACTIONS ==========
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev)
  }, [])

  const closePanel = useCallback(() => {
    setIsPanelOpen(false)
  }, [])

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      const newMode = prev === 'list' ? 'grouped' : 'list'
      if (newMode === 'grouped') {
        fetchGroupedNotifications()
      }
      return newMode
    })
  }, [fetchGroupedNotifications])

  // ========== FILTERED NOTIFICATIONS ==========
  const getFilteredNotifications = useCallback(() => {
    switch (filter) {
      case NOTIFICATION_FILTERS.UNREAD:
        return notifications.filter(n => !n.read)
      case NOTIFICATION_FILTERS.MENTIONS:
        return notifications.filter(n => n.type === 'mention')
      case NOTIFICATION_FILTERS.WORKSPACE:
        return notifications.filter(n => n.origem === 'workspace')
      case NOTIFICATION_FILTERS.APP:
        return notifications.filter(n => n.origem === 'app')
      case NOTIFICATION_FILTERS.URGENT:
        return notifications.filter(n => n.urgent)
      default:
        return notifications
    }
  }, [notifications, filter])

  // ========== CONTEXT VALUE ==========
  const value = {
    // Data
    notifications,
    filteredNotifications: getFilteredNotifications(),
    groupedNotifications,
    counts,
    unreadCount,
    mentionsCount,

    // State
    isLoading,
    isLoadingMore,
    hasMore,

    // UI State
    isPanelOpen,
    filter,
    viewMode,
    toast,

    // Setters
    setFilter,

    // Actions
    markAsRead,
    markAllAsRead,
    executeAction,
    deleteNotification,
    loadMore,
    refresh,

    // UI Actions
    togglePanel,
    closePanel,
    toggleViewMode,
    showToast,
    dismissToast,

    // Config
    NOTIFICATION_TYPES,
    NOTIFICATION_FILTERS,
    NOTIFICATION_CONFIG
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
