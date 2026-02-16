import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Euro,
  MessageSquare,
  Hash,
  ArrowRight,
  Paperclip,
  AtSign,
  Image as ImageIcon,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  Activity
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  CriticalDeadlinesWidget,
  BudgetHealthWidget,
  PendingApprovalsWidget,
  UnreadMessagesWidget
} from '../components/DashboardWidgets'
import {
  FONTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  COLORS,
  SPACING,
  RADIUS,
  SHADOWS,
  KPI_ACCENTS,
  getPhaseColor,
  getPhaseBg,
  getStatusColor as getTokenStatusColor,
} from '../styles/designTokens'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    projetosEmProposta: 0,
    projetosEmRisco: 0,
    totalClientes: 0,
    pipelineTotal: 0,
    progressoMedio: 0
  })
  const [recentProjects, setRecentProjects] = useState([])
  const [projectsByPhase, setProjectsByPhase] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        const { data: projetos, error: projetosError } = await supabase
          .from('projetos')
          .select('*')
          .order('updated_at', { ascending: false })

        if (projetosError) throw projetosError

        const { data: clientes, error: clientesError } = await supabase
          .from('clientes')
          .select('id')

        if (clientesError) throw clientesError

        if (projetos && projetos.length > 0) {
          const ativos = projetos.filter(p => p.fase !== 'Entrega' && p.fase !== 'Casa Viva')
          const emProposta = projetos.filter(p => p.fase === 'Proposta' || p.fase === 'Conceito')
          const emRisco = projetos.filter(p => p.status === 'at_risk' || p.status === 'delayed')

          const pipelineTotal = projetos.reduce((sum, p) => sum + (parseFloat(p.orcamento_atual) || 0), 0)
          const progressoMedio = projetos.length > 0
            ? projetos.reduce((sum, p) => sum + (p.progresso || 0), 0) / projetos.length
            : 0

          const faseCount = {}
          projetos.forEach(p => {
            const fase = p.fase || 'Outros'
            faseCount[fase] = (faseCount[fase] || 0) + 1
          })
          const phaseData = Object.entries(faseCount).map(([fase, count]) => ({ fase, count }))

          setStats({
            totalProjetos: projetos.length,
            projetosAtivos: ativos.length,
            projetosEmProposta: emProposta.length,
            projetosEmRisco: emRisco.length,
            totalClientes: clientes?.length || 0,
            pipelineTotal,
            progressoMedio: Math.round(progressoMedio)
          })

          setRecentProjects(projetos.slice(0, 5))
          setProjectsByPhase(phaseData)
        }

        let mensagens = null
        try {
          const { data } = await supabase
            .from('chat_mensagens')
            .select(`
              id,
              conteudo,
              autor_id,
              autor_nome,
              attachments,
              created_at,
              canal_id
            `)
            .order('created_at', { ascending: false })
            .limit(5)
          mensagens = data
        } catch (e) {
          // Table may not exist yet
        }

        if (mensagens && mensagens.length > 0) {
          const activity = mensagens.map(m => ({
            id: m.id,
            type: m.conteudo?.includes('@') ? 'mention' : 'message',
            projeto: { codigo: '', nome: '' },
            autor: { nome: m.autor_nome || 'Utilizador', avatar_url: null },
            conteudo: m.conteudo || '',
            created_at: m.created_at,
            hasAttachment: m.attachments && m.attachments.length > 0,
            hasMention: m.conteudo?.includes('@')
          }))
          setRecentActivity(activity)
        }

      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (value) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`
    return `€${value.toFixed(0)}`
  }

  const getStatusColor = (status) => getTokenStatusColor(status)

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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 19) return 'Boa tarde'
    return 'Boa noite'
  }

  const getFirstName = () => {
    if (!profile?.nome) return ''
    return profile.nome.split(' ')[0]
  }

  // Loading state
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `3px solid ${COLORS.border}`,
            borderTopColor: COLORS.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: FONT_SIZES.md }}>A carregar dashboard...</p>
        </div>
      </div>
    )
  }

  const totalPhaseCount = projectsByPhase.reduce((sum, p) => sum + p.count, 0)

  return (
    <div className="fade-in">
      {/* Header with greeting */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? SPACING.base : 0,
        marginBottom: SPACING['3xl']
      }}>
        <div>
          <p style={{
            fontSize: FONT_SIZES.base,
            color: COLORS.accent,
            fontWeight: FONT_WEIGHTS.semibold,
            fontFamily: FONTS.body,
            marginBottom: SPACING.xs,
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            {getGreeting()}{getFirstName() ? `, ${getFirstName()}` : ''}
          </p>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES['3xl'],
            fontWeight: FONT_WEIGHTS.semibold,
            letterSpacing: '-0.5px',
            color: COLORS.textPrimary,
            margin: 0,
            lineHeight: 1.1
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: FONT_SIZES.md,
            fontFamily: FONTS.body,
            color: COLORS.textSecondary,
            marginTop: SPACING.xs
          }}>
            Visão geral da GAVINHO Group
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/projetos')}
          style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}
        >
          Ver Projetos
          <ArrowUpRight size={16} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stagger-children" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? SPACING.md : SPACING.base,
        marginBottom: SPACING.xl
      }}>
        {/* Projetos Ativos */}
        <div style={{
          background: KPI_ACCENTS.olive.gradient,
          borderRadius: RADIUS.xl,
          padding: SPACING.xl,
          border: `1px solid ${COLORS.border}`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = SHADOWS.md }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          onClick={() => navigate('/projetos')}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(122, 139, 110, 0.06)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base }}>
            <span style={{ fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium, fontFamily: FONTS.body }}>Projetos Ativos</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: RADIUS.md,
              background: KPI_ACCENTS.olive.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderKanban size={20} style={{ color: COLORS.accent }} />
            </div>
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: '40px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.projetosAtivos}
          </div>
          <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: SPACING.sm }}>
            {stats.totalProjetos} total
          </div>
        </div>

        {/* Pipeline Total */}
        <div style={{
          background: KPI_ACCENTS.gold.gradient,
          borderRadius: RADIUS.xl,
          padding: SPACING.xl,
          border: `1px solid ${COLORS.border}`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = SHADOWS.md }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(201, 168, 108, 0.06)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base }}>
            <span style={{ fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium, fontFamily: FONTS.body }}>Pipeline Total</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: RADIUS.md,
              background: KPI_ACCENTS.gold.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Euro size={20} style={{ color: COLORS.warning }} />
            </div>
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: '40px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1, letterSpacing: '-1px' }}>
            {formatCurrency(stats.pipelineTotal)}
          </div>
          <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: SPACING.sm }}>
            valor contratado
          </div>
        </div>

        {/* Clientes */}
        <div style={{
          background: KPI_ACCENTS.steel.gradient,
          borderRadius: RADIUS.xl,
          padding: SPACING.xl,
          border: `1px solid ${COLORS.border}`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = SHADOWS.md }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(122, 139, 158, 0.06)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base }}>
            <span style={{ fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium, fontFamily: FONTS.body }}>Clientes</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: RADIUS.md,
              background: KPI_ACCENTS.steel.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} style={{ color: COLORS.info }} />
            </div>
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: '40px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.totalClientes}
          </div>
          <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: SPACING.sm }}>
            na base de dados
          </div>
        </div>

        {/* Progresso Médio */}
        <div style={{
          background: KPI_ACCENTS.olive.gradient,
          borderRadius: RADIUS.xl,
          padding: SPACING.xl,
          border: `1px solid ${COLORS.border}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = SHADOWS.md }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(201, 168, 108, 0.06)'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base }}>
            <span style={{ fontSize: FONT_SIZES.base, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium, fontFamily: FONTS.body }}>Progresso Médio</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: RADIUS.md,
              background: KPI_ACCENTS.gold.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} style={{ color: COLORS.warning }} />
            </div>
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: '40px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.progressoMedio}%
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: COLORS.border,
            borderRadius: '2px',
            marginTop: SPACING.md,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${stats.progressoMedio}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.warning}, ${COLORS.accent})`,
              borderRadius: '2px',
              transition: 'width 1s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Status Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: SPACING.md,
        marginBottom: SPACING.xl
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          padding: `${SPACING.base} ${SPACING.lg}`,
          background: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `4px solid ${COLORS.success}`
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: COLORS.successBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={20} style={{ color: COLORS.success }} />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: '28px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1 }}>
              {stats.projetosAtivos - stats.projetosEmRisco}
            </div>
            <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: '2px' }}>Projetos no Prazo</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          padding: `${SPACING.base} ${SPACING.lg}`,
          background: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `4px solid ${COLORS.warning}`
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: COLORS.warningBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={20} style={{ color: COLORS.warning }} />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: '28px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1 }}>
              {stats.projetosEmProposta}
            </div>
            <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: '2px' }}>Em Proposta/Conceito</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          padding: `${SPACING.base} ${SPACING.lg}`,
          background: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `4px solid ${COLORS.error}`
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: COLORS.errorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} style={{ color: COLORS.error }} />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: '28px', fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, lineHeight: 1 }}>
              {stats.projetosEmRisco}
            </div>
            <div style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: '2px' }}>Em Risco / Bloqueados</div>
          </div>
        </div>
      </div>

      {/* KPI Widgets Row */}
      <div className="grid grid-4 mb-xl" style={{ gap: SPACING.lg }}>
        <CriticalDeadlinesWidget />
        <BudgetHealthWidget />
        <PendingApprovalsWidget />
        <UnreadMessagesWidget />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: SPACING.lg, marginBottom: SPACING.xl }}>
        {/* Recent Projects */}
        <div style={{
          background: COLORS.bgCard,
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.lg} ${SPACING.xl} ${SPACING.base}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
              <BarChart3 size={18} style={{ color: COLORS.accent }} />
              <h3 style={{ fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, fontFamily: FONTS.body, color: COLORS.textPrimary, margin: 0 }}>
                Projetos Recentes
              </h3>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/projetos')}
              style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.body, color: COLORS.accent, fontWeight: FONT_WEIGHTS.medium }}
            >
              Ver todos
              <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
            </button>
          </div>

          {recentProjects.length > 0 ? (
            <div style={isMobile ? { overflowX: 'auto' } : undefined}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 120px 130px 120px', minWidth: '590px',
                padding: `${SPACING.md} ${SPACING.xl}`,
                borderBottom: `1px solid ${COLORS.border}`,
                background: COLORS.bgCardHover
              }}>
                {['Código', 'Nome', 'Fase', 'Progresso', 'Localização'].map(h => (
                  <span key={h} style={{
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.semibold,
                    fontFamily: FONTS.body,
                    color: COLORS.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {recentProjects.map((project, idx) => (
                <div
                  key={project.codigo}
                  onClick={() => navigate(`/projetos/${project.codigo}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 120px 130px 120px', minWidth: '590px',
                    padding: `${SPACING.md} ${SPACING.xl}`,
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: idx < recentProjects.length - 1 ? '1px solid rgba(229, 226, 217, 0.5)' : 'none',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgCardHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    fontWeight: FONT_WEIGHTS.semibold,
                    color: COLORS.accent,
                    fontFamily: FONTS.mono,
                    fontSize: FONT_SIZES.base
                  }}>
                    {project.codigo}
                  </span>
                  <span style={{
                    fontFamily: FONTS.heading,
                    fontWeight: FONT_WEIGHTS.semibold,
                    color: COLORS.textPrimary,
                    fontSize: '15px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: SPACING.md
                  }}>
                    {project.nome}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    padding: `${SPACING.xs} ${SPACING.md}`,
                    borderRadius: RADIUS.full,
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.semibold,
                    fontFamily: FONTS.body,
                    background: getPhaseBg(project.fase),
                    color: getPhaseColor(project.fase),
                    width: 'fit-content'
                  }}>
                    {project.fase || 'N/D'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <div style={{
                      width: '50px',
                      height: '6px',
                      background: COLORS.border,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${project.progresso || 0}%`,
                        height: '100%',
                        background: getStatusColor(project.status),
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: FONT_SIZES.sm, fontFamily: FONTS.body, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium }}>
                      {project.progresso || 0}%
                    </span>
                  </div>
                  <span style={{ color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: FONT_SIZES.base }}>
                    {project.localizacao || '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: SPACING['4xl'], textAlign: 'center', color: COLORS.textSecondary }}>
              <FolderKanban size={48} style={{ opacity: 0.2, marginBottom: SPACING.base }} />
              <p style={{ margin: `0 0 ${SPACING.md}`, fontFamily: FONTS.body }}>Nenhum projeto encontrado</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/projetos')}>
                Criar Projeto
              </button>
            </div>
          )}
        </div>

        {/* Phase Distribution */}
        <div style={{
          background: COLORS.bgCard,
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          padding: `${SPACING.lg} ${SPACING.xl}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg }}>
            <Activity size={18} style={{ color: COLORS.accent }} />
            <h3 style={{ fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, fontFamily: FONTS.body, color: COLORS.textPrimary, margin: 0 }}>
              Por Fase
            </h3>
          </div>

          {/* Visual bar chart */}
          {projectsByPhase.length > 0 && (
            <div style={{
              display: 'flex',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: SPACING.lg,
              background: COLORS.border
            }}>
              {projectsByPhase.map(({ fase, count }) => (
                <div key={fase} style={{
                  width: `${(count / totalPhaseCount) * 100}%`,
                  background: getPhaseColor(fase),
                  transition: 'width 0.5s ease'
                }} />
              ))}
            </div>
          )}

          {projectsByPhase.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, flex: 1 }}>
              {projectsByPhase.map(({ fase, count }) => (
                <div key={fase} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${SPACING.md} ${SPACING.md}`,
                  background: COLORS.bgCardHover,
                  borderRadius: RADIUS.md,
                  transition: 'all 0.15s ease',
                  cursor: 'default'
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.border; e.currentTarget.style.transform = 'translateX(4px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.bgCardHover; e.currentTarget.style.transform = 'translateX(0)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getPhaseColor(fase),
                      flexShrink: 0
                    }} />
                    <span style={{ fontWeight: FONT_WEIGHTS.medium, fontSize: FONT_SIZES.base, fontFamily: FONTS.body, color: COLORS.textPrimary }}>{fase}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <span style={{
                      fontSize: FONT_SIZES.xs,
                      fontFamily: FONTS.body,
                      color: COLORS.textSecondary,
                      fontWeight: FONT_WEIGHTS.medium
                    }}>
                      {Math.round((count / totalPhaseCount) * 100)}%
                    </span>
                    <span style={{
                      fontWeight: FONT_WEIGHTS.bold,
                      color: COLORS.textPrimary,
                      fontSize: '15px',
                      minWidth: '24px',
                      textAlign: 'right'
                    }}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.textSecondary, fontFamily: FONTS.body }}>
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: COLORS.bgCard,
        borderRadius: RADIUS.xl,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${SPACING.lg} ${SPACING.xl} ${SPACING.base}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
            <MessageSquare size={18} style={{ color: COLORS.accent }} />
            <h3 style={{ fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, fontFamily: FONTS.body, color: COLORS.textPrimary, margin: 0 }}>
              Últimos Desenvolvimentos
            </h3>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/workspace')}
            style={{ fontSize: FONT_SIZES.base, fontFamily: FONTS.body, color: COLORS.accent, fontWeight: FONT_WEIGHTS.medium }}
          >
            Ver todos
            <ArrowRight size={14} style={{ marginLeft: SPACING.xs }} />
          </button>
        </div>

        {recentActivity.length > 0 ? (
          <div>
            {recentActivity.map((activity, idx) => (
              <div
                key={activity.id}
                onClick={() => navigate(`/workspace?canal=${activity.projeto.codigo}`)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.md,
                  padding: `${SPACING.md} ${SPACING.xl}`,
                  cursor: 'pointer',
                  borderBottom: idx < recentActivity.length - 1 ? '1px solid rgba(229, 226, 217, 0.5)' : 'none',
                  background: activity.hasMention ? 'rgba(122, 139, 110, 0.04)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(122, 139, 110, 0.08)' : COLORS.bgCardHover}
                onMouseLeave={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(122, 139, 110, 0.04)' : 'transparent'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${COLORS.border} 0%, ${COLORS.borderHover} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: FONT_SIZES.sm,
                  fontWeight: FONT_WEIGHTS.semibold,
                  fontFamily: FONTS.body,
                  color: COLORS.textPrimary,
                  flexShrink: 0
                }}>
                  {getInitials(activity.autor.nome)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: '3px' }}>
                    <span style={{ fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.base, fontFamily: FONTS.body, color: COLORS.textPrimary }}>
                      {activity.autor.nome}
                    </span>
                    {activity.hasMention && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: `2px ${SPACING.sm}`,
                        background: COLORS.accent,
                        color: COLORS.textInverse,
                        borderRadius: RADIUS.sm,
                        fontSize: '10px',
                        fontWeight: FONT_WEIGHTS.semibold,
                        fontFamily: FONTS.body
                      }}>
                        <AtSign size={9} />
                        Menção
                      </span>
                    )}
                    <span style={{ fontSize: FONT_SIZES.xs, fontFamily: FONTS.body, color: COLORS.textSecondary, marginLeft: 'auto' }}>
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: FONT_SIZES.base,
                    fontFamily: FONTS.body,
                    color: COLORS.textSecondary,
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {activity.conteudo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textSecondary }}>
            <MessageSquare size={36} style={{ opacity: 0.2, marginBottom: SPACING.md }} />
            <p style={{ margin: 0, fontSize: FONT_SIZES.md, fontFamily: FONTS.body }}>Sem atividade recente</p>
          </div>
        )}
      </div>
    </div>
  )
}
