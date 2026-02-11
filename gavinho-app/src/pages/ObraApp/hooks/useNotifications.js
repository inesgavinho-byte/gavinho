// =====================================================
// USE NOTIFICATIONS HOOK
// Database-backed notifications for ObraApp
// Persisted in app_notificacoes table with real-time sync
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

const MAX_NOTIFICATIONS = 100

// Notification types
export const NOTIFICATION_TYPES = {
  // Tarefas
  TAREFA_ATRIBUIDA: 'tarefa_atribuida',
  TAREFA_ATUALIZADA: 'tarefa_atualizada',
  TAREFA_CONCLUIDA: 'tarefa_concluida',
  TAREFA_ATRASADA: 'tarefa_atrasada',
  TAREFA_COMENTARIO: 'tarefa_comentario',

  // Materiais
  REQUISICAO_NOVA: 'requisicao_nova',
  MATERIAL_APROVADO: 'material_aprovado',
  MATERIAL_ENTREGUE: 'material_entregue',
  MATERIAL_REJEITADO: 'material_rejeitado',

  // Aprovações
  APROVACAO_PENDENTE: 'aprovacao_pendente',
  APROVACAO_CONCLUIDA: 'aprovacao_concluida',

  // Diário e Relatórios
  DIARIO_CRIADO: 'diario_criado',
  RELATORIO_DISPONIVEL: 'relatorio_disponivel',

  // Comunicação
  MENSAGEM_NOVA: 'mensagem_nova',
  MENCAO: 'mencao',

  // Alertas
  ALERTA_PRAZO: 'alerta_prazo',
  ALERTA_SEGURANCA: 'alerta_seguranca',
  ALERTA_CLIMA: 'alerta_clima'
}

// Notification configs with icons and colors
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
  [NOTIFICATION_TYPES.TAREFA_ATRASADA]: {
    title: 'Tarefa atrasada',
    icon: '⚠️',
    color: '#ef4444'
  },
  [NOTIFICATION_TYPES.TAREFA_COMENTARIO]: {
    title: 'Novo comentário',
    icon: '💬',
    color: '#6366f1'
  },
  [NOTIFICATION_TYPES.REQUISICAO_NOVA]: {
    title: 'Nova requisição de material',
    icon: '📦',
    color: '#8b5cf6'
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
  [NOTIFICATION_TYPES.APROVACAO_PENDENTE]: {
    title: 'Aprovação pendente',
    icon: '⏳',
    color: '#f59e0b'
  },
  [NOTIFICATION_TYPES.APROVACAO_CONCLUIDA]: {
    title: 'Aprovação concluída',
    icon: '✅',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.DIARIO_CRIADO]: {
    title: 'Diário atualizado',
    icon: '📖',
    color: '#8b5cf6'
  },
  [NOTIFICATION_TYPES.RELATORIO_DISPONIVEL]: {
    title: 'Relatório disponível',
    icon: '📊',
    color: '#6366f1'
  },
  [NOTIFICATION_TYPES.MENSAGEM_NOVA]: {
    title: 'Nova mensagem',
    icon: '💬',
    color: '#6366f1'
  },
  [NOTIFICATION_TYPES.MENCAO]: {
    title: 'Você foi mencionado',
    icon: '@',
    color: '#3b82f6'
  },
  [NOTIFICATION_TYPES.ALERTA_PRAZO]: {
    title: 'Alerta de prazo',
    icon: '⏰',
    color: '#f59e0b'
  },
  [NOTIFICATION_TYPES.ALERTA_SEGURANCA]: {
    title: 'Alerta de segurança',
    icon: '🚨',
    color: '#ef4444'
  },
  [NOTIFICATION_TYPES.ALERTA_CLIMA]: {
    title: 'Alerta meteorológico',
    icon: '🌧️',
    color: '#0ea5e9'
  }
}

