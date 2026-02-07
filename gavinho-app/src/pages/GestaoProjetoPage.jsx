import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUp,
  Minus,
  AlertOctagon,
  Calendar,
  ListChecks,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Send,
  X,
  FileText,
  DollarSign,
  Receipt,
  Target,
  Flag,
  CircleDot
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// RAG Status Colors
const RAG_COLORS = {
  'on-track': { bg: 'rgba(74, 124, 89, 0.15)', dot: '#4A7C59', text: '#4A7C59', label: 'No Prazo' },
  'at-risk': { bg: 'rgba(217, 119, 6, 0.15)', dot: '#D97706', text: '#D97706', label: 'Em Risco' },
  'off-track': { bg: 'rgba(220, 38, 38, 0.15)', dot: '#DC2626', text: '#DC2626', label: 'Atrasado' }
}

// Phase Colors - matching mockup
const PHASE_COLORS = {
  'design': { bg: '#E8E4DF', text: '#8B7355' },
  'Design': { bg: '#E8E4DF', text: '#8B7355' },
  'DESIGN': { bg: '#E8E4DF', text: '#8B7355' },
  'Conceito': { bg: '#E8E4DF', text: '#8B7355' },
  'Projeto': { bg: '#E8E4DF', text: '#8B7355' },
  'execution': { bg: '#FDEBD0', text: '#C9A227' },
  'Execução': { bg: '#FDEBD0', text: '#C9A227' },
  'EXECUÇÃO': { bg: '#FDEBD0', text: '#C9A227' },
  'Licenciamento': { bg: '#FDEBD0', text: '#C9A227' },
  'construction': { bg: '#D4EDDA', text: '#5D8A66' },
  'Construção': { bg: '#D4EDDA', text: '#5D8A66' },
  'CONSTRUÇÃO': { bg: '#D4EDDA', text: '#5D8A66' },
  'Fit-out': { bg: '#D4EDDA', text: '#5D8A66' }
}

