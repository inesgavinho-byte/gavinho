// =====================================================
// USE UNIFIED NOTIFICATIONS HOOK
// Hook consolidado para notificações de toda a aplicação
// Combina notificacoes (Teams) + app_notificacoes (Obras)
// Suporta: Agrupamento, Ações inline, Paginação
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_PAGE_SIZE = 20

// Configuração de ícones e cores por tipo
export const NOTIFICATION_CONFIG = {
  // Tarefas
  tarefa_atribuida: { icon: '📋', color: '#3b82f6', label: 'Tarefa atribuída' },
  tarefa_atualizada: { icon: '📝', color: '#f59e0b', label: 'Tarefa atualizada' },
  tarefa_concluida: { icon: '✅', color: '#10b981', label: 'Tarefa concluída' },
  tarefa_atrasada: { icon: '⚠️', color: '#ef4444', label: 'Tarefa atrasada' },
  tarefa_comentario: { icon: '💬', color: '#6366f1', label: 'Comentário' },

  // Materiais
  requisicao_nova: { icon: '📦', color: '#8b5cf6', label: 'Nova requisição' },
  material_aprovado: { icon: '✓', color: '#10b981', label: 'Material aprovado' },
  material_entregue: { icon: '🚚', color: '#10b981', label: 'Material entregue' },
  material_rejeitado: { icon: '❌', color: '#ef4444', label: 'Material rejeitado' },

  // Aprovações
  aprovacao_pendente: { icon: '⏳', color: '#f59e0b', label: 'Aprovação pendente' },
  aprovacao_concluida: { icon: '✅', color: '#10b981', label: 'Aprovação concluída' },

  // Workspace
  mention: { icon: '@', color: '#3b82f6', label: 'Menção' },
  message: { icon: '💬', color: '#6366f1', label: 'Mensagem' },
  comment: { icon: '💬', color: '#6366f1', label: 'Comentário' },
  task: { icon: '📋', color: '#f59e0b', label: 'Tarefa' },
  project: { icon: '📁', color: '#8b5cf6', label: 'Projeto' },
  approval: { icon: '⏳', color: '#f59e0b', label: 'Aprovação' },
  system: { icon: '🔔', color: '#6b7280', label: 'Sistema' },

  // Alertas
  alerta_prazo: { icon: '⏰', color: '#f59e0b', label: 'Alerta de prazo' },
  alerta_seguranca: { icon: '🚨', color: '#ef4444', label: 'Alerta de segurança' },

  // Default
  default: { icon: '🔔', color: '#6b7280', label: 'Notificação' }
}

