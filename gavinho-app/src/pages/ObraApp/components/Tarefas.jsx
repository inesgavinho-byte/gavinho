// =====================================================
// TAREFAS COMPONENT
// Task management for obra workers
// Features: Due-soon alerts, Quick status buttons, Task creation
// =====================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  CheckCircle2, Circle, Clock, AlertCircle, User,
  Calendar, ChevronRight, Loader2, Filter, Search,
  AlertTriangle, Play, Bell, Plus, X, ChevronDown
} from 'lucide-react'
import { styles, colors } from '../styles'
import { formatDate, formatDateTime } from '../utils'
import { notifyTaskCompleted, NOTIFICATION_TYPES, createNotification } from '../utils/notifications'

const TASK_STATUS = {
  pendente: { label: 'Pendente', color: '#f59e0b', icon: Circle },
  em_progresso: { label: 'Em Progresso', color: '#3b82f6', icon: Clock },
  concluida: { label: 'Concluída', color: '#10b981', icon: CheckCircle2 },
  bloqueada: { label: 'Bloqueada', color: '#ef4444', icon: AlertCircle }
}

const PRIORITY_COLORS = {
  alta: '#ef4444',
  media: '#f59e0b',
  baixa: '#6b7280'
}

// Check if task is due soon (within 24h or 48h)
const getDueSoonStatus = (tarefa) => {
  if (!tarefa.data_limite || tarefa.estado === 'concluida') return null
  const now = new Date()
  const dueDate = new Date(tarefa.data_limite)
  const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60)

  if (hoursUntilDue < 0) return 'overdue'
  if (hoursUntilDue <= 24) return 'urgent' // Due within 24h
  if (hoursUntilDue <= 48) return 'soon' // Due within 48h
  return null
}