// Insight Type Config
const INSIGHT_TYPES = {
  'urgent': { label: 'AÇÃO URGENTE', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)', border: '#DC2626' },
  'warning': { label: 'DEADLINE PRÓXIMO', color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)', border: '#D97706' },
  'suggestion': { label: 'SUGESTÃO', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', border: '#3B82F6' }
}

export default function GestaoProjetoPage() {
  const navigate = useNavigate()
  const { profile, getUserName } = useAuth()
  const [loading, setLoading] = useState(true)

  // Data states
  const [portfolioHealth, setPortfolioHealth] = useState([])
  const [ragSummary, setRagSummary] = useState({ on_track: 0, at_risk: 0, off_track: 0, total: 0 })
  const [insights, setInsights] = useState([])
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [milestones, setMilestones] = useState([])
  const [financialSummary, setFinancialSummary] = useState({
    volumeAtivo: 2400000,
    porFaturar: 890000,
    margemMedia: 23,
    projetosAtivos: 7
  })

  // UI states
  const [taskFilter, setTaskFilter] = useState('today')
  const [commandInput, setCommandInput] = useState('')

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 19) return 'Boa tarde'
    return 'Boa noite'
  }

  // Format date
  const formatDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const now = new Date()
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`
  }

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch projects
      const { data: projetosData } = await supabase
        .from('projetos')
        .select('*, clientes(nome)')
        .not('fase', 'in', '(Entrega,Casa Viva,Arquivado)')
        .order('updated_at', { ascending: false })

      if (projetosData) {
        const mapped = projetosData.map(p => ({
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          cliente_nome: p.clientes?.nome || 'N/A',
          status_geral: p.status === 'delayed' ? 'off-track' : p.status === 'at_risk' ? 'at-risk' : 'on-track',
          progresso_percentagem: p.progresso || Math.floor(Math.random() * 80 + 10),
          desvio_prazo_dias: Math.floor(Math.random() * 20 - 10),
          desvio_custo_percentagem: Math.floor(Math.random() * 16 - 5),
          fase_atual: p.fase
        }))
        setPortfolioHealth(mapped)

        // Calculate RAG summary
        const summary = {
          on_track: mapped.filter(p => p.status_geral === 'on-track').length,
          at_risk: mapped.filter(p => p.status_geral === 'at-risk').length,
          off_track: mapped.filter(p => p.status_geral === 'off-track').length,
          total: mapped.length
        }
        setRagSummary(summary)

        // Update financial summary
        setFinancialSummary({
          volumeAtivo: 2400000,
          porFaturar: 890000,
          margemMedia: 23,
          projetosAtivos: mapped.length
        })
      }

      // Generate insights from real project data
      try {
        const generatedInsights = []
        if (projetosData) {
          const offTrack = projetosData.filter(p => p.status === 'delayed')
          const atRisk = projetosData.filter(p => p.status === 'at_risk')

          offTrack.forEach(p => {
            generatedInsights.push({
              id: `insight-urgent-${p.id}`,
              tipo: 'urgent',
              titulo: p.nome,
              mensagem: `está marcado como atrasado. Verifica as tarefas pendentes e o plano de recuperação.`,
              acao_label: 'Ver projeto',
              acao_rota: `/projetos/${p.codigo}`
            })
          })

          atRisk.forEach(p => {
            generatedInsights.push({
              id: `insight-warning-${p.id}`,
              tipo: 'warning',
              titulo: p.nome,
              mensagem: `está em risco. Revê o cronograma e os entregáveis próximos.`,
              acao_label: 'Ver detalhes',
              acao_rota: `/projetos/${p.codigo}`
            })
          })

          // Add a suggestion insight if there are active projects without recent updates
          const staleProjects = projetosData.filter(p => {
            const lastUpdate = new Date(p.updated_at)
            const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
            return daysSinceUpdate > 7
          })
          staleProjects.slice(0, 1).forEach(p => {
            generatedInsights.push({
              id: `insight-suggestion-${p.id}`,
              tipo: 'suggestion',
              titulo: p.nome,
              mensagem: `não tem atualizações há mais de 7 dias. Considera rever o estado do projeto.`,
              acao_label: 'Atualizar projeto',
              acao_rota: `/projetos/${p.codigo}`
            })
          })
        }
        setInsights(generatedInsights.slice(0, 3))
      } catch (insightErr) {
        console.error('Error generating insights:', insightErr)
        setInsights([])
      }

      // Generate alerts from real project data
      try {
        const generatedAlerts = []
        if (projetosData) {
          // Alert for off-track projects (budget risk)
          projetosData.filter(p => p.status === 'delayed').forEach(p => {
            generatedAlerts.push({
              id: `alert-delay-${p.id}`,
              icon: 'clock',
              titulo: 'Projeto atrasado',
              descricao: `${p.nome} está marcado como atrasado`,
              acao: 'Ver detalhes'
            })
          })

          // Alert for overdue tasks
          const { data: overdueTasks } = await supabase
            .from('tarefas')
            .select('id, titulo, projetos(nome)')
            .lt('data_limite', new Date().toISOString())
            .in('status', ['pendente', 'em_progresso'])
            .limit(3)

          if (overdueTasks) {
            overdueTasks.forEach(t => {
              generatedAlerts.push({
                id: `alert-task-${t.id}`,
                icon: 'file',
                titulo: 'Tarefa em atraso',
                descricao: `${t.titulo}${t.projetos?.nome ? ` — ${t.projetos.nome}` : ''}`,
                acao: 'Ver tarefa'
              })
            })
          }

          // Alert for projects at risk
          projetosData.filter(p => p.status === 'at_risk').slice(0, 2).forEach(p => {
            generatedAlerts.push({
              id: `alert-risk-${p.id}`,
              icon: 'calendar',
              titulo: 'Projeto em risco',
              descricao: `${p.nome} necessita de atenção`,
              acao: 'Ver projeto'
            })
          })
        }
        setAlerts(generatedAlerts.slice(0, 4))
      } catch (alertErr) {
        console.error('Error generating alerts:', alertErr)
        setAlerts([])
      }

      // Fetch milestones from entregaveis or projeto_fases_contratuais
      try {
        const { data: fasesData } = await supabase
          .from('projeto_fases_contratuais')
          .select('id, nome, data_prevista, data_real, estado, projetos(nome)')
          .gte('data_prevista', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('data_prevista', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
          .order('data_prevista', { ascending: true })
          .limit(6)

        if (fasesData && fasesData.length > 0) {
          const now = new Date()
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)

          const mappedMilestones = fasesData.map(f => {
            const dataPrev = new Date(f.data_prevista)
            const diffDays = Math.ceil((dataPrev - now) / (1000 * 60 * 60 * 24))
            let status = 'upcoming'
            let statusLabel = `Em ${diffDays} dias`

            if (diffDays < 0) {
              status = 'overdue'
              statusLabel = `${Math.abs(diffDays)} dias em atraso`
            } else if (diffDays === 0) {
              status = 'tomorrow'
              statusLabel = 'Hoje'
            } else if (diffDays === 1) {
              status = 'tomorrow'
              statusLabel = 'Amanhã'
            }

            return {
              id: f.id,
              dia: String(dataPrev.getDate()).padStart(2, '0'),
              titulo: f.nome,
              projeto: f.projetos?.nome || 'N/A',
              status,
              statusLabel
            }
          })
          setMilestones(mappedMilestones.slice(0, 4))
        } else {
          setMilestones([])
        }
      } catch (milestoneErr) {
        console.error('Error fetching milestones:', milestoneErr)
        setMilestones([])
      }

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tarefas')
        .select('*, projetos(codigo, nome)')
        .in('status', ['pendente', 'em_progresso'])
        .order('data_limite', { ascending: true })
        .limit(10)

      if (tasksData && tasksData.length > 0) {
        const mappedTasks = tasksData.map(t => {
          const now = new Date()
          const deadline = t.data_limite ? new Date(t.data_limite) : null
          let dataInfo = ''
          let statusProjeto = 'on-track'

          if (deadline) {
            const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
            if (diffDays < 0) {
              dataInfo = `${Math.abs(diffDays)} dias em atraso`
            } else if (diffDays === 0) {
              dataInfo = 'Hoje'
            } else if (diffDays === 1) {
              dataInfo = 'Amanhã'
            } else {
              dataInfo = `Em ${diffDays} dias`
            }
          }

          if (t.projetos) {
            statusProjeto = t.projetos.status === 'delayed' ? 'off-track'
              : t.projetos.status === 'at_risk' ? 'at-risk'
              : 'on-track'
          }

          return {
            id: t.id,
            titulo: t.titulo,
            projeto_codigo: t.projetos?.codigo || '',
            projeto_nome: t.projetos?.nome || '',
            status_projeto: statusProjeto,
            data_info: dataInfo,
            prioridade: t.prioridade || 'media',
            garvis_sugerida: t.origem_tipo === 'sistema'
          }
        })
        setTasks(mappedTasks)
      } else {
        setTasks([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Keyboard shortcut for command bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('garvis-command-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle command submission
  const handleCommand = async () => {
    if (!commandInput.trim()) return

    if (commandInput.startsWith('/status')) {
      const projectCode = commandInput.split(' ')[1]
      if (projectCode) {
        navigate(`/projetos/${projectCode}`)
      }
    }

    setCommandInput('')
  }

  // Dismiss insight
  const dismissInsight = (insightId) => {
    setInsights(prev => prev.filter(i => i.id !== insightId))
  }

  // Sort projects by status
  const sortedProjects = [...portfolioHealth].sort((a, b) => {
    const statusOrder = { 'off-track': 0, 'at-risk': 1, 'on-track': 2 }
    return (statusOrder[a.status_geral] || 2) - (statusOrder[b.status_geral] || 2)
  })

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `€${Math.round(value / 1000)}K`
    }
    return `€${value}`
  }

  // Get alert icon
  const getAlertIcon = (type) => {
    switch (type) {
      case 'clock': return <Clock size={18} style={{ color: '#D97706' }} />
      case 'file': return <FileText size={18} style={{ color: '#8B7355' }} />
      case 'calendar': return <Calendar size={18} style={{ color: '#3B82F6' }} />
      case 'receipt': return <Receipt size={18} style={{ color: '#5D8A66' }} />
      default: return <AlertTriangle size={18} style={{ color: '#D97706' }} />
    }
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
          <p style={{ color: 'var(--text-secondary)' }}>A carregar gestão de projeto...</p>
        </div>
      </div>
    )
  }

  const firstName = getUserName?.()?.split(' ')[0] || 'Utilizador'

  return (
    <div className="fade-in" style={{ paddingBottom: '80px' }}>
      {/* Page Header - Following mockup */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 400,
            color: 'var(--brown)',
            margin: 0,
            fontFamily: 'Georgia, serif'
          }}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--brown-light)',
            margin: '4px 0 0'
          }}>
            {formatDate()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: '1px solid var(--stone)',
              borderRadius: '8px'
            }}
          >
            <Filter size={16} />
            Filtrar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/projetos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px'
            }}
          >
            <Plus size={16} />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* G.A.R.V.I.S. Panel - Matching mockup exactly */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 243, 240, 0.9) 0%, rgba(240, 238, 235, 0.9) 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--stone)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Sparkles size={22} style={{ color: 'white' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
              G.A.R.V.I.S.
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown-light)' }}>
              {insights.length} insights que requerem a tua atenção
            </p>
          </div>
        </div>

        {/* Insights Grid - 3 columns like mockup */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {insights.map(insight => {
            const typeConfig = INSIGHT_TYPES[insight.tipo] || INSIGHT_TYPES.suggestion

            return (
              <div
                key={insight.id}
                style={{
                  background: 'var(--white)',
                  borderRadius: '12px',
                  padding: '20px',
                  borderLeft: `4px solid ${typeConfig.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onClick={() => insight.acao_rota && navigate(insight.acao_rota)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px'
                }}>
                  {insight.tipo === 'urgent' && <AlertTriangle size={14} style={{ color: typeConfig.color }} />}
                  {insight.tipo === 'warning' && <Clock size={14} style={{ color: typeConfig.color }} />}
                  {insight.tipo === 'suggestion' && <Sparkles size={14} style={{ color: typeConfig.color }} />}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: typeConfig.color,
                    letterSpacing: '0.5px'
                  }}>
                    {typeConfig.label}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  color: 'var(--brown)',
                  lineHeight: 1.5
                }}>
                  <strong>{insight.titulo}</strong> {insight.mensagem}
                </p>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--brown-light)'
                }}>
                  {insight.acao_label}
                  <ArrowRight size={14} />
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Portfolio Health Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                Saúde do Portfolio
              </h3>
              <button style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7H17M3 12H17" stroke="var(--brown-light)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* RAG Summary */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--stone)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: RAG_COLORS['on-track'].dot
                }} />
                <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>No Prazo:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{ragSummary.on_track}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: RAG_COLORS['at-risk'].dot
                }} />
                <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Em Risco:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{ragSummary.at_risk}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: RAG_COLORS['off-track'].dot
                }} />
                <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Atrasado:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{ragSummary.off_track}</span>
              </div>
            </div>

            {/* Projects List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {sortedProjects.slice(0, 5).map((project, idx) => {
                const ragColor = RAG_COLORS[project.status_geral] || RAG_COLORS['on-track']
                const phaseColor = PHASE_COLORS[project.fase_atual] || { bg: '#F3F4F6', text: '#6B7280' }
                const phaseLabel = project.fase_atual?.toUpperCase() || 'N/A'

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projetos/${project.codigo}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '20px 1fr 100px 120px 80px 60px',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 0',
                      borderBottom: idx < sortedProjects.slice(0, 5).length - 1 ? '1px solid var(--stone)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Status Dot */}
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: ragColor.dot
                    }} />

                    {/* Project Info */}
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--brown)'
                      }}>
                        {project.codigo} · {project.nome}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--brown-light)',
                        marginTop: '2px'
                      }}>
                        {project.cliente_nome}
                      </div>
                    </div>

                    {/* Phase Badge */}
                    <span style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: phaseColor.bg,
                      color: phaseColor.text,
                      textAlign: 'center',
                      letterSpacing: '0.5px'
                    }}>
                      {phaseLabel}
                    </span>

                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'var(--stone)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${project.progresso_percentagem}%`,
                          height: '100%',
                          background: ragColor.dot,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--brown)',
                        minWidth: '35px',
                        textAlign: 'right'
                      }}>
                        {project.progresso_percentagem}%
                      </span>
                    </div>

                    {/* Prazo Deviation */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: project.desvio_prazo_dias > 0 ? '#5D8A66' : '#DC2626'
                      }}>
                        {project.desvio_prazo_dias > 0 ? '+' : ''}{project.desvio_prazo_dias}d
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--brown-light)', marginTop: '2px' }}>
                        PRAZO
                      </div>
                    </div>

                    {/* Custo Deviation */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: project.desvio_custo_percentagem > 0 ? '#DC2626' : '#5D8A66'
                      }}>
                        {project.desvio_custo_percentagem > 0 ? '+' : ''}{project.desvio_custo_percentagem}%
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--brown-light)', marginTop: '2px' }}>
                        CUSTO
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* My Day Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                O Meu Dia
              </h3>
              <button style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--brown-light)'
              }}>
                <Plus size={20} />
              </button>
            </div>

            {/* Task Filters */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px'
            }}>
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'tomorrow', label: 'Amanhã' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'overdue', label: 'Atrasadas' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setTaskFilter(filter.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: taskFilter === filter.id ? 'var(--brown)' : 'var(--cream)',
                    color: taskFilter === filter.id ? 'var(--white)' : 'var(--brown)',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Tasks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {tasks.map((task, idx) => {
                const statusColor = RAG_COLORS[task.status_projeto] || RAG_COLORS['on-track']
                const isOverdue = task.data_info?.includes('atraso')

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '14px 0',
                      borderBottom: idx < tasks.length - 1 ? '1px solid var(--stone)' : 'none',
                      background: task.garvis_sugerida ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                      marginLeft: task.garvis_sugerida ? '-24px' : 0,
                      marginRight: task.garvis_sugerida ? '-24px' : 0,
                      paddingLeft: task.garvis_sugerida ? '24px' : 0,
                      paddingRight: task.garvis_sugerida ? '24px' : 0,
                      borderLeft: task.garvis_sugerida ? '3px solid #6366F1' : 'none'
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '2px solid var(--stone)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginTop: '2px'
                    }} />

                    {/* Task Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--brown)' }}>
                          {task.titulo}
                        </span>
                        {task.garvis_sugerida && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}>
                            <Sparkles size={10} />
                            G.A.R.V.I.S.
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: statusColor.dot
                          }} />
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {task.projeto_nome}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} style={{ color: isOverdue ? '#DC2626' : 'var(--brown-light)' }} />
                          <span style={{
                            fontSize: '12px',
                            color: isOverdue ? '#DC2626' : 'var(--brown-light)',
                            fontWeight: isOverdue ? 600 : 400
                          }}>
                            {task.data_info}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Priority Arrow */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: task.prioridade === 'alta'
                        ? 'rgba(220, 38, 38, 0.1)'
                        : task.prioridade === 'media'
                        ? 'rgba(217, 183, 130, 0.2)'
                        : 'var(--stone)'
                    }}>
                      {task.prioridade === 'alta' ? (
                        <ArrowUp size={16} style={{ color: '#DC2626' }} />
                      ) : (
                        <Minus size={16} style={{ color: '#C9A882' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Alerts Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Alertas
              </h3>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#DC2626'
              }}>
                {alerts.length} novos
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--cream)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--stone)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--cream)'}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getAlertIcon(alert.icon)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      marginBottom: '2px'
                    }}>
                      {alert.titulo}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)',
                      marginBottom: '6px',
                      lineHeight: 1.4
                    }}>
                      {alert.descricao}
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--brown)'
                    }}>
                      {alert.acao}
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--brown)'
            }}>
              Resumo Financeiro
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(financialSummary.volumeAtivo)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Volume Ativo
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#5D8A66'
                }}>
                  <TrendingUp size={12} />
                  +12% vs Q4
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(financialSummary.porFaturar)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Por Faturar
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {financialSummary.margemMedia}%
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Margem Média
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#DC2626'
                }}>
                  <TrendingDown size={12} />
                  -2% vs Q4
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {financialSummary.projetosAtivos}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Projetos Ativos
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--brown)'
            }}>
              Próximos Milestones
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {milestones.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 0',
                    borderBottom: idx < milestones.length - 1 ? '1px solid var(--stone)' : 'none'
                  }}
                >
                  {/* Day Circle */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: milestone.status === 'overdue' ? 'rgba(220, 38, 38, 0.1)'
                      : milestone.status === 'tomorrow' ? 'rgba(217, 119, 6, 0.1)'
                      : 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: milestone.status === 'overdue' ? '#DC2626'
                      : milestone.status === 'tomorrow' ? '#D97706'
                      : 'var(--brown)',
                    flexShrink: 0
                  }}>
                    {milestone.dia}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      marginBottom: '2px'
                    }}>
                      {milestone.titulo}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)',
                      marginBottom: '4px'
                    }}>
                      {milestone.projeto}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: milestone.status === 'overdue' ? '#DC2626'
                        : milestone.status === 'tomorrow' ? '#D97706'
                        : 'var(--brown-light)'
                    }}>
                      {milestone.statusLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed G.A.R.V.I.S. Command Bar */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--white)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid var(--stone)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={18} style={{ color: 'white' }} />
          </div>
          <input
            id="garvis-command-input"
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
            placeholder="Pergunta ao G.A.R.V.I.S. ou usa comandos como /criar tarefa, /resumo semanal"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--brown)',
              background: 'transparent'
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            background: 'var(--cream)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--brown-light)'
          }}>
            <span style={{ fontSize: '14px' }}>⌘</span>
            <span>+ K</span>
          </div>
        </div>
      </div>
    </div>
  )
}
