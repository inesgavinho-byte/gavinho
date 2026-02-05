// =====================================================
// TAREFAS COMPONENT
// Task management for obra workers
// =====================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  CheckCircle2, Circle, Clock, AlertCircle, User,
  Calendar, ChevronRight, Loader2, Filter, Search
} from 'lucide-react'
import { styles, colors } from '../styles'
import { formatDate, formatDateTime } from '../utils'

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

export default function Tarefas({ obra, user }) {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas') // todas, minhas, pendentes
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarefa, setSelectedTarefa] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (obra) {
      loadTarefas()
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
    return true
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
            { key: 'pendentes', label: 'Pendentes' }
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
            </button>
          ))}
        </div>
      </div>

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

                {tasks.map(tarefa => (
                  <div
                    key={tarefa.id}
                    style={tarefaStyles.card}
                    onClick={() => setSelectedTarefa(tarefa)}
                  >
                    <div style={tarefaStyles.cardHeader}>
                      <h4 style={tarefaStyles.cardTitle}>{tarefa.titulo}</h4>
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
                          {isOverdue(tarefa) && ' (atrasada)'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

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
                  {React.createElement(TASK_STATUS[selectedTarefa.estado].icon, { size: 14 })}
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
      `}</style>
    </div>
  )
}