export default function Tarefas({ obra, user }) {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas') // todas, minhas, pendentes, urgentes
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarefa, setSelectedTarefa] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [showDueAlert, setShowDueAlert] = useState(true)

  // Task creation state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [equipa, setEquipa] = useState([])
  const [newTask, setNewTask] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    responsavel_id: '',
    data_limite: ''
  })

  // Permission check: only admin, gestao, or encarregado can create tasks
  const canCreateTask = user.isAdmin ||
    user.tipo === 'gestao' ||
    user.cargo?.toLowerCase() === 'encarregado'

  useEffect(() => {
    if (obra) {
      loadTarefas()
      loadEquipa()
      const unsubscribe = subscribeToTarefas()
      return unsubscribe
    }
  }, [obra])

  const loadTarefas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          *,
          responsavel:responsavel_id (id, nome),
          criador:criado_por (id, nome)
        `)
        .eq('obra_id', obra.id)
        .order('prioridade', { ascending: false })
        .order('data_limite', { ascending: true })

      if (error) throw error
      setTarefas(data || [])
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToTarefas = () => {
    const channel = supabase
      .channel(`obra_tarefas_${obra.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tarefas',
        filter: `obra_id=eq.${obra.id}`
      }, () => {
        loadTarefas()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const loadEquipa = async () => {
    try {
      // Load workers assigned to this obra
      const { data: trabalhadores } = await supabase
        .from('trabalhador_obras')
        .select('trabalhador_id, trabalhadores(id, nome, cargo)')
        .eq('obra_id', obra.id)

      // Load gestão users (profiles)
      const { data: gestao } = await supabase
        .from('profiles')
        .select('id, nome')

      const members = []
      if (trabalhadores) {
        trabalhadores.forEach(t => {
          if (t.trabalhadores) {
            members.push({ id: t.trabalhadores.id, nome: t.trabalhadores.nome, cargo: t.trabalhadores.cargo })
          }
        })
      }
      if (gestao) {
        gestao.forEach(g => {
          if (!members.find(m => m.id === g.id)) {
            members.push({ id: g.id, nome: g.nome, cargo: 'Gestão' })
          }
        })
      }
      setEquipa(members)
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.titulo.trim()) {
      alert('O título é obrigatório')
      return
    }

    setCreating(true)
    try {
      const taskData = {
        titulo: newTask.titulo.trim(),
        descricao: newTask.descricao.trim() || null,
        obra_id: obra.id,
        criado_por_id: user.id,
        responsavel_id: newTask.responsavel_id || null,
        prioridade: newTask.prioridade,
        estado: 'pendente',
        data_limite: newTask.data_limite || null,
        categoria: 'obra',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('tarefas')
        .insert(taskData)
        .select()

      if (error) throw error

      // Notify assigned person
      if (newTask.responsavel_id && newTask.responsavel_id !== user.id) {
        await createNotification({
          utilizadorId: newTask.responsavel_id,
          tipo: NOTIFICATION_TYPES.TAREFA_ATRIBUIDA,
          mensagem: `${user.nome} atribuiu-te a tarefa: ${newTask.titulo}`,
          obraId: obra.id,
          tarefaId: data?.[0]?.id,
          dados: { titulo: newTask.titulo, atribuidoPor: user.nome }
        })
      }

      // Reset form
      setNewTask({ titulo: '', descricao: '', prioridade: 'media', responsavel_id: '', data_limite: '' })
      setShowCreateForm(false)
      loadTarefas()
    } catch (err) {
      console.error('Erro ao criar tarefa:', err)
      alert('Erro ao criar tarefa')
    } finally {
      setCreating(false)
    }
  }

  const updateTarefaStatus = async (tarefa, newStatus) => {
    setUpdating(true)
    try {
      const updates = {
        estado: newStatus,
        updated_at: new Date().toISOString()
      }

      // If completing, add completion date
      if (newStatus === 'concluida') {
        updates.data_conclusao = new Date().toISOString()
      }

      const { error } = await supabase
        .from('tarefas')
        .update(updates)
        .eq('id', tarefa.id)

      if (error) throw error

      // Update local state
      setTarefas(prev => prev.map(t =>
        t.id === tarefa.id ? { ...t, ...updates } : t
      ))

      if (selectedTarefa?.id === tarefa.id) {
        setSelectedTarefa({ ...selectedTarefa, ...updates })
      }

      // Send notification when task is completed
      if (newStatus === 'concluida' && tarefa.criado_por_id && tarefa.criado_por_id !== user.id) {
        await createNotification({
          utilizadorId: tarefa.criado_por_id,
          tipo: NOTIFICATION_TYPES.TAREFA_CONCLUIDA,
          mensagem: `${user.nome} completou a tarefa: ${tarefa.titulo}`,
          obraId: obra.id,
          tarefaId: tarefa.id,
          dados: { titulo: tarefa.titulo, completadoPor: user.nome }
        })
      }
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err)
      alert('Erro ao atualizar tarefa')
    } finally {
      setUpdating(false)
    }
  }

  // Filter tasks
  const filteredTarefas = tarefas.filter(t => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!t.titulo?.toLowerCase().includes(query) &&
          !t.descricao?.toLowerCase().includes(query)) {
        return false
      }
    }

    // Status filter
    if (filter === 'minhas') {
      return t.responsavel_id === user.id
    }
    if (filter === 'pendentes') {
      return t.estado !== 'concluida'
    }
    if (filter === 'urgentes') {
      const status = getDueSoonStatus(t)
      return status === 'overdue' || status === 'urgent' || status === 'soon'
    }
    return true
  })

  // Get urgent tasks for alert banner
  const urgentTasks = tarefas.filter(t => {
    if (t.responsavel_id !== user.id) return false
    const status = getDueSoonStatus(t)
    return status === 'overdue' || status === 'urgent'
  })

  // Group by status
  const groupedByStatus = {
    pendente: filteredTarefas.filter(t => t.estado === 'pendente'),
    em_progresso: filteredTarefas.filter(t => t.estado === 'em_progresso'),
    bloqueada: filteredTarefas.filter(t => t.estado === 'bloqueada'),
    concluida: filteredTarefas.filter(t => t.estado === 'concluida')
  }

  // Check if task is overdue
  const isOverdue = (tarefa) => {
    if (!tarefa.data_limite || tarefa.estado === 'concluida') return false
    return new Date(tarefa.data_limite) < new Date()
  }

  // Local styles
  const tarefaStyles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      overflow: 'hidden'
    },
    header: {
      padding: 12,
      background: 'white',
      borderBottom: '1px solid #e5e7eb'
    },
    searchContainer: {
      display: 'flex',
      gap: 8,
      marginBottom: 8
    },
    searchInput: {
      flex: 1,
      padding: '8px 12px',
      paddingLeft: 36,
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      background: '#f9fafb'
    },
    searchIcon: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af'
    },
    filters: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 4
    },
    filterButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: 16,
      fontSize: 13,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s'
    },
    filterActive: {
      background: colors.primary,
      color: 'white'
    },
    filterInactive: {
      background: '#f3f4f6',
      color: '#6b7280'
    },
    list: {
      flex: 1,
      overflow: 'auto',
      padding: 12
    },
    statusSection: {
      marginBottom: 16
    },
    statusHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      padding: '4px 0'
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 500
    },
    card: {
      background: 'white',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: 500,
      margin: 0,
      flex: 1
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      marginLeft: 8
    },
    cardMeta: {
      display: 'flex',
      gap: 12,
      fontSize: 12,
      color: '#6b7280'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    },
    overdue: {
      color: '#ef4444'
    },
    // Detail modal
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 100
    },
    modalContent: {
      background: 'white',
      borderRadius: '16px 16px 0 0',
      width: '100%',
      maxHeight: '80vh',
      overflow: 'auto',
      animation: 'slideUp 0.3s ease'
    },
    modalHeader: {
      padding: 16,
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 1
    },
    modalBody: {
      padding: 16
    },
    section: {
      marginBottom: 16
    },
    sectionLabel: {
      fontSize: 12,
      color: '#6b7280',
      marginBottom: 4,
      textTransform: 'uppercase',
      fontWeight: 500
    },
    description: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap'
    },
    statusButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 8,
      marginTop: 16
    },
    statusButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      border: '2px solid',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    skeleton: {
      background: '#f3f4f6',
      borderRadius: 12,
      padding: 16,
      marginBottom: 8
    },
    skeletonLine: {
      height: 12,
      background: '#e5e7eb',
      borderRadius: 4,
      marginBottom: 8
    },
    empty: {
      textAlign: 'center',
      padding: 40,
      color: '#6b7280'
    },
    // Due-soon alert banner
    alertBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderBottom: '1px solid #f59e0b',
      cursor: 'pointer'
    },
    alertBannerUrgent: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      borderColor: '#ef4444'
    },
    alertIcon: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f59e0b',
      color: 'white',
      flexShrink: 0
    },
    alertIconUrgent: {
      background: '#ef4444'
    },
    alertText: {
      flex: 1,
      fontSize: 13
    },
    alertTitle: {
      fontWeight: 600,
      color: '#92400e',
      marginBottom: 2
    },
    alertTitleUrgent: {
      color: '#991b1b'
    },
    alertDesc: {
      color: '#b45309',
      fontSize: 12
    },
    alertDescUrgent: {
      color: '#dc2626'
    },
    alertDismiss: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: 4
    },
    // Quick status buttons in card
    quickActions: {
      display: 'flex',
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      borderTop: '1px solid #f3f4f6'
    },
    quickButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 10px',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      fontSize: 11,
      background: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    quickButtonActive: {
      borderColor: '#3b82f6',
      background: '#eff6ff',
      color: '#2563eb'
    },
    // FAB button
    fab: {
      position: 'fixed',
      bottom: 80,
      right: 16,
      width: 52,
      height: 52,
      borderRadius: 26,
      background: colors.primary,
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 50,
      transition: 'transform 0.2s'
    },
    // Create form modal
    createModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 100
    },
    createContent: {
      background: 'white',
      borderRadius: '16px 16px 0 0',
      width: '100%',
      maxHeight: '85vh',
      overflow: 'auto',
      animation: 'slideUp 0.3s ease',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
    },
    createHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 1
    },
    createBody: {
      padding: 16
    },
    formField: {
      marginBottom: 16
    },
    formLabel: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: '#374151',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.3
    },
    formInput: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    formTextarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
      minHeight: 80,
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    formSelect: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
      background: 'white',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center'
    },
    formRow: {
      display: 'flex',
      gap: 12
    },
    priorityChips: {
      display: 'flex',
      gap: 8
    },
    priorityChip: {
      flex: 1,
      padding: '8px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 500,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s',
      background: 'white'
    },
    createButton: {
      width: '100%',
      padding: 14,
      background: colors.primary,
      border: 'none',
      borderRadius: 8,
      color: 'white',
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8
    },
    // Due soon badge styles
    dueSoonBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 10,
      fontWeight: 600
    },
    dueSoonUrgent: {
      background: '#fee2e2',
      color: '#dc2626'
    },
    dueSoonSoon: {
      background: '#fef3c7',
      color: '#d97706'
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div style={tarefaStyles.container}>
        <div style={tarefaStyles.header}>
          <div style={{ ...tarefaStyles.skeletonLine, width: '100%', height: 36 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...tarefaStyles.skeletonLine, width: 80, height: 28, borderRadius: 14 }} />
            ))}
          </div>
        </div>
        <div style={tarefaStyles.list}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={tarefaStyles.skeleton}>
              <div style={{ ...tarefaStyles.skeletonLine, width: '70%' }} />
              <div style={{ ...tarefaStyles.skeletonLine, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={tarefaStyles.container}>
      {/* Header with search and filters */}
      <div style={tarefaStyles.header}>
        <div style={{ position: 'relative', ...tarefaStyles.searchContainer }}>
          <Search size={16} style={tarefaStyles.searchIcon} />
          <input
            type="text"
            placeholder="Pesquisar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={tarefaStyles.searchInput}
          />
        </div>
        <div style={tarefaStyles.filters}>
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'minhas', label: 'Minhas' },
            { key: 'pendentes', label: 'Pendentes' },
            { key: 'urgentes', label: 'Urgentes' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                ...tarefaStyles.filterButton,
                ...(filter === f.key ? tarefaStyles.filterActive : tarefaStyles.filterInactive)
              }}
            >
              {f.label}
              {f.key === 'minhas' && ` (${tarefas.filter(t => t.responsavel_id === user.id).length})`}
              {f.key === 'urgentes' && urgentTasks.length > 0 && ` (${urgentTasks.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Due-soon alert banner */}
      {showDueAlert && urgentTasks.length > 0 && (
        <div
          style={{
            ...tarefaStyles.alertBanner,
            ...(urgentTasks.some(t => getDueSoonStatus(t) === 'overdue') ? tarefaStyles.alertBannerUrgent : {})
          }}
          onClick={() => setFilter('urgentes')}
        >
          <div style={{
            ...tarefaStyles.alertIcon,
            ...(urgentTasks.some(t => getDueSoonStatus(t) === 'overdue') ? tarefaStyles.alertIconUrgent : {})
          }}>
            {urgentTasks.some(t => getDueSoonStatus(t) === 'overdue')
              ? <AlertTriangle size={18} />
              : <Bell size={18} />
            }
          </div>
          <div style={tarefaStyles.alertText}>
            <div style={{
              ...tarefaStyles.alertTitle,
              ...(urgentTasks.some(t => getDueSoonStatus(t) === 'overdue') ? tarefaStyles.alertTitleUrgent : {})
            }}>
              {urgentTasks.some(t => getDueSoonStatus(t) === 'overdue')
                ? `${urgentTasks.filter(t => getDueSoonStatus(t) === 'overdue').length} tarefa(s) atrasada(s)!`
                : `${urgentTasks.length} tarefa(s) a vencer em 24h`
              }
            </div>
            <div style={{
              ...tarefaStyles.alertDesc,
              ...(urgentTasks.some(t => getDueSoonStatus(t) === 'overdue') ? tarefaStyles.alertDescUrgent : {})
            }}>
              Toca para ver
            </div>
          </div>
          <button
            style={tarefaStyles.alertDismiss}
            onClick={(e) => { e.stopPropagation(); setShowDueAlert(false); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Task list */}
      <div style={tarefaStyles.list}>
        {filteredTarefas.length === 0 ? (
          <div style={tarefaStyles.empty}>
            <CheckCircle2 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Sem tarefas {filter === 'minhas' ? 'atribuídas' : ''}</p>
          </div>
        ) : (
          Object.entries(groupedByStatus).map(([status, tasks]) => {
            if (tasks.length === 0) return null
            const StatusIcon = TASK_STATUS[status].icon

            return (
              <div key={status} style={tarefaStyles.statusSection}>
                <div style={tarefaStyles.statusHeader}>
                  <span
                    style={{
                      ...tarefaStyles.statusBadge,
                      background: `${TASK_STATUS[status].color}20`,
                      color: TASK_STATUS[status].color
                    }}
                  >
                    <StatusIcon size={14} />
                    {TASK_STATUS[status].label} ({tasks.length})
                  </span>
                </div>

                {tasks.map(tarefa => {
                  const dueSoonStatus = getDueSoonStatus(tarefa)
                  const isMyTask = tarefa.responsavel_id === user.id

                  return (
                    <div
                      key={tarefa.id}
                      style={tarefaStyles.card}
                    >
                      <div onClick={() => setSelectedTarefa(tarefa)}>
                        <div style={tarefaStyles.cardHeader}>
                          <h4 style={tarefaStyles.cardTitle}>{tarefa.titulo}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {dueSoonStatus && (
                              <span style={{
                                ...tarefaStyles.dueSoonBadge,
                                ...(dueSoonStatus === 'overdue' || dueSoonStatus === 'urgent'
                                  ? tarefaStyles.dueSoonUrgent
                                  : tarefaStyles.dueSoonSoon)
                              }}>
                                <AlertTriangle size={10} />
                                {dueSoonStatus === 'overdue' ? 'Atrasada' :
                                 dueSoonStatus === 'urgent' ? '<24h' : '<48h'}
                              </span>
                            )}
                            {tarefa.prioridade && (
                              <span
                                style={{
                                  ...tarefaStyles.priorityDot,
                                  background: PRIORITY_COLORS[tarefa.prioridade]
                                }}
                                title={`Prioridade ${tarefa.prioridade}`}
                              />
                            )}
                          </div>
                        </div>
                        <div style={tarefaStyles.cardMeta}>
                          {tarefa.responsavel && (
                            <span style={tarefaStyles.metaItem}>
                              <User size={12} />
                              {tarefa.responsavel.nome}
                            </span>
                          )}
                          {tarefa.data_limite && (
                            <span style={{
                              ...tarefaStyles.metaItem,
                              ...(isOverdue(tarefa) ? tarefaStyles.overdue : {})
                            }}>
                              <Calendar size={12} />
                              {formatDate(tarefa.data_limite)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick status buttons for user's tasks */}
                      {isMyTask && tarefa.estado !== 'concluida' && (
                        <div style={tarefaStyles.quickActions}>
                          {tarefa.estado === 'pendente' && (
                            <button
                              style={tarefaStyles.quickButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                updateTarefaStatus(tarefa, 'em_progresso')
                              }}
                              disabled={updating}
                            >
                              <Play size={12} /> Iniciar
                            </button>
                          )}
                          {tarefa.estado === 'em_progresso' && (
                            <>
                              <button
                                style={tarefaStyles.quickButton}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateTarefaStatus(tarefa, 'concluida')
                                }}
                                disabled={updating}
                              >
                                <CheckCircle2 size={12} /> Concluir
                              </button>
                              <button
                                style={tarefaStyles.quickButton}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateTarefaStatus(tarefa, 'bloqueada')
                                }}
                                disabled={updating}
                              >
                                <AlertCircle size={12} /> Bloquear
                              </button>
                            </>
                          )}
                          {tarefa.estado === 'bloqueada' && (
                            <button
                              style={tarefaStyles.quickButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                updateTarefaStatus(tarefa, 'em_progresso')
                              }}
                              disabled={updating}
                            >
                              <Play size={12} /> Retomar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* FAB - Create Task Button */}
      {canCreateTask && (
        <button
          style={tarefaStyles.fab}
          onClick={() => setShowCreateForm(true)}
          title="Nova tarefa"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Create Task Modal */}
      {showCreateForm && (
        <div style={tarefaStyles.createModal} onClick={() => setShowCreateForm(false)}>
          <div style={tarefaStyles.createContent} onClick={e => e.stopPropagation()}>
            <div style={tarefaStyles.createHeader}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Nova Tarefa</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>
            <div style={tarefaStyles.createBody}>
              {/* Title */}
              <div style={tarefaStyles.formField}>
                <label style={tarefaStyles.formLabel}>Título *</label>
                <input
                  type="text"
                  placeholder="Descreve a tarefa..."
                  value={newTask.titulo}
                  onChange={e => setNewTask(prev => ({ ...prev, titulo: e.target.value }))}
                  style={tarefaStyles.formInput}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div style={tarefaStyles.formField}>
                <label style={tarefaStyles.formLabel}>Descrição</label>
                <textarea
                  placeholder="Detalhes adicionais..."
                  value={newTask.descricao}
                  onChange={e => setNewTask(prev => ({ ...prev, descricao: e.target.value }))}
                  style={tarefaStyles.formTextarea}
                  rows={3}
                />
              </div>

              {/* Priority */}
              <div style={tarefaStyles.formField}>
                <label style={tarefaStyles.formLabel}>Prioridade</label>
                <div style={tarefaStyles.priorityChips}>
                  {[
                    { key: 'baixa', label: 'Baixa', color: '#6b7280' },
                    { key: 'media', label: 'Média', color: '#f59e0b' },
                    { key: 'alta', label: 'Alta', color: '#ef4444' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setNewTask(prev => ({ ...prev, prioridade: p.key }))}
                      style={{
                        ...tarefaStyles.priorityChip,
                        ...(newTask.prioridade === p.key ? {
                          borderColor: p.color,
                          background: `${p.color}10`,
                          color: p.color
                        } : {})
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsavel & Due date row */}
              <div style={tarefaStyles.formRow}>
                <div style={{ ...tarefaStyles.formField, flex: 1 }}>
                  <label style={tarefaStyles.formLabel}>Responsável</label>
                  <select
                    value={newTask.responsavel_id}
                    onChange={e => setNewTask(prev => ({ ...prev, responsavel_id: e.target.value }))}
                    style={tarefaStyles.formSelect}
                  >
                    <option value="">Sem atribuição</option>
                    {equipa.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome}{m.cargo ? ` (${m.cargo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ ...tarefaStyles.formField, flex: 1 }}>
                  <label style={tarefaStyles.formLabel}>Data Limite</label>
                  <input
                    type="date"
                    value={newTask.data_limite}
                    onChange={e => setNewTask(prev => ({ ...prev, data_limite: e.target.value }))}
                    style={tarefaStyles.formInput}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateTask}
                disabled={creating || !newTask.titulo.trim()}
                style={{
                  ...tarefaStyles.createButton,
                  opacity: creating || !newTask.titulo.trim() ? 0.6 : 1
                }}
              >
                {creating ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    A criar...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Criar Tarefa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTarefa && (
        <div style={tarefaStyles.modal} onClick={() => setSelectedTarefa(null)}>
          <div style={tarefaStyles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={tarefaStyles.modalHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    ...tarefaStyles.statusBadge,
                    background: `${TASK_STATUS[selectedTarefa.estado].color}20`,
                    color: TASK_STATUS[selectedTarefa.estado].color
                  }}
                >
                  {(() => { const Icon = TASK_STATUS[selectedTarefa.estado].icon; return <Icon size={14} /> })()}
                  {TASK_STATUS[selectedTarefa.estado].label}
                </span>
                {selectedTarefa.prioridade && (
                  <span style={{
                    fontSize: 12,
                    color: PRIORITY_COLORS[selectedTarefa.prioridade],
                    fontWeight: 500
                  }}>
                    Prioridade {selectedTarefa.prioridade}
                  </span>
                )}
              </div>
              <h2 style={{ margin: '12px 0 0', fontSize: 18 }}>{selectedTarefa.titulo}</h2>
            </div>

            <div style={tarefaStyles.modalBody}>
              {selectedTarefa.descricao && (
                <div style={tarefaStyles.section}>
                  <div style={tarefaStyles.sectionLabel}>Descrição</div>
                  <p style={tarefaStyles.description}>{selectedTarefa.descricao}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {selectedTarefa.responsavel && (
                  <div style={tarefaStyles.section}>
                    <div style={tarefaStyles.sectionLabel}>Responsável</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={16} color="#6b7280" />
                      <span>{selectedTarefa.responsavel.nome}</span>
                    </div>
                  </div>
                )}

                {selectedTarefa.data_limite && (
                  <div style={tarefaStyles.section}>
                    <div style={tarefaStyles.sectionLabel}>Data Limite</div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      ...(isOverdue(selectedTarefa) ? { color: '#ef4444' } : {})
                    }}>
                      <Calendar size={16} />
                      <span>{formatDate(selectedTarefa.data_limite)}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedTarefa.data_conclusao && (
                <div style={tarefaStyles.section}>
                  <div style={tarefaStyles.sectionLabel}>Concluída em</div>
                  <span>{formatDateTime(selectedTarefa.data_conclusao)}</span>
                </div>
              )}

              {/* Status update buttons */}
              {(selectedTarefa.responsavel_id === user.id || user.tipo === 'admin') && (
                <div style={tarefaStyles.statusButtons}>
                  {Object.entries(TASK_STATUS).map(([status, config]) => {
                    const Icon = config.icon
                    const isActive = selectedTarefa.estado === status

                    return (
                      <button
                        key={status}
                        onClick={() => !isActive && updateTarefaStatus(selectedTarefa, status)}
                        disabled={updating || isActive}
                        style={{
                          ...tarefaStyles.statusButton,
                          borderColor: isActive ? config.color : '#e5e7eb',
                          background: isActive ? `${config.color}10` : 'white',
                          color: isActive ? config.color : '#374151',
                          opacity: updating ? 0.5 : 1
                        }}
                      >
                        {updating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={16} />}
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