export default function useUnifiedNotifications(user, options = {}) {
  const {
    origem = null, // 'app', 'workspace', ou null para ambos
    autoRefresh = true,
    pageSize = DEFAULT_PAGE_SIZE,
    enableGrouping = false,
    enableRealtime = true
  } = options

  // State
  const [notifications, setNotifications] = useState([])
  const [groupedNotifications, setGroupedNotifications] = useState([])
  const [counts, setCounts] = useState({ total: 0, app: 0, workspace: 0, urgentes: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)

  // Pagination
  const [offset, setOffset] = useState(0)

  // Toast
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  // ========== LOAD NOTIFICATIONS ==========
  const loadNotifications = useCallback(async (reset = false) => {
    if (!user?.id) return

    try {
      if (reset) {
        setLoading(true)
        setOffset(0)
      } else {
        setLoadingMore(true)
      }

      const currentOffset = reset ? 0 : offset

      const { data, error: fetchError } = await supabase
        .rpc('get_notificacoes_unificadas', {
          p_user_id: user.id,
          p_user_email: user.email || null,
          p_limit: pageSize + 1, // +1 para verificar se há mais
          p_offset: currentOffset,
          p_apenas_nao_lidas: false,
          p_tipo: null,
          p_origem: origem
        })

      if (fetchError) throw fetchError

      const hasMoreResults = data?.length > pageSize
      const results = hasMoreResults ? data.slice(0, pageSize) : (data || [])

      // Formatar notificações
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
      console.error('Erro ao carregar notificações:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.id, user?.email, pageSize, origem, offset])

  // ========== LOAD GROUPED NOTIFICATIONS ==========
  const loadGroupedNotifications = useCallback(async () => {
    if (!user?.id || !enableGrouping) return

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_notificacoes_agrupadas', {
          p_user_id: user.id,
          p_user_email: user.email || null,
          p_limit: pageSize,
          p_offset: 0
        })

      if (fetchError) throw fetchError

      const formatted = (data || []).map(g => ({
        ...g,
        config: NOTIFICATION_CONFIG[g.type] || NOTIFICATION_CONFIG.default
      }))

      setGroupedNotifications(formatted)
    } catch (err) {
      console.error('Erro ao carregar notificações agrupadas:', err)
    }
  }, [user?.id, user?.email, pageSize, enableGrouping])

  // ========== LOAD COUNTS ==========
  const loadCounts = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error: fetchError } = await supabase
        .rpc('contar_notificacoes_unificadas_nao_lidas', {
          p_user_id: user.id,
          p_user_email: user.email || null
        })

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        setCounts(data[0])
      }
    } catch (err) {
      console.error('Erro ao contar notificações:', err)
    }
  }, [user?.id, user?.email])

  // ========== MARK AS READ ==========
  const markAsRead = useCallback(async (notificationId, notifOrigem = null) => {
    try {
      const { error: updateError } = await supabase
        .rpc('marcar_notificacao_lida', {
          p_notification_id: notificationId,
          p_origem: notifOrigem
        })

      if (updateError) throw updateError

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )

      // Update counts
      setCounts(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }))

    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
    }
  }, [])

  // ========== MARK ALL AS READ ==========
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    try {
      const { error: updateError } = await supabase
        .rpc('marcar_todas_notificacoes_lidas_unificado', {
          p_user_id: user.id,
          p_user_email: user.email || null
        })

      if (updateError) throw updateError

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
      setCounts({ total: 0, app: 0, workspace: 0, urgentes: 0 })

    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
    }
  }, [user?.id, user?.email])

  // ========== EXECUTE ACTION ==========
  const executeAction = useCallback(async (notificationId, actionId) => {
    if (!user?.id) return { success: false, error: 'Utilizador não autenticado' }

    try {
      const { data, error: execError } = await supabase
        .rpc('executar_acao_notificacao', {
          p_notification_id: notificationId,
          p_acao_id: actionId,
          p_user_id: user.id
        })

      if (execError) throw execError

      const result = data

      if (result?.success) {
        // Update local state - mark action as executed
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

        showToast({
          type: 'success',
          message: result.message || 'Ação executada com sucesso'
        })
      }

      return result
    } catch (err) {
      console.error('Erro ao executar ação:', err)
      showToast({
        type: 'error',
        message: 'Erro ao executar ação'
      })
      return { success: false, error: err.message }
    }
  }, [user?.id])

  // ========== LOAD MORE (Pagination) ==========
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadNotifications(false)
    }
  }, [loadingMore, hasMore, loadNotifications])

  // ========== REFRESH ==========
  const refresh = useCallback(() => {
    loadNotifications(true)
    loadCounts()
    if (enableGrouping) {
      loadGroupedNotifications()
    }
  }, [loadNotifications, loadCounts, loadGroupedNotifications, enableGrouping])

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

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    if (user?.id) {
      loadNotifications(true)
      loadCounts()
      if (enableGrouping) {
        loadGroupedNotifications()
      }
    }
  }, [user?.id])

  // ========== REALTIME SUBSCRIPTION ==========
  useEffect(() => {
    if (!user?.id || !enableRealtime) return

    // Subscribe to app_notificacoes
    const appChannel = supabase
      .channel(`unified_notif_app_${user.id}`)
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
          user_email: n.utilizador_email,
          sender_id: null,
          type: n.tipo,
          title: n.titulo,
          message: n.mensagem,
          context: n.dados || {},
          link: null,
          read: n.lida,
          read_at: n.data_leitura,
          urgent: n.urgente,
          actions: n.acoes,
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
      .channel(`unified_notif_ws_${user.id}`)
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
          user_email: null,
          sender_id: n.sender_id,
          type: n.type,
          title: n.title,
          message: n.message,
          context: n.context || {},
          link: n.link,
          read: n.read,
          read_at: n.read_at,
          urgent: false,
          actions: n.acoes,
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
  }, [user?.id, enableRealtime, showToast])

  // ========== AUTO REFRESH ==========
  useEffect(() => {
    if (!autoRefresh || !user?.id) return

    // Refresh counts every 30 seconds
    const interval = setInterval(() => {
      loadCounts()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, user?.id, loadCounts])

  // ========== RETURN ==========
  return {
    // Data
    notifications,
    groupedNotifications,
    counts,
    unreadCount: counts.total,

    // State
    loading,
    loadingMore,
    hasMore,
    error,

    // Actions
    markAsRead,
    markAllAsRead,
    executeAction,
    loadMore,
    refresh,

    // Toast
    toast,
    showToast,
    dismissToast,

    // Config
    NOTIFICATION_CONFIG
  }
}

// ========== HELPER: Format relative time ==========
export function formatRelativeTime(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'agora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`

  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

// ========== HELPER: Group notifications by date ==========
export function groupNotificationsByDate(notifications) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: []
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  notifications.forEach(n => {
    const date = new Date(n.created_at)

    if (date >= today) {
      groups.today.push(n)
    } else if (date >= yesterday) {
      groups.yesterday.push(n)
    } else if (date >= weekAgo) {
      groups.thisWeek.push(n)
    } else {
      groups.older.push(n)
    }
  })

  return groups
}
