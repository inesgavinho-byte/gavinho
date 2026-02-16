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
import {
  FONTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  COLORS,
  SPACING,
  RADIUS,
} from '../styles/designTokens'

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

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
          <AlertTriangle size={20} style={{ color: stats.overdue > 0 ? COLORS.error : COLORS.warning }} />
          <h3 className="card-title" style={{ fontFamily: FONTS.body }}>Prazos Críticos</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tarefas')}>
          Ver todas <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: SPACING.xl, textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${COLORS.border}`,
            borderTopColor: COLORS.gold,
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
            gap: SPACING.md,
            marginBottom: SPACING.base,
            padding: SPACING.md,
            background: COLORS.bgCardHover,
            borderRadius: RADIUS.sm
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: FONT_SIZES.xl,
                fontWeight: FONT_WEIGHTS.bold,
                color: stats.overdue > 0 ? COLORS.error : COLORS.textSecondary
              }}>
                {stats.overdue}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Atrasadas</div>
            </div>
            <div style={{ width: '1px', background: COLORS.border }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: FONT_SIZES.xl,
                fontWeight: FONT_WEIGHTS.bold,
                color: stats.dueToday > 0 ? COLORS.warning : COLORS.textSecondary
              }}>
                {stats.dueToday}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Hoje</div>
            </div>
            <div style={{ width: '1px', background: COLORS.border }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: FONT_SIZES.xl,
                fontWeight: FONT_WEIGHTS.bold,
                color: COLORS.info
              }}>
                {stats.dueThisWeek}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Esta Semana</div>
            </div>
          </div>

          {/* Task List */}
          {tasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => navigate('/tarefas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.md,
                    padding: `${SPACING.md} ${SPACING.md}`,
                    background: task.isOverdue ? COLORS.errorBg : 'transparent',
                    borderRadius: RADIUS.sm,
                    cursor: 'pointer',
                    borderLeft: `3px solid ${task.isOverdue ? COLORS.error : task.isTodayDeadline ? COLORS.warning : COLORS.info}`,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgCardHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = task.isOverdue ? COLORS.errorBg : 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: FONT_SIZES.base,
                      fontWeight: FONT_WEIGHTS.medium,
                      fontFamily: FONTS.body,
                      color: COLORS.textPrimary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {task.titulo}
                    </div>
                    {task.projetos && (
                      <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>
                        {task.projetos.codigo}
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    flexShrink: 0
                  }}>
                    <Clock size={12} style={{ color: task.isOverdue ? COLORS.error : COLORS.textSecondary }} />
                    <span style={{
                      fontSize: FONT_SIZES.sm,
                      fontWeight: FONT_WEIGHTS.semibold,
                      fontFamily: FONTS.body,
                      color: task.isOverdue ? COLORS.error : task.isTodayDeadline ? COLORS.warning : COLORS.textSecondary
                    }}>
                      {formatDate(task.data_limite)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: SPACING.sm }} />
              <p style={{ margin: 0, fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem tarefas urgentes</p>
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
      case 'aprovado': return { label: 'Aprovado', color: COLORS.success, icon: CheckCircle2 }
      case 'enviado': return { label: 'Enviado', color: COLORS.info, icon: Clock }
      case 'rascunho': return { label: 'Rascunho', color: COLORS.textSecondary, icon: FileCheck }
      case 'rejeitado': return { label: 'Rejeitado', color: COLORS.error, icon: XCircle }
      case 'expirado': return { label: 'Expirado', color: COLORS.warning, icon: AlertCircle }
      default: return { label: status, color: COLORS.textSecondary, icon: FileCheck }
    }
  }

  const getHealthIcon = (health) => {
    switch (health) {
      case 'over': return <TrendingUp size={14} style={{ color: COLORS.error }} />
      case 'attention': return <TrendingUp size={14} style={{ color: COLORS.warning }} />
      case 'under': return <TrendingDown size={14} style={{ color: COLORS.info }} />
      default: return <CheckCircle2 size={14} style={{ color: COLORS.success }} />
    }
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
          <Euro size={20} style={{ color: COLORS.success }} />
          <h3 className="card-title" style={{ fontFamily: FONTS.body }}>Saúde Orçamental</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orcamentos')}>
          Ver todos <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: SPACING.xl, textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${COLORS.border}`,
            borderTopColor: COLORS.gold,
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
            gap: SPACING.md,
            marginBottom: SPACING.base,
            padding: SPACING.md,
            background: COLORS.bgCardHover,
            borderRadius: RADIUS.sm
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.success }}>
                {stats.approved}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Aprovados</div>
            </div>
            <div style={{ width: '1px', background: COLORS.border }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.info }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Pendentes</div>
            </div>
            <div style={{ width: '1px', background: COLORS.border }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: FONT_SIZES.xl,
                fontWeight: FONT_WEIGHTS.bold,
                color: stats.atRisk > 0 ? COLORS.error : COLORS.textSecondary
              }}>
                {stats.atRisk}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>Em Risco</div>
            </div>
          </div>

          {/* Budget List */}
          {budgets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
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
                      gap: SPACING.md,
                      padding: `${SPACING.md} ${SPACING.md}`,
                      borderRadius: RADIUS.sm,
                      cursor: 'pointer',
                      borderLeft: `3px solid ${statusInfo.color}`,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgCardHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: FONT_SIZES.base,
                        fontWeight: FONT_WEIGHTS.medium,
                        fontFamily: FONTS.body,
                        color: COLORS.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {budget.titulo || budget.codigo}
                      </div>
                      {budget.projetos && (
                        <div style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>
                          {budget.projetos.codigo}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 }}>
                      {getHealthIcon(budget.health)}
                      <span style={{
                        fontSize: FONT_SIZES.sm,
                        fontWeight: FONT_WEIGHTS.semibold,
                        fontFamily: FONTS.body,
                        color: COLORS.textPrimary
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
            <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary }}>
              <Euro size={32} style={{ opacity: 0.3, marginBottom: SPACING.sm }} />
              <p style={{ margin: 0, fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem orçamentos</p>
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
      case 'urgente': return { label: 'Urgente', color: COLORS.error, bg: COLORS.errorBg }
      case 'alta': return { label: 'Alta', color: COLORS.warning, bg: COLORS.warningBg }
      case 'normal': return { label: 'Normal', color: COLORS.info, bg: 'rgba(122, 139, 158, 0.15)' }
      default: return { label: 'Baixa', color: COLORS.textSecondary, bg: COLORS.bgCardHover }
    }
  }

  const formatCurrency = (value) => {
    if (!value) return ''
    return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}`
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
          <Package size={20} style={{ color: stats.urgent > 0 ? COLORS.warning : COLORS.info }} />
          <h3 className="card-title" style={{ fontFamily: FONTS.body }}>Aprovações Pendentes</h3>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/requisicoes')}>
          Ver todas <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: SPACING.xl, textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${COLORS.border}`,
            borderTopColor: COLORS.gold,
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
            gap: SPACING.base,
            marginBottom: SPACING.base,
            padding: SPACING.base,
            background: stats.urgent > 0
              ? COLORS.warningBg
              : COLORS.bgCardHover,
            borderRadius: RADIUS.sm,
            borderLeft: stats.urgent > 0 ? `4px solid ${COLORS.warning}` : 'none'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: '28px',
                fontWeight: FONT_WEIGHTS.bold,
                color: stats.pending > 0 ? COLORS.warning : COLORS.success
              }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary }}>
                Requisições Pendentes
              </div>
            </div>
            {stats.urgent > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                padding: `${SPACING.sm} ${SPACING.md}`,
                background: COLORS.errorBg,
                borderRadius: RADIUS.sm
              }}>
                <AlertTriangle size={16} style={{ color: COLORS.error }} />
                <span style={{ fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, fontFamily: FONTS.body, color: COLORS.error }}>
                  {stats.urgent} urgente{stats.urgent > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Requisition List */}
          {requisitions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              {requisitions.map(req => {
                const urgencyInfo = getUrgencyInfo(req.urgencia)
                return (
                  <div
                    key={req.id}
                    onClick={() => navigate('/requisicoes')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.md,
                      padding: `${SPACING.md} ${SPACING.md}`,
                      borderRadius: RADIUS.sm,
                      cursor: 'pointer',
                      background: urgencyInfo.bg,
                      transition: 'opacity 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: FONT_SIZES.base,
                        fontWeight: FONT_WEIGHTS.medium,
                        fontFamily: FONTS.body,
                        color: COLORS.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {req.descricao}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.sm,
                        fontSize: FONT_SIZES.xs,
                        fontFamily: FONTS.body,
                        color: COLORS.textSecondary
                      }}>
                        <span>{req.quantidade} {req.unidade}</span>
                        {req.obras && <span>• {req.obras.codigo}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 }}>
                      {req.valor_estimado && (
                        <span style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary }}>
                          {formatCurrency(req.valor_estimado)}
                        </span>
                      )}
                      <span style={{
                        padding: `2px ${SPACING.sm}`,
                        borderRadius: RADIUS.sm,
                        fontSize: '10px',
                        fontWeight: FONT_WEIGHTS.semibold,
                        fontFamily: FONTS.body,
                        background: urgencyInfo.color,
                        color: COLORS.textInverse
                      }}>
                        {urgencyInfo.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: SPACING.sm, color: COLORS.success }} />
              <p style={{ margin: 0, fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem aprovações pendentes</p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
          <MessageSquare size={20} style={{ color: stats.mentions > 0 ? COLORS.accent : COLORS.info }} />
          <h3 className="card-title" style={{ fontFamily: FONTS.body }}>Mensagens</h3>
          {stats.mentions > 0 && (
            <span style={{
              padding: `2px ${SPACING.sm}`,
              borderRadius: RADIUS.sm,
              fontSize: FONT_SIZES.xs,
              fontWeight: FONT_WEIGHTS.semibold,
              fontFamily: FONTS.body,
              background: COLORS.accent,
              color: COLORS.textInverse
            }}>
              {stats.mentions} menções
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workspace')}>
          Abrir <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: SPACING.xl, textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${COLORS.border}`,
            borderTopColor: COLORS.gold,
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
                    gap: SPACING.md,
                    padding: `${SPACING.md} 0`,
                    cursor: 'pointer',
                    borderBottom: idx < messages.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                    background: msg.isMention ? 'rgba(122, 139, 110, 0.08)' : 'transparent',
                    marginLeft: '-16px',
                    marginRight: '-16px',
                    paddingLeft: SPACING.base,
                    paddingRight: SPACING.base,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgCardHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = msg.isMention ? 'rgba(122, 139, 110, 0.08)' : 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.border} 0%, ${COLORS.borderHover} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.semibold,
                    fontFamily: FONTS.body,
                    color: COLORS.textPrimary,
                    flexShrink: 0
                  }}>
                    {getInitials(msg.autor_nome)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.sm,
                      marginBottom: '2px'
                    }}>
                      <span style={{
                        fontWeight: FONT_WEIGHTS.semibold,
                        fontSize: FONT_SIZES.base,
                        fontFamily: FONTS.body,
                        color: COLORS.textPrimary
                      }}>
                        {msg.autor_nome}
                      </span>
                      <span style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary }}>
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: FONT_SIZES.sm,
                      fontFamily: FONTS.body,
                      color: COLORS.textSecondary,
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
            <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary }}>
              <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: SPACING.sm, color: COLORS.success }} />
              <p style={{ margin: 0, fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem mensagens novas</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
