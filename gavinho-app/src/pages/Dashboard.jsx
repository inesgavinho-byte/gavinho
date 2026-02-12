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

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'var(--success)'
      case 'at_risk': return 'var(--warning)'
      case 'delayed': return 'var(--error)'
      case 'on_hold': return 'var(--info)'
      case 'completed': return 'var(--success)'
      default: return 'var(--info)'
    }
  }

  const getFaseColor = (fase) => {
    const colors = {
      'Proposta': '#8A9EB8',
      'Conceito': '#C9A882',
      'Projeto': '#C3BAAF',
      'Projeto Execução': '#B0A599',
      'Licenciamento': '#B0A599',
      'Construção': '#7A9E7A',
      'Fit-out': '#5F5C59',
      'Entrega': '#4A4845'
    }
    return colors[fase] || '#C3BAAF'
  }

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
            border: '3px solid var(--stone)',
            borderTopColor: 'var(--accent-olive)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>A carregar dashboard...</p>
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
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: '36px'
      }}>
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--accent-olive)',
            fontWeight: '600',
            marginBottom: '4px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            {getGreeting()}{getFirstName() ? `, ${getFirstName()}` : ''}
          </p>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            color: 'var(--brown)',
            margin: 0
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--brown-light)',
            marginTop: '4px'
          }}>
            Visão geral da GAVINHO Group
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/projetos')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Ver Projetos
          <ArrowUpRight size={16} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stagger-children" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '10px' : '16px',
        marginBottom: '24px'
      }}>
        {/* Projetos Ativos */}
        <div style={{
          background: 'linear-gradient(135deg, #F8F6F0 0%, #F0EDE4 100%)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--stone)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', fontWeight: '500' }}>Projetos Ativos</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(122, 139, 110, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderKanban size={20} style={{ color: 'var(--accent-olive)' }} />
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.projetosAtivos}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '6px' }}>
            {stats.totalProjetos} total
          </div>
        </div>

        {/* Pipeline Total */}
        <div style={{
          background: 'linear-gradient(135deg, #F8F5EE 0%, #F2EDDF 100%)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--stone)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', fontWeight: '500' }}>Pipeline Total</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(201, 168, 108, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Euro size={20} style={{ color: 'var(--warning)' }} />
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1, letterSpacing: '-1px' }}>
            {formatCurrency(stats.pipelineTotal)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '6px' }}>
            valor contratado
          </div>
        </div>

        {/* Clientes */}
        <div style={{
          background: 'linear-gradient(135deg, #F5F7F9 0%, #EDF0F4 100%)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--stone)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', fontWeight: '500' }}>Clientes</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(122, 139, 158, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} style={{ color: 'var(--info)' }} />
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.totalClientes}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '6px' }}>
            na base de dados
          </div>
        </div>

        {/* Progresso Médio */}
        <div style={{
          background: 'linear-gradient(135deg, #F8F6F0 0%, #F0EDE4 100%)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid var(--stone)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', fontWeight: '500' }}>Progresso Médio</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(201, 168, 108, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} style={{ color: 'var(--warning)' }} />
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1, letterSpacing: '-1px' }}>
            {stats.progressoMedio}%
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'var(--stone)',
            borderRadius: '2px',
            marginTop: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${stats.progressoMedio}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--warning), var(--accent-olive))',
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
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'var(--white)',
          borderRadius: '16px',
          border: '1px solid var(--stone)',
          borderLeft: '4px solid var(--success)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(122, 139, 110, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1 }}>
              {stats.projetosAtivos - stats.projetosEmRisco}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>Projetos no Prazo</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'var(--white)',
          borderRadius: '16px',
          border: '1px solid var(--stone)',
          borderLeft: '4px solid var(--warning)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(201, 168, 108, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1 }}>
              {stats.projetosEmProposta}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>Em Proposta/Conceito</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'var(--white)',
          borderRadius: '16px',
          border: '1px solid var(--stone)',
          borderLeft: '4px solid var(--error)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(154, 107, 91, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--brown)', lineHeight: 1 }}>
              {stats.projetosEmRisco}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>Em Risco / Bloqueados</div>
          </div>
        </div>
      </div>

      {/* KPI Widgets Row */}
      <div className="grid grid-4 mb-xl" style={{ gap: '20px' }}>
        <CriticalDeadlinesWidget />
        <BudgetHealthWidget />
        <PendingApprovalsWidget />
        <UnreadMessagesWidget />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* Recent Projects */}
        <div style={{
          background: 'var(--white)',
          borderRadius: '20px',
          border: '1px solid var(--stone)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-olive)' }} />
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--brown)', margin: 0 }}>
                Projetos Recentes
              </h3>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/projetos')}
              style={{ fontSize: '13px', color: 'var(--accent-olive)', fontWeight: '500' }}
            >
              Ver todos
              <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </button>
          </div>

          {recentProjects.length > 0 ? (
            <div style={isMobile ? { overflowX: 'auto' } : undefined}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 120px 130px 120px', minWidth: '590px',
                padding: '10px 24px',
                borderBottom: '1px solid var(--stone)',
                background: 'var(--cream)'
              }}>
                {['Código', 'Nome', 'Fase', 'Progresso', 'Localização'].map(h => (
                  <span key={h} style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--brown-light)',
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
                    padding: '14px 24px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: idx < recentProjects.length - 1 ? '1px solid rgba(229, 226, 217, 0.5)' : 'none',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    fontWeight: '600',
                    color: 'var(--accent-olive)',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: '13px'
                  }}>
                    {project.codigo}
                  </span>
                  <span style={{
                    fontWeight: '500',
                    color: 'var(--brown)',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '12px'
                  }}>
                    {project.nome}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: `${getFaseColor(project.fase)}18`,
                    color: getFaseColor(project.fase),
                    width: 'fit-content'
                  }}>
                    {project.fase || 'N/D'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '50px',
                      height: '6px',
                      background: 'var(--stone)',
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
                    <span style={{ fontSize: '12px', color: 'var(--brown-light)', fontWeight: '500' }}>
                      {project.progresso || 0}%
                    </span>
                  </div>
                  <span style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                    {project.localizacao || '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
              <FolderKanban size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ margin: '0 0 12px' }}>Nenhum projeto encontrado</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/projetos')}>
                Criar Projeto
              </button>
            </div>
          )}
        </div>

        {/* Phase Distribution */}
        <div style={{
          background: 'var(--white)',
          borderRadius: '20px',
          border: '1px solid var(--stone)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--brown)', margin: 0 }}>
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
              marginBottom: '20px',
              background: 'var(--stone)'
            }}>
              {projectsByPhase.map(({ fase, count }) => (
                <div key={fase} style={{
                  width: `${(count / totalPhaseCount) * 100}%`,
                  background: getFaseColor(fase),
                  transition: 'width 0.5s ease'
                }} />
              ))}
            </div>
          )}

          {projectsByPhase.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {projectsByPhase.map(({ fase, count }) => (
                <div key={fase} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  transition: 'all 0.15s ease'
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--stone)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.transform = 'translateX(0)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getFaseColor(fase),
                      flexShrink: 0
                    }} />
                    <span style={{ fontWeight: '500', fontSize: '13px', color: 'var(--brown)' }}>{fase}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--brown-light)',
                      fontWeight: '500'
                    }}>
                      {Math.round((count / totalPhaseCount) * 100)}%
                    </span>
                    <span style={{
                      fontWeight: '700',
                      color: 'var(--brown)',
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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--brown-light)' }}>
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'var(--white)',
        borderRadius: '20px',
        border: '1px solid var(--stone)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--brown)', margin: 0 }}>
              Últimos Desenvolvimentos
            </h3>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/workspace')}
            style={{ fontSize: '13px', color: 'var(--accent-olive)', fontWeight: '500' }}
          >
            Ver todos
            <ArrowRight size={14} style={{ marginLeft: '4px' }} />
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
                  gap: '14px',
                  padding: '14px 24px',
                  cursor: 'pointer',
                  borderBottom: idx < recentActivity.length - 1 ? '1px solid rgba(229, 226, 217, 0.5)' : 'none',
                  background: activity.hasMention ? 'rgba(122, 139, 110, 0.04)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(122, 139, 110, 0.08)' : 'var(--cream)'}
                onMouseLeave={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(122, 139, 110, 0.04)' : 'transparent'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--stone) 0%, var(--stone-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brown)',
                  flexShrink: 0
                }}>
                  {getInitials(activity.autor.nome)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                      {activity.autor.nome}
                    </span>
                    {activity.hasMention && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        background: 'var(--accent-olive)',
                        color: 'white',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 600
                      }}>
                        <AtSign size={9} />
                        Menção
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: 'auto' }}>
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--brown-light)',
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
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <MessageSquare size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Sem atividade recente</p>
          </div>
        )}
      </div>
    </div>
  )
}
