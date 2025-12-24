import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, Calendar, CheckCircle2, Circle, ChevronRight, ChevronDown,
  MoreVertical, X, Edit, Trash2, FolderOpen, User
} from 'lucide-react'

const STATUS_OPTIONS = [
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

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [equipa, setEquipa] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterResponsavel, setFilterResponsavel] = useState('')
  const [expandedProjects, setExpandedProjects] = useState({})
  const [expandedTasks, setExpandedTasks] = useState({})
  
  const [showModal, setShowModal] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)
  const [parentTaskId, setParentTaskId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [addingSubtaskTo, setAddingSubtaskTo] = useState(null)
  const [quickSubtask, setQuickSubtask] = useState('')
  
  const [form, setForm] = useState({
    titulo: '', descricao: '', projeto_id: '', prioridade: 'Media',
    status: 'pendente', data_limite: '', responsavel_id: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const expanded = {}
    projetos.forEach(p => { expanded[p.id] = true })
    expanded['sem_projeto'] = true
    setExpandedProjects(expanded)
  }, [projetos])

  const fetchData = async () => {
    try {
      const [tarefasRes, projetosRes, equipaRes] = await Promise.all([
        supabase.from('tarefas').select('*').order('created_at', { ascending: false }),
        supabase.from('projetos').select('id, codigo, nome').eq('arquivado', false).order('codigo', { ascending: false }),
        supabase.from('utilizadores').select('id, nome, avatar_url').eq('ativo', true).order('nome')
      ])

      if (tarefasRes.error) throw tarefasRes.error
      setTarefas(tarefasRes.data || [])
      setProjetos(projetosRes.data || [])
      setEquipa(equipaRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar tarefas por projeto
  const getGroupedTasks = () => {
    const groups = {}
    const mainTasks = tarefas.filter(t => {
      if (t.tarefa_pai_id) return false
      const matchSearch = t.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = !filterStatus || t.status === filterStatus
      const matchResponsavel = !filterResponsavel || t.responsavel_id === filterResponsavel
      return matchSearch && matchStatus && matchResponsavel
    })

    mainTasks.forEach(task => {
      const projectId = task.projeto_id || 'sem_projeto'
      if (!groups[projectId]) groups[projectId] = []
      const subtasks = tarefas.filter(t => t.tarefa_pai_id === task.id)
      groups[projectId].push({ ...task, subtarefas: subtasks })
    })

    return groups
  }

  // CRUD
  const handleSave = async () => {
    if (!form.titulo.trim()) return

    try {
      const data = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        projeto_id: form.projeto_id || null,
        prioridade: form.prioridade,
        status: form.status,
        data_limite: form.data_limite || null,
        responsavel_id: form.responsavel_id || null,
        tarefa_pai_id: parentTaskId || null
      }

      if (editingTarefa) {
        await supabase.from('tarefas').update(data).eq('id', editingTarefa.id)
      } else {
        await supabase.from('tarefas').insert([data])
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar tarefa')
    }
  }

  const handleQuickSubtask = async (parentTask) => {
    if (!quickSubtask.trim()) return

    try {
      await supabase.from('tarefas').insert([{
        titulo: quickSubtask,
        projeto_id: parentTask.projeto_id,
        prioridade: 'Media',
        status: 'pendente',
        tarefa_pai_id: parentTask.id
      }])

      setQuickSubtask('')
      setAddingSubtaskTo(null)
      setExpandedTasks(prev => ({ ...prev, [parentTask.id]: true }))
      fetchData()
    } catch (err) {
      alert('Erro ao criar sub-tarefa')
    }
  }

  const handleDelete = async (tarefa) => {
    try {
      await supabase.from('tarefas').delete().eq('id', tarefa.id)
      setShowDeleteConfirm(null)
      fetchData()
    } catch (err) {
      alert('Erro ao eliminar')
    }
  }

  const handleToggleComplete = async (tarefa) => {
    try {
      const newStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida'
      await supabase.from('tarefas').update({ 
        status: newStatus,
        data_conclusao: newStatus === 'concluida' ? new Date().toISOString() : null
      }).eq('id', tarefa.id)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleStatusChange = async (tarefa, newStatus) => {
    try {
      await supabase.from('tarefas').update({ 
        status: newStatus,
        data_conclusao: newStatus === 'concluida' ? new Date().toISOString() : null
      }).eq('id', tarefa.id)
      setMenuOpen(null)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleAssign = async (tarefa, odId) => {
    try {
      await supabase.from('tarefas').update({ responsavel_id: odId || null }).eq('id', tarefa.id)
      setMenuOpen(null)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const resetForm = () => {
    setForm({ titulo: '', descricao: '', projeto_id: '', prioridade: 'Media', status: 'pendente', data_limite: '', responsavel_id: '' })
    setEditingTarefa(null)
    setParentTaskId(null)
  }

  const handleEdit = (tarefa) => {
    setEditingTarefa(tarefa)
    setParentTaskId(tarefa.tarefa_pai_id)
    setForm({
      titulo: tarefa.titulo || '',
      descricao: tarefa.descricao || '',
      projeto_id: tarefa.projeto_id || '',
      prioridade: tarefa.prioridade || 'Media',
      status: tarefa.status || 'pendente',
      data_limite: tarefa.data_limite || '',
      responsavel_id: tarefa.responsavel_id || ''
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleAddToProject = (projectId) => {
    resetForm()
    setForm(prev => ({ ...prev, projeto_id: projectId === 'sem_projeto' ? '' : projectId }))
    setShowModal(true)
  }

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const groupedTasks = getGroupedTasks()
  
  const getProjetoInfo = (id) => projetos.find(p => p.id === id)
  const getMembroInfo = (id) => equipa.find(m => m.id === id)
  const getPrioridadeConfig = (prio) => PRIORIDADES.find(p => p.id === prio) || PRIORIDADES[1]
  const getStatusConfig = (status) => STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0]
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : ''
  const isOverdue = (d, status) => d && status !== 'concluida' && new Date(d) < new Date()
  const getInitials = (nome) => nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'

  const totalMain = tarefas.filter(t => !t.tarefa_pai_id).length
  const concluidas = tarefas.filter(t => !t.tarefa_pai_id && t.status === 'concluida').length

  const sortedProjectIds = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'sem_projeto') return 1
    if (b === 'sem_projeto') return -1
    const projA = getProjetoInfo(a)
    const projB = getProjetoInfo(b)
    return (projA?.codigo || '').localeCompare(projB?.codigo || '')
  })

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // Render task row
  const renderTask = (tarefa, isSubtask = false) => {
    const prioConfig = getPrioridadeConfig(tarefa.prioridade)
    const statusConfig = getStatusConfig(tarefa.status)
    const responsavel = getMembroInfo(tarefa.responsavel_id)
    const isComplete = tarefa.status === 'concluida'
    const hasSubtasks = !isSubtask && tarefa.subtarefas && tarefa.subtarefas.length > 0
    const isExpanded = expandedTasks[tarefa.id]
    const overdue = isOverdue(tarefa.data_limite, tarefa.status)
    const isAddingSubtask = addingSubtaskTo === tarefa.id

    return (
      <div key={tarefa.id}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isSubtask ? '28px 1fr 32px 80px 70px 60px 28px 28px' : '36px 1fr 32px 80px 70px 60px 28px 28px',
          alignItems: 'center', 
          padding: isSubtask ? '6px 12px 6px 44px' : '8px 12px',
          borderBottom: '1px solid var(--stone)', 
          background: isSubtask ? 'var(--cream)' : 'var(--white)',
          fontSize: isSubtask ? '12px' : '13px',
          gap: '6px'
        }}>
          {/* Expand + Check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {!isSubtask && (
              <button onClick={() => toggleTask(tarefa.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--brown-light)', opacity: hasSubtasks ? 1 : 0.3 }}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <button onClick={() => handleToggleComplete(tarefa)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
              {isComplete ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Circle size={16} style={{ color: 'var(--brown-light)' }} />}
            </button>
          </div>

          {/* Título + Sub-task count */}
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span onClick={() => handleEdit(tarefa)} style={{ fontWeight: isSubtask ? 400 : 500, textDecoration: isComplete ? 'line-through' : 'none', color: isComplete ? 'var(--brown-light)' : 'var(--brown)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {tarefa.titulo}
            </span>
            {hasSubtasks && (
              <span style={{ fontSize: '9px', color: 'var(--brown-light)', background: 'var(--stone)', padding: '1px 5px', borderRadius: '6px', flexShrink: 0 }}>
                {tarefa.subtarefas.filter(s => s.status === 'concluida').length}/{tarefa.subtarefas.length}
              </span>
            )}
          </div>

          {/* Avatar responsável */}
          <div>
            {responsavel ? (
              <div title={responsavel.nome} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--warning)', color: 'white', fontSize: '9px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getInitials(responsavel.nome)}
              </div>
            ) : (
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px dashed var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={12} style={{ color: 'var(--brown-light)' }} />
              </div>
            )}
          </div>

          {/* Status */}
          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, background: statusConfig.color === 'var(--success)' ? 'rgba(122, 158, 122, 0.15)' : statusConfig.color === 'var(--warning)' ? 'rgba(201, 168, 130, 0.2)' : statusConfig.color === 'var(--info)' ? 'rgba(138, 158, 184, 0.15)' : 'var(--stone)', color: statusConfig.color, textAlign: 'center' }}>
            {statusConfig.label}
          </span>

          {/* Prioridade */}
          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, background: prioConfig.bg, color: prioConfig.color, textAlign: 'center' }}>
            {tarefa.prioridade}
          </span>

          {/* Data */}
          <div style={{ fontSize: '10px', color: overdue ? 'var(--error)' : 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '2px' }}>
            {tarefa.data_limite && <Calendar size={10} />}
            {formatDate(tarefa.data_limite)}
          </div>

          {/* Editar */}
          <button onClick={() => handleEdit(tarefa)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}>
            <Edit size={14} />
          </button>

          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(menuOpen === tarefa.id ? null : tarefa.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}>
              <MoreVertical size={14} />
            </button>
            {menuOpen === tarefa.id && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(null)} />
                <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 20, minWidth: '150px', overflow: 'hidden' }}>
                  {!isSubtask && (
                    <button onClick={() => { setAddingSubtaskTo(tarefa.id); setExpandedTasks(prev => ({...prev, [tarefa.id]: true})); setMenuOpen(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
                      <Plus size={14} /> Sub-tarefa
                    </button>
                  )}
                  
                  <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 600, color: 'var(--brown-light)', borderTop: '1px solid var(--stone)', marginTop: '4px' }}>ATRIBUIR A</div>
                  <button onClick={() => handleAssign(tarefa, null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', textAlign: 'left', color: 'var(--brown-light)' }}>
                    <User size={12} /> Sem atribuição
                  </button>
                  {equipa.slice(0, 5).map(m => (
                    <button key={m.id} onClick={() => handleAssign(tarefa, m.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', border: 'none', background: tarefa.responsavel_id === m.id ? 'var(--cream)' : 'none', cursor: 'pointer', fontSize: '11px', textAlign: 'left' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--warning)', color: 'white', fontSize: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(m.nome)}</div>
                      {m.nome?.split(' ')[0]}
                    </button>
                  ))}

                  <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 600, color: 'var(--brown-light)', borderTop: '1px solid var(--stone)', marginTop: '4px' }}>STATUS</div>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => handleStatusChange(tarefa, s.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', border: 'none', background: tarefa.status === s.id ? 'var(--cream)' : 'none', cursor: 'pointer', fontSize: '11px', textAlign: 'left' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} /> {s.label}
                    </button>
                  ))}

                  <div style={{ borderTop: '1px solid var(--stone)', marginTop: '4px' }} />
                  <button onClick={() => { setShowDeleteConfirm(tarefa); setMenuOpen(null) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', textAlign: 'left', color: 'var(--error)' }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sub-tarefas */}
        {!isSubtask && isExpanded && (
          <>
            {tarefa.subtarefas?.map(sub => renderTask(sub, true))}
            
            {/* Quick add subtask */}
            <div style={{ padding: '6px 12px 6px 44px', borderBottom: '1px solid var(--stone)', background: 'var(--cream)' }}>
              {isAddingSubtask ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={quickSubtask} 
                    onChange={e => setQuickSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickSubtask(tarefa); if (e.key === 'Escape') { setAddingSubtaskTo(null); setQuickSubtask('') } }}
                    placeholder="Nome da sub-tarefa..."
                    autoFocus
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <button onClick={() => handleQuickSubtask(tarefa)} disabled={!quickSubtask.trim()} style={{ padding: '6px 12px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', opacity: quickSubtask.trim() ? 1 : 0.5 }}>
                    Criar
                  </button>
                  <button onClick={() => { setAddingSubtaskTo(null); setQuickSubtask('') }} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingSubtaskTo(tarefa.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--brown-light)', padding: '2px 0' }}>
                  <Plus size={12} /> Adicionar sub-tarefa
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Tarefas</h1>
          <p style={{ color: 'var(--brown-light)', fontSize: '13px', margin: 0 }}>
            {totalMain - concluidas} pendentes • {concluidas}/{totalMain} concluídas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }} style={{ fontSize: '13px', padding: '8px 14px' }}>
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '7px 7px 7px 30px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}>
          <option value="">Todos os Status</option>
          {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}>
          <option value="">Todos</option>
          {equipa.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </div>

      {/* Grupos por Projeto */}
      {sortedProjectIds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
          <p style={{ margin: 0 }}>Sem tarefas. Crie a primeira!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedProjectIds.map(projectId => {
            const projeto = getProjetoInfo(projectId)
            const tasks = groupedTasks[projectId]
            const isExpanded = expandedProjects[projectId]
            const completedCount = tasks.filter(t => t.status === 'concluida').length

            return (
              <div key={projectId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div onClick={() => toggleProject(projectId)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--cream)', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--stone)' : 'none' }}>
                  {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--brown-light)' }} /> : <ChevronRight size={14} style={{ color: 'var(--brown-light)' }} />}
                  <FolderOpen size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{projeto ? `${projeto.codigo} - ${projeto.nome}` : 'Sem Projeto'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: 'auto' }}>{completedCount}/{tasks.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleAddToProject(projectId) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}>
                    <Plus size={14} />
                  </button>
                </div>
                {isExpanded && <div>{tasks.map(tarefa => renderTask(tarefa))}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '420px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{editingTarefa ? 'Editar Tarefa' : parentTaskId ? 'Nova Sub-tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="O que precisa ser feito?"
                  style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {!parentTaskId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Projeto</label>
                    <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                      <option value="">Sem projeto</option>
                      {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Responsável</label>
                  <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                    <option value="">Sem atribuição</option>
                    {equipa.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                    {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Prioridade</label>
                  <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                    {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Prazo</label>
                  <input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} 
                    style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ fontSize: '12px', padding: '7px 14px' }}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={!form.titulo.trim()} style={{ fontSize: '12px', padding: '7px 14px' }}>{editingTarefa ? 'Guardar' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminação */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '20px', maxWidth: '320px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Eliminar Tarefa</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '16px', fontSize: '13px' }}>Eliminar "<strong>{showDeleteConfirm.titulo}</strong>"?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline" style={{ fontSize: '12px', padding: '7px 12px' }}>Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ padding: '7px 12px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
