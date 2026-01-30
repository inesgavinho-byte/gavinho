import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FolderKanban, Clock, CheckCircle2, AlertCircle,
  AlertTriangle, MessageCircle, Calendar, TrendingUp,
  Database, RefreshCw, Users, Target, Layers, ArrowRight,
  CircleDot, Activity, BarChart3, Zap, Timer, Plus, Search,
  ChevronRight, ChevronDown, Edit, Trash2, X, Check, XCircle,
  MoreVertical, Flag, AlertOctagon, Kanban, GanttChart, LayoutDashboard,
  Circle, User, FolderOpen, Euro, Milestone
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import TeamWorkloadGantt from '../components/TeamWorkloadGantt'

// ============================================
// CONSTANTS
// ============================================
const PROJECT_PHASES = [
  { key: 'Conceito', label: 'Conceito', color: '#8B9DC3' },
  { key: 'Estudo Prévio', label: 'Estudo Prévio', color: '#A3B18A' },
  { key: 'Anteprojeto', label: 'Anteprojeto', color: '#DDA15E' },
  { key: 'Projeto Execução', label: 'Projeto Execução', color: '#BC6C25' },
  { key: 'Acompanhamento Obra', label: 'Acomp. Obra', color: '#606C38' },
  { key: 'Entrega', label: 'Entrega', color: '#283618' },
  { key: 'Casa Viva', label: 'Casa Viva', color: '#669BBC' }
]