// Helper to create notification in database
export async function createNotification({
  utilizadorId,
  utilizadorEmail,
  tipo,
  titulo,
  mensagem,
  obraId,
  requisicaoId,
  tarefaId,
  dados = {},
  urgente = false
}) {
  try {
    const config = NOTIFICATION_CONFIG[tipo] || {}

    const { data, error } = await supabase
      .from('app_notificacoes')
      .insert({
        utilizador_id: utilizadorId,
        utilizador_email: utilizadorEmail,
        tipo,
        titulo: titulo || config.title || 'Notificação',
        mensagem,
        obra_id: obraId,
        requisicao_id: requisicaoId,
        tarefa_id: tarefaId,
        dados: {
          ...dados,
          icon: config.icon,
          color: config.color
        },
        urgente
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar notificação:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Erro ao criar notificação:', err)
    return null
  }
}

// Helper to notify multiple users
export async function notifyUsers({
  userIds = [],
  userEmails = [],
  tipo,
  titulo,
  mensagem,
  obraId,
  requisicaoId,
  tarefaId,
  dados = {},
  urgente = false
}) {
  const notifications = []

  // Create for user IDs
  for (const userId of userIds) {
    const notif = await createNotification({
      utilizadorId: userId,
      tipo,
      titulo,
      mensagem,
      obraId,
      requisicaoId,
      tarefaId,
      dados,
      urgente
    })
    if (notif) notifications.push(notif)
  }

  // Create for emails (fallback)
  for (const email of userEmails) {
    const notif = await createNotification({
      utilizadorEmail: email,
      tipo,
      titulo,
      mensagem,
      obraId,
      requisicaoId,
      tarefaId,
      dados,
      urgente
    })
    if (notif) notifications.push(notif)
  }

  return notifications
}

export default function useNotifications(obra, user) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  // Load notifications from database
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('app_notificacoes')
        .select('*')
        .or(`utilizador_id.eq.${user.id},utilizador_email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS)

      if (error) throw error

      const formattedNotifications = (data || []).map(n => ({
        id: n.id,
        type: n.tipo,
        title: n.titulo,
        message: n.mensagem,
        icon: n.dados?.icon || NOTIFICATION_CONFIG[n.tipo]?.icon || '🔔',
        color: n.dados?.color || NOTIFICATION_CONFIG[n.tipo]?.color || '#6b7280',
        data: {
          ...n.dados,
          obraId: n.obra_id,
          requisicaoId: n.requisicao_id,
          tarefaId: n.tarefa_id
        },
        read: n.lida,
        urgent: n.urgente,
        createdAt: n.created_at
      }))

      setNotifications(formattedNotifications)
      setUnreadCount(formattedNotifications.filter(n => !n.read).length)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.email])

  // Initial load
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`app_notificacoes_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notificacoes',
        filter: `utilizador_id=eq.${user.id}`
      }, (payload) => {
        const n = payload.new
        const config = NOTIFICATION_CONFIG[n.tipo] || {}

        const newNotification = {
          id: n.id,
          type: n.tipo,
          title: n.titulo,
          message: n.mensagem,
          icon: n.dados?.icon || config.icon || '🔔',
          color: n.dados?.color || config.color || '#6b7280',
          data: {
            ...n.dados,
            obraId: n.obra_id,
            requisicaoId: n.requisicao_id,
            tarefaId: n.tarefa_id
          },
          read: n.lida,
          urgent: n.urgente,
          createdAt: n.created_at
        }

        setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS))
        setUnreadCount(prev => prev + 1)

        // Show toast
        showToastNotification(newNotification)

        // Show push notification
        showPushNotification(newNotification)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_notificacoes',
        filter: `utilizador_id=eq.${user.id}`
      }, (payload) => {
        const n = payload.new
        setNotifications(prev => prev.map(notif =>
          notif.id === n.id ? { ...notif, read: n.lida } : notif
        ))
        // Recalculate unread count
        setNotifications(prev => {
          setUnreadCount(prev.filter(notif => !notif.read).length)
          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Subscribe to task changes (legacy real-time for immediate feedback)
  useEffect(() => {
    if (!obra?.id || !user?.id) return

    const taskChannel = supabase
      .channel(`obra_tarefas_notif_${obra.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tarefas',
        filter: `obra_id=eq.${obra.id}`
      }, async (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        // Only process if user is the assignee
        if (newRecord?.responsavel_id !== user.id) return

        let tipo = null
        let mensagem = null

        if (eventType === 'INSERT') {
          tipo = NOTIFICATION_TYPES.TAREFA_ATRIBUIDA
          mensagem = newRecord.titulo
        } else if (eventType === 'UPDATE') {
          if (newRecord.estado === 'concluida' && oldRecord?.estado !== 'concluida') {
            tipo = NOTIFICATION_TYPES.TAREFA_CONCLUIDA
            mensagem = newRecord.titulo
          } else if (oldRecord?.estado !== newRecord.estado) {
            tipo = NOTIFICATION_TYPES.TAREFA_ATUALIZADA
            mensagem = `${newRecord.titulo} - ${newRecord.estado}`
          }
        }

        if (tipo && mensagem) {
          await createNotification({
            utilizadorId: user.id,
            tipo,
            mensagem,
            obraId: obra.id,
            tarefaId: newRecord.id
          })
        }
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
      }, async (payload) => {
        const { new: newRecord, old: oldRecord } = payload

        // Only notify if user created the request
        if (newRecord?.solicitante_id !== user.id) return

        let tipo = null
        let mensagem = null

        if (newRecord.estado === 'aprovado' && oldRecord?.estado === 'pendente') {
          tipo = NOTIFICATION_TYPES.MATERIAL_APROVADO
          mensagem = `Pedido de ${newRecord.material} aprovado`
        } else if (newRecord.estado === 'entregue') {
          tipo = NOTIFICATION_TYPES.MATERIAL_ENTREGUE
          mensagem = `${newRecord.material} entregue`
        } else if (newRecord.estado === 'rejeitado') {
          tipo = NOTIFICATION_TYPES.MATERIAL_REJEITADO
          mensagem = `Pedido de ${newRecord.material} rejeitado`
        }

        if (tipo && mensagem) {
          await createNotification({
            utilizadorId: user.id,
            tipo,
            mensagem,
            obraId: obra.id,
            requisicaoId: newRecord.id
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(materialChannel)
    }
  }, [obra?.id, user?.id])

  // Show toast notification
  const showToastNotification = useCallback((notification) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    setShowToast(notification)
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(null)
    }, 5000)
  }, [])

  // Show push notification
  const showPushNotification = useCallback((notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          tag: notification.id,
          requireInteraction: notification.urgent
        })
      } catch (err) {
        console.warn('Push notification failed:', err)
      }
    }
  }, [])

  // Add notification (creates in database)
  const addNotification = useCallback(async (notif) => {
    if (!user?.id) return null

    return await createNotification({
      utilizadorId: user.id,
      tipo: notif.type,
      titulo: notif.title,
      mensagem: notif.message,
      obraId: obra?.id || notif.data?.obraId,
      requisicaoId: notif.data?.requisicaoId,
      tarefaId: notif.data?.tarefaId,
      dados: notif.data,
      urgente: notif.urgent || false
    })
  }, [user?.id, obra?.id])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('app_notificacoes')
        .update({
          lida: true,
          data_leitura: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('app_notificacoes')
        .update({
          lida: true,
          data_leitura: new Date().toISOString()
        })
        .or(`utilizador_id.eq.${user.id},utilizador_email.eq.${user.email}`)
        .eq('lida', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
    }
  }, [user?.id, user?.email])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('app_notificacoes')
        .delete()
        .or(`utilizador_id.eq.${user.id},utilizador_email.eq.${user.email}`)

      if (error) throw error

      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error('Erro ao limpar notificações:', err)
    }
  }, [user?.id, user?.email])

  // Dismiss toast
  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setShowToast(null)
  }, [])

  // Request push notification permission
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (err) {
      console.error('Error requesting notification permission:', err)
      return false
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    showToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissToast,
    requestPushPermission,
    reload: loadNotifications,
    // Export helpers for external use
    NOTIFICATION_TYPES,
    NOTIFICATION_CONFIG
  }
}
