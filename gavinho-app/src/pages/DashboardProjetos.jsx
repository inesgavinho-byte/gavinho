import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, Clock, CheckCircle2, AlertCircle,
  AlertTriangle, MessageCircle, Calendar, TrendingUp,
  Database, RefreshCw, Users, Target, Layers, ArrowRight,
  CircleDot, Activity, BarChart3, Zap, Timer
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import TeamWorkloadGantt from '../components/TeamWorkloadGantt'

// Phases for architecture/interior design projects
const PROJECT_PHASES = [
  { key: 'Conceito', label: 'Conceito', color: '#8B9DC3' },
  { key: 'Estudo Prévio', label: 'Estudo Prévio', color: '#A3B18A' },
  { key: 'Anteprojeto', label: 'Anteprojeto', color: '#DDA15E' },
  { key: 'Projeto Execução', label: 'Projeto Execução', color: '#BC6C25' },
  { key: 'Acompanhamento Obra', label: 'Acomp. Obra', color: '#606C38' },
  { key: 'Entrega', label: 'Entrega', color: '#283618' },
  { key: 'Casa Viva', label: 'Casa Viva', color: '#669BBC' }
]

// Health status indicators
const HEALTH_STATUS = {
  excellent: { label: 'Excelente', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  good: { label: 'Bom', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.1)' },
  attention: { label: 'Atenção', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  risk: { label: 'Em Risco', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  critical: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
}

export default function DashboardProjetos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    emAndamento: 0,
    concluidos: 0,
    decisoesPendentes: 0,
    onTrack: 0,
    atRisk: 0,
    delayed: 0
  })
  const [phaseDistribution, setPhaseDistribution] = useState([])
  const [projectHealth, setProjectHealth] = useState([])
  const [alertas, setAlertas] = useState([])
  const [projetosRecentes, setProjetosRecentes] = useState([])
  const [milestones, setMilestones] = useState([])
  const [teamStats, setTeamStats] = useState({ total: 0, ativos: 0, disponiveis: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch projects
      const { data: projetos, error: projetosError } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })

      if (projetosError) {
        console.error('Erro ao buscar projetos:', projetosError)
        throw projetosError
      }

      // Fetch pending tasks/decisions
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select('*, projetos(codigo, nome)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch milestones
      const { data: marcos } = await supabase
        .from('tarefas')
        .select('*, projetos(codigo, nome)')
        .eq('marco', true)
        .gte('data_fim', new Date().toISOString().split('T')[0])
        .order('data_fim', { ascending: true })
        .limit(5)

      // Fetch team members
      const { data: equipa } = await supabase
        .from('utilizadores')
        .select('id, nome, role, ativo')
        .eq('ativo', true)

      if (projetos && projetos.length > 0) {
        const activeProjetos = projetos.filter(p => !p.arquivado)

        const emAndamento = activeProjetos.filter(p =>
          p.fase !== 'Entrega' && p.fase !== 'Casa Viva'
        ).length

        const concluidos = projetos.filter(p =>
          p.fase === 'Entrega' || p.fase === 'Casa Viva'
        ).length

        // Calculate project timeline status based on progress vs expected
        let onTrack = 0, atRisk = 0, delayed = 0
        activeProjetos.forEach(p => {
          const progress = p.progresso || 0
          // Simple heuristic: compare progress with time elapsed
          if (p.created_at && p.data_entrega) {
            const start = new Date(p.created_at)
            const end = new Date(p.data_entrega)
            const now = new Date()
            const totalDays = (end - start) / (1000 * 60 * 60 * 24)
            const elapsedDays = (now - start) / (1000 * 60 * 60 * 24)
            const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100)

            if (progress >= expectedProgress - 5) onTrack++
            else if (progress >= expectedProgress - 15) atRisk++
            else delayed++
          } else {
            // If no dates, use progress as indicator
            if (progress >= 50) onTrack++
            else if (progress >= 25) atRisk++
            else onTrack++ // New projects start on track
          }
        })

        // Phase distribution
        const phaseCount = {}
        PROJECT_PHASES.forEach(phase => phaseCount[phase.key] = 0)
        activeProjetos.forEach(p => {
          const fase = p.fase || 'Conceito'
          if (phaseCount[fase] !== undefined) phaseCount[fase]++
          else phaseCount['Conceito']++
        })

        const distribution = PROJECT_PHASES.map(phase => ({
          ...phase,
          count: phaseCount[phase.key],
          percentage: activeProjetos.length > 0
            ? Math.round((phaseCount[phase.key] / activeProjetos.length) * 100)
            : 0
        })).filter(p => p.count > 0)

        setPhaseDistribution(distribution)

        // Calculate project health scores
        const healthScores = activeProjetos.slice(0, 6).map(p => {
          const progress = p.progresso || 0
          let health = 'good'

          // Calculate health based on various factors
          if (progress >= 80) health = 'excellent'
          else if (progress >= 60) health = 'good'
          else if (progress >= 40) health = 'attention'
          else if (progress >= 20) health = 'risk'
          else health = 'attention'

          return {
            id: p.id,
            codigo: p.codigo,
            nome: p.nome,
            fase: p.fase || 'Conceito',
            progresso: progress,
            health: HEALTH_STATUS[health]
          }
        })
        setProjectHealth(healthScores)

        setStats({
          total: projetos.length,
          emAndamento,
          concluidos,
          decisoesPendentes: tarefas?.length || 0,
          onTrack,
          atRisk,
          delayed
        })

        setProjetosRecentes(projetos.slice(0, 5).map(p => ({
          ...p,
          cliente_nome: p.cliente_nome || 'Cliente não definido'
        })))
      }

      // Team stats
      if (equipa) {
        setTeamStats({
          total: equipa.length,
          ativos: equipa.filter(e => e.role !== 'user').length,
          disponiveis: equipa.length // Could calculate based on workload
        })
      }

      // Generate alerts based on real data or mock
      const alertasData = []

      if (tarefas && tarefas.length > 0) {
        tarefas.slice(0, 4).forEach(t => {
          const diasPassados = Math.floor((new Date() - new Date(t.created_at)) / (1000 * 60 * 60 * 24))
          alertasData.push({
            id: t.id,
            tipo: t.tipo === 'aprovacao' ? 'warning' : 'info',
            titulo: t.titulo,
            projeto: t.projetos?.codigo || '',
            descricao: t.descricao?.substring(0, 50) || '',
            tempo: `há ${diasPassados}d`
          })
        })
      }

      // Mock alerts if none
      if (alertasData.length === 0) {
        alertasData.push(
          { id: 1, tipo: 'warning', titulo: 'Aprovação de materiais pendente', projeto: 'GA00489', descricao: 'Escolha de pedra para bancadas', tempo: 'há 5d' },
          { id: 2, tipo: 'warning', titulo: 'Projeto sem atividade há 10 dias', projeto: 'GA00473', descricao: 'Última atualização: 07/01', tempo: 'há 10d' },
          { id: 3, tipo: 'info', titulo: 'Decisão de layout aguarda resposta', projeto: 'GA00492', descricao: 'Configuração da suíte principal', tempo: 'há 3d' },
          { id: 4, tipo: 'info', titulo: 'Feedback do cliente pendente', projeto: 'GA00466', descricao: 'Proposta de iluminação enviada', tempo: 'há 2d' }
        )
      }
      setAlertas(alertasData)

      // Milestones
      if (marcos && marcos.length > 0) {
        setMilestones(marcos.map(m => ({
          id: m.id,
          data: new Date(m.data_fim),
          titulo: m.titulo,
          projeto: m.projetos?.codigo || '',
          nome: m.projetos?.nome || ''
        })))
      } else {
        // Mock milestones
        const hoje = new Date()
        setMilestones([
          { id: 1, data: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000), titulo: 'Entrega Projeto Execução', projeto: 'GA00489', nome: 'AS House' },
          { id: 2, data: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), titulo: 'Reunião Aprovação', projeto: 'GA00492', nome: 'Villa Mar' },
          { id: 3, data: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000), titulo: 'Apresentação Conceito', projeto: 'GA00495', nome: 'Loft Cascais' }
        ])
      }

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return {
      dia: date.getDate(),
      mes: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', ''),
      diaSemana: date.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '')
    }
  }

  const getDiasRestantes = (date) => {
    const hoje = new Date()
    const diff = Math.ceil((date - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Projetos</h1>
          <p className="page-subtitle">Visão geral e performance da equipa</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Empty state warning */}
      {stats.total === 0 && (
        <div className="card" style={{
          padding: '32px',
          textAlign: 'center',
          marginBottom: '24px',
          background: 'var(--alert-warning-bg)',
          border: '1px solid var(--warning)'
        }}>
          <Database size={48} style={{ color: 'var(--warning)', marginBottom: '16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>
            Nenhum projeto encontrado
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '16px' }}>
            A base de dados não tem projetos. Execute o seed para criar dados de exemplo.
          </p>
          <button
            onClick={() => navigate('/admin/seed')}
            className="btn btn-primary"
          >
            Ir para Seed de Dados
          </button>
        </div>
      )}

      {/* Main KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Projects */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Total de Projetos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.total}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderKanban size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Em Andamento</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.emAndamento}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(163, 177, 138, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={22} style={{ color: 'var(--accent-olive)' }} />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Concluídos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.concluidos}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={22} style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Decisões Pendentes</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: stats.decisoesPendentes > 5 ? '#ef4444' : 'var(--brown)', lineHeight: 1 }}>
                {stats.decisoesPendentes}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: stats.decisoesPendentes > 5 ? 'rgba(239, 68, 68, 0.1)' : 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={22} style={{ color: stats.decisoesPendentes > 5 ? '#ef4444' : 'var(--brown-light)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Status & Phase Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        {/* Timeline Performance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Timer size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Performance Prazos</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* On Track */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '2px' }}>No Prazo</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{stats.onTrack}</div>
              </div>
              <div style={{
                width: '60px',
                height: '6px',
                background: 'var(--stone)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stats.emAndamento > 0 ? (stats.onTrack / stats.emAndamento) * 100 : 0}%`,
                  height: '100%',
                  background: '#22c55e',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* At Risk */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={20} style={{ color: '#eab308' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '2px' }}>Atenção</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>{stats.atRisk}</div>
              </div>
              <div style={{
                width: '60px',
                height: '6px',
                background: 'var(--stone)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stats.emAndamento > 0 ? (stats.atRisk / stats.emAndamento) * 100 : 0}%`,
                  height: '100%',
                  background: '#eab308',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Delayed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={20} style={{ color: '#ef4444' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '2px' }}>Atrasado</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{stats.delayed}</div>
              </div>
              <div style={{
                width: '60px',
                height: '6px',
                background: 'var(--stone)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stats.emAndamento > 0 ? (stats.delayed / stats.emAndamento) * 100 : 0}%`,
                  height: '100%',
                  background: '#ef4444',
                  borderRadius: '3px'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Phase Distribution */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Layers size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Projetos por Fase</h3>
          </div>

          {/* Phase bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {phaseDistribution.length > 0 ? (
              phaseDistribution.map(phase => (
                <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '120px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--brown)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {phase.label}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: '100%',
                      height: '24px',
                      background: 'var(--cream)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${phase.percentage}%`,
                        minWidth: phase.count > 0 ? '20px' : '0',
                        height: '100%',
                        background: phase.color,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease'
                      }}>
                        {phase.count > 0 && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'white',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}>
                            {phase.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: '40px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--brown-light)',
                    textAlign: 'right'
                  }}>
                    {phase.percentage}%
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: 'var(--brown-light)',
                fontSize: '13px'
              }}>
                Sem projetos ativos para mostrar distribuição
              </div>
            )}
          </div>

          {/* Phase legend */}
          {phaseDistribution.length > 0 && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--stone)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {PROJECT_PHASES.map(phase => (
                <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: phase.color
                  }} />
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{phase.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Health Overview */}
      {projectHealth.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={18} style={{ color: 'var(--accent-olive)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Estado dos Projetos</h3>
            </div>
            <button
              onClick={() => navigate('/projetos')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
            >
              Ver todos
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {projectHealth.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projetos/${project.codigo}`)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: project.health.bg,
                  border: `1px solid ${project.health.color}20`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                      {project.codigo}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>
                      {project.nome?.substring(0, 20)}{project.nome?.length > 20 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: project.health.color,
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'white'
                  }}>
                    {project.health.label}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${project.progresso}%`,
                      height: '100%',
                      background: project.health.color,
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{project.fase}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: project.health.color }}>{project.progresso}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts & Pending Decisions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Ações Necessárias</h3>
          </div>
          <button
            onClick={() => navigate('/planning?tab=bloqueios')}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
          >
            Ver todos
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {alertas.map(alerta => (
            <div
              key={alerta.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => navigate('/planning?tab=bloqueios')}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: alerta.tipo === 'warning' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {alerta.tipo === 'warning' ? (
                  <AlertTriangle size={18} style={{ color: '#eab308' }} />
                ) : (
                  <MessageCircle size={18} style={{ color: '#3b82f6' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {alerta.titulo}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--brown-light)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {alerta.projeto} · {alerta.descricao}
                </div>
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--brown-light)',
                whiteSpace: 'nowrap'
              }}>
                {alerta.tempo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects and Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Projects */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Projetos Recentes</h3>
            <button
              onClick={() => navigate('/projetos')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
            >
              Ver todos
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projetosRecentes.map(projeto => (
              <div
                key={projeto.id}
                onClick={() => navigate(`/projetos/${projeto.codigo}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--cream)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--stone)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FolderKanban size={18} style={{ color: 'var(--brown-light)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--brown)',
                    marginBottom: '2px'
                  }}>
                    {projeto.codigo}_{(projeto.nome || '').toUpperCase().substring(0, 15)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {projeto.fase || 'Conceito'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '60px',
                    height: '6px',
                    background: 'var(--stone)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${projeto.progresso || 0}%`,
                      height: '100%',
                      background: 'var(--accent-olive)',
                      borderRadius: '3px'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown)', minWidth: '32px' }}>
                    {projeto.progresso || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Próximos Milestones</h3>
            <button
              onClick={() => navigate('/planning')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
            >
              Ver todos
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {milestones.map(milestone => {
              const { dia, mes, diaSemana } = formatDate(milestone.data)
              const diasRestantes = getDiasRestantes(milestone.data)
              const isUrgent = diasRestantes <= 3
              const isThisWeek = diasRestantes <= 7

              return (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px',
                    background: isUrgent ? 'rgba(239, 68, 68, 0.05)' : 'var(--cream)',
                    borderRadius: '10px',
                    border: isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                  }}
                >
                  <div style={{
                    textAlign: 'center',
                    minWidth: '48px',
                    padding: '8px',
                    background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'white',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: isUrgent ? '#ef4444' : 'var(--brown)', lineHeight: 1 }}>{dia}</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: isUrgent ? '#ef4444' : 'var(--brown-light)', textTransform: 'uppercase' }}>{mes}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      marginBottom: '2px'
                    }}>
                      {milestone.titulo}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      {milestone.projeto} · {milestone.nome}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: isUrgent ? '#ef4444' : isThisWeek ? '#eab308' : 'var(--accent-olive)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}>
                    {diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : `${diasRestantes} dias`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Gantt */}
      <div style={{ marginTop: '24px' }}>
        <TeamWorkloadGantt />
      </div>
    </div>
  )
}
