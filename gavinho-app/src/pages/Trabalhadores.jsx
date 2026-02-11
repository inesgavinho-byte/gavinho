import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Users, UserPlus, Search, Phone, Key, Building2,
  Edit, Trash2, X, Check, Loader2, HardHat, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function Trabalhadores() {
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
      <div style={styles.loadingContainer}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <HardHat size={28} style={{ color: 'var(--brown)' }} />
            Trabalhadores
          </h1>
          <p style={styles.subtitle}>Gerir trabalhadores e acessos à PWA</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingWorker(null)
            setShowModal(true)
          }}
          style={styles.addButton}
        >
          <UserPlus size={20} />
          Novo Trabalhador
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Users size={24} style={{ color: 'var(--brown)' }} />
          </div>
          <div>
            <div style={styles.statValue}>{activeCount}</div>
            <div style={styles.statLabel}>Trabalhadores ativos</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'var(--stone)' }}>
            <Users size={24} style={{ color: 'var(--brown-light)' }} />
          </div>
          <div>
            <div style={styles.statValue}>{inactiveCount}</div>
            <div style={styles.statLabel}>Inativos</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#e8f5e9' }}>
            <Building2 size={24} style={{ color: '#2e7d32' }} />
          </div>
          <div>
            <div style={styles.statValue}>{obrasEmCurso}</div>
            <div style={styles.statLabel}>Obras em curso</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <Search size={20} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Pesquisar por nome, telefone ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Workers List */}
      <div style={styles.listCard}>
        {filteredWorkers.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhum trabalhador encontrado</p>
            <button
              onClick={() => {
                resetForm()
                setEditingWorker(null)
                setShowModal(true)
              }}
              style={styles.emptyButton}
            >
              Adicionar primeiro trabalhador
            </button>
          </div>
        ) : (
          filteredWorkers.map((worker, index) => (
            <div key={worker.id}>
              {index > 0 && <div style={styles.divider} />}
              <div
                style={styles.workerRow}
                onClick={() => setExpandedWorker(expandedWorker === worker.id ? null : worker.id)}
              >
                <div style={styles.workerInfo}>
                  <div style={{
                    ...styles.avatar,
                    background: worker.ativo ? 'var(--brown)' : 'var(--stone)'
                  }}>
                    {worker.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.workerName}>
                      {worker.nome}
                      {!worker.ativo && (
                        <span style={styles.inactiveBadge}>Inativo</span>
                      )}
                    </div>
                    <div style={styles.workerMeta}>
                      <span style={styles.metaItem}>
                        <Phone size={14} />
                        {worker.telefone}
                      </span>
                      {worker.cargo && (
                        <span style={styles.metaItem}>
                          <HardHat size={14} />
                          {worker.cargo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.workerActions}>
                  <span style={styles.obraCount}>
                    {worker.trabalhador_obras?.length || 0} obra(s)
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(worker) }}
                    style={styles.iconButton}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(worker) }}
                    style={{ ...styles.iconButton, color: '#f44336' }}
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
                <div style={styles.expandedContent}>
                  <p style={styles.expandedLabel}>Obras atribuídas:</p>
                  {worker.trabalhador_obras?.length > 0 ? (
                    <div style={styles.obrasTags}>
                      {worker.trabalhador_obras.map(to => (
                        <span key={to.obra_id} style={styles.obraTag}>
                          <Building2 size={14} style={{ color: 'var(--brown)' }} />
                          <strong>{to.obras?.codigo}</strong>
                          <span style={{ color: 'var(--brown-light)' }}>- {to.obras?.nome}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.noObras}>Nenhuma obra atribuída</p>
                  )}
                  <div style={styles.pinInfo}>
                    PIN: <span style={styles.pinValue}>{worker.pin}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingWorker ? 'Editar Trabalhador' : 'Novo Trabalhador'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingWorker(null) }}
                style={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Nome *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  style={styles.input}
                  placeholder="Nome completo"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Telemóvel *</label>
                <div style={styles.phoneRow}>
                  <span style={styles.phonePrefix}>+351</span>
                  <input
                    type="tel"
                    required
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value.replace(/\D/g, '') })}
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="912 345 678"
                    maxLength={9}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>PIN de Acesso *</label>
                <div style={styles.pinRow}>
                  <input
                    type="text"
                    required
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    style={{ ...styles.input, flex: 1, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 4 }}
                    placeholder="1234"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={generatePin}
                    style={styles.generateButton}
                  >
                    Gerar
                  </button>
                </div>
                <p style={styles.hint}>PIN de 4-6 dígitos para acesso à app</p>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Cargo</label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  style={styles.input}
                  placeholder="Ex: Pedreiro, Eletricista, Encarregado..."
                />
              </div>

              <div style={styles.field}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    style={styles.checkbox}
                  />
                  Trabalhador ativo
                </label>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Obras Atribuídas</label>
                <div style={styles.obrasList}>
                  {obras.length === 0 ? (
                    <p style={styles.noObrasModal}>Nenhuma obra disponível</p>
                  ) : (
                    obras.map(obra => (
                      <label
                        key={obra.id}
                        style={{
                          ...styles.obraOption,
                          background: form.obras.includes(obra.id) ? 'var(--cream)' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.obras.includes(obra.id)}
                          onChange={() => toggleObraSelection(obra.id)}
                          style={styles.checkbox}
                        />
                        <span style={styles.obraCode}>{obra.codigo}</span>
                        <span style={styles.obraName}>- {obra.nome}</span>
                        <span style={{
                          ...styles.statusBadge,
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

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingWorker(null) }}
                  style={styles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.submitButton}
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 256
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
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
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
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
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--brown)'
  },
  statLabel: {
    fontSize: 13,
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
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  listCard: {
    background: 'var(--white)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
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
    justifyContent: 'center',
    transition: 'background 0.2s'
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
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
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
    color: 'var(--brown)',
    transition: 'background 0.2s'
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
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    marginTop: 24
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
    color: 'var(--brown)',
    transition: 'background 0.2s'
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
    gap: 8,
    transition: 'background 0.2s'
  }
}
