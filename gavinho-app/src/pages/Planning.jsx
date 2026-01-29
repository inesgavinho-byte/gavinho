import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Plus,
  Milestone,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreVertical,
  X,
  Users,
  Flag,
  ArrowRight,
  AlertOctagon,
  Kanban,
  GanttChart,
  Building2,
  User,
  CheckCircle,
  Circle,
  Loader2,
  LayoutList,
  FolderOpen
} from 'lucide-react'

// Dados de exemplo - projetos com tarefas e timeline
const projectsData = [
  {
    id: 1,
    codigo: 'GA00466',
    nome: 'Penthouse António Enes',
    cliente: 'Silva Investments',
    pm: 'Maria Santos',
    expanded: true,
    health: 'warning',
    tarefas: [
      {
        id: 101,
        nome: 'Projeto de Execução',
        inicio: '2024-09-01',
        fim: '2024-10-15',
        progresso: 100,
        responsavel: 'Pedro Costa',
        status: 'concluida',
        marco: false,
        dependencias: []
      },
      {
        id: 102,
        nome: 'Demolições',
        inicio: '2024-10-16',
        fim: '2024-10-30',
        progresso: 100,
        responsavel: 'Carlos Ferreira',
        status: 'concluida',
        marco: false,
        dependencias: [101]
      },
      {
        id: 103,
        nome: 'Instalações Técnicas',
        inicio: '2024-11-01',
        fim: '2024-12-15',
        progresso: 75,
        responsavel: 'João Mendes',
        status: 'em_progresso',
        marco: false,
        dependencias: [102]
      },
      {
        id: 104,
        nome: 'Acabamentos',
        inicio: '2024-12-10',
        fim: '2025-02-28',
        progresso: 25,
        responsavel: 'Ana Oliveira',
        status: 'em_progresso',
        marco: false,
        dependencias: [103]
      },
      {
        id: 105,
        nome: 'Aprovação Materiais Cliente',
        inicio: '2024-12-20',
        fim: '2024-12-20',
        progresso: 0,
        responsavel: 'Maria Santos',
        status: 'pendente',
        marco: true,
        dependencias: []
      },
      {
        id: 106,
        nome: 'Marcenaria',
        inicio: '2025-01-15',
        fim: '2025-03-15',
        progresso: 0,
        responsavel: 'Carlos Ferreira',
        status: 'nao_iniciada',
        marco: false,
        dependencias: [104, 105]
      },
      {
        id: 107,
        nome: 'Entrega Final',
        inicio: '2025-04-30',
        fim: '2025-04-30',
        progresso: 0,
        responsavel: 'Maria Santos',
        status: 'nao_iniciada',
        marco: true,
        dependencias: [106]
      }
    ]
  },
  {
    id: 2,
    codigo: 'GA00470',
    nome: 'Villa Cascais',
    cliente: 'Fundo Atlântico',
    pm: 'Maria Santos',
    expanded: false,
    health: 'good',
    tarefas: [
      {
        id: 201,
        nome: 'Licenciamento',
        inicio: '2024-08-01',
        fim: '2024-11-30',
        progresso: 100,
        responsavel: 'Pedro Costa',
        status: 'concluida',
        marco: false,
        dependencias: []
      },
      {
        id: 202,
        nome: 'Alvará de Construção',
        inicio: '2024-11-30',
        fim: '2024-11-30',
        progresso: 100,
        responsavel: 'Pedro Costa',
        status: 'concluida',
        marco: true,
        dependencias: [201]
      },
      {
        id: 203,
        nome: 'Fundações',
        inicio: '2024-12-01',
        fim: '2025-01-15',
        progresso: 60,
        responsavel: 'Carlos Ferreira',
        status: 'em_progresso',
        marco: false,
        dependencias: [202]
      },
      {
        id: 204,
        nome: 'Estrutura',
        inicio: '2025-01-16',
        fim: '2025-04-30',
        progresso: 0,
        responsavel: 'Carlos Ferreira',
        status: 'nao_iniciada',
        marco: false,
        dependencias: [203]
      },
      {
        id: 205,
        nome: 'Cobertura Concluída',
        inicio: '2025-05-15',
        fim: '2025-05-15',
        progresso: 0,
        responsavel: 'Carlos Ferreira',
        status: 'nao_iniciada',
        marco: true,
        dependencias: [204]
      }
    ]
  },
  {
    id: 3,
    codigo: 'GA00472',
    nome: 'Hotel Comporta',
    cliente: 'Comporta Ventures',
    pm: 'Inês Gavinho',
    expanded: false,
    health: 'good',
    tarefas: [
      {
        id: 301,
        nome: 'Estudo Prévio',
        inicio: '2024-10-01',
        fim: '2024-11-15',
        progresso: 100,
        responsavel: 'Pedro Costa',
        status: 'concluida',
        marco: false,
        dependencias: []
      },
      {
        id: 302,
        nome: 'Aprovação Conceito',
        inicio: '2024-11-20',
        fim: '2024-11-20',
        progresso: 100,
        responsavel: 'Inês Gavinho',
        status: 'concluida',
        marco: true,
        dependencias: [301]
      },
      {
        id: 303,
        nome: 'Projeto de Licenciamento',
        inicio: '2024-11-25',
        fim: '2025-02-28',
        progresso: 35,
        responsavel: 'Pedro Costa',
        status: 'em_progresso',
        marco: false,
        dependencias: [302]
      },
      {
        id: 304,
        nome: 'Submissão Câmara',
        inicio: '2025-03-01',
        fim: '2025-03-01',
        progresso: 0,
        responsavel: 'Pedro Costa',
        status: 'nao_iniciada',
        marco: true,
        dependencias: [303]
      }
    ]
  }
]

