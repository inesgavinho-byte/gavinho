import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users, ChevronLeft, ChevronRight, Calendar, Clock, User, Briefcase,
  Loader2, ZoomIn, ZoomOut, Filter, Download, RefreshCw, Eye, ChevronDown
} from 'lucide-react'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Cores para diferentes projetos
const PROJECT_COLORS = [
  '#8B7355', '#7A9E7A', '#8A9EB8', '#C9A882', '#B89E8B', '#9E8AB8',
  '#8BB8A9', '#B8A98B', '#A9B88B', '#8BA9B8', '#B88B9E', '#9EB88A'
]

export default function TeamWorkloadGantt() {
  const [loading, setLoading] = useState(true)
  const [utilizadores, setUtilizadores] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [ausencias, setAusencias] = useState([])

  // Timeline state
  const [viewMode, setViewMode] = useState('month') // 'week', 'month', 'quarter'
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthsToShow, setMonthsToShow] = useState(6)

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [expandedUsers, setExpandedUsers] = useState({})

  const scrollRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load team members
      const { data: users, error: usersError } = await supabase
        .from('utilizadores')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (usersError) throw usersError
      setUtilizadores(users || [])

      // Load tasks with project info
      const { data: tasks, error: tasksError } = await supabase
        .from('tarefas')
        .select('*, projetos(nome, codigo)')
        .not('responsavel_id', 'is', null)
        .order('data_limite')

      if (!tasksError) {
        setTarefas(tasks || [])
      }

      // Load projects
      const { data: projs, error: projsError } = await supabase
        .from('projetos')
        .select('id, nome, codigo, status')
        .in('status', ['ativo', 'em_progresso', 'on_track', 'at_risk'])

      if (!projsError) {
        setProjetos(projs || [])
      }

      // Load absences
      const { data: abs, error: absError } = await supabase
        .from('ausencias')
        .select('*')
        .gte('data_fim', new Date().toISOString().split('T')[0])

      if (!absError) {
        setAusencias(abs || [])
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      // Use sample data
      setUtilizadores(getSampleUsers())
      setTarefas(getSampleTasks())
    } finally {
      setLoading(false)
    }
  }

  const getSampleUsers = () => [
    { id: '1', nome: 'Ana Silva', cargo: 'Arquiteta', departamento: 'Arquitetura', avatar_url: null },
    { id: '2', nome: 'Bruno Costa', cargo: 'Designer', departamento: 'Design Interiores', avatar_url: null },
    { id: '3', nome: 'Carla Mendes', cargo: 'Engenheira', departamento: 'Construção', avatar_url: null },
    { id: '4', nome: 'David Oliveira', cargo: 'Gestor', departamento: 'Gestão', avatar_url: null },
    { id: '5', nome: 'Eva Santos', cargo: 'Arquiteta', departamento: 'Arquitetura', avatar_url: null }
  ]

  const getSampleTasks = () => {
    const today = new Date()
    const tasks = []
    const users = getSampleUsers()

    // Generate sample tasks across the timeline
    users.forEach((user, idx) => {
      // Add 2-4 tasks per user
      for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
        const startOffset = Math.floor(Math.random() * 60) - 30
        const duration = Math.floor(Math.random() * 30) + 7
        const start = new Date(today)
        start.setDate(start.getDate() + startOffset)
        const end = new Date(start)
        end.setDate(end.getDate() + duration)

        tasks.push({
          id: `task-${idx}-${i}`,
          titulo: `Tarefa ${i + 1} - ${user.nome.split(' ')[0]}`,
          responsavel_id: user.id,
          responsavel_nome: user.nome,
          data_inicio: start.toISOString().split('T')[0],
          data_limite: end.toISOString().split('T')[0],
          status: ['pendente', 'em_progresso', 'concluido'][Math.floor(Math.random() * 3)],
          prioridade: ['baixa', 'media', 'alta'][Math.floor(Math.random() * 3)],
          projetos: { nome: `Projeto ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`, codigo: `GA00${500 + Math.floor(Math.random() * 100)}` }
        })
      }
    })

    return tasks
  }

  // Generate timeline columns
  const getTimelineColumns = () => {
    const columns = []
    const current = new Date(startDate)

    for (let i = 0; i < monthsToShow; i++) {
      const year = current.getFullYear()
      const month = current.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      columns.push({
        year,
        month,
        label: `${MONTHS_PT[month]} ${year.toString().slice(2)}`,
        days: daysInMonth,
        start: new Date(year, month, 1),
        end: new Date(year, month, daysInMonth)
      })

      current.setMonth(current.getMonth() + 1)
    }

    return columns
  }

  const timelineColumns = getTimelineColumns()
  const totalDays = timelineColumns.reduce((sum, col) => sum + col.days, 0)
  const dayWidth = 100 / totalDays // percentage

  // Calculate task position on timeline
  const getTaskPosition = (task) => {
    const taskStart = new Date(task.data_inicio || task.data_limite)
    const taskEnd = new Date(task.data_limite || task.data_inicio)

    const timelineStart = startDate
    const timelineEnd = new Date(startDate)
    timelineEnd.setMonth(timelineEnd.getMonth() + monthsToShow)

    // Clamp to visible range
    const visibleStart = taskStart < timelineStart ? timelineStart : taskStart
    const visibleEnd = taskEnd > timelineEnd ? timelineEnd : taskEnd

    if (visibleEnd < timelineStart || visibleStart > timelineEnd) {
      return null // Task not visible
    }

    const startDays = Math.floor((visibleStart - timelineStart) / (1000 * 60 * 60 * 24))
    const duration = Math.max(1, Math.ceil((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1)

    return {
      left: startDays * dayWidth,
      width: duration * dayWidth
    }
  }

  // Get tasks for a specific user
  const getUserTasks = (userId) => {
    return tarefas.filter(t => t.responsavel_id === userId || t.responsavel_nome === utilizadores.find(u => u.id === userId)?.nome)
  }

  // Get user workload percentage for the visible period
  const getUserWorkload = (userId) => {
    const userTasks = getUserTasks(userId)
    if (userTasks.length === 0) return 0

    const timelineStart = startDate
    const timelineEnd = new Date(startDate)
    timelineEnd.setMonth(timelineEnd.getMonth() + monthsToShow)

    let busyDays = 0
    const totalVisibleDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24))

    userTasks.forEach(task => {
      const taskStart = new Date(task.data_inicio || task.data_limite)
      const taskEnd = new Date(task.data_limite || task.data_inicio)

      const visibleStart = taskStart < timelineStart ? timelineStart : taskStart
      const visibleEnd = taskEnd > timelineEnd ? timelineEnd : taskEnd

      if (visibleStart <= visibleEnd) {
        busyDays += Math.ceil((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24))
      }
    })

    return Math.min(100, Math.round((busyDays / totalVisibleDays) * 100))
  }

  // Navigation
  const navigateTimeline = (direction) => {
    const newDate = new Date(startDate)
    newDate.setMonth(newDate.getMonth() + (direction * Math.ceil(monthsToShow / 2)))
    setStartDate(newDate)
  }

  const goToToday = () => {
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  // Get today's position
  const getTodayPosition = () => {
    const today = new Date()
    const timelineStart = startDate
    const diffDays = Math.floor((today - timelineStart) / (1000 * 60 * 60 * 24))
    if (diffDays < 0 || diffDays > totalDays) return null
    return diffDays * dayWidth
  }

  const todayPosition = getTodayPosition()

  // Filter users
  const filteredUsers = utilizadores.filter(u =>
    !departmentFilter || u.departamento === departmentFilter
  )

  // Get unique departments
  const departments = [...new Set(utilizadores.map(u => u.departamento).filter(Boolean))]

  // Get color for project
  const getProjectColor = (projectId) => {
    const index = projetos.findIndex(p => p.id === projectId)
    return PROJECT_COLORS[index % PROJECT_COLORS.length]
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header / Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Cronograma da Equipa</h3>
            <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
              Visualize as alocações e disponibilidade de cada membro da equipa
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadData} className="btn btn-outline" style={{ padding: '8px 12px' }}>
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
        </div>

        {/* Timeline Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigateTimeline(-1)}
              style={{
                background: 'var(--stone)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToToday}
              style={{
                background: 'var(--brown)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Hoje
            </button>
            <button
              onClick={() => navigateTimeline(1)}
              style={{
                background: 'var(--stone)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Período:</span>
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Departamento:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              <option value="">Todos</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: 'var(--stone)', borderRadius: '2px' }} />
              Planeado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }} />
              Concluído
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '3px', height: '12px', background: 'var(--warning)', borderRadius: '2px' }} />
              Hoje
            </span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {/* Left Panel - Users */}
          <div style={{ width: '250px', flexShrink: 0, borderRight: '2px solid var(--stone)' }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              background: 'var(--cream)',
              borderBottom: '1px solid var(--stone)',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--brown-light)',
              height: '44px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Users size={14} style={{ marginRight: '8px' }} />
              EQUIPA ({filteredUsers.length})
            </div>

            {/* User List */}
            <div style={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
              {filteredUsers.map(user => {
                const workload = getUserWorkload(user.id)
                const userTasks = getUserTasks(user.id)

                return (
                  <div key={user.id}>
                    <div
                      onClick={() => setExpandedUsers(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--stone)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s',
                        background: expandedUsers[user.id] ? 'var(--cream)' : 'white',
                        minHeight: '56px'
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--brown)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        {user.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                          {user.nome}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                          {user.cargo || user.departamento}
                        </div>
                      </div>

                      {/* Workload indicator */}
                      <div style={{
                        width: '40px',
                        textAlign: 'right',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: workload > 80 ? 'var(--error)' : workload > 50 ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {workload}%
                      </div>

                      <ChevronDown
                        size={14}
                        style={{
                          transition: 'transform 0.2s',
                          transform: expandedUsers[user.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                          color: 'var(--brown-light)'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Panel - Timeline */}
          <div style={{ flex: 1, overflow: 'auto' }} ref={scrollRef}>
            {/* Timeline Header */}
            <div style={{
              display: 'flex',
              background: 'var(--cream)',
              borderBottom: '1px solid var(--stone)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              minWidth: `${totalDays * 4}px`
            }}>
              {timelineColumns.map((col, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${(col.days / totalDays) * 100}%`,
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--stone)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--brown)'
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Timeline Rows */}
            <div style={{ position: 'relative', minWidth: `${totalDays * 4}px` }}>
              {/* Today line */}
              {todayPosition !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${todayPosition}%`,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'var(--warning)',
                    zIndex: 5
                  }}
                />
              )}

              {/* User rows */}
              {filteredUsers.map(user => {
                const userTasks = getUserTasks(user.id)
                const isExpanded = expandedUsers[user.id]

                return (
                  <div key={user.id}>
                    {/* Main row - aggregated view */}
                    <div
                      style={{
                        height: '56px',
                        borderBottom: '1px solid var(--stone)',
                        position: 'relative',
                        background: isExpanded ? 'var(--cream)' : 'white'
                      }}
                    >
                      {/* Month grid lines */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                        {timelineColumns.map((col, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: `${(col.days / totalDays) * 100}%`,
                              borderRight: '1px solid var(--stone)',
                              opacity: 0.3
                            }}
                          />
                        ))}
                      </div>

                      {/* Task bars (aggregated) */}
                      {!isExpanded && userTasks.map(task => {
                        const pos = getTaskPosition(task)
                        if (!pos) return null

                        const isCompleted = task.status === 'concluido'
                        const color = task.projeto_id ? getProjectColor(task.projeto_id) : 'var(--brown-light)'

                        return (
                          <div
                            key={task.id}
                            title={`${task.titulo}\n${task.projetos?.nome || ''}`}
                            style={{
                              position: 'absolute',
                              left: `${pos.left}%`,
                              width: `${pos.width}%`,
                              top: '16px',
                              height: '24px',
                              background: isCompleted ? 'var(--success)' : color,
                              opacity: isCompleted ? 0.7 : 0.85,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 6px',
                              overflow: 'hidden'
                            }}
                          >
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              color: 'white',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {task.projetos?.codigo || task.titulo}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Expanded rows - individual tasks */}
                    {isExpanded && userTasks.map(task => {
                      const pos = getTaskPosition(task)
                      if (!pos) return null

                      const isCompleted = task.status === 'concluido'
                      const color = task.projeto_id ? getProjectColor(task.projeto_id) : 'var(--brown-light)'

                      return (
                        <div
                          key={task.id}
                          style={{
                            height: '40px',
                            borderBottom: '1px solid var(--stone)',
                            position: 'relative',
                            background: 'rgba(250, 248, 245, 0.5)'
                          }}
                        >
                          {/* Month grid lines */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                            {timelineColumns.map((col, idx) => (
                              <div
                                key={idx}
                                style={{
                                  width: `${(col.days / totalDays) * 100}%`,
                                  borderRight: '1px solid var(--stone)',
                                  opacity: 0.2
                                }}
                              />
                            ))}
                          </div>

                          {/* Task bar */}
                          <div
                            title={`${task.titulo}\n${task.projetos?.nome || ''}\n${task.data_inicio || ''} - ${task.data_limite || ''}`}
                            style={{
                              position: 'absolute',
                              left: `${pos.left}%`,
                              width: `${pos.width}%`,
                              top: '8px',
                              height: '24px',
                              background: isCompleted ? 'var(--success)' : color,
                              opacity: isCompleted ? 0.7 : 0.9,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 8px',
                              overflow: 'hidden',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: 'white',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {task.titulo}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
            {filteredUsers.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Membros da Equipa</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>
            {tarefas.filter(t => t.status === 'em_progresso').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Tarefas em Progresso</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning)' }}>
            {filteredUsers.filter(u => getUserWorkload(u.id) > 80).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Carga Alta (&gt;80%)</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>
            {filteredUsers.filter(u => getUserWorkload(u.id) < 30).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Disponíveis (&lt;30%)</div>
        </div>
      </div>
    </div>
  )
}
