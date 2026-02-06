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
  Image as ImageIcon
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  CriticalDeadlinesWidget,
  BudgetHealthWidget,
  PendingApprovalsWidget,
  UnreadMessagesWidget
} from '../components/DashboardWidgets'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
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

  // Recent activity from chat channels
  const [recentActivity, setRecentActivity] = useState([])

  // Buscar dados do Supabase
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Buscar projetos
        const { data: projetos, error: projetosError } = await supabase
          .from('projetos')
          .select('*')
          .order('updated_at', { ascending: false })

        if (projetosError) throw projetosError

        // Buscar clientes
        const { data: clientes, error: clientesError } = await supabase
          .from('clientes')
          .select('id')

        if (clientesError) throw clientesError

        // Calcular estatísticas
        if (projetos && projetos.length > 0) {
          const ativos = projetos.filter(p => p.fase !== 'Entrega' && p.fase !== 'Casa Viva')
          const emProposta = projetos.filter(p => p.fase === 'Proposta' || p.fase === 'Conceito')
          const emRisco = projetos.filter(p => p.status === 'at_risk' || p.status === 'delayed')
          
          const pipelineTotal = projetos.reduce((sum, p) => sum + (parseFloat(p.orcamento_atual) || 0), 0)
          const progressoMedio = projetos.length > 0 
            ? projetos.reduce((sum, p) => sum + (p.progresso || 0), 0) / projetos.length 
            : 0

          // Contar projetos por fase
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

          setRecentProjects(projetos.slice(0, 6))
          setProjectsByPhase(phaseData)
        }

        // Buscar atividade recente dos chats
        const { data: mensagens } = await supabase
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
          .limit(10)

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
        // Silent fail - dashboard will show empty states
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}k`
    }
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
      'Licenciamento': '#B0A599',
      'Construção': '#7A9E7A',
      'Fit-out': '#5F5C59',
      'Entrega': '#4A4845'
    }
    return colors[fase] || '#C3BAAF'
  }

  // Format relative time for activity
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

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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
            borderTopColor: 'var(--gold)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>A carregar dashboard...</p>
        </div>
      </div>
    )
  }

  // KPIs dinâmicos
  const kpis = [
    {
      label: 'Projetos Ativos',
      value: stats.projetosAtivos.toString(),
      subtext: `${stats.totalProjetos} total`,
      icon: FolderKanban,
      color: 'var(--gold)'
    },
    {
      label: 'Pipeline Total',
      value: formatCurrency(stats.pipelineTotal),
      subtext: 'valor contratado',
      icon: Euro,
      color: 'var(--success)'
    },
    {
      label: 'Clientes',
      value: stats.totalClientes.toString(),
      subtext: 'na base de dados',
      icon: Users,
      color: 'var(--info)'
    },
    {
      label: 'Progresso Médio',
      value: `${stats.progressoMedio}%`,
      subtext: 'dos projetos',
      icon: TrendingUp,
      color: 'var(--warning)'
    }
  ]

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral da GAVINHO Group</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projetos')}>
          Ver Projetos
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-4 mb-xl">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-md">
              <span className="kpi-label">{kpi.label}</span>
              <kpi.icon size={20} style={{ color: kpi.color }} />
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-trend neutral">
              <span>{kpi.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Cards - Pipeline por Status */}
      <div className="grid grid-3 mb-xl">
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, rgba(122, 158, 122, 0.1) 0%, rgba(122, 158, 122, 0.05) 100%)',
          borderLeft: '4px solid var(--success)'
        }}>
          <div className="flex items-center gap-md">
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {stats.projetosAtivos - stats.projetosEmRisco}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Projetos no Prazo</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, rgba(201, 168, 130, 0.1) 0%, rgba(201, 168, 130, 0.05) 100%)',
          borderLeft: '4px solid var(--warning)'
        }}>
          <div className="flex items-center gap-md">
            <Clock size={24} style={{ color: 'var(--warning)' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {stats.projetosEmProposta}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Em Proposta/Conceito</div>
            </div>
          </div>
        </div>

        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(184, 138, 138, 0.1) 0%, rgba(184, 138, 138, 0.05) 100%)',
          borderLeft: '4px solid var(--error)'
        }}>
          <div className="flex items-center gap-md">
            <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {stats.projetosEmRisco}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Em Risco / Bloqueados</div>
            </div>
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

      {/* Main Content */}
      <div className="grid grid-3">
        {/* Recent Projects */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">Projetos Recentes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projetos')}>Ver todos</button>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Fase</th>
                    <th>Progresso</th>
                    <th>Localização</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <tr 
                      key={project.codigo} 
                      onClick={() => navigate(`/projetos/${project.codigo}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ 
                          fontWeight: '600', 
                          color: 'var(--gold)',
                          fontFamily: 'monospace'
                        }}>
                          {project.codigo}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{project.nome}</td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: `${getFaseColor(project.fase)}20`,
                          color: getFaseColor(project.fase)
                        }}>
                          {project.fase || 'N/D'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '60px', 
                            height: '6px', 
                            background: 'var(--stone)', 
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${project.progresso || 0}%`, 
                              height: '100%', 
                              background: getStatusColor(project.status),
                              borderRadius: '3px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {project.progresso || 0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {project.localizacao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <FolderKanban size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Nenhum projeto encontrado</p>
              <button className="btn btn-primary mt-md" onClick={() => navigate('/projetos')}>
                Criar Projeto
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Distribuição por Fase */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Por Fase</h3>
          </div>
          
          {projectsByPhase.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projectsByPhase.map(({ fase, count }) => (
                <div key={fase} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--cream)',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getFaseColor(fase)
                    }}></div>
                    <span style={{ fontWeight: '500' }}>{fase}</span>
                  </div>
                  <span style={{ 
                    fontWeight: '700',
                    color: 'var(--gold)',
                    fontSize: '16px'
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity from Chat */}
      <div className="card mt-xl">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} style={{ color: 'var(--accent-olive)' }} />
            <h3 className="card-title">Últimos Desenvolvimentos</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workspace')}>
            Ver todos <ArrowRight size={14} style={{ marginLeft: '4px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {recentActivity.map((activity, idx) => (
            <div
              key={activity.id}
              onClick={() => navigate(`/workspace?canal=${activity.projeto.codigo}`)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--stone)' : 'none',
                background: activity.hasMention ? 'rgba(139, 155, 123, 0.08)' : 'transparent',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(139, 155, 123, 0.15)' : 'var(--cream)'}
              onMouseLeave={(e) => e.currentTarget.style.background = activity.hasMention ? 'rgba(139, 155, 123, 0.08)' : 'transparent'}
            >
              {/* Avatar */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brown-dark)',
                flexShrink: 0
              }}>
                {getInitials(activity.autor.nome)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                    {activity.autor.nome}
                  </span>
                  {activity.hasMention && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      background: 'var(--accent-olive)',
                      color: 'white',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      <AtSign size={10} />
                      Menção
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 6px 0',
                  fontSize: '13px',
                  color: 'var(--brown)',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {activity.conteudo}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Hash size={12} style={{ color: 'var(--brown-light)' }} />
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--gold)',
                    fontWeight: 600,
                    fontFamily: 'monospace'
                  }}>
                    {activity.projeto.codigo}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    {activity.projeto.nome}
                  </span>
                  {activity.hasAttachment && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--brown-light)'
                    }}>
                      <Paperclip size={11} />
                      Anexo
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight size={16} style={{ color: 'var(--brown-light)', flexShrink: 0, marginTop: '12px' }} />
            </div>
          ))}
        </div>

        {recentActivity.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>Sem atividade recente</p>
          </div>
        )}
      </div>
    </div>
  )
}
