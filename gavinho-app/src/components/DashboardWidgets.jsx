import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Euro,
  TrendingUp,
  TrendingDown,
  FileCheck,
  MessageSquare,
  Calendar,
  ArrowRight,
  Package,
  AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Widget: Alertas de Prazos Críticos (Tarefas a Vencer)
export function CriticalDeadlinesWidget() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0
  })

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(today)
        endOfWeek.setDate(endOfWeek.getDate() + 7)

        const { data, error } = await supabase
          .from('tarefas')
          .select(`
            id,
            titulo,
            data_limite,
            prioridade,
            status,
            projeto_id,
            projetos:projeto_id (codigo, nome)
          `)
          .in('status', ['pendente', 'em_progresso'])
          .not('data_limite', 'is', null)
          .lte('data_limite', endOfWeek.toISOString())
          .order('data_limite', { ascending: true })
          .limit(10)

        if (error) throw error

        const now = new Date()
        let overdue = 0
        let dueToday = 0
        let dueThisWeek = 0

        const processedTasks = (data || []).map(task => {
          const deadline = new Date(task.data_limite)
          deadline.setHours(23, 59, 59, 999)

          const isOverdue = deadline < now
          const isTodayDeadline = deadline.toDateString() === today.toDateString()

          if (isOverdue) overdue++
          else if (isTodayDeadline) dueToday++
          else dueThisWeek++

          return {
            ...task,
            isOverdue,
            isTodayDeadline
          }
        })

        setStats({ overdue, dueToday, dueThisWeek })
        setTasks(processedTasks.slice(0, 5))
      } catch (err) {
        // Table may not exist yet - widget shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Hoje'
    if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã'
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }

  const getPriorityColor = (prioridade) => {
    switch (prioridade) {
      case 'urgente': return 'var(--error)'
      case 'alta': return 'var(--warning)'
      case 'media': return 'var(--info)'
      default: return 'var(--text-secondary)'
    }
  }

  const totalAlerts = stats.overdue + stats.dueToday + stats.dueThisWeek

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} style={{ color: stats.overdue > 0 ? 'var(--error)' : 'var(--warning)' }} />
          <h3 className="card-title">Prazos Críticos</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tarefas')}>
          Ver todas <ArrowRight size={14} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--stone)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--cream)',
            borderRadius: '10px'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: stats.overdue > 0 ? 'var(--error)' : 'var(--text-secondary)'
              }}>
                {stats.overdue}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Atrasadas</div>
            </div>
            <div style={{ width: '1px', background: 'var(--stone)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: stats.dueToday > 0 ? 'var(--warning)' : 'var(--text-secondary)'
              }}>
                {stats.dueToday}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hoje</div>
            </div>
            <div style={{ width: '1px', background: 'var(--stone)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--info)' }}>
                {stats.dueThisWeek}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Esta Semana</div>
            </div>
          </div>

          {/* Task List */}
          {tasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => navigate('/tarefas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: task.isOverdue ? 'rgba(184, 138, 138, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${task.isOverdue ? 'var(--error)' : task.isTodayDeadline ? 'var(--warning)' : 'var(--info)'}`,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = task.isOverdue ? 'rgba(184, 138, 138, 0.1)' : 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {task.titulo}
                    </div>
                    {task.projetos && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {task.projetos.codigo}
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0
                  }}>
                    <Clock size={12} style={{ color: task.isOverdue ? 'var(--error)' : 'var(--text-secondary)' }} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: task.isOverdue ? 'var(--error)' : task.isTodayDeadline ? 'var(--warning)' : 'var(--text-secondary)'
                    }}>
                      {formatDate(task.data_limite)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sem tarefas urgentes</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Widget: Saúde do Orçamento por Projeto
export function BudgetHealthWidget() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    atRisk: 0
  })

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        // Fetch budgets with project info
        const { data, error } = await supabase
          .from('orcamentos')
          .select(`
            id,
            codigo,
            titulo,
            status,
            total,
            projeto_id,
            projetos:projeto_id (codigo, nome, orcamento_atual)
          `)
          .order('updated_at', { ascending: false })
          .limit(20)

        if (error) throw error

        // Calculate stats
        let approved = 0
        let pending = 0
        let atRisk = 0

        const processedBudgets = (data || []).map(budget => {
          if (budget.status === 'aprovado') approved++
          else if (budget.status === 'rascunho' || budget.status === 'enviado') pending++
          if (budget.status === 'rejeitado' || budget.status === 'expirado') atRisk++

          // Calculate health based on comparison with project budget
          let health = 'good'
          if (budget.projetos?.orcamento_atual && budget.total) {
            const ratio = budget.total / budget.projetos.orcamento_atual
            if (ratio > 1.1) health = 'over'
            else if (ratio > 1) health = 'attention'
            else if (ratio < 0.8) health = 'under'
          }

          return { ...budget, health }
        })

        setStats({
          total: data?.length || 0,
          approved,
          pending,
          atRisk
        })
        setBudgets(processedBudgets.slice(0, 5))
      } catch (err) {
        // Table may not exist yet - widget shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchBudgets()
  }, [])

  const formatCurrency = (value) => {
    if (!value) return '€0'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`
    return `€${value.toFixed(0)}`
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'aprovado': return { label: 'Aprovado', color: 'var(--success)', icon: CheckCircle2 }
      case 'enviado': return { label: 'Enviado', color: 'var(--info)', icon: Clock }
      case 'rascunho': return { label: 'Rascunho', color: 'var(--text-secondary)', icon: FileCheck }
      case 'rejeitado': return { label: 'Rejeitado', color: 'var(--error)', icon: XCircle }
      case 'expirado': return { label: 'Expirado', color: 'var(--warning)', icon: AlertCircle }
      default: return { label: status, color: 'var(--text-secondary)', icon: FileCheck }
    }
  }

  const getHealthIcon = (health) => {
    switch (health) {
      case 'over': return <TrendingUp size={14} style={{ color: 'var(--error)' }} />
      case 'attention': return <TrendingUp size={14} style={{ color: 'var(--warning)' }} />
      case 'under': return <TrendingDown size={14} style={{ color: 'var(--info)' }} />
      default: return <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
    }
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Euro size={20} style={{ color: 'var(--success)' }} />
          <h3 className="card-title">Saúde Orçamental</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orcamentos')}>
          Ver todos <ArrowRight size={14} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--stone)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--cream)',
            borderRadius: '10px'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
                {stats.approved}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Aprovados</div>
            </div>
            <div style={{ width: '1px', background: 'var(--stone)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--info)' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pendentes</div>
            </div>
            <div style={{ width: '1px', background: 'var(--stone)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: stats.atRisk > 0 ? 'var(--error)' : 'var(--text-secondary)'
              }}>
                {stats.atRisk}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Em Risco</div>
            </div>
          </div>

          {/* Budget List */}
          {budgets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {budgets.map(budget => {
                const statusInfo = getStatusInfo(budget.status)
                const StatusIcon = statusInfo.icon
                return (
                  <div
                    key={budget.id}
                    onClick={() => navigate(`/orcamentos/${budget.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${statusInfo.color}`,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {budget.titulo || budget.codigo}
                      </div>
                      {budget.projetos && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {budget.projetos.codigo}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {getHealthIcon(budget.health)}
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {formatCurrency(budget.total)}
                      </span>
                      <StatusIcon size={14} style={{ color: statusInfo.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Euro size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sem orçamentos</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Widget: Aprovações Pendentes (Requisições)
export function PendingApprovalsWidget() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [requisitions, setRequisitions] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    urgent: 0,
    total: 0
  })

  useEffect(() => {
    const fetchRequisitions = async () => {
      try {
        const { data, error } = await supabase
          .from('requisicoes_materiais')
          .select(`
            id,
            codigo,
            descricao,
            quantidade,
            unidade,
            urgencia,
            estado,
            valor_estimado,
            data_necessaria,
            obra_id,
            obras:obra_id (codigo, nome)
          `)
          .eq('estado', 'pendente')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error

        const pending = data?.length || 0
        const urgent = (data || []).filter(r => r.urgencia === 'urgente' || r.urgencia === 'alta').length

        setStats({
          pending,
          urgent,
          total: pending
        })
        setRequisitions((data || []).slice(0, 5))
      } catch (err) {
        // Table may not exist yet - widget shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchRequisitions()
  }, [])

  const getUrgencyInfo = (urgencia) => {
    switch (urgencia) {
      case 'urgente': return { label: 'Urgente', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
      case 'alta': return { label: 'Alta', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' }
      case 'normal': return { label: 'Normal', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' }
      default: return { label: 'Baixa', color: 'var(--text-secondary)', bg: 'var(--cream)' }
    }
  }

  const formatCurrency = (value) => {
    if (!value) return ''
    return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package size={20} style={{ color: stats.urgent > 0 ? 'var(--warning)' : 'var(--info)' }} />
          <h3 className="card-title">Aprovações Pendentes</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/requisicoes')}>
          Ver todas <ArrowRight size={14} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--stone)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '16px',
            background: stats.urgent > 0
              ? 'linear-gradient(135deg, rgba(201, 168, 130, 0.1) 0%, rgba(201, 168, 130, 0.05) 100%)'
              : 'var(--cream)',
            borderRadius: '10px',
            borderLeft: stats.urgent > 0 ? '4px solid var(--warning)' : 'none'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: stats.pending > 0 ? 'var(--warning)' : 'var(--success)'
              }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Requisições Pendentes
              </div>
            </div>
            {stats.urgent > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'rgba(184, 138, 138, 0.15)',
                borderRadius: '8px'
              }}>
                <AlertTriangle size={16} style={{ color: 'var(--error)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--error)' }}>
                  {stats.urgent} urgente{stats.urgent > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Requisition List */}
          {requisitions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requisitions.map(req => {
                const urgencyInfo = getUrgencyInfo(req.urgencia)
                return (
                  <div
                    key={req.id}
                    onClick={() => navigate('/requisicoes')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: urgencyInfo.bg,
                      transition: 'opacity 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {req.descricao}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        <span>{req.quantidade} {req.unidade}</span>
                        {req.obras && <span>• {req.obras.codigo}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {req.valor_estimado && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {formatCurrency(req.valor_estimado)}
                        </span>
                      )}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '600',
                        background: urgencyInfo.color,
                        color: 'white'
                      }}>
                        {urgencyInfo.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: '8px', color: 'var(--success)' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sem aprovações pendentes</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Widget: Mensagens Não Lidas
export function UnreadMessagesWidget() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState({
    unread: 0,
    mentions: 0
  })

  useEffect(() => {
    const fetchMessages = async () => {
      if (!profile?.id) {
        setLoading(false)
        return
      }

      try {
        // Fetch messages with mentions for current user
        const { data: mentions, error: mentionsError } = await supabase
          .from('chat_mencoes')
          .select(`
            id,
            lida,
            mensagem_id,
            chat_mensagens:mensagem_id (
              id,
              conteudo,
              autor_nome,
              created_at,
              canal_id
            )
          `)
          .eq('user_id', profile.id)
          .eq('lida', false)
          .order('created_at', { ascending: false })
          .limit(10)

        if (mentionsError) throw mentionsError

        // Get recent unread messages (simplified - checking messages not from current user)
        const { data: recentMessages, error: recentError } = await supabase
          .from('chat_mensagens')
          .select(`
            id,
            conteudo,
            autor_id,
            autor_nome,
            created_at,
            canal_id,
            chat_canais:canal_id (nome, projeto_id)
          `)
          .neq('autor_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (recentError) throw recentError

        const mentionCount = mentions?.length || 0
        const processedMessages = (recentMessages || []).slice(0, 5).map(msg => ({
          ...msg,
          isMention: mentions?.some(m => m.mensagem_id === msg.id)
        }))

        setStats({
          unread: processedMessages.length,
          mentions: mentionCount
        })
        setMessages(processedMessages)
      } catch (err) {
        // Table may not exist yet - widget shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [profile?.id])

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} style={{ color: stats.mentions > 0 ? 'var(--accent-olive)' : 'var(--info)' }} />
          <h3 className="card-title">Mensagens</h3>
          {stats.mentions > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              background: 'var(--accent-olive)',
              color: 'white'
            }}>
              {stats.mentions} menções
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workspace')}>
          Abrir <ArrowRight size={14} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--stone)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      ) : (
        <>
          {/* Message List */}
          {messages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  onClick={() => navigate('/workspace')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 0',
                    cursor: 'pointer',
                    borderBottom: idx < messages.length - 1 ? '1px solid var(--stone)' : 'none',
                    background: msg.isMention ? 'rgba(139, 155, 123, 0.08)' : 'transparent',
                    marginLeft: '-16px',
                    marginRight: '-16px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = msg.isMention ? 'rgba(139, 155, 123, 0.08)' : 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--brown-dark)',
                    flexShrink: 0
                  }}>
                    {getInitials(msg.autor_nome)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '2px'
                    }}>
                      <span style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        color: 'var(--text-primary)'
                      }}>
                        {msg.autor_nome}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.conteudo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: '8px', color: 'var(--success)' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sem mensagens novas</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
