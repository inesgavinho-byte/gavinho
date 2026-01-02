import { useState, useEffect } from 'react'
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
  GanttChart,
  Kanban,
  Search,
  Circle,
  Edit,
  Trash2,
  FolderOpen,
  User
} from 'lucide-react'

// ============================================
// TAB: TAREFAS (KANBAN)
// ============================================
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

function TarefasTab() {
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

  const handleSave = async () => {
    if (!form.titulo.trim()) return

    try {
      if (editingTarefa) {
        await supabase.from('tarefas').update(form).eq('id', editingTarefa.id)
      } else {
        await supabase.from('tarefas').insert([{ ...form, tarefa_pai_id: parentTaskId || null }])
      }
      setShowModal(false)
      setEditingTarefa(null)
      setParentTaskId(null)
      setForm({ titulo: '', descricao: '', projeto_id: '', prioridade: 'Media', status: 'pendente', data_limite: '', responsavel_id: '' })
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await supabase.from('tarefas').delete().eq('tarefa_pai_id', id)
      await supabase.from('tarefas').delete().eq('id', id)
      setShowDeleteConfirm(null)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleStatusChange = async (task, newStatus) => {
    try {
      await supabase.from('tarefas').update({ status: newStatus }).eq('id', task.id)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleQuickSubtask = async (parentId) => {
    if (!quickSubtask.trim()) return
    try {
      const parent = tarefas.find(t => t.id === parentId)
      await supabase.from('tarefas').insert([{
        titulo: quickSubtask,
        projeto_id: parent?.projeto_id || null,
        tarefa_pai_id: parentId,
        prioridade: 'Media',
        status: 'pendente'
      }])
      setQuickSubtask('')
      setAddingSubtaskTo(null)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const openEdit = (tarefa) => {
    setEditingTarefa(tarefa)
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

  const openNewTask = (projetoId = '', parentId = null) => {
    setEditingTarefa(null)
    setParentTaskId(parentId)
    setForm({ titulo: '', descricao: '', projeto_id: projetoId || '', prioridade: 'Media', status: 'pendente', data_limite: '', responsavel_id: '' })
    setShowModal(true)
  }

  const toggleProject = (id) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleTask = (id) => setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }))

  const groupedTasks = getGroupedTasks()
  const stats = {
    total: tarefas.filter(t => !t.tarefa_pai_id).length,
    pendentes: tarefas.filter(t => !t.tarefa_pai_id && t.status === 'pendente').length,
    emProgresso: tarefas.filter(t => !t.tarefa_pai_id && (t.status === 'em_progresso' || t.status === 'em_revisao')).length,
    concluidas: tarefas.filter(t => !t.tarefa_pai_id && t.status === 'concluida').length
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}><div className="loading-spinner" /></div>
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown-light)' }}>{stats.pendentes}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Pendentes</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning)' }}>{stats.emProgresso}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Em Progresso</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{stats.concluidas}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Concluídas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input
              type="text"
              placeholder="Pesquisar tarefas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
            <option value="">Todos os estados</option>
            {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
            <option value="">Todos os responsáveis</option>
            {equipa.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <button onClick={() => openNewTask()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {Object.keys(groupedTasks).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
            Sem tarefas. Cria a primeira!
          </div>
        ) : (
          [...projetos.filter(p => groupedTasks[p.id]), ...(groupedTasks['sem_projeto'] ? [{ id: 'sem_projeto', codigo: '', nome: 'Sem Projeto' }] : [])].map(projeto => (
            <div key={projeto.id}>
              {/* Header Projeto */}
              <div
                onClick={() => toggleProject(projeto.id)}
                style={{
                  padding: '12px 16px',
                  background: 'var(--cream)',
                  borderBottom: '1px solid var(--stone)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                {expandedProjects[projeto.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <FolderOpen size={16} style={{ color: 'var(--gold)' }} />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  {projeto.codigo && `${projeto.codigo} - `}{projeto.nome}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: 'auto' }}>
                  {groupedTasks[projeto.id]?.length || 0} tarefas
                </span>
              </div>
              
              {/* Tarefas do Projeto */}
              {expandedProjects[projeto.id] && groupedTasks[projeto.id]?.map(task => (
                <div key={task.id}>
                  {/* Tarefa Principal */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--stone)', gap: '10px' }}>
                    {task.subtarefas?.length > 0 && (
                      <button onClick={() => toggleTask(task.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        {expandedTasks[task.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(task, task.status === 'concluida' ? 'pendente' : 'concluida')}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {task.status === 'concluida' ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <Circle size={18} style={{ color: 'var(--brown-light)' }} />
                      )}
                    </button>
                    <span style={{ flex: 1, textDecoration: task.status === 'concluida' ? 'line-through' : 'none', color: task.status === 'concluida' ? 'var(--brown-light)' : 'var(--brown)', fontSize: '13px' }}>
                      {task.titulo}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: PRIORIDADES.find(p => p.id === task.prioridade)?.bg, color: PRIORIDADES.find(p => p.id === task.prioridade)?.color }}>
                      {task.prioridade}
                    </span>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '11px', background: 'white' }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {task.data_limite && (
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(task.data_limite).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setMenuOpen(menuOpen === task.id ? null : task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <MoreVertical size={16} style={{ color: 'var(--brown-light)' }} />
                      </button>
                      {menuOpen === task.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid var(--stone)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '140px' }}>
                          <button onClick={() => openEdit(task)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <Edit size={14} /> Editar
                          </button>
                          <button onClick={() => { setAddingSubtaskTo(task.id); setMenuOpen(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <Plus size={14} /> Subtarefa
                          </button>
                          <button onClick={() => { setShowDeleteConfirm(task.id); setMenuOpen(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}>
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Subtarefas */}
                  {expandedTasks[task.id] && task.subtarefas?.map(sub => (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 8px 48px', borderBottom: '1px solid var(--stone)', gap: '10px', background: 'rgba(0,0,0,0.02)' }}>
                      <button onClick={() => handleStatusChange(sub, sub.status === 'concluida' ? 'pendente' : 'concluida')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        {sub.status === 'concluida' ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Circle size={16} style={{ color: 'var(--brown-light)' }} />}
                      </button>
                      <span style={{ flex: 1, fontSize: '12px', textDecoration: sub.status === 'concluida' ? 'line-through' : 'none', color: sub.status === 'concluida' ? 'var(--brown-light)' : 'var(--brown)' }}>
                        {sub.titulo}
                      </span>
                      <button onClick={() => { setShowDeleteConfirm(sub.id); setMenuOpen(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={12} style={{ color: 'var(--brown-light)' }} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Input subtarefa rápida */}
                  {addingSubtaskTo === task.id && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 8px 48px', borderBottom: '1px solid var(--stone)', gap: '8px', background: 'rgba(0,0,0,0.02)' }}>
                      <input
                        type="text"
                        placeholder="Nova subtarefa..."
                        value={quickSubtask}
                        onChange={e => setQuickSubtask(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleQuickSubtask(task.id); if (e.key === 'Escape') setAddingSubtaskTo(null) }}
                        autoFocus
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}
                      />
                      <button onClick={() => handleQuickSubtask(task.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Adicionar</button>
                      <button onClick={() => setAddingSubtaskTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Modal Nova/Editar Tarefa */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editingTarefa ? 'Editar Tarefa' : parentTaskId ? 'Nova Subtarefa' : 'Nova Tarefa'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título da tarefa" className="form-input" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional" className="form-input" rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Projeto</label>
                  <select value={form.projeto_id} onChange={e => setForm({ ...form, projeto_id: e.target.value })} className="form-input">
                    <option value="">Sem projeto</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Responsável</label>
                  <select value={form.responsavel_id} onChange={e => setForm({ ...form, responsavel_id: e.target.value })} className="form-input">
                    <option value="">Não atribuído</option>
                    {equipa.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Prioridade</label>
                  <select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })} className="form-input">
                    {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input">
                    {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Data Limite</label>
                  <input type="date" value={form.data_limite} onChange={e => setForm({ ...form, data_limite: e.target.value })} className="form-input" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={!form.titulo.trim()}>
                {editingTarefa ? 'Guardar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Delete */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Eliminar Tarefa</h3>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Tens a certeza? Esta ação não pode ser revertida.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn" style={{ background: 'var(--error)', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// TAB: TIMELINE (GANTT)
// ============================================

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

export default function Planning() {
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' or 'tarefas'
  const [projects, setProjects] = useState(projectsData)
  const [viewMode, setViewMode] = useState('month') // week, month, quarter
  const [currentDate, setCurrentDate] = useState(new Date(2024, 11, 18)) // Dec 18, 2024
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterPM, setFilterPM] = useState('Todos')
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)

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
  const navigate = (direction) => {
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

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Planning</h1>
          <p className="page-subtitle">Gestão de projetos e tarefas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--stone)' }}>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '14px 24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'timeline' ? 600 : 400,
              color: activeTab === 'timeline' ? 'var(--brown)' : 'var(--brown-light)',
              borderBottom: activeTab === 'timeline' ? '2px solid var(--gold)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <GanttChart size={18} />
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('tarefas')}
            style={{
              padding: '14px 24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'tarefas' ? 600 : 400,
              color: activeTab === 'tarefas' ? 'var(--brown)' : 'var(--brown-light)',
              borderBottom: activeTab === 'tarefas' ? '2px solid var(--gold)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Kanban size={18} />
            Tarefas
          </button>
        </div>
      </div>

      {/* Tab: Tarefas */}
      {activeTab === 'tarefas' && <TarefasTab />}

      {/* Tab: Tarefas */}
      {activeTab === 'tarefas' && <TarefasTab />}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <>
          {/* Toolbar Compacta */}
          <div className="card" style={{ padding: '8px 16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              {/* View Mode */}
              <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: '20px', padding: '3px' }}>
                {['week', 'month', 'quarter'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '5px 12px', borderRadius: '16px', border: 'none',
                      background: viewMode === mode ? 'white' : 'transparent',
                      boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontWeight: viewMode === mode ? 600 : 400, fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Trimestre'}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: 600, fontSize: '12px', minWidth: '140px', textAlign: 'center' }}>
                  {rangeStart.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })} - {rangeEnd.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => navigate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => setCurrentDate(new Date())} style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--stone)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Hoje</button>
              </div>

              {/* Filter & Add */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select value={filterPM} onChange={(e) => setFilterPM(e.target.value)} style={{ padding: '5px 8px', fontSize: '11px', border: '1px solid var(--stone)', borderRadius: '6px' }}>
                  <option value="Todos">Todos PMs</option>
                  {uniquePMs.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
                <button onClick={() => setShowAddTaskModal(true)} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }}>
                  <Plus size={14} /> Nova
                </button>
              </div>
            </div>
          </div>

      {/* Gantt Chart */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', height: 'calc(100vh - 220px)', minHeight: '400px' }}>
          {/* Coluna Fixa - Nomes */}
          <div style={{ width: '240px', minWidth: '240px', borderRight: '2px solid var(--stone)', background: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', background: 'var(--cream)', borderBottom: '1px solid var(--stone)', fontWeight: 600, fontSize: '11px' }}>Projeto / Tarefa</div>
            <div style={{ height: '28px', background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredProjects.map(project => (
                <div key={project.id}>
                  <div onClick={() => toggleProject(project.id)} style={{ padding: '6px 10px', background: 'var(--off-white)', borderBottom: '1px solid var(--stone)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
                    {project.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: healthConfig[project.health].color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '9px', color: 'var(--gold)', fontWeight: 600 }}>{project.codigo}</span>
                      <div style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.nome}</div>
                    </div>
                  </div>
                  {project.expanded && project.tarefas.map(task => (
                    <div key={task.id} onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : { ...task, projeto: project })} style={{ padding: '4px 10px 4px 28px', borderBottom: '1px solid var(--stone)', cursor: 'pointer', background: selectedTask?.id === task.id ? 'var(--cream)' : 'white', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {task.dependencias?.length > 0 && <Link2 size={9} style={{ color: 'var(--brown-light)' }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.nome}</div>
                        <div style={{ fontSize: '8px', color: 'var(--brown-light)' }}>{task.responsavel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline - Scroll */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ minWidth: `${columns.length * colWidth}px` }}>
              {/* Header Meses */}
              <div style={{ display: 'flex', background: 'var(--cream)', borderBottom: '1px solid var(--stone)', position: 'sticky', top: 0, zIndex: 3 }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width: `${g.count * colWidth}px`, padding: '8px 4px', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'capitalize', borderRight: '1px solid var(--stone)' }}>{g.month}</div>
                ))}
              </div>
              {/* Header Dias */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--stone)', position: 'sticky', top: '32px', zIndex: 3, background: 'white' }}>
                {columns.map((col, i) => (
                  <div key={i} style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, padding: '4px 1px', textAlign: 'center', fontSize: '9px', color: col.isWeekend ? 'var(--brown-light)' : 'var(--brown)', background: col.isToday ? 'rgba(201, 168, 130, 0.3)' : col.isWeekend ? 'var(--cream)' : 'white', fontWeight: col.isToday ? 700 : 400, borderRight: col.isFirstOfMonth ? '1px solid var(--stone)' : 'none' }}>{col.label}</div>
                ))}
              </div>
              {/* Rows */}
              {filteredProjects.map(project => (
                <div key={project.id}>
                  <div style={{ display: 'flex', background: 'var(--off-white)', borderBottom: '1px solid var(--stone)', height: '36px' }}>
                    {columns.map((col, i) => (<div key={i} style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, height: '100%', background: col.isToday ? 'rgba(201, 168, 130, 0.15)' : col.isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent', borderRight: col.isFirstOfMonth ? '1px solid var(--stone)' : 'none' }} />))}
                  </div>
                  {project.expanded && project.tarefas.map(tarefa => {
                    const pos = getTaskPosition(tarefa)
                    return (
                      <div key={tarefa.id} style={{ display: 'flex', borderBottom: '1px solid var(--stone)', height: '32px', position: 'relative' }}>
                        {columns.map((col, i) => (<div key={i} style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, height: '100%', background: col.isToday ? 'rgba(201, 168, 130, 0.15)' : col.isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent', borderRight: col.isFirstOfMonth ? '1px solid var(--stone)' : 'none' }} />))}
                        {tarefa.marco ? (
                          <div onClick={() => setSelectedTask({ ...tarefa, projeto: project })} style={{ position: 'absolute', left: pos.left, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: '10px', height: '10px', background: statusConfig[tarefa.status].color, borderRadius: '2px', cursor: 'pointer', zIndex: 2 }} title={tarefa.nome} />
                        ) : (
                          <div onClick={() => setSelectedTask({ ...tarefa, projeto: project })} style={{ position: 'absolute', left: pos.left, top: '50%', transform: 'translateY(-50%)', width: pos.width, height: '18px', background: statusConfig[tarefa.status].bg, border: `1px solid ${statusConfig[tarefa.status].color}`, borderRadius: '4px', cursor: 'pointer', zIndex: 2, overflow: 'hidden' }} title={`${tarefa.nome} (${tarefa.progresso}%)`}>
                            <div style={{ height: '100%', width: `${tarefa.progresso}%`, background: statusConfig[tarefa.status].color, opacity: 0.5 }} />
                            {parseFloat(pos.width) > 50 && (<span style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', fontWeight: 600, color: statusConfig[tarefa.status].color, whiteSpace: 'nowrap' }}>{tarefa.nome}</span>)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda compacta */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '9px', color: 'var(--brown-light)', flexWrap: 'wrap' }}>
        {Object.entries(statusConfig).map(([k, v]) => (<div key={k} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: v.bg, border: `1px solid ${v.color}` }} />{v.label}</div>))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '6px', height: '6px', background: 'var(--warning)', borderRadius: '1px', transform: 'rotate(45deg)' }} />Marco</div>
      </div>
      <div className="card mt-lg">
        <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
          <span className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Legenda:</span>
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-xs">
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '3px',
                  background: config.bg,
                  border: `1px solid ${config.color}`
                }} 
              />
              <span style={{ fontSize: '12px' }}>{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-xs">
            <div 
              style={{ 
                width: '10px', 
                height: '10px', 
                background: 'var(--warning)',
                borderRadius: '2px',
                transform: 'rotate(45deg)'
              }} 
            />
            <span style={{ fontSize: '12px' }}>Marco</span>
          </div>
          <div className="flex items-center gap-xs">
            <Link2 size={12} style={{ color: 'var(--brown-light)' }} />
            <span style={{ fontSize: '12px' }}>Tem dependências</span>
          </div>
        </div>
      </div>

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
        </>
      )}
    </div>
  )
}
