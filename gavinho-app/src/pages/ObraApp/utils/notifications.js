// =====================================================
// NOTIFICATION UTILITIES
// Helper functions for creating notifications across ObraApp
// =====================================================

import { supabase } from '../../../lib/supabase'

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

// Notification configs
export const NOTIFICATION_CONFIG = {
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

/**
 * Create a single notification in the database
 */
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

/**
 * Notify multiple users at once
 */
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

/**
 * Notify users about a new material requisition
 */
export async function notifyNewRequisition({
  obraId,
  obraNome,
  requisicaoId,
  material,
  solicitanteNome,
  approverIds = [],
  approverEmails = []
}) {
  return await notifyUsers({
    userIds: approverIds,
    userEmails: approverEmails,
    tipo: NOTIFICATION_TYPES.REQUISICAO_NOVA,
    mensagem: `${solicitanteNome} solicitou ${material} na obra ${obraNome}`,
    obraId,
    requisicaoId,
    dados: {
      material,
      solicitante: solicitanteNome,
      obraNome
    },
    urgente: false
  })
}

/**
 * Notify user about material status change
 */
export async function notifyMaterialStatus({
  userId,
  obraId,
  requisicaoId,
  material,
  status,
  motivo
}) {
  const tipoMap = {
    aprovado: NOTIFICATION_TYPES.MATERIAL_APROVADO,
    rejeitado: NOTIFICATION_TYPES.MATERIAL_REJEITADO,
    entregue: NOTIFICATION_TYPES.MATERIAL_ENTREGUE
  }

  const mensagemMap = {
    aprovado: `O seu pedido de ${material} foi aprovado`,
    rejeitado: `O seu pedido de ${material} foi rejeitado${motivo ? `: ${motivo}` : ''}`,
    entregue: `${material} foi entregue`
  }

  return await createNotification({
    utilizadorId: userId,
    tipo: tipoMap[status] || NOTIFICATION_TYPES.MATERIAL_APROVADO,
    mensagem: mensagemMap[status] || `Pedido de ${material} atualizado`,
    obraId,
    requisicaoId,
    dados: { material, status, motivo }
  })
}

/**
 * Notify user about task assignment
 */
export async function notifyTaskAssigned({
  userId,
  obraId,
  tarefaId,
  tarefaTitulo,
  atribuidoPor
}) {
  return await createNotification({
    utilizadorId: userId,
    tipo: NOTIFICATION_TYPES.TAREFA_ATRIBUIDA,
    mensagem: `${atribuidoPor} atribuiu-lhe a tarefa: ${tarefaTitulo}`,
    obraId,
    tarefaId,
    dados: { titulo: tarefaTitulo, atribuidoPor }
  })
}

/**
 * Notify about task completion
 */
export async function notifyTaskCompleted({
  userIds,
  obraId,
  tarefaId,
  tarefaTitulo,
  completadoPor
}) {
  return await notifyUsers({
    userIds,
    tipo: NOTIFICATION_TYPES.TAREFA_CONCLUIDA,
    mensagem: `${completadoPor} completou a tarefa: ${tarefaTitulo}`,
    obraId,
    tarefaId,
    dados: { titulo: tarefaTitulo, completadoPor }
  })
}

/**
 * Notify about overdue tasks
 */
export async function notifyTaskOverdue({
  userId,
  obraId,
  tarefaId,
  tarefaTitulo,
  diasAtraso
}) {
  return await createNotification({
    utilizadorId: userId,
    tipo: NOTIFICATION_TYPES.TAREFA_ATRASADA,
    mensagem: `A tarefa "${tarefaTitulo}" está atrasada ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''}`,
    obraId,
    tarefaId,
    dados: { titulo: tarefaTitulo, diasAtraso },
    urgente: true
  })
}

/**
 * Notify about new comment on task
 */
export async function notifyTaskComment({
  userId,
  obraId,
  tarefaId,
  tarefaTitulo,
  comentario,
  autorNome
}) {
  return await createNotification({
    utilizadorId: userId,
    tipo: NOTIFICATION_TYPES.TAREFA_COMENTARIO,
    mensagem: `${autorNome} comentou na tarefa "${tarefaTitulo}"`,
    obraId,
    tarefaId,
    dados: { titulo: tarefaTitulo, comentario, autor: autorNome }
  })
}

/**
 * Notify about pending approval
 */
export async function notifyPendingApproval({
  userId,
  obraId,
  tipo,
  descricao,
  dados = {}
}) {
  return await createNotification({
    utilizadorId: userId,
    tipo: NOTIFICATION_TYPES.APROVACAO_PENDENTE,
    mensagem: `Aprovação pendente: ${descricao}`,
    obraId,
    dados: { tipoAprovacao: tipo, ...dados }
  })
}

/**
 * Notify about diary/log creation
 */
export async function notifyDiaryCreated({
  userIds,
  obraId,
  obraNome,
  data,
  criadoPor
}) {
  return await notifyUsers({
    userIds,
    tipo: NOTIFICATION_TYPES.DIARIO_CRIADO,
    mensagem: `${criadoPor} adicionou uma entrada no diário de ${obraNome}`,
    obraId,
    dados: { data, autor: criadoPor, obraNome }
  })
}

/**
 * Notify about deadline approaching
 */
export async function notifyDeadlineApproaching({
  userId,
  obraId,
  tarefaId,
  tarefaTitulo,
  diasRestantes
}) {
  return await createNotification({
    utilizadorId: userId,
    tipo: NOTIFICATION_TYPES.ALERTA_PRAZO,
    mensagem: `A tarefa "${tarefaTitulo}" termina em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}`,
    obraId,
    tarefaId,
    dados: { titulo: tarefaTitulo, diasRestantes },
    urgente: diasRestantes <= 1
  })
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId, userEmail) {
  try {
    const { count, error } = await supabase
      .from('app_notificacoes')
      .select('*', { count: 'exact', head: true })
      .or(`utilizador_id.eq.${userId},utilizador_email.eq.${userEmail}`)
      .eq('lida', false)

    if (error) throw error
    return count || 0
  } catch (err) {
    console.error('Erro ao contar notificações:', err)
    return 0
  }
}

/**
 * Mark notifications as read for a specific obra
 */
export async function markObraNotificationsAsRead(userId, obraId) {
  try {
    const { error } = await supabase
      .from('app_notificacoes')
      .update({
        lida: true,
        data_leitura: new Date().toISOString()
      })
      .eq('utilizador_id', userId)
      .eq('obra_id', obraId)
      .eq('lida', false)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Erro ao marcar notificações como lidas:', err)
    return false
  }
}
