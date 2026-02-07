import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import {
  HardHat, Users, UserPlus, Search, Phone, Key, Building2,
  Edit, Trash2, X, Check, Loader2, Plus, ChevronDown, ChevronUp,
  Clock, Calendar, Download, LogIn, LogOut as LogOutIcon,
  CalendarDays, TrendingUp, Package, Filter, CheckCheck, Truck,
  AlertTriangle, User
} from 'lucide-react'

// Tab configuration
const TABS = [
  { id: 'trabalhadores', label: 'Trabalhadores', icon: Users },
  { id: 'presencas', label: 'Presenças', icon: Clock },
  { id: 'requisicoes', label: 'Requisições', icon: Package }
]

export default function GestaoObras() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'trabalhadores'

  const setActiveTab = (tab) => {
    setSearchParams({ tab })
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <HardHat size={28} style={{ color: 'var(--brown)' }} />
            Gestão Obras
          </h1>
          <p style={styles.subtitle}>Trabalhadores, presenças e requisições de materiais</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {})
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'trabalhadores' && <TrabalhadoresTab />}
        {activeTab === 'presencas' && <PresencasTab />}
        {activeTab === 'requisicoes' && <RequisicoesTab />}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// =============================================
// TRABALHADORES TAB
// =============================================
function TrabalhadoresTab() {
  const { profile } = useAuth()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [trabalhadores, setTrabalhadores] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [expandedWorker, setExpandedWorker] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    pin: '',
    cargo: '',
    ativo: true,
    obras: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: workersData, error: workersError } = await supabase
        .from('trabalhadores')
        .select(`
          *,
          trabalhador_obras(
            obra_id,
            obras(id, codigo, nome)
          )
        `)
        .order('nome')

      if (workersError) throw workersError

      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })

      if (obrasError) throw obrasError

      setTrabalhadores(workersData || [])
      setObras(obrasData || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setForm({ ...form, pin })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/\D/g, '')
    if (!cleaned.startsWith('351') && cleaned.length === 9) {
      cleaned = '351' + cleaned
    }
    return '+' + cleaned
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const phoneFormatted = formatPhone(form.telefone)

      if (editingWorker) {
        const { error: updateError } = await supabase
          .from('trabalhadores')
          .update({
            nome: form.nome,
            telefone: phoneFormatted,
            pin: form.pin,
            cargo: form.cargo,
            ativo: form.ativo
          })
          .eq('id', editingWorker.id)

        if (updateError) throw updateError

        await supabase
          .from('trabalhador_obras')
          .delete()
          .eq('trabalhador_id', editingWorker.id)

        if (form.obras.length > 0) {
          const assignments = form.obras.map(obraId => ({
            trabalhador_id: editingWorker.id,
            obra_id: obraId
          }))

          const { error: assignError } = await supabase
            .from('trabalhador_obras')
            .insert(assignments)

          if (assignError) throw assignError
        }
      } else {
        const { data: newWorker, error: insertError } = await supabase
          .from('trabalhadores')
          .insert({
            nome: form.nome,
            telefone: phoneFormatted,
            pin: form.pin,
            cargo: form.cargo,
            ativo: form.ativo
          })
          .select()
          .single()

        if (insertError) throw insertError

        if (form.obras.length > 0) {
          const assignments = form.obras.map(obraId => ({
            trabalhador_id: newWorker.id,
            obra_id: obraId
          }))

          const { error: assignError } = await supabase
            .from('trabalhador_obras')
            .insert(assignments)

          if (assignError) throw assignError
        }
      }

      setShowModal(false)
      setEditingWorker(null)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      toast.error('Erro', 'Erro ao guardar trabalhador: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (worker) => {
    setEditingWorker(worker)
    setForm({
      nome: worker.nome || '',
      telefone: worker.telefone?.replace('+351', '') || '',
      pin: worker.pin || '',
      cargo: worker.cargo || '',
      ativo: worker.ativo !== false,
      obras: worker.trabalhador_obras?.map(to => to.obra_id) || []
    })
    setShowModal(true)
  }

  const handleDelete = async (worker) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Trabalhador',
      message: `Tens a certeza que queres eliminar ${worker.nome}?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase
            .from('trabalhador_obras')
            .delete()
            .eq('trabalhador_id', worker.id)

          const { error } = await supabase
            .from('trabalhadores')
            .delete()
            .eq('id', worker.id)

          if (error) throw error

          loadData()
        } catch (err) {
          console.error('Erro ao eliminar:', err)
          toast.error('Erro', 'Erro ao eliminar trabalhador')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  const resetForm = () => {
    setForm({
      nome: '',
      telefone: '',
      pin: '',
      cargo: '',
      ativo: true,
      obras: []
    })
  }

  const toggleObraSelection = (obraId) => {
    setForm(prev => ({
      ...prev,
      obras: prev.obras.includes(obraId)
        ? prev.obras.filter(id => id !== obraId)
        : [...prev.obras, obraId]
    }))
  }

  const filteredWorkers = trabalhadores.filter(w =>
    w.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.telefone?.includes(searchTerm) ||
    w.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeCount = trabalhadores.filter(w => w.ativo).length
  const inactiveCount = trabalhadores.filter(w => !w.ativo).length
  const obrasEmCurso = obras.filter(o => o.status === 'em_curso').length

  if (loading) {
    return (
      <div style={tabStyles.loadingContainer}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header with button */}
      <div style={tabStyles.tabHeader}>
        <div />
        <button
          onClick={() => {
            resetForm()
            setEditingWorker(null)
            setShowModal(true)
          }}
          style={tabStyles.addButton}
        >
          <UserPlus size={20} />
          Novo Trabalhador
        </button>
      </div>

      {/* Stats Cards */}
      <div style={tabStyles.statsGrid}>
        <div style={tabStyles.statCard}>
          <div style={tabStyles.statIcon}>
            <Users size={24} style={{ color: 'var(--brown)' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{activeCount}</div>
            <div style={tabStyles.statLabel}>Trabalhadores ativos</div>
          </div>
        </div>
        <div style={tabStyles.statCard}>
          <div style={{ ...tabStyles.statIcon, background: 'var(--stone)' }}>
            <Users size={24} style={{ color: 'var(--brown-light)' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{inactiveCount}</div>
            <div style={tabStyles.statLabel}>Inativos</div>
          </div>
        </div>
        <div style={tabStyles.statCard}>
          <div style={{ ...tabStyles.statIcon, background: '#e8f5e9' }}>
            <Building2 size={24} style={{ color: '#2e7d32' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{obrasEmCurso}</div>
            <div style={tabStyles.statLabel}>Obras em curso</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={tabStyles.searchContainer}>
        <Search size={20} style={tabStyles.searchIcon} />
        <input
          type="text"
          placeholder="Pesquisar por nome, telefone ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={tabStyles.searchInput}
        />
      </div>

      {/* Workers List */}
      <div style={tabStyles.listCard}>
        {filteredWorkers.length === 0 ? (
          <div style={tabStyles.emptyState}>
            <Users size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhum trabalhador encontrado</p>
            <button
              onClick={() => {
                resetForm()
                setEditingWorker(null)
                setShowModal(true)
              }}
              style={tabStyles.emptyButton}
            >
              Adicionar primeiro trabalhador
            </button>
          </div>
        ) : (
          filteredWorkers.map((worker, index) => (
            <div key={worker.id}>
              {index > 0 && <div style={tabStyles.divider} />}
              <div
                style={tabStyles.workerRow}
                onClick={() => setExpandedWorker(expandedWorker === worker.id ? null : worker.id)}
              >
                <div style={tabStyles.workerInfo}>
                  <div style={{
                    ...tabStyles.avatar,
                    background: worker.ativo ? 'var(--brown)' : 'var(--stone)'
                  }}>
                    {worker.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={tabStyles.workerName}>
                      {worker.nome}
                      {!worker.ativo && (
                        <span style={tabStyles.inactiveBadge}>Inativo</span>
                      )}
                    </div>
                    <div style={tabStyles.workerMeta}>
                      <span style={tabStyles.metaItem}>
                        <Phone size={14} />
                        {worker.telefone}
                      </span>
                      {worker.cargo && (
                        <span style={tabStyles.metaItem}>
                          <HardHat size={14} />
                          {worker.cargo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={tabStyles.workerActions}>
                  <span style={tabStyles.obraCount}>
                    {worker.trabalhador_obras?.length || 0} obra(s)
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(worker) }}
                    style={tabStyles.iconButton}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(worker) }}
                    style={{ ...tabStyles.iconButton, color: '#f44336' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedWorker === worker.id ? (
                    <ChevronUp size={20} style={{ color: 'var(--brown-light)' }} />
                  ) : (
                    <ChevronDown size={20} style={{ color: 'var(--brown-light)' }} />
                  )}
                </div>
              </div>

              {expandedWorker === worker.id && (
                <div style={tabStyles.expandedContent}>
                  <p style={tabStyles.expandedLabel}>Obras atribuídas:</p>
                  {worker.trabalhador_obras?.length > 0 ? (
                    <div style={tabStyles.obrasTags}>
                      {worker.trabalhador_obras.map(to => (
                        <span key={to.obra_id} style={tabStyles.obraTag}>
                          <Building2 size={14} style={{ color: 'var(--brown)' }} />
                          <strong>{to.obras?.codigo}</strong>
                          <span style={{ color: 'var(--brown-light)' }}>- {to.obras?.nome}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={tabStyles.noObras}>Nenhuma obra atribuída</p>
                  )}
                  <div style={tabStyles.pinInfo}>
                    PIN: <span style={tabStyles.pinValue}>{worker.pin}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={tabStyles.modalOverlay}>
          <div style={tabStyles.modal}>
            <div style={tabStyles.modalHeader}>
              <h2 style={tabStyles.modalTitle}>
                {editingWorker ? 'Editar Trabalhador' : 'Novo Trabalhador'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingWorker(null) }}
                style={tabStyles.closeButton}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={tabStyles.form}>
              <div style={tabStyles.field}>
                <label style={tabStyles.label}>Nome *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  style={tabStyles.input}
                  placeholder="Nome completo"
                />
              </div>

              <div style={tabStyles.field}>
                <label style={tabStyles.label}>Telemóvel *</label>
                <div style={tabStyles.phoneRow}>
                  <span style={tabStyles.phonePrefix}>+351</span>
                  <input
                    type="tel"
                    required
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value.replace(/\D/g, '') })}
                    style={{ ...tabStyles.input, flex: 1 }}
                    placeholder="912 345 678"
                    maxLength={9}
                  />
                </div>
              </div>

              <div style={tabStyles.field}>
                <label style={tabStyles.label}>PIN de Acesso *</label>
                <div style={tabStyles.pinRow}>
                  <input
                    type="text"
                    required
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    style={{ ...tabStyles.input, flex: 1, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 4 }}
                    placeholder="1234"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={generatePin}
                    style={tabStyles.generateButton}
                  >
                    Gerar
                  </button>
                </div>
                <p style={tabStyles.hint}>PIN de 4-6 dígitos para acesso à app</p>
              </div>

              <div style={tabStyles.field}>
                <label style={tabStyles.label}>Cargo</label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  style={tabStyles.input}
                  placeholder="Ex: Pedreiro, Eletricista, Encarregado..."
                />
              </div>

              <div style={tabStyles.field}>
                <label style={tabStyles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    style={tabStyles.checkbox}
                  />
                  Trabalhador ativo
                </label>
              </div>

              <div style={tabStyles.field}>
                <label style={tabStyles.label}>Obras Atribuídas</label>
                <div style={tabStyles.obrasList}>
                  {obras.length === 0 ? (
                    <p style={tabStyles.noObrasModal}>Nenhuma obra disponível</p>
                  ) : (
                    obras.map(obra => (
                      <label
                        key={obra.id}
                        style={{
                          ...tabStyles.obraOption,
                          background: form.obras.includes(obra.id) ? 'var(--cream)' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.obras.includes(obra.id)}
                          onChange={() => toggleObraSelection(obra.id)}
                          style={tabStyles.checkbox}
                        />
                        <span style={tabStyles.obraCode}>{obra.codigo}</span>
                        <span style={tabStyles.obraName}>- {obra.nome}</span>
                        <span style={{
                          ...tabStyles.statusBadge,
                          background: obra.status === 'em_curso' ? '#e8f5e9' :
                                     obra.status === 'em_projeto' ? '#e3f2fd' : '#f5f5f5',
                          color: obra.status === 'em_curso' ? '#2e7d32' :
                                obra.status === 'em_projeto' ? '#1976d2' : '#666'
                        }}>
                          {obra.status?.replace('_', ' ')}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={tabStyles.modalActions}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingWorker(null) }}
                  style={tabStyles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={tabStyles.submitButton}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingWorker ? 'Guardar Alterações' : 'Criar Trabalhador'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}

// =============================================
// PRESENÇAS TAB
// =============================================
function PresencasTab() {
  const [presencas, setPresencas] = useState([])
  const [trabalhadores, setTrabalhadores] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, horasTotal: 0, mediaHoras: 0 })

  const [filtroObra, setFiltroObra] = useState('')
  const [filtroTrabalhador, setFiltroTrabalhador] = useState('')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (trabalhadores.length > 0 && obras.length > 0) {
      loadPresencas()
    }
  }, [filtroObra, filtroTrabalhador, dataInicio, dataFim, trabalhadores, obras])

  const loadData = async () => {
    try {
      const [trabRes, obrasRes] = await Promise.all([
        supabase.from('trabalhadores').select('id, nome, cargo').order('nome'),
        supabase.from('obras').select('id, codigo, nome').order('codigo', { ascending: false })
      ])

      setTrabalhadores(trabRes.data || [])
      setObras(obrasRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  }

  const loadPresencas = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('presencas')
        .select(`
          *,
          trabalhadores(id, nome, cargo),
          obras(id, codigo, nome)
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false })
        .order('hora_entrada', { ascending: false })

      if (filtroObra) {
        query = query.eq('obra_id', filtroObra)
      }

      if (filtroTrabalhador) {
        query = query.eq('trabalhador_id', filtroTrabalhador)
      }

      const { data, error } = await query

      if (error) throw error

      setPresencas(data || [])

      const total = data?.length || 0
      let horasTotal = 0

      data?.forEach(p => {
        if (p.hora_entrada && p.hora_saida) {
          const diff = new Date(p.hora_saida) - new Date(p.hora_entrada)
          horasTotal += diff / (1000 * 60 * 60)
        }
      })

      setStats({
        total,
        horasTotal: horasTotal.toFixed(1),
        mediaHoras: total > 0 ? (horasTotal / total).toFixed(1) : 0
      })
    } catch (err) {
      console.error('Erro ao carregar presenças:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    return new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return null
    const diff = new Date(saida) - new Date(entrada)
    return (diff / (1000 * 60 * 60)).toFixed(1)
  }

  const getStatusBadge = (presenca) => {
    if (!presenca.hora_entrada) {
      return { text: 'Sem entrada', color: '#F44336', bg: '#FFEBEE' }
    }
    if (!presenca.hora_saida) {
      return { text: 'Em trabalho', color: '#4CAF50', bg: '#E8F5E9' }
    }
    return { text: 'Completo', color: '#2196F3', bg: '#E3F2FD' }
  }

  const exportCSV = () => {
    const headers = ['Data', 'Trabalhador', 'Cargo', 'Obra', 'Entrada', 'Saída', 'Horas', 'Notas']
    const rows = presencas.map(p => [
      p.data,
      p.trabalhadores?.nome || '',
      p.trabalhadores?.cargo || '',
      p.obras?.codigo || '',
      formatTime(p.hora_entrada),
      formatTime(p.hora_saida),
      calcularHoras(p.hora_entrada, p.hora_saida) || '',
      p.notas || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presencas_${dataInicio}_${dataFim}.csv`
    link.click()
  }

  const presencasPorData = presencas.reduce((acc, p) => {
    if (!acc[p.data]) acc[p.data] = []
    acc[p.data].push(p)
    return acc
  }, {})

  return (
    <div>
      {/* Header with button */}
      <div style={tabStyles.tabHeader}>
        <div />
        <button onClick={exportCSV} style={tabStyles.addButton}>
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div style={tabStyles.statsGrid}>
        <div style={tabStyles.statCard}>
          <div style={tabStyles.statIcon}>
            <CalendarDays size={24} style={{ color: 'var(--brown)' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.total}</div>
            <div style={tabStyles.statLabel}>Registos no período</div>
          </div>
        </div>
        <div style={tabStyles.statCard}>
          <div style={{ ...tabStyles.statIcon, background: '#E8F5E9' }}>
            <Clock size={24} style={{ color: '#2e7d32' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.horasTotal}h</div>
            <div style={tabStyles.statLabel}>Total de horas</div>
          </div>
        </div>
        <div style={tabStyles.statCard}>
          <div style={{ ...tabStyles.statIcon, background: '#E3F2FD' }}>
            <TrendingUp size={24} style={{ color: '#1976d2' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.mediaHoras}h</div>
            <div style={tabStyles.statLabel}>Média por dia</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={tabStyles.filtersCard}>
        <div style={tabStyles.filtersGrid}>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={tabStyles.filterInput}
            />
          </div>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={tabStyles.filterInput}
            />
          </div>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={tabStyles.filterInput}
            >
              <option value="">Todas as obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>
              ))}
            </select>
          </div>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Trabalhador</label>
            <select
              value={filtroTrabalhador}
              onChange={(e) => setFiltroTrabalhador(e.target.value)}
              style={tabStyles.filterInput}
            >
              <option value="">Todos</option>
              {trabalhadores.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Presenças */}
      <div style={tabStyles.listCard}>
        {loading ? (
          <div style={tabStyles.loadingState}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
          </div>
        ) : presencas.length === 0 ? (
          <div style={tabStyles.emptyState}>
            <Clock size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhum registo encontrado</p>
            <p style={{ color: 'var(--brown-light)', fontSize: 13, marginTop: 4 }}>Ajusta os filtros ou aguarda novos registos</p>
          </div>
        ) : (
          Object.entries(presencasPorData).map(([data, registos]) => (
            <div key={data} style={tabStyles.dateGroup}>
              <div style={tabStyles.dateHeader}>
                <Calendar size={16} />
                {formatDate(data)}
                <span style={tabStyles.dateCount}>{registos.length} registo(s)</span>
              </div>
              {registos.map(p => {
                const status = getStatusBadge(p)
                return (
                  <div key={p.id} style={tabStyles.presencaRow}>
                    <div style={tabStyles.presencaAvatar}>
                      {p.trabalhadores?.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={tabStyles.presencaInfo}>
                      <div style={tabStyles.presencaNome}>{p.trabalhadores?.nome}</div>
                      <div style={tabStyles.presencaMeta}>
                        <span style={tabStyles.metaItem}>
                          <Building2 size={12} />
                          {p.obras?.codigo}
                        </span>
                        {p.trabalhadores?.cargo && (
                          <span style={tabStyles.metaItem}>{p.trabalhadores.cargo}</span>
                        )}
                      </div>
                    </div>
                    <div style={tabStyles.presencaTimes}>
                      <div style={tabStyles.timeBlock}>
                        <LogIn size={14} style={{ color: '#4CAF50' }} />
                        <span>{formatTime(p.hora_entrada)}</span>
                      </div>
                      <div style={tabStyles.timeBlock}>
                        <LogOutIcon size={14} style={{ color: p.hora_saida ? '#F44336' : '#ccc' }} />
                        <span style={{ color: p.hora_saida ? 'inherit' : '#ccc' }}>
                          {formatTime(p.hora_saida)}
                        </span>
                      </div>
                    </div>
                    <div style={tabStyles.presencaHoras}>
                      {p.hora_saida ? (
                        <span style={tabStyles.horasValue}>{calcularHoras(p.hora_entrada, p.hora_saida)}h</span>
                      ) : (
                        <span style={{ ...tabStyles.statusBadgeSmall, color: status.color, background: status.bg }}>
                          {status.text}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// =============================================
// REQUISIÇÕES TAB
// =============================================
function RequisicoesTab() {
  const { profile } = useAuth()
  const toast = useToast()
  const [requisicoes, setRequisicoes] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroUrgente, setFiltroUrgente] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [selectedReq, setSelectedReq] = useState(null)
  const [modalNotas, setModalNotas] = useState('')

  const [stats, setStats] = useState({
    pendentes: 0,
    aprovadas: 0,
    validadas: 0,
    rejeitadas: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadRequisicoes()
  }, [filtroStatus, filtroObra, filtroUrgente])

  const loadData = async () => {
    try {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('id, codigo, nome')
        .order('codigo', { ascending: false })

      setObras(obrasData || [])
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
    }
  }

  const loadRequisicoes = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('requisicoes_materiais')
        .select(`
          *,
          obras(id, codigo, nome)
        `)
        .order('data_pedido', { ascending: false })

      if (filtroStatus) {
        query = query.eq('status', filtroStatus)
      }

      if (filtroObra) {
        query = query.eq('obra_id', filtroObra)
      }

      if (filtroUrgente) {
        query = query.eq('urgente', true)
      }

      const { data, error } = await query

      if (error) throw error

      setRequisicoes(data || [])

      const allReqs = data || []
      setStats({
        pendentes: allReqs.filter(r => r.status === 'pendente').length,
        aprovadas: allReqs.filter(r => r.status === 'aprovado').length,
        validadas: allReqs.filter(r => r.status === 'validado').length,
        rejeitadas: allReqs.filter(r => r.status === 'rejeitado').length
      })
    } catch (err) {
      console.error('Erro ao carregar requisições:', err)
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (req, action) => {
    setSelectedReq(req)
    setModalAction(action)
    setModalNotas('')
    setShowModal(true)
  }

  const handleAction = async () => {
    if (!selectedReq || !modalAction) return

    setActionLoading(selectedReq.id)
    try {
      const now = new Date().toISOString()
      let updateData = {}

      switch (modalAction) {
        case 'aprovar':
          updateData = {
            status: 'aprovado',
            aprovado_por_id: profile?.id,
            aprovado_por_nome: 'Edgard Borges',
            data_aprovacao: now,
            notas_aprovacao: modalNotas || null
          }
          break

        case 'validar':
          updateData = {
            status: 'validado',
            validado_por_id: profile?.id,
            validado_por_nome: 'João Umbelino',
            data_validacao: now,
            notas_validacao: modalNotas || null
          }
          break

        case 'rejeitar':
          updateData = {
            status: 'rejeitado',
            rejeitado_por_id: profile?.id,
            rejeitado_por_nome: profile?.nome || 'Utilizador',
            data_rejeicao: now,
            motivo_rejeicao: modalNotas || 'Sem motivo especificado'
          }
          break

        case 'entregar':
          updateData = {
            status: 'entregue',
            data_entrega: now,
            entregue_por: profile?.nome || 'Utilizador'
          }
          break
      }

      const { error } = await supabase
        .from('requisicoes_materiais')
        .update(updateData)
        .eq('id', selectedReq.id)

      if (error) throw error

      let mensagem = ''
      switch (modalAction) {
        case 'aprovar':
          mensagem = `✅ Requisição APROVADA pelo Encarregado\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nAprovado por: Edgard Borges`
          break
        case 'validar':
          mensagem = `✓✓ Requisição VALIDADA pela Direção\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nValidado por: João Umbelino - Direção Operação`
          break
        case 'rejeitar':
          mensagem = `❌ Requisição REJEITADA\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nMotivo: ${modalNotas || 'Não especificado'}`
          break
        case 'entregar':
          mensagem = `📦 Material ENTREGUE\n${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}`
          break
      }

      if (mensagem) {
        await supabase.from('obra_mensagens').insert({
          obra_id: selectedReq.obra_id,
          autor_id: profile?.id,
          autor_nome: profile?.nome || 'Sistema',
          conteudo: mensagem,
          tipo: 'requisicao_update'
        })
      }

      setShowModal(false)
      loadRequisicoes()
    } catch (err) {
      console.error('Erro na ação:', err)
      toast.error('Erro', 'Erro ao processar ação')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pendente':
        return { text: 'Aguarda Encarregado', color: '#FF9800', bg: '#FFF3E0' }
      case 'aprovado':
        return { text: 'Aguarda Direção', color: '#2196F3', bg: '#E3F2FD' }
      case 'validado':
        return { text: 'Validado', color: '#4CAF50', bg: '#E8F5E9' }
      case 'rejeitado':
        return { text: 'Rejeitado', color: '#F44336', bg: '#FFEBEE' }
      case 'entregue':
        return { text: 'Entregue', color: '#9C27B0', bg: '#F3E5F5' }
      default:
        return { text: status, color: '#666', bg: '#f5f5f5' }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportCSV = () => {
    const headers = ['Data', 'Obra', 'Material', 'Qtd', 'Unidade', 'Pedido por', 'Status', 'Aprovado por', 'Validado por']
    const rows = requisicoes.map(r => [
      formatDate(r.data_pedido),
      r.obras?.codigo || '',
      r.material,
      r.quantidade,
      r.unidade,
      r.pedido_por_nome,
      r.status,
      r.aprovado_por_nome || '',
      r.validado_por_nome || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `requisicoes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div>
      {/* Header with button */}
      <div style={tabStyles.tabHeader}>
        <div />
        <button onClick={exportCSV} style={tabStyles.addButton}>
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ ...tabStyles.statsGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div
          style={{ ...tabStyles.statCard, cursor: 'pointer', border: filtroStatus === 'pendente' ? '2px solid #FF9800' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'pendente' ? '' : 'pendente')}
        >
          <div style={{ ...tabStyles.statIcon, background: '#FFF3E0' }}>
            <Clock size={24} style={{ color: '#FF9800' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.pendentes}</div>
            <div style={tabStyles.statLabel}>Pendentes</div>
          </div>
        </div>
        <div
          style={{ ...tabStyles.statCard, cursor: 'pointer', border: filtroStatus === 'aprovado' ? '2px solid #2196F3' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'aprovado' ? '' : 'aprovado')}
        >
          <div style={{ ...tabStyles.statIcon, background: '#E3F2FD' }}>
            <Check size={24} style={{ color: '#2196F3' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.aprovadas}</div>
            <div style={tabStyles.statLabel}>Aguardam Validação</div>
          </div>
        </div>
        <div
          style={{ ...tabStyles.statCard, cursor: 'pointer', border: filtroStatus === 'validado' ? '2px solid #4CAF50' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'validado' ? '' : 'validado')}
        >
          <div style={{ ...tabStyles.statIcon, background: '#E8F5E9' }}>
            <CheckCheck size={24} style={{ color: '#4CAF50' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.validadas}</div>
            <div style={tabStyles.statLabel}>Validadas</div>
          </div>
        </div>
        <div
          style={{ ...tabStyles.statCard, cursor: 'pointer', border: filtroStatus === 'rejeitado' ? '2px solid #F44336' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'rejeitado' ? '' : 'rejeitado')}
        >
          <div style={{ ...tabStyles.statIcon, background: '#FFEBEE' }}>
            <X size={24} style={{ color: '#F44336' }} />
          </div>
          <div>
            <div style={tabStyles.statValue}>{stats.rejeitadas}</div>
            <div style={tabStyles.statLabel}>Rejeitadas</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={tabStyles.filtersCard}>
        <div style={tabStyles.filtersGrid}>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={tabStyles.filterInput}
            >
              <option value="">Todas as obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>
              ))}
            </select>
          </div>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={tabStyles.filterInput}
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="validado">Validadas</option>
              <option value="rejeitado">Rejeitadas</option>
              <option value="entregue">Entregues</option>
            </select>
          </div>
          <div style={tabStyles.filterGroup}>
            <label style={tabStyles.filterLabel}>&nbsp;</label>
            <label style={tabStyles.checkboxFilter}>
              <input
                type="checkbox"
                checked={filtroUrgente}
                onChange={(e) => setFiltroUrgente(e.target.checked)}
              />
              <AlertTriangle size={16} style={{ color: filtroUrgente ? '#F44336' : '#999' }} />
              Apenas urgentes
            </label>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={tabStyles.listCard}>
        {loading ? (
          <div style={tabStyles.loadingState}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
          </div>
        ) : requisicoes.length === 0 ? (
          <div style={tabStyles.emptyState}>
            <Package size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhuma requisição encontrada</p>
          </div>
        ) : (
          requisicoes.map(req => {
            const statusInfo = getStatusInfo(req.status)
            return (
              <div key={req.id} style={tabStyles.reqCard}>
                <div style={tabStyles.reqHeader}>
                  <div style={tabStyles.reqInfo}>
                    <div style={tabStyles.reqMaterial}>
                      {req.urgente && <AlertTriangle size={16} style={{ color: '#F44336' }} />}
                      <strong>{req.quantidade} {req.unidade}</strong> - {req.material}
                    </div>
                    <div style={tabStyles.reqMeta}>
                      <span style={tabStyles.metaItem}>
                        <Building2 size={14} />
                        {req.obras?.codigo}
                      </span>
                      <span style={tabStyles.metaItem}>
                        <User size={14} />
                        {req.pedido_por_nome}
                      </span>
                      <span style={tabStyles.metaItem}>
                        <Calendar size={14} />
                        {formatDate(req.data_pedido)}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    ...tabStyles.statusBadge,
                    color: statusInfo.color,
                    background: statusInfo.bg
                  }}>
                    {statusInfo.text}
                  </span>
                </div>

                {req.notas && (
                  <p style={tabStyles.reqNotas}>📝 {req.notas}</p>
                )}

                <div style={tabStyles.workflowInfo}>
                  <div style={tabStyles.workflowStep}>
                    <span style={tabStyles.workflowLabel}>Pedido por:</span>
                    <span>{req.pedido_por_nome}</span>
                  </div>
                  {req.aprovado_por_nome && (
                    <div style={tabStyles.workflowStep}>
                      <span style={tabStyles.workflowLabel}>Aprovado por:</span>
                      <span><strong>{req.aprovado_por_nome}</strong> - Encarregado</span>
                    </div>
                  )}
                  {req.validado_por_nome && (
                    <div style={tabStyles.workflowStep}>
                      <span style={tabStyles.workflowLabel}>Validado por:</span>
                      <span><strong>{req.validado_por_nome}</strong> - Direção Operação</span>
                    </div>
                  )}
                  {req.status === 'rejeitado' && (
                    <div style={{ ...tabStyles.workflowStep, color: '#F44336' }}>
                      <span style={tabStyles.workflowLabel}>Rejeitado:</span>
                      <span>{req.motivo_rejeicao || 'Sem motivo'}</span>
                    </div>
                  )}
                </div>

                <div style={tabStyles.reqActions}>
                  {req.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => openActionModal(req, 'aprovar')}
                        style={tabStyles.approveButton}
                        disabled={actionLoading === req.id}
                      >
                        <Check size={16} />
                        Aprovar (Encarregado)
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'rejeitar')}
                        style={tabStyles.rejectButton}
                        disabled={actionLoading === req.id}
                      >
                        <X size={16} />
                        Rejeitar
                      </button>
                    </>
                  )}
                  {req.status === 'aprovado' && (
                    <>
                      <button
                        onClick={() => openActionModal(req, 'validar')}
                        style={tabStyles.validateButton}
                        disabled={actionLoading === req.id}
                      >
                        <CheckCheck size={16} />
                        Validar (Direção)
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'rejeitar')}
                        style={tabStyles.rejectButton}
                        disabled={actionLoading === req.id}
                      >
                        <X size={16} />
                        Rejeitar
                      </button>
                    </>
                  )}
                  {req.status === 'validado' && (
                    <button
                      onClick={() => openActionModal(req, 'entregar')}
                      style={tabStyles.deliverButton}
                      disabled={actionLoading === req.id}
                    >
                      <Truck size={16} />
                      Marcar como Entregue
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Ação */}
      {showModal && selectedReq && (
        <div style={tabStyles.modalOverlay}>
          <div style={tabStyles.modal}>
            <div style={tabStyles.modalHeader}>
              <h2 style={tabStyles.modalTitle}>
                {modalAction === 'aprovar' && 'Aprovar Requisição'}
                {modalAction === 'validar' && 'Validar Requisição'}
                {modalAction === 'rejeitar' && 'Rejeitar Requisição'}
                {modalAction === 'entregar' && 'Confirmar Entrega'}
              </h2>
              <button onClick={() => setShowModal(false)} style={tabStyles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={tabStyles.modalBody}>
              <div style={tabStyles.modalReqInfo}>
                <strong>{selectedReq.quantidade} {selectedReq.unidade}</strong> de <strong>{selectedReq.material}</strong>
                <br />
                <span style={{ color: '#666', fontSize: 13 }}>
                  Obra: {selectedReq.obras?.codigo} | Pedido por: {selectedReq.pedido_por_nome}
                </span>
              </div>

              {modalAction === 'aprovar' && (
                <div style={tabStyles.modalInfo}>
                  <p>Ao aprovar, a requisição será enviada para validação da Direção de Operação.</p>
                  <p><strong>Aprovado por: Edgard Borges - Encarregado</strong></p>
                </div>
              )}

              {modalAction === 'validar' && (
                <div style={tabStyles.modalInfo}>
                  <p>Ao validar, a requisição será marcada como pronta para entrega.</p>
                  <p><strong>Validado por: João Umbelino - Direção Operação</strong></p>
                </div>
              )}

              <div style={tabStyles.field}>
                <label style={tabStyles.label}>
                  {modalAction === 'rejeitar' ? 'Motivo da rejeição *' : 'Notas (opcional)'}
                </label>
                <textarea
                  value={modalNotas}
                  onChange={(e) => setModalNotas(e.target.value)}
                  placeholder={modalAction === 'rejeitar' ? 'Explique o motivo da rejeição...' : 'Adicione notas se necessário...'}
                  style={tabStyles.textarea}
                  rows={3}
                />
              </div>
            </div>

            <div style={tabStyles.modalActionsRow}>
              <button onClick={() => setShowModal(false)} style={tabStyles.cancelButton}>
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (modalAction === 'rejeitar' && !modalNotas.trim())}
                style={{
                  ...tabStyles.confirmButton,
                  background: modalAction === 'rejeitar' ? '#F44336' :
                             modalAction === 'aprovar' ? '#FF9800' :
                             modalAction === 'validar' ? '#4CAF50' : '#9C27B0'
                }}
              >
                {actionLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    {modalAction === 'aprovar' && <><Check size={16} /> Aprovar</>}
                    {modalAction === 'validar' && <><CheckCheck size={16} /> Validar</>}
                    {modalAction === 'rejeitar' && <><X size={16} /> Rejeitar</>}
                    {modalAction === 'entregar' && <><Truck size={16} /> Confirmar Entrega</>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================
// STYLES
// =============================================
const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto'
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--brown)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: 0
  },
  subtitle: {
    color: 'var(--brown-light)',
    marginTop: 4,
    marginBottom: 0,
    fontSize: 14
  },
  tabsContainer: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    borderBottom: '2px solid var(--stone)',
    paddingBottom: 0
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--brown-light)',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: 'var(--brown)',
    borderBottomColor: 'var(--brown)',
    fontWeight: 600
  },
  tabContent: {
    minHeight: 400
  }
}

const tabStyles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 256
  },
  tabHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'var(--brown)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 20
  },
  statCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)'
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--cream)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--brown)'
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--brown-light)'
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 20
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--brown-light)'
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 44px',
    border: '2px solid var(--stone)',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  },
  filtersCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  filterInput: {
    padding: '10px 12px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: 'white'
  },
  checkboxFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13
  },
  listCard: {
    background: 'var(--white)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  emptyState: {
    padding: 48,
    textAlign: 'center'
  },
  emptyButton: {
    marginTop: 16,
    padding: '10px 20px',
    background: 'var(--brown)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer'
  },
  divider: {
    height: 1,
    background: 'var(--stone)'
  },
  workerRow: {
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  workerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: 18
  },
  workerName: {
    fontWeight: 600,
    color: 'var(--brown)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15
  },
  inactiveBadge: {
    fontSize: 11,
    padding: '2px 8px',
    background: 'var(--stone)',
    color: 'var(--brown-light)',
    borderRadius: 4
  },
  workerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    fontSize: 13,
    color: 'var(--brown-light)'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  workerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  obraCount: {
    fontSize: 13,
    color: 'var(--brown-light)',
    marginRight: 8
  },
  iconButton: {
    padding: 8,
    background: 'none',
    border: 'none',
    color: 'var(--brown-light)',
    cursor: 'pointer',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  expandedContent: {
    padding: '0 16px 16px 74px',
    background: 'var(--cream)',
    borderTop: '1px solid var(--stone)'
  },
  expandedLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)',
    marginBottom: 10,
    marginTop: 16
  },
  obrasTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  obraTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'var(--white)',
    border: '1px solid var(--stone)',
    borderRadius: 8,
    fontSize: 13
  },
  noObras: {
    fontSize: 13,
    color: 'var(--brown-light)',
    fontStyle: 'italic',
    margin: 0
  },
  pinInfo: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid var(--stone)',
    fontSize: 12,
    color: 'var(--brown-light)'
  },
  pinValue: {
    fontFamily: 'monospace',
    background: 'var(--stone)',
    padding: '2px 8px',
    borderRadius: 4
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    padding: 20,
    borderBottom: '1px solid var(--stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--brown)',
    margin: 0
  },
  closeButton: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--brown-light)',
    borderRadius: 6
  },
  form: {
    padding: 20
  },
  field: {
    marginBottom: 18
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)',
    marginBottom: 6
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  phoneRow: {
    display: 'flex',
    gap: 8
  },
  phonePrefix: {
    padding: '12px 14px',
    background: 'var(--cream)',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    color: 'var(--brown-light)',
    fontSize: 14
  },
  pinRow: {
    display: 'flex',
    gap: 8
  },
  generateButton: {
    padding: '12px 16px',
    background: 'var(--cream)',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  hint: {
    fontSize: 11,
    color: 'var(--brown-light)',
    marginTop: 4,
    marginBottom: 0
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: 'var(--brown)',
    cursor: 'pointer'
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: 'var(--brown)'
  },
  obrasList: {
    border: '2px solid var(--stone)',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'auto'
  },
  noObrasModal: {
    padding: 16,
    textAlign: 'center',
    color: 'var(--brown-light)',
    fontSize: 13,
    margin: 0
  },
  obraOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--stone)',
    transition: 'background 0.2s'
  },
  obraCode: {
    fontWeight: 600,
    color: 'var(--brown)'
  },
  obraName: {
    color: 'var(--brown-light)',
    flex: 1
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 16,
    whiteSpace: 'nowrap'
  },
  statusBadgeSmall: {
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 12
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    marginTop: 24
  },
  modalActionsRow: {
    padding: 20,
    borderTop: '1px solid var(--stone)',
    display: 'flex',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    background: 'transparent',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  submitButton: {
    flex: 1,
    padding: '12px 20px',
    background: 'var(--brown)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  confirmButton: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  // Presencas specific
  dateGroup: {
    borderBottom: '1px solid var(--stone)'
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: 'var(--cream)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  dateCount: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--brown-light)'
  },
  presencaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    borderBottom: '1px solid var(--stone)'
  },
  presencaAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--brown)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 16
  },
  presencaInfo: {
    flex: 1,
    minWidth: 0
  },
  presencaNome: {
    fontWeight: 600,
    color: 'var(--brown)',
    fontSize: 14
  },
  presencaMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    fontSize: 12,
    color: 'var(--brown-light)'
  },
  presencaTimes: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  timeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: 'var(--brown)'
  },
  presencaHoras: {
    minWidth: 70,
    textAlign: 'right'
  },
  horasValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--brown)',
    background: 'var(--cream)',
    padding: '4px 10px',
    borderRadius: 12
  },
  // Requisicoes specific
  reqCard: {
    padding: 20,
    borderBottom: '1px solid var(--stone)'
  },
  reqHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12
  },
  reqInfo: {
    flex: 1
  },
  reqMaterial: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    color: 'var(--brown)',
    marginBottom: 6
  },
  reqMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    fontSize: 13,
    color: 'var(--brown-light)'
  },
  reqNotas: {
    fontSize: 13,
    color: '#666',
    background: 'var(--cream)',
    padding: '10px 12px',
    borderRadius: 8,
    margin: '0 0 12px 0'
  },
  workflowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: 8,
    fontSize: 13
  },
  workflowStep: {
    display: 'flex',
    gap: 8
  },
  workflowLabel: {
    color: 'var(--brown-light)',
    minWidth: 100
  },
  reqActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },
  approveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  validateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  rejectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'transparent',
    color: '#F44336',
    border: '2px solid #F44336',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  deliverButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#9C27B0',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalBody: {
    padding: 20
  },
  modalReqInfo: {
    padding: 16,
    background: 'var(--cream)',
    borderRadius: 10,
    marginBottom: 16
  },
  modalInfo: {
    padding: 12,
    background: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#1976D2'
  }
}