const HEALTH_STATUS = {
  excellent: { label: 'Excelente', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  good: { label: 'Bom', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.1)' },
  attention: { label: 'Atenção', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  risk: { label: 'Em Risco', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  critical: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
}

const TASK_STATUS = [
  { id: 'pendente', label: 'A Fazer', color: 'var(--brown-light)' },
  { id: 'em_progresso', label: 'Em Progresso', color: 'var(--warning)' },
  { id: 'em_revisao', label: 'Em Revisão', color: 'var(--info)' },
  { id: 'concluida', label: 'Concluída', color: 'var(--success)' }
]

const PRIORIDADES = [
  { id: 'Baixa', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  { id: 'Media', color: 'var(--brown)', bg: 'var(--stone)' },
  { id: 'Alta', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  { id: 'Urgente', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
]

const BLOQUEIO_TIPOS = [
  { id: 'bloqueio', label: 'Bloqueio', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  { id: 'aprovacao', label: 'Aprovação', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  { id: 'selecao', label: 'Seleção', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  { id: 'informacao', label: 'Informação', color: 'var(--brown-light)', bg: 'var(--stone)' }
]

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tarefas', label: 'Tarefas', icon: Kanban },
  { id: 'planning', label: 'Planning', icon: GanttChart },
  { id: 'bloqueios', label: 'Bloqueios', icon: AlertOctagon }
]

export default function DashboardProjetos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState([])
  const [equipa, setEquipa] = useState([])

  // Dashboard state
  const [stats, setStats] = useState({
    total: 0, emAndamento: 0, concluidos: 0, decisoesPendentes: 0,
    onTrack: 0, atRisk: 0, delayed: 0
  })
  const [phaseDistribution, setPhaseDistribution] = useState([])
  const [projectHealth, setProjectHealth] = useState([])
  const [alertas, setAlertas] = useState([])
  const [projetosRecentes, setProjetosRecentes] = useState([])
  const [milestones, setMilestones] = useState([])

  // Tarefas state
  const [tarefas, setTarefas] = useState([])
  const [tarefasSearch, setTarefasSearch] = useState('')
  const [tarefasFilterStatus, setTarefasFilterStatus] = useState('')
  const [expandedProjects, setExpandedProjects] = useState({})
  const [expandedTasks, setExpandedTasks] = useState({})
  const [showTarefaModal, setShowTarefaModal] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)
  const [tarefaForm, setTarefaForm] = useState({
    titulo: '', descricao: '', projeto_id: '', prioridade: 'Media',
    status: 'pendente', data_limite: '', responsavel_id: ''
  })

  // Bloqueios state
  const [bloqueios, setBloqueios] = useState([])
  const [bloqueiosSearch, setBloqueiosSearch] = useState('')
  const [bloqueiosFilterStatus, setBloqueiosFilterStatus] = useState('pendente')
  const [bloqueiosFilterTipo, setBloqueiosFilterTipo] = useState('')
  const [showBloqueioModal, setShowBloqueioModal] = useState(false)
  const [editingBloqueio, setEditingBloqueio] = useState(null)
  const [bloqueioForm, setBloqueioForm] = useState({
    titulo: '', descricao: '', projeto_id: '', categoria: 'tecnica', tipo: 'bloqueio',
    prioridade: 'media', impacto_custo: '', impacto_prazo_dias: '', data_limite: ''
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    const expanded = {}
    projetos.forEach(p => { expanded[p.id] = true })
    expanded['sem_projeto'] = true
    setExpandedProjects(expanded)
  }, [projetos])

  const setActiveTab = (tab) => {
    setSearchParams({ tab })
  }

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [projetosRes, tarefasRes, bloqueiosRes, equipaRes] = await Promise.all([
        supabase.from('projetos').select('*').order('created_at', { ascending: false }),
        supabase.from('tarefas').select('*, projetos(codigo, nome)').order('created_at', { ascending: false }),
        supabase.from('decisoes').select('*, projetos(codigo, nome)').order('created_at', { ascending: false }),
        supabase.from('utilizadores').select('id, nome, avatar_url, role, ativo').eq('ativo', true).order('nome')
      ])

      const projetosData = projetosRes.data || []
      const tarefasData = tarefasRes.data || []
      const bloqueiosData = bloqueiosRes.data || []
      const equipaData = equipaRes.data || []

      setProjetos(projetosData)
      setTarefas(tarefasData)
      setBloqueios(bloqueiosData)
      setEquipa(equipaData)

      // Process dashboard stats
      processDashboardStats(projetosData, tarefasData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const processDashboardStats = (projetosData, tarefasData) => {
    if (!projetosData.length) return

    const activeProjetos = projetosData.filter(p => !p.arquivado)
    const emAndamento = activeProjetos.filter(p => p.fase !== 'Entrega' && p.fase !== 'Casa Viva').length
    const concluidos = projetosData.filter(p => p.fase === 'Entrega' || p.fase === 'Casa Viva').length
    const pendentes = tarefasData.filter(t => t.status === 'pendente').length

    // Timeline status
    let onTrack = 0, atRisk = 0, delayed = 0
    activeProjetos.forEach(p => {
      const progress = p.progresso || 0
      if (progress >= 50) onTrack++
      else if (progress >= 25) atRisk++
      else onTrack++
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
      percentage: activeProjetos.length > 0 ? Math.round((phaseCount[phase.key] / activeProjetos.length) * 100) : 0
    })).filter(p => p.count > 0)

    setPhaseDistribution(distribution)

    // Project health
    const healthScores = activeProjetos.slice(0, 6).map(p => {
      const progress = p.progresso || 0
      let health = progress >= 80 ? 'excellent' : progress >= 60 ? 'good' : progress >= 40 ? 'attention' : 'risk'
      return { id: p.id, codigo: p.codigo, nome: p.nome, fase: p.fase || 'Conceito', progresso: progress, health: HEALTH_STATUS[health] }
    })
    setProjectHealth(healthScores)

    setStats({ total: projetosData.length, emAndamento, concluidos, decisoesPendentes: pendentes, onTrack, atRisk, delayed })
    setProjetosRecentes(projetosData.slice(0, 5))

    // Alerts from tasks
    const alertasData = tarefasData.filter(t => t.status === 'pendente').slice(0, 4).map(t => ({
      id: t.id, tipo: 'info', titulo: t.titulo, projeto: t.projetos?.codigo || '',
      descricao: t.descricao?.substring(0, 50) || '', tempo: 'Pendente'
    }))
    setAlertas(alertasData.length ? alertasData : [
      { id: 1, tipo: 'warning', titulo: 'Aprovação de materiais pendente', projeto: 'GA00489', descricao: 'Escolha de pedra para bancadas', tempo: 'há 5d' }
    ])

    // Milestones
    const marcos = tarefasData.filter(t => t.marco && t.data_fim).slice(0, 3).map(m => ({
      id: m.id, data: new Date(m.data_fim), titulo: m.titulo, projeto: m.projetos?.codigo || '', nome: m.projetos?.nome || ''
    }))
    setMilestones(marcos.length ? marcos : [
      { id: 1, data: new Date(Date.now() + 3*24*60*60*1000), titulo: 'Entrega Projeto Execução', projeto: 'GA00489', nome: 'AS House' }
    ])
  }

  // ============================================
  // TAREFAS HANDLERS
  // ============================================
  const getGroupedTasks = () => {
    const groups = {}
    const mainTasks = tarefas.filter(t => {
      if (t.tarefa_pai_id) return false
      const matchSearch = t.titulo?.toLowerCase().includes(tarefasSearch.toLowerCase())
      const matchStatus = !tarefasFilterStatus || t.status === tarefasFilterStatus
      return matchSearch && matchStatus
    })

    mainTasks.forEach(task => {
      const projectId = task.projeto_id || 'sem_projeto'
      if (!groups[projectId]) groups[projectId] = []
      const subtasks = tarefas.filter(t => t.tarefa_pai_id === task.id)
      groups[projectId].push({ ...task, subtarefas: subtasks })
    })
    return groups
  }

  const handleSaveTarefa = async () => {
    if (!tarefaForm.titulo.trim()) return
    try {
      const data = {
        titulo: tarefaForm.titulo, descricao: tarefaForm.descricao || null,
        projeto_id: tarefaForm.projeto_id || null, prioridade: tarefaForm.prioridade,
        status: tarefaForm.status, data_limite: tarefaForm.data_limite || null,
        responsavel_id: tarefaForm.responsavel_id || null
      }
      if (editingTarefa) {
        await supabase.from('tarefas').update(data).eq('id', editingTarefa.id)
      } else {
        await supabase.from('tarefas').insert([data])
      }
      setShowTarefaModal(false)
      setTarefaForm({ titulo: '', descricao: '', projeto_id: '', prioridade: 'Media', status: 'pendente', data_limite: '', responsavel_id: '' })
      setEditingTarefa(null)
      fetchAllData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleToggleTarefaStatus = async (tarefa) => {
    const newStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida'
    await supabase.from('tarefas').update({ status: newStatus }).eq('id', tarefa.id)
    fetchAllData()
  }

  // ============================================
  // BLOQUEIOS HANDLERS
  // ============================================
  const getFilteredBloqueios = () => {
    return bloqueios.filter(item => {
      const matchSearch = item.titulo?.toLowerCase().includes(bloqueiosSearch.toLowerCase())
      const matchStatus = !bloqueiosFilterStatus || bloqueiosFilterStatus === 'todos' || item.status === bloqueiosFilterStatus
      const matchTipo = !bloqueiosFilterTipo || item.tipo === bloqueiosFilterTipo
      return matchSearch && matchStatus && matchTipo
    })
  }

  const handleSaveBloqueio = async () => {
    if (!bloqueioForm.titulo.trim() || !bloqueioForm.projeto_id) {
      alert('Preencha título e projeto')
      return
    }
    try {
      const data = {
        titulo: bloqueioForm.titulo, descricao: bloqueioForm.descricao || null,
        projeto_id: bloqueioForm.projeto_id, categoria: bloqueioForm.categoria,
        tipo: bloqueioForm.tipo, prioridade: bloqueioForm.prioridade,
        impacto_custo: bloqueioForm.impacto_custo ? parseFloat(bloqueioForm.impacto_custo) : null,
        impacto_prazo_dias: bloqueioForm.impacto_prazo_dias ? parseInt(bloqueioForm.impacto_prazo_dias) : null,
        data_limite: bloqueioForm.data_limite || null, status: 'pendente'
      }
      if (editingBloqueio) {
        await supabase.from('decisoes').update(data).eq('id', editingBloqueio.id)
      } else {
        await supabase.from('decisoes').insert([data])
      }
      setShowBloqueioModal(false)
      setBloqueioForm({ titulo: '', descricao: '', projeto_id: '', categoria: 'tecnica', tipo: 'bloqueio', prioridade: 'media', impacto_custo: '', impacto_prazo_dias: '', data_limite: '' })
      setEditingBloqueio(null)
      fetchAllData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleResolverBloqueio = async (item) => {
    const newStatus = item.tipo === 'bloqueio' ? 'resolvido' : 'aprovada'
    await supabase.from('decisoes').update({ status: newStatus, decidido_em: new Date().toISOString() }).eq('id', item.id)
    fetchAllData()
  }

  // ============================================
  // RENDER HELPERS
  // ============================================
  const formatDate = (date) => ({
    dia: date.getDate(),
    mes: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')
  })

  const getDiasRestantes = (date) => Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  // ============================================
  // RENDER DASHBOARD TAB
  // ============================================
  const renderDashboard = () => (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Total de Projetos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.total}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Em Andamento</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.emAndamento}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(163, 177, 138, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} style={{ color: 'var(--accent-olive)' }} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Concluídos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.concluidos}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={22} style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Decisões Pendentes</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: stats.decisoesPendentes > 5 ? '#ef4444' : 'var(--brown)', lineHeight: 1 }}>{stats.decisoesPendentes}</div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: stats.decisoesPendentes > 5 ? 'rgba(239, 68, 68, 0.1)' : 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={22} style={{ color: stats.decisoesPendentes > 5 ? '#ef4444' : 'var(--brown-light)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Phase Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Timer size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Performance Prazos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>No Prazo</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{stats.onTrack}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#eab308' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Atenção</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>{stats.atRisk}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} style={{ color: '#ef4444' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Atrasado</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{stats.delayed}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Layers size={18} style={{ color: 'var(--accent-olive)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Projetos por Fase</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {phaseDistribution.length > 0 ? phaseDistribution.map(phase => (
              <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '120px', fontSize: '12px', fontWeight: 500, color: 'var(--brown)' }}>{phase.label}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ width: '100%', height: '24px', background: 'var(--cream)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${phase.percentage}%`, minWidth: phase.count > 0 ? '20px' : '0', height: '100%', background: phase.color, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {phase.count > 0 && <span style={{ fontSize: '11px', fontWeight: 600, color: 'white' }}>{phase.count}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ width: '40px', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textAlign: 'right' }}>{phase.percentage}%</div>
              </div>
            )) : <div style={{ textAlign: 'center', padding: '32px', color: 'var(--brown-light)' }}>Sem projetos ativos</div>}
          </div>
        </div>
      </div>

      {/* Project Health & Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Projetos Recentes</h3>
            <button onClick={() => navigate('/projetos')} className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: 'var(--accent-olive)' }}>Ver todos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projetosRecentes.slice(0, 5).map(projeto => (
              <div key={projeto.id} onClick={() => navigate(`/projetos/${projeto.codigo}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--cream)', borderRadius: '10px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderKanban size={18} style={{ color: 'var(--brown-light)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{projeto.codigo}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{projeto.fase || 'Conceito'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '60px', height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${projeto.progresso || 0}%`, height: '100%', background: 'var(--accent-olive)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown)' }}>{projeto.progresso || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Próximos Milestones</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {milestones.map(milestone => {
              const { dia, mes } = formatDate(milestone.data)
              const diasRestantes = getDiasRestantes(milestone.data)
              const isUrgent = diasRestantes <= 3
              return (
                <div key={milestone.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: isUrgent ? 'rgba(239, 68, 68, 0.05)' : 'var(--cream)', borderRadius: '10px', border: isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : 'none' }}>
                  <div style={{ textAlign: 'center', minWidth: '48px', padding: '8px', background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: isUrgent ? '#ef4444' : 'var(--brown)', lineHeight: 1 }}>{dia}</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: isUrgent ? '#ef4444' : 'var(--brown-light)', textTransform: 'uppercase' }}>{mes}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>{milestone.titulo}</div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{milestone.projeto} · {milestone.nome}</div>
                  </div>
                  <div style={{ padding: '6px 12px', borderRadius: '8px', background: isUrgent ? '#ef4444' : 'var(--accent-olive)', fontSize: '11px', fontWeight: 600, color: 'white' }}>
                    {diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : `${diasRestantes} dias`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <TeamWorkloadGantt />
      </div>
    </>
  )

  // ============================================
  // RENDER TAREFAS TAB
  // ============================================
  const renderTarefas = () => {
    const groupedTasks = getGroupedTasks()

    return (
      <>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input className="input" placeholder="Pesquisar tarefas..." value={tarefasSearch} onChange={e => setTarefasSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
          </div>
          <select className="input" value={tarefasFilterStatus} onChange={e => setTarefasFilterStatus(e.target.value)} style={{ width: '160px' }}>
            <option value="">Todos os estados</option>
            {TASK_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditingTarefa(null); setShowTarefaModal(true) }}>
            <Plus size={18} /> Nova Tarefa
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(groupedTasks).map(([projectId, tasks]) => {
            const projeto = projetos.find(p => p.id === projectId)
            const isExpanded = expandedProjects[projectId]

            return (
              <div key={projectId} className="card">
                <div onClick={() => setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }))} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--stone)' : 'none' }}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <FolderOpen size={18} style={{ color: 'var(--accent-olive)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--brown)' }}>{projeto ? `${projeto.codigo} - ${projeto.nome}` : 'Sem Projeto'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--brown-light)', marginLeft: 'auto' }}>{tasks.length} tarefas</span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '12px' }}>
                    {tasks.map(task => {
                      const statusConfig = TASK_STATUS.find(s => s.id === task.status)
                      const prioridadeConfig = PRIORIDADES.find(p => p.id === task.prioridade)

                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', marginBottom: '8px', background: 'var(--cream)' }}>
                          <button onClick={() => handleToggleTarefaStatus(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {task.status === 'concluida' ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} /> : <Circle size={20} style={{ color: 'var(--brown-light)' }} />}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, color: 'var(--brown)', textDecoration: task.status === 'concluida' ? 'line-through' : 'none' }}>{task.titulo}</div>
                            {task.data_limite && <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Calendar size={12} /> {new Date(task.data_limite).toLocaleDateString('pt-PT')}</div>}
                          </div>
                          {prioridadeConfig && <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: prioridadeConfig.bg, color: prioridadeConfig.color, fontWeight: 500 }}>{task.prioridade}</span>}
                          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'var(--stone)', color: statusConfig?.color }}>{statusConfig?.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {Object.keys(groupedTasks).length === 0 && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Kanban size={48} style={{ color: 'var(--stone-dark)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Sem tarefas</h3>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>Crie uma nova tarefa para começar</p>
            </div>
          )}
        </div>
      </>
    )
  }

  // ============================================
  // RENDER BLOQUEIOS TAB
  // ============================================
  const renderBloqueios = () => {
    const filteredBloqueios = getFilteredBloqueios()

    return (
      <>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input className="input" placeholder="Pesquisar bloqueios..." value={bloqueiosSearch} onChange={e => setBloqueiosSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
          </div>
          <select className="input" value={bloqueiosFilterStatus} onChange={e => setBloqueiosFilterStatus(e.target.value)} style={{ width: '140px' }}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="resolvido">Resolvidos</option>
            <option value="aprovada">Aprovados</option>
          </select>
          <select className="input" value={bloqueiosFilterTipo} onChange={e => setBloqueiosFilterTipo(e.target.value)} style={{ width: '140px' }}>
            <option value="">Todos os tipos</option>
            {BLOQUEIO_TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditingBloqueio(null); setShowBloqueioModal(true) }}>
            <Plus size={18} /> Novo Bloqueio
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBloqueios.map(item => {
            const tipoConfig = BLOQUEIO_TIPOS.find(t => t.id === item.tipo)
            const isResolved = ['resolvido', 'aprovada', 'implementada'].includes(item.status)

            return (
              <div key={item.id} className="card" style={{ padding: '16px', opacity: isResolved ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tipoConfig?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.tipo === 'bloqueio' ? <AlertTriangle size={20} style={{ color: tipoConfig?.color }} /> : <MessageCircle size={20} style={{ color: tipoConfig?.color }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brown)' }}>{item.titulo}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: tipoConfig?.bg, color: tipoConfig?.color }}>{tipoConfig?.label}</span>
                      {isResolved && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>{item.projetos?.codigo} · {item.descricao?.substring(0, 100)}</div>
                    {item.data_limite && <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> Limite: {new Date(item.data_limite).toLocaleDateString('pt-PT')}</div>}
                  </div>
                  {!isResolved && (
                    <button onClick={() => handleResolverBloqueio(item)} className="btn btn-outline btn-sm" style={{ color: 'var(--success)' }}>
                      <Check size={16} /> Resolver
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredBloqueios.length === 0 && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <AlertOctagon size={48} style={{ color: 'var(--stone-dark)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Sem bloqueios</h3>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>Nenhum bloqueio ou decisão pendente</p>
            </div>
          )}
        </div>
      </>
    )
  }

  // ============================================
  // RENDER PLANNING TAB
  // ============================================
  const renderPlanning = () => (
    <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
      <GanttChart size={64} style={{ color: 'var(--accent-olive)', marginBottom: '16px' }} />
      <h3 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Planning & Gantt</h3>
      <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px' }}>Visualização de timeline e dependências dos projetos</p>
      <button onClick={() => navigate('/planning')} className="btn btn-primary">
        Abrir Planning Completo <ArrowRight size={16} />
      </button>
    </div>
  )

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Projetos</h1>
          <p className="page-subtitle">Visão geral e gestão de projetos</p>
        </div>
        <button onClick={fetchAllData} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--stone)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: activeTab === tab.id ? 'var(--white)' : 'transparent',
              border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-olive)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-olive)' : 'var(--brown-light)',
              fontWeight: activeTab === tab.id ? 600 : 500, fontSize: '14px', cursor: 'pointer',
              transition: 'all 0.2s', marginBottom: '-1px'
            }}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.id === 'tarefas' && tarefas.filter(t => t.status === 'pendente').length > 0 && (
              <span style={{ background: 'var(--warning)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                {tarefas.filter(t => t.status === 'pendente').length}
              </span>
            )}
            {tab.id === 'bloqueios' && bloqueios.filter(b => b.status === 'pendente').length > 0 && (
              <span style={{ background: 'var(--error)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                {bloqueios.filter(b => b.status === 'pendente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'tarefas' && renderTarefas()}
      {activeTab === 'bloqueios' && renderBloqueios()}
      {activeTab === 'planning' && renderPlanning()}

      {/* Tarefa Modal */}
      {showTarefaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button onClick={() => setShowTarefaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Título *</label>
                <input className="input" value={tarefaForm.titulo} onChange={e => setTarefaForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da tarefa" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Projeto</label>
                <select className="input" value={tarefaForm.projeto_id} onChange={e => setTarefaForm(f => ({ ...f, projeto_id: e.target.value }))}>
                  <option value="">Sem projeto</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Prioridade</label>
                  <select className="input" value={tarefaForm.prioridade} onChange={e => setTarefaForm(f => ({ ...f, prioridade: e.target.value }))}>
                    {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Limite</label>
                  <input type="date" className="input" value={tarefaForm.data_limite} onChange={e => setTarefaForm(f => ({ ...f, data_limite: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Responsável</label>
                <select className="input" value={tarefaForm.responsavel_id} onChange={e => setTarefaForm(f => ({ ...f, responsavel_id: e.target.value }))}>
                  <option value="">Sem responsável</option>
                  {equipa.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea className="input" rows={3} value={tarefaForm.descricao} onChange={e => setTarefaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional..." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" onClick={() => setShowTarefaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveTarefa}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bloqueio Modal */}
      {showBloqueioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingBloqueio ? 'Editar' : 'Novo Bloqueio/Decisão'}</h3>
              <button onClick={() => setShowBloqueioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Título *</label>
                <input className="input" value={bloqueioForm.titulo} onChange={e => setBloqueioForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Projeto *</label>
                  <select className="input" value={bloqueioForm.projeto_id} onChange={e => setBloqueioForm(f => ({ ...f, projeto_id: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo</label>
                  <select className="input" value={bloqueioForm.tipo} onChange={e => setBloqueioForm(f => ({ ...f, tipo: e.target.value }))}>
                    {BLOQUEIO_TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea className="input" rows={3} value={bloqueioForm.descricao} onChange={e => setBloqueioForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Limite</label>
                <input type="date" className="input" value={bloqueioForm.data_limite} onChange={e => setBloqueioForm(f => ({ ...f, data_limite: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" onClick={() => setShowBloqueioModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveBloqueio}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