const statusConfig = {
  concluida: { label: 'Concluída', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  em_progresso: { label: 'Em Progresso', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  pendente: { label: 'Pendente', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  nao_iniciada: { label: 'Não Iniciada', color: 'var(--brown-light)', bg: 'var(--stone)' },
  atrasada: { label: 'Atrasada', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
}

const healthConfig = {
  good: { color: 'var(--success)' },
  warning: { color: 'var(--warning)' },
  critical: { color: 'var(--error)' }
}

// Dados de bloqueios de todos os projetos
const bloqueiosData = [
  {
    id: 1,
    titulo: 'Aguardar aprovação de materiais pelo cliente',
    descricao: 'Cliente ainda não aprovou a seleção de mármores para a cozinha',
    projeto: { codigo: 'GA00466', nome: 'Penthouse António Enes' },
    tipo: 'cliente',
    prioridade: 'alta',
    status: 'ativo',
    criado_em: '2024-12-10',
    responsavel: 'Maria Santos',
    impacto: 'Atrasa início da marcenaria em 2 semanas'
  },
  {
    id: 2,
    titulo: 'Licença de construção pendente',
    descricao: 'Câmara Municipal ainda não emitiu o alvará de construção',
    projeto: { codigo: 'GA00470', nome: 'Villa Cascais' },
    tipo: 'legal',
    prioridade: 'critica',
    status: 'ativo',
    criado_em: '2024-11-28',
    responsavel: 'Pedro Costa',
    impacto: 'Bloqueia todo o início de obra'
  },
  {
    id: 3,
    titulo: 'Fornecedor de luminárias com atraso',
    descricao: 'Artemide comunicou atraso de 6 semanas na entrega das luminárias',
    projeto: { codigo: 'GA00466', nome: 'Penthouse António Enes' },
    tipo: 'fornecedor',
    prioridade: 'media',
    status: 'ativo',
    criado_em: '2024-12-15',
    responsavel: 'Ana Oliveira',
    impacto: 'Pode atrasar acabamentos finais'
  },
  {
    id: 4,
    titulo: 'Decisão de layout da suite principal',
    descricao: 'Cliente pediu tempo para decidir entre as 2 opções apresentadas',
    projeto: { codigo: 'GA00472', nome: 'Hotel Comporta' },
    tipo: 'cliente',
    prioridade: 'media',
    status: 'ativo',
    criado_em: '2024-12-12',
    responsavel: 'Inês Gavinho',
    impacto: 'Atrasa finalização do projeto de execução'
  },
  {
    id: 5,
    titulo: 'Problemas estruturais detetados',
    descricao: 'Engenheiro identificou necessidade de reforço estrutural não previsto',
    projeto: { codigo: 'GA00466', nome: 'Penthouse António Enes' },
    tipo: 'tecnico',
    prioridade: 'critica',
    status: 'resolvido',
    criado_em: '2024-12-01',
    resolvido_em: '2024-12-08',
    responsavel: 'Carlos Ferreira',
    impacto: 'Orçamento adicional aprovado'
  }
]

const bloqueioTipoConfig = {
  cliente: { label: 'Cliente', color: 'var(--info)', icon: Users },
  fornecedor: { label: 'Fornecedor', color: 'var(--warning)', icon: Building2 },
  legal: { label: 'Legal/Licenças', color: 'var(--error)', icon: AlertOctagon },
  tecnico: { label: 'Técnico', color: 'var(--brown)', icon: AlertTriangle },
  interno: { label: 'Interno', color: 'var(--brown-light)', icon: Users }
}

const prioridadeConfig = {
  critica: { label: 'Crítica', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  alta: { label: 'Alta', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  media: { label: 'Média', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  baixa: { label: 'Baixa', color: 'var(--brown-light)', bg: 'var(--stone)' }
}

export default function Planning() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') || 'planning'
  const [projects, setProjects] = useState(projectsData)
  const [viewMode, setViewMode] = useState('month') // week, month, quarter
  const [currentDate, setCurrentDate] = useState(new Date(2024, 11, 18)) // Dec 18, 2024
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterPM, setFilterPM] = useState('Todos')
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)

  // Real data from Supabase
  const [realTarefas, setRealTarefas] = useState([])
  const [realProjetos, setRealProjetos] = useState([])
  const [equipa, setEquipa] = useState([])
  const [loadingReal, setLoadingReal] = useState(true)

  // Sub-tab for Tarefas view
  const [tarefasView, setTarefasView] = useState('projeto') // 'projeto' or 'pessoa'

  // Load real data from Supabase
  useEffect(() => {
    loadRealData()
  }, [])

  const loadRealData = async () => {
    setLoadingReal(true)
    try {
      const [tarefasRes, projetosRes, equipaRes] = await Promise.all([
        supabase.from('tarefas').select('*').order('created_at', { ascending: false }),
        supabase.from('projetos').select('id, codigo, nome, pm_id').eq('arquivado', false).order('codigo', { ascending: false }),
        supabase.from('utilizadores').select('id, nome, avatar_url, funcao').eq('ativo', true).order('nome')
      ])

      setRealTarefas(tarefasRes.data || [])
      setRealProjetos(projetosRes.data || [])
      setEquipa(equipaRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoadingReal(false)
    }
  }

  // Get member info
  const getMembroInfo = (id) => equipa.find(m => m.id === id)
  const getProjetoInfo = (id) => realProjetos.find(p => p.id === id)

  // Group tasks by project
  const getTarefasPorProjeto = () => {
    const groups = {}
    realTarefas.filter(t => !t.tarefa_pai_id).forEach(tarefa => {
      const projectId = tarefa.projeto_id || 'sem_projeto'
      if (!groups[projectId]) groups[projectId] = []
      const subtarefas = realTarefas.filter(t => t.tarefa_pai_id === tarefa.id)
      groups[projectId].push({ ...tarefa, subtarefas })
    })
    return groups
  }

  // Group tasks by person (responsavel)
  const getTarefasPorPessoa = () => {
    const groups = {}
    realTarefas.filter(t => !t.tarefa_pai_id).forEach(tarefa => {
      const personId = tarefa.responsavel_id || 'sem_atribuicao'
      if (!groups[personId]) groups[personId] = []
      const subtarefas = realTarefas.filter(t => t.tarefa_pai_id === tarefa.id)
      groups[personId].push({ ...tarefa, subtarefas })
    })
    return groups
  }

  // Calcular range de datas baseado no viewMode
  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)
    
    if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay())
      end.setDate(start.getDate() + 13) // 2 semanas
    } else if (viewMode === 'month') {
      start.setDate(1)
      end.setMonth(end.getMonth() + 2)
      end.setDate(0)
    } else { // quarter
      start.setMonth(Math.floor(start.getMonth() / 3) * 3)
      start.setDate(1)
      end.setMonth(start.getMonth() + 5)
      end.setDate(0)
    }
    
    return { start, end }
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange()

  // Gerar colunas de dias/semanas
  const generateColumns = () => {
    const columns = []
    const current = new Date(rangeStart)
    
    if (viewMode === 'week') {
      while (current <= rangeEnd) {
        columns.push({
          date: new Date(current),
          label: current.getDate().toString(),
          isWeekend: current.getDay() === 0 || current.getDay() === 6,
          isToday: current.toDateString() === new Date().toDateString()
        })
        current.setDate(current.getDate() + 1)
      }
    } else if (viewMode === 'month') {
      while (current <= rangeEnd) {
        columns.push({
          date: new Date(current),
          label: current.getDate().toString(),
          isWeekend: current.getDay() === 0 || current.getDay() === 6,
          isToday: current.toDateString() === new Date().toDateString(),
          isFirstOfMonth: current.getDate() === 1
        })
        current.setDate(current.getDate() + 1)
      }
    } else { // quarter - weekly columns
      while (current <= rangeEnd) {
        const weekStart = new Date(current)
        columns.push({
          date: weekStart,
          label: `S${Math.ceil(current.getDate() / 7)}`,
          isToday: false
        })
        current.setDate(current.getDate() + 7)
      }
    }
    
    return columns
  }

  const columns = generateColumns()

  // Agrupar colunas por mês
  const getMonthGroups = () => {
    const groups = []
    let currentMonth = null
    let count = 0
    
    columns.forEach((col, idx) => {
      const month = col.date.toLocaleString('pt-PT', { month: 'short', year: 'numeric' })
      if (month !== currentMonth) {
        if (currentMonth) {
          groups.push({ month: currentMonth, count })
        }
        currentMonth = month
        count = 1
      } else {
        count++
      }
      if (idx === columns.length - 1) {
        groups.push({ month: currentMonth, count })
      }
    })
    
    return groups
  }

  const monthGroups = getMonthGroups()

  // Calcular posição e largura da barra de tarefa
  const getTaskPosition = (tarefa) => {
    const taskStart = new Date(tarefa.inicio)
    const taskEnd = new Date(tarefa.fim)
    
    const totalDays = Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24))
    const startOffset = Math.max(0, Math.ceil((taskStart - rangeStart) / (1000 * 60 * 60 * 24)))
    const endOffset = Math.min(totalDays, Math.ceil((taskEnd - rangeStart) / (1000 * 60 * 60 * 24)))
    
    const left = (startOffset / totalDays) * 100
    const width = Math.max(((endOffset - startOffset + 1) / totalDays) * 100, 0.5)
    
    return { left: `${left}%`, width: `${width}%` }
  }

  // Navegar no tempo
  const navigateTime = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 14))
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction * 2))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction * 6))
    }
    setCurrentDate(newDate)
  }

  // Toggle expand projeto
  const toggleProject = (projectId) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, expanded: !p.expanded } : p
    ))
  }

  // Filtrar projetos
  const filteredProjects = projects.filter(p => 
    filterPM === 'Todos' || p.pm === filterPM
  )

  // PMs únicos
  const uniquePMs = [...new Set(projects.map(p => p.pm))]

  // Calcular estatísticas
  const allTasks = projects.flatMap(p => p.tarefas)
  const tasksInProgress = allTasks.filter(t => t.status === 'em_progresso').length
  const tasksPending = allTasks.filter(t => t.status === 'pendente').length
  const milestonesUpcoming = allTasks.filter(t => t.marco && t.status !== 'concluida').length

  // Coluna width
  const colWidth = viewMode === 'week' ? 40 : viewMode === 'month' ? 28 : 60

  // Estatísticas de bloqueios
  const bloqueiosAtivos = bloqueiosData.filter(b => b.status === 'ativo').length
  const bloqueiosCriticos = bloqueiosData.filter(b => b.status === 'ativo' && b.prioridade === 'critica').length

  // Todas as tarefas de todos os projetos para a tab Tarefas
  const todasTarefas = projects.flatMap(p =>
    p.tarefas.map(t => ({ ...t, projeto: { codigo: p.codigo, nome: p.nome } }))
  )

  const setActiveTab = (tab) => {
    setSearchParams({ tab })
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Planning</h1>
          <p className="page-subtitle">
            {activeTab === 'planning' && 'Timeline de projetos e marcos'}
            {activeTab === 'bloqueios' && 'Bloqueios ativos em todos os projetos'}
            {activeTab === 'tarefas' && 'Todas as tarefas de todos os projetos'}
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary">
            <Download size={18} />
            Exportar
          </button>
          {activeTab === 'planning' && (
            <button className="btn btn-primary" onClick={() => setShowAddTaskModal(true)}>
              <Plus size={18} />
              Nova Tarefa
            </button>
          )}
          {activeTab === 'bloqueios' && (
            <button className="btn btn-primary">
              <Plus size={18} />
              Novo Bloqueio
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        background: 'var(--cream)',
        padding: '6px',
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        {[
          { id: 'planning', label: 'Planning', icon: GanttChart },
          { id: 'bloqueios', label: 'Bloqueios', icon: AlertOctagon, badge: bloqueiosAtivos },
          { id: 'tarefas', label: 'Tarefas', icon: Kanban }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: activeTab === tab.id ? 'var(--white)' : 'transparent',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                padding: '2px 8px',
                background: activeTab === tab.id ? 'var(--error)' : 'rgba(184, 138, 138, 0.2)',
                color: activeTab === tab.id ? 'white' : 'var(--error)',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Planning (Gantt) */}
      {activeTab === 'planning' && (
        <>
          {/* KPIs Compactos */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--stone)',
              minWidth: '160px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(201, 168, 130, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={18} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{projects.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Projetos Ativos</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--stone)',
              minWidth: '160px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(138, 158, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={18} style={{ color: 'var(--info)' }} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{tasksInProgress}</div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Tarefas em Progresso</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'var(--white)',
              borderRadius: '12px',
              border: '1px solid var(--stone)',
              minWidth: '160px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(201, 168, 130, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{tasksPending}</div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Pendentes de Ap.</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="card mb-lg">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-sm">
            <div 
              className="flex"
              style={{ 
                background: 'var(--cream)',
                borderRadius: '980px',
                padding: '4px'
              }}
            >
              {['week', 'month', 'quarter'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '980px',
                    border: 'none',
                    background: viewMode === mode ? 'var(--white)' : 'transparent',
                    boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                    fontWeight: viewMode === mode ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Trimestre'}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-md">
            <button className="btn btn-ghost btn-icon" onClick={() => navigateTime(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ fontWeight: 600, minWidth: '180px', textAlign: 'center' }}>
              {rangeStart.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              {' "" '}
              {rangeEnd.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => navigateTime(1)}>
              <ChevronRight size={20} />
            </button>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-sm">
            <Filter size={16} style={{ color: 'var(--brown-light)' }} />
            <select 
              className="select" 
              style={{ width: 'auto', minWidth: '150px' }}
              value={filterPM}
              onChange={(e) => setFilterPM(e.target.value)}
            >
              <option value="Todos">Todos os PMs</option>
              {uniquePMs.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
          <div style={{ minWidth: `${280 + (columns.length * colWidth)}px` }}>
            {/* Header - Months */}
            <div className="flex" style={{ borderBottom: '1px solid var(--stone)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{
                width: '280px',
                minWidth: '280px',
                padding: '10px 14px',
                background: 'var(--cream)',
                fontWeight: 600,
                fontSize: '12px',
                borderRight: '1px solid var(--stone)'
              }}>
                Projeto / Tarefa
              </div>
              <div className="flex" style={{ flex: 1 }}>
                {monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${group.count * colWidth}px`,
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'capitalize',
                      background: 'var(--cream)',
                      borderRight: '1px solid var(--stone)'
                    }}
                  >
                    {group.month}
                  </div>
                ))}
              </div>
            </div>

            {/* Header - Days */}
            <div className="flex" style={{ borderBottom: '1px solid var(--stone)', position: 'sticky', top: '42px', zIndex: 9, background: 'var(--white)' }}>
              <div style={{
                width: '280px',
                minWidth: '280px',
                borderRight: '1px solid var(--stone)'
              }} />
              <div className="flex" style={{ flex: 1 }}>
                {columns.map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${colWidth}px`,
                      minWidth: `${colWidth}px`,
                      padding: '8px 2px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: col.isWeekend ? 'var(--brown-light)' : 'var(--brown)',
                      background: col.isToday ? 'rgba(195, 186, 175, 0.3)' : col.isWeekend ? 'var(--cream)' : 'transparent',
                      borderRight: col.isFirstOfMonth ? '1px solid var(--stone)' : 'none',
                      fontWeight: col.isToday ? 600 : 400
                    }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Projects & Tasks */}
            {filteredProjects.map(project => (
              <div key={project.id}>
                {/* Project Row */}
                <div 
                  className="flex"
                  style={{ 
                    borderBottom: '1px solid var(--stone)',
                    background: 'var(--off-white)',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleProject(project.id)}
                >
                  <div
                    style={{
                      width: '280px',
                      minWidth: '280px',
                      padding: '10px 14px',
                      borderRight: '1px solid var(--stone)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    {project.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: healthConfig[project.health].color 
                      }} 
                    />
                    <div>
                      <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blush-dark)' }}>
                          {project.codigo}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{project.nome}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: '54px' }}>
                    {/* Project summary bar could go here */}
                  </div>
                </div>

                {/* Task Rows */}
                {project.expanded && project.tarefas.map(tarefa => {
                  const position = getTaskPosition(tarefa)
                  return (
                    <div 
                      key={tarefa.id}
                      className="flex"
                      style={{ 
                        borderBottom: '1px solid var(--stone)',
                        background: 'var(--white)'
                      }}
                    >
                      <div
                        style={{
                          width: '280px',
                          minWidth: '280px',
                          padding: '8px 14px 8px 40px',
                          borderRight: '1px solid var(--stone)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {tarefa.marco ? (
                          <Flag size={14} style={{ color: 'var(--warning)' }} />
                        ) : (
                          <div style={{ width: '14px' }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div 
                            style={{ 
                              fontSize: '13px',
                              fontWeight: tarefa.marco ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {tarefa.nome}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {tarefa.responsavel}
                          </div>
                        </div>
                        {tarefa.dependencias.length > 0 && (
                          <Link2 size={12} style={{ color: 'var(--brown-light)' }} />
                        )}
                      </div>
                      <div 
                        style={{ 
                          flex: 1, 
                          position: 'relative', 
                          height: '44px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {/* Grid lines */}
                        <div 
                          className="flex" 
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0 
                          }}
                        >
                          {columns.map((col, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: `${colWidth}px`,
                                minWidth: `${colWidth}px`,
                                height: '100%',
                                background: col.isToday ? 'rgba(195, 186, 175, 0.2)' : col.isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                                borderRight: col.isFirstOfMonth ? '1px solid var(--stone)' : 'none'
                              }}
                            />
                          ))}
                        </div>

                        {/* Task Bar */}
                        {tarefa.marco ? (
                          // Marco (milestone) - diamond
                          <div
                            style={{
                              position: 'absolute',
                              left: position.left,
                              transform: 'translateX(-50%)',
                              width: '16px',
                              height: '16px',
                              background: statusConfig[tarefa.status].color,
                              borderRadius: '2px',
                              cursor: 'pointer',
                              zIndex: 2,
                              rotate: '45deg'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTask({ ...tarefa, projeto: project })
                            }}
                            title={tarefa.nome}
                          />
                        ) : (
                          // Regular task bar
                          <div
                            style={{
                              position: 'absolute',
                              left: position.left,
                              width: position.width,
                              height: '24px',
                              background: statusConfig[tarefa.status].bg,
                              borderRadius: '6px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: `1px solid ${statusConfig[tarefa.status].color}`,
                              zIndex: 2
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTask({ ...tarefa, projeto: project })
                            }}
                            title={`${tarefa.nome} (${tarefa.progresso}%)`}
                          >
                            {/* Progress fill */}
                            <div
                              style={{
                                height: '100%',
                                width: `${tarefa.progresso}%`,
                                background: statusConfig[tarefa.status].color,
                                opacity: 0.6
                              }}
                            />
                            {/* Label inside bar if wide enough */}
                            {parseFloat(position.width) > 8 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '8px',
                                  transform: 'translateY(-50%)',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: tarefa.progresso > 50 ? 'var(--white)' : statusConfig[tarefa.status].color,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: 'calc(100% - 16px)'
                                }}
                              >
                                {tarefa.nome}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend - Inline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 16px',
          background: 'var(--cream)',
          borderTop: '1px solid var(--stone)',
          fontSize: '11px',
          flexWrap: 'wrap'
        }}>
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: config.bg, border: `1px solid ${config.color}` }} />
              <span style={{ color: 'var(--brown-light)' }}>{config.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--warning)', borderRadius: '1px', transform: 'rotate(45deg)' }} />
            <span style={{ color: 'var(--brown-light)' }}>Marco</span>
          </div>
        </div>
      </div>
        </>
      )}

      {/* TAB: Bloqueios */}
      {activeTab === 'bloqueios' && (
        <div>
          {/* KPIs Bloqueios */}
          <div className="stats-grid mb-xl" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(184, 138, 138, 0.15)' }}>
                <AlertOctagon size={22} style={{ stroke: 'var(--error)' }} />
              </div>
              <div className="stat-value">{bloqueiosAtivos}</div>
              <div className="stat-label">Bloqueios Ativos</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(184, 138, 138, 0.25)' }}>
                <AlertTriangle size={22} style={{ stroke: 'var(--error)' }} />
              </div>
              <div className="stat-value">{bloqueiosCriticos}</div>
              <div className="stat-label">Críticos</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(138, 158, 184, 0.15)' }}>
                <Users size={22} style={{ stroke: 'var(--info)' }} />
              </div>
              <div className="stat-value">{bloqueiosData.filter(b => b.tipo === 'cliente').length}</div>
              <div className="stat-label">Aguardam Cliente</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(122, 158, 122, 0.15)' }}>
                <CheckCircle size={22} style={{ stroke: 'var(--success)' }} />
              </div>
              <div className="stat-value">{bloqueiosData.filter(b => b.status === 'resolvido').length}</div>
              <div className="stat-label">Resolvidos</div>
            </div>
          </div>

          {/* Lista de Bloqueios */}
          <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Bloqueios de Todos os Projetos
              </h3>
              <div className="flex gap-sm">
                <select className="select" style={{ width: 'auto', minWidth: '150px' }}>
                  <option value="todos">Todos os Tipos</option>
                  {Object.entries(bloqueioTipoConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select className="select" style={{ width: 'auto', minWidth: '130px' }}>
                  <option value="ativos">Ativos</option>
                  <option value="resolvidos">Resolvidos</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bloqueiosData.filter(b => b.status === 'ativo').map(bloqueio => {
                const TipoIcon = bloqueioTipoConfig[bloqueio.tipo]?.icon || AlertOctagon
                return (
                  <div
                    key={bloqueio.id}
                    style={{
                      padding: '20px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${prioridadeConfig[bloqueio.prioridade]?.color || 'var(--stone)'}`
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-md" style={{ flex: 1 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'var(--white)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: bloqueioTipoConfig[bloqueio.tipo]?.color || 'var(--brown-light)'
                        }}>
                          <TipoIcon size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
                            {bloqueio.titulo}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                            {bloqueio.descricao}
                          </div>
                          <div className="flex items-center gap-md" style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            <span className="flex items-center gap-xs">
                              <Building2 size={12} />
                              {bloqueio.projeto.codigo} - {bloqueio.projeto.nome}
                            </span>
                            <span className="flex items-center gap-xs">
                              <User size={12} />
                              {bloqueio.responsavel}
                            </span>
                            <span className="flex items-center gap-xs">
                              <Calendar size={12} />
                              {new Date(bloqueio.criado_em).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                          {bloqueio.impacto && (
                            <div style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              background: 'rgba(184, 138, 138, 0.1)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: 'var(--error)'
                            }}>
                              <strong>Impacto:</strong> {bloqueio.impacto}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-sm">
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: prioridadeConfig[bloqueio.prioridade]?.bg,
                          color: prioridadeConfig[bloqueio.prioridade]?.color
                        }}>
                          {prioridadeConfig[bloqueio.prioridade]?.label}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: bloqueioTipoConfig[bloqueio.tipo]?.color + '20',
                          color: bloqueioTipoConfig[bloqueio.tipo]?.color
                        }}>
                          {bloqueioTipoConfig[bloqueio.tipo]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Tarefas (Asana-style) */}
      {activeTab === 'tarefas' && (
        <div>
          {/* KPIs Tarefas */}
          <div className="stats-grid mb-xl" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(138, 158, 184, 0.15)' }}>
                <Kanban size={22} style={{ stroke: 'var(--info)' }} />
              </div>
              <div className="stat-value">{realTarefas.filter(t => !t.tarefa_pai_id).length}</div>
              <div className="stat-label">Total Tarefas</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(138, 158, 184, 0.15)' }}>
                <Clock size={22} style={{ stroke: 'var(--info)' }} />
              </div>
              <div className="stat-value">{realTarefas.filter(t => !t.tarefa_pai_id && t.status === 'em_progresso').length}</div>
              <div className="stat-label">Em Progresso</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(201, 168, 130, 0.2)' }}>
                <Circle size={22} style={{ stroke: 'var(--warning)' }} />
              </div>
              <div className="stat-value">{realTarefas.filter(t => !t.tarefa_pai_id && t.status === 'pendente').length}</div>
              <div className="stat-label">Pendentes</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(122, 158, 122, 0.15)' }}>
                <CheckCircle size={22} style={{ stroke: 'var(--success)' }} />
              </div>
              <div className="stat-value">{realTarefas.filter(t => !t.tarefa_pai_id && t.status === 'concluida').length}</div>
              <div className="stat-label">Concluídas</div>
            </div>
          </div>

          {/* Sub-tabs: Por Projeto / Por Pessoa */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '20px',
            background: 'var(--stone)',
            padding: '4px',
            borderRadius: '10px',
            width: 'fit-content'
          }}>
            <button
              onClick={() => setTarefasView('projeto')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: tarefasView === 'projeto' ? 'var(--white)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: tarefasView === 'projeto' ? 600 : 500,
                color: tarefasView === 'projeto' ? 'var(--brown)' : 'var(--brown-light)',
                cursor: 'pointer',
                boxShadow: tarefasView === 'projeto' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <FolderOpen size={16} />
              Por Projeto
            </button>
            <button
              onClick={() => setTarefasView('pessoa')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: tarefasView === 'pessoa' ? 'var(--white)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: tarefasView === 'pessoa' ? 600 : 500,
                color: tarefasView === 'pessoa' ? 'var(--brown)' : 'var(--brown-light)',
                cursor: 'pointer',
                boxShadow: tarefasView === 'pessoa' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Users size={16} />
              Por Pessoa
            </button>
          </div>

          {/* Loading state */}
          {loadingReal ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
            </div>
          ) : (
            <>
              {/* Vista: Por Projeto */}
              {tarefasView === 'projeto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(getTarefasPorProjeto())
                    .sort(([a], [b]) => {
                      if (a === 'sem_projeto') return 1
                      if (b === 'sem_projeto') return -1
                      const projA = getProjetoInfo(a)
                      const projB = getProjetoInfo(b)
                      return (projB?.codigo || '').localeCompare(projA?.codigo || '')
                    })
                    .map(([projectId, tarefas]) => {
                      const projeto = getProjetoInfo(projectId)
                      const concluidas = tarefas.filter(t => t.status === 'concluida').length
                      return (
                        <div key={projectId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                          {/* Project Header */}
                          <div style={{
                            padding: '14px 20px',
                            background: 'var(--cream)',
                            borderBottom: '1px solid var(--stone)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <FolderOpen size={18} style={{ color: 'var(--warning)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                                {projeto ? `${projeto.codigo} - ${projeto.nome}` : 'Sem Projeto'}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '12px',
                              color: 'var(--brown-light)',
                              background: 'var(--white)',
                              padding: '4px 10px',
                              borderRadius: '12px'
                            }}>
                              {concluidas}/{tarefas.length} concluídas
                            </span>
                          </div>

                          {/* Tasks List */}
                          <div>
                            {tarefas.map(tarefa => (
                              <TarefaRow
                                key={tarefa.id}
                                tarefa={tarefa}
                                getMembroInfo={getMembroInfo}
                                getProjetoInfo={getProjetoInfo}
                                showProject={false}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                  {Object.keys(getTarefasPorProjeto()).length === 0 && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--brown-light)' }}>
                      <LayoutList size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>Sem tarefas. Cria a primeira na página Tarefas!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Vista: Por Pessoa */}
              {tarefasView === 'pessoa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(getTarefasPorPessoa())
                    .sort(([a], [b]) => {
                      if (a === 'sem_atribuicao') return 1
                      if (b === 'sem_atribuicao') return -1
                      const membroA = getMembroInfo(a)
                      const membroB = getMembroInfo(b)
                      return (membroA?.nome || '').localeCompare(membroB?.nome || '')
                    })
                    .map(([personId, tarefas]) => {
                      const pessoa = getMembroInfo(personId)
                      const concluidas = tarefas.filter(t => t.status === 'concluida').length
                      const emProgresso = tarefas.filter(t => t.status === 'em_progresso').length
                      return (
                        <div key={personId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                          {/* Person Header */}
                          <div style={{
                            padding: '14px 20px',
                            background: 'var(--cream)',
                            borderBottom: '1px solid var(--stone)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            {pessoa ? (
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '13px',
                                color: 'var(--brown-dark)'
                              }}>
                                {pessoa.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            ) : (
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--stone)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <User size={18} style={{ color: 'var(--brown-light)' }} />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                                {pessoa?.nome || 'Sem Atribuição'}
                              </div>
                              {pessoa?.funcao && (
                                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                                  {pessoa.funcao}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {emProgresso > 0 && (
                                <span style={{
                                  fontSize: '11px',
                                  color: 'var(--info)',
                                  background: 'rgba(138, 158, 184, 0.15)',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontWeight: 500
                                }}>
                                  {emProgresso} em progresso
                                </span>
                              )}
                              <span style={{
                                fontSize: '12px',
                                color: 'var(--brown-light)',
                                background: 'var(--white)',
                                padding: '4px 10px',
                                borderRadius: '12px'
                              }}>
                                {concluidas}/{tarefas.length}
                              </span>
                            </div>
                          </div>

                          {/* Tasks List */}
                          <div>
                            {tarefas.map(tarefa => (
                              <TarefaRow
                                key={tarefa.id}
                                tarefa={tarefa}
                                getMembroInfo={getMembroInfo}
                                getProjetoInfo={getProjetoInfo}
                                showProject={true}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                  {Object.keys(getTarefasPorPessoa()).length === 0 && (
                    <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--brown-light)' }}>
                      <Users size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>Sem tarefas. Cria a primeira na página Tarefas!</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedTask(null)}
          style={{ justifyContent: 'flex-end', padding: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              height: '100vh',
              background: 'var(--white)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: 'var(--space-lg)',
              borderBottom: '1px solid var(--stone)',
              position: 'sticky',
              top: 0,
              background: 'var(--white)',
              zIndex: 10
            }}>
              <div className="flex items-center justify-between mb-sm">
                <span 
                  className="badge"
                  style={{ 
                    background: statusConfig[selectedTask.status].bg,
                    color: statusConfig[selectedTask.status].color
                  }}
                >
                  {statusConfig[selectedTask.status].label}
                </span>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTask(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-sm mb-xs">
                {selectedTask.marco && <Flag size={16} style={{ color: 'var(--warning)' }} />}
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                  {selectedTask.nome}
                </h2>
              </div>
              <div className="text-muted" style={{ fontSize: '13px' }}>
                {selectedTask.projeto.codigo} "" {selectedTask.projeto.nome}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: 'var(--space-lg)' }}>
              {/* Progress */}
              {!selectedTask.marco && (
                <div className="mb-lg">
                  <div className="flex items-center justify-between mb-sm">
                    <span className="text-muted" style={{ fontSize: '13px' }}>Progresso</span>
                    <span style={{ fontWeight: 600 }}>{selectedTask.progresso}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: '8px' }}>
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${selectedTask.progresso}%`,
                        background: statusConfig[selectedTask.status].color
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="mb-lg">
                <div className="text-muted" style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Datas
                </div>
                <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                  <div 
                    style={{
                      padding: '12px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div className="text-muted" style={{ fontSize: '11px', marginBottom: '2px' }}>Início</div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {new Date(selectedTask.inicio).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                  <div 
                    style={{
                      padding: '12px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div className="text-muted" style={{ fontSize: '11px', marginBottom: '2px' }}>Fim</div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {new Date(selectedTask.fim).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsável */}
              <div className="mb-lg">
                <div className="text-muted" style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Responsável
                </div>
                <div 
                  style={{
                    padding: '12px 16px',
                    background: 'var(--cream)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--brown-dark)'
                    }}
                  >
                    {selectedTask.responsavel.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedTask.responsavel}</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>Equipa</div>
                  </div>
                </div>
              </div>

              {/* Dependências */}
              {selectedTask.dependencias.length > 0 && (
                <div className="mb-lg">
                  <div className="text-muted" style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Dependências
                  </div>
                  <div className="flex flex-col gap-sm">
                    {selectedTask.dependencias.map(depId => {
                      const dep = selectedTask.projeto.tarefas.find(t => t.id === depId)
                      if (!dep) return null
                      return (
                        <div 
                          key={depId}
                          style={{
                            padding: '10px 14px',
                            background: 'var(--cream)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <Link2 size={14} style={{ color: 'var(--brown-light)' }} />
                          <span style={{ fontSize: '13px' }}>{dep.nome}</span>
                          <span 
                            className="badge"
                            style={{ 
                              marginLeft: 'auto',
                              background: statusConfig[dep.status].bg,
                              color: statusConfig[dep.status].color,
                              fontSize: '10px'
                            }}
                          >
                            {statusConfig[dep.status].label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-sm">
                <button className="btn btn-outline" style={{ width: '100%' }}>
                  <Users size={16} />
                  Alterar Responsável
                </button>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  <CheckCircle2 size={16} />
                  Atualizar Progresso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="modal-overlay" onClick={() => setShowAddTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Nova Tarefa</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddTaskModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Projeto</label>
                <select className="select">
                  <option value="">Selecionar projeto...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.codigo}>
                      {p.codigo} "" {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Nome da Tarefa</label>
                <input type="text" className="input" placeholder="Ex: Instalação de pavimentos" />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Data Início</label>
                  <input type="date" className="input" />
                </div>
                <div className="input-group">
                  <label className="input-label">Data Fim</label>
                  <input type="date" className="input" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Responsável</label>
                <select className="select">
                  <option value="">Selecionar responsável...</option>
                  <option value="maria">Maria Santos</option>
                  <option value="pedro">Pedro Costa</option>
                  <option value="ana">Ana Oliveira</option>
                  <option value="carlos">Carlos Ferreira</option>
                  <option value="joao">João Mendes</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Dependências (opcional)</label>
                <select className="select" multiple style={{ minHeight: '80px' }}>
                  <option value="">Nenhuma</option>
                </select>
                <span className="text-muted" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Ctrl+click para selecionar múltiplas
                </span>
              </div>

              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                  <Flag size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: '14px' }}>Marcar como Marco</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddTaskModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary">
                <Plus size={16} />
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component: TarefaRow (used in Tarefas tab)
function TarefaRow({ tarefa, getMembroInfo, getProjetoInfo, showProject }) {
  const responsavel = getMembroInfo(tarefa.responsavel_id)
  const projeto = getProjetoInfo(tarefa.projeto_id)
  const isComplete = tarefa.status === 'concluida'
  const isOverdue = tarefa.data_limite && tarefa.status !== 'concluida' && new Date(tarefa.data_limite) < new Date()

  const getStatusConfig = (status) => {
    const configs = {
      pendente: { label: 'A Fazer', color: 'var(--brown-light)', bg: 'var(--stone)' },
      em_progresso: { label: 'Em Progresso', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
      em_revisao: { label: 'Em Revisão', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
      concluida: { label: 'Concluída', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
      cancelada: { label: 'Cancelada', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
    }
    return configs[status] || configs.pendente
  }

  const getPrioridadeConfig = (prio) => {
    const configs = {
      baixa: { label: 'Baixa', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
      media: { label: 'Média', color: 'var(--brown)', bg: 'var(--stone)' },
      alta: { label: 'Alta', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
      urgente: { label: 'Urgente', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
    }
    return configs[prio?.toLowerCase()] || configs.media
  }

  const statusConfig = getStatusConfig(tarefa.status)
  const prioConfig = getPrioridadeConfig(tarefa.prioridade)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 20px',
      borderBottom: '1px solid var(--stone)',
      background: 'var(--white)'
    }}>
      {/* Status circle */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: `2px solid ${statusConfig.color}`,
        background: isComplete ? statusConfig.color : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {isComplete && <CheckCircle size={14} style={{ color: 'white' }} />}
      </div>

      {/* Task info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500,
          color: isComplete ? 'var(--brown-light)' : 'var(--brown)',
          textDecoration: isComplete ? 'line-through' : 'none',
          marginBottom: '2px'
        }}>
          {tarefa.titulo}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--brown-light)'
        }}>
          {showProject && projeto && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FolderOpen size={12} />
                {projeto.codigo}
              </span>
              <span>•</span>
            </>
          )}
          {tarefa.data_limite && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isOverdue ? 'var(--error)' : 'var(--brown-light)'
            }}>
              <Calendar size={12} />
              {new Date(tarefa.data_limite).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
              {isOverdue && ' (Atrasada)'}
            </span>
          )}
          {tarefa.subtarefas && tarefa.subtarefas.length > 0 && (
            <span style={{
              fontSize: '10px',
              background: 'var(--stone)',
              padding: '2px 6px',
              borderRadius: '8px'
            }}>
              {tarefa.subtarefas.filter(s => s.status === 'concluida').length}/{tarefa.subtarefas.length} subtarefas
            </span>
          )}
        </div>
      </div>

      {/* Responsavel avatar */}
      {!showProject && responsavel && (
        <div
          title={responsavel.nome}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--warning)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {responsavel.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
        </div>
      )}

      {/* Priority badge */}
      <span style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 600,
        background: prioConfig.bg,
        color: prioConfig.color,
        flexShrink: 0
      }}>
        {prioConfig.label}
      </span>

      {/* Status badge */}
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
        background: statusConfig.bg,
        color: statusConfig.color,
        flexShrink: 0,
        minWidth: '80px',
        textAlign: 'center'
      }}>
        {statusConfig.label}
      </span>
    </div>
  )
}
