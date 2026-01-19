import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FolderKanban, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Euro
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()
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
          const emRisco = projetos.filter(p => p.status === 'at_risk' || p.status === 'blocked')
          
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

      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
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
      case 'blocked': return 'var(--error)'
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
    </div>
  )
}
