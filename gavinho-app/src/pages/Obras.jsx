import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Plus, Search, HardHat, MapPin, Calendar, Users,
  MoreVertical, Eye, X, Edit, Trash2, Play, Pause, CheckCircle,
  Loader2, AlertTriangle, ChevronDown
} from 'lucide-react'

const statusOptions = ['Todos', 'Planeamento', 'Em Curso', 'Pausada', 'Concluída', 'Cancelada']
const tipoOptions = ['Todos', 'Construção Nova', 'Remodelação', 'Ampliação', 'Fit-out']

export default function Obras() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [editingObra, setEditingObra] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [selectedTipo, setSelectedTipo] = useState('Todos')

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    projeto_id: '',
    localizacao: '',
    tipo: 'Remodelação',
    status: 'planeamento',
    progresso: 0,
    data_inicio: '',
    data_prevista_conclusao: '',
    encarregado: '',
    orcamento: '',
    notas: ''
  })

  useEffect(() => {
    fetchObras()
    fetchProjetos()

    // Supabase Realtime subscription para sincronizar alterações
    const channel = supabase
      .channel('obras-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obras' },
        (payload) => {
          console.log('Obras alterado:', payload)
          if (payload.eventType === 'INSERT') {
            // Refetch to get joined data
            fetchObras()
          } else if (payload.eventType === 'UPDATE') {
            setObras(prev => prev.map(o =>
              o.id === payload.new.id ? { ...o, ...payload.new } : o
            ))
          } else if (payload.eventType === 'DELETE') {
            setObras(prev => prev.filter(o => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchObras = async () => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select(`*, projetos (codigo, nome, cliente_nome)`)
        .order('codigo', { ascending: true })

      if (error) throw error
      setObras(data || [])
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .order('codigo', { ascending: true })

      if (error) throw error
      setProjetos(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '', projeto_id: '', localizacao: '', tipo: 'Remodelação',
      status: 'planeamento', progresso: 0, data_inicio: '',
      data_prevista_conclusao: '', encarregado: '', orcamento: '', notas: ''
    })
    setEditingObra(null)
  }

  const handleNewObra = () => {
    resetForm()
    setShowModal(true)
  }

  const handleEditObra = (obra) => {
    setEditingObra(obra)
    setFormData({
      codigo: obra.codigo || '',
      nome: obra.nome || '',
      projeto_id: obra.projeto_id || '',
      localizacao: obra.localizacao || '',
      tipo: obra.tipo || 'Remodelação',
      status: obra.status || 'planeamento',
      progresso: obra.progresso || 0,
      data_inicio: obra.data_inicio || '',
      data_prevista_conclusao: obra.data_prevista_conclusao || '',
      encarregado: obra.encarregado || '',
      orcamento: obra.orcamento || '',
      notas: obra.notas || ''
    })
    setShowModal(true)
    setActiveMenu(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      alert('O nome da obra é obrigatório')
      return
    }
    setSaving(true)

    try {
      const obraData = {
        nome: formData.nome,
        projeto_id: formData.projeto_id || null,
        localizacao: formData.localizacao || null,
        tipo: formData.tipo,
        status: formData.status,
        progresso: parseInt(formData.progresso) || 0,
        data_inicio: formData.data_inicio || null,
        data_prevista_conclusao: formData.data_prevista_conclusao || null,
        encarregado: formData.encarregado || null,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        notas: formData.notas || null
      }

      // Adicionar codigo apenas quando editando
      if (editingObra && formData.codigo) {
        obraData.codigo = formData.codigo.toUpperCase()
      }

      if (editingObra) {
        const { error } = await supabase
          .from('obras')
          .update(obraData)
          .eq('id', editingObra.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obras')
          .insert([obraData])
        if (error) throw error
      }

      setShowModal(false)
      resetForm()
      fetchObras()
    } catch (error) {
      console.error('Erro ao guardar obra:', error)
      alert('Erro ao guardar obra: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteObra = async (obra) => {
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', obra.id)

      if (error) throw error
      setShowDeleteModal(null)
      fetchObras()
    } catch (error) {
      console.error('Erro ao eliminar obra:', error)
      alert('Erro ao eliminar obra: ' + (error.message || JSON.stringify(error)))
    }
  }

  // Helpers
  const getStatusColor = (status) => {
    const colors = {
      'planeamento': 'var(--info)',
      'em_curso': 'var(--success)',
      'pausada': 'var(--warning)',
      'concluida': 'var(--brown)',
      'cancelada': 'var(--error)'
    }
    return colors[status] || 'var(--info)'
  }

  const getStatusLabel = (status) => {
    const labels = {
      planeamento: 'Planeamento',
      em_curso: 'Em Curso',
      pausada: 'Pausada',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    }
    return labels[status] || status
  }

  const getStatusValue = (label) => {
    const values = {
      'Planeamento': 'planeamento',
      'Em Curso': 'em_curso',
      'Pausada': 'pausada',
      'Concluída': 'concluida',
      'Cancelada': 'cancelada'
    }
    return values[label] || null
  }

  const getPrioridadeFromOrcamento = (orcamento) => {
    if (!orcamento) return 'media'
    if (orcamento >= 500000) return 'urgente'
    if (orcamento >= 300000) return 'alta'
    if (orcamento >= 100000) return 'media'
    return 'baixa'
  }

  const getPrioridadeStyle = (prioridade) => {
    const styles = {
      urgente: { bg: 'var(--priority-urgente)', label: 'URGENTE' },
      alta: { bg: 'var(--priority-alta)', label: 'ALTA' },
      media: { bg: 'var(--priority-media)', label: 'MÉDIA' },
      baixa: { bg: 'var(--priority-baixa)', label: 'BAIXA' }
    }
    return styles[prioridade] || styles.media
  }

  const formatDateRange = (dataInicio, dataFim) => {
    const format = (d) => {
      if (!d) return ''
      return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    const inicio = format(dataInicio)
    const fim = format(dataFim)
    if (inicio && fim) return `${inicio} - ${fim}`
    if (inicio) return inicio
    if (fim) return `até ${fim}`
    return '—'
  }

  // Filtrar obras
  const filteredObras = obras.filter(obra => {
    const matchesSearch =
      obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.localizacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.encarregado?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'Todos' || obra.status === getStatusValue(selectedStatus)
    const matchesTipo = selectedTipo === 'Todos' || obra.tipo === selectedTipo

    return matchesSearch && matchesStatus && matchesTipo
  })

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Obras</h1>
          <p className="page-subtitle">Gestão completa de obras de construção</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewObra}>
          <Plus size={18} />
          Nova Obra
        </button>
      </div>

      {/* Filtros - Estilo Pill como Projetos */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Procurar por nome, cliente ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '14px 40px 14px 20px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="Todos">Todos os estados</option>
            {statusOptions.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>

        {/* Tipo Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            style={{
              padding: '14px 40px 14px 20px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="Todos">Todos os tipos</option>
            {tipoOptions.filter(t => t !== 'Todos').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Grid de Cards de Obras */}
      {filteredObras.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <HardHat size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Nenhuma obra encontrada</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleNewObra}>Criar Primeira Obra</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredObras.map((obra) => {
            const prioridade = getPrioridadeFromOrcamento(obra.orcamento)
            const prioridadeStyle = getPrioridadeStyle(prioridade)
            return (
              <div
                key={obra.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '20px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'box-shadow 0.2s ease'
                }}
                onClick={() => navigate(`/obras/${obra.codigo}`)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                {/* Header: Título + Badge + Menu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      marginBottom: '4px',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {obra.codigo}_{(obra.nome || '').toUpperCase()}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--brown-light)',
                      margin: 0
                    }}>
                      {obra.projetos?.cliente_nome || obra.encarregado || 'Encarregado não definido'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Priority Badge */}
                    <span style={{
                      padding: '4px 10px',
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderRadius: '4px',
                      background: prioridadeStyle.bg,
                      color: 'white'
                    }}>
                      {prioridadeStyle.label}
                    </span>

                    {/* Menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === obra.id ? null : obra.id) }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--brown-light)',
                          borderRadius: '4px'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenu === obra.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'var(--white)',
                          borderRadius: '10px',
                          boxShadow: 'var(--shadow-lg)',
                          minWidth: '150px',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/obras/${obra.codigo}`) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Eye size={14} />Ver Detalhe</button>
                          <button onClick={(e) => { e.stopPropagation(); handleEditObra(obra) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Edit size={14} />Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(obra); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}><Trash2 size={14} />Eliminar</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Info: Localização + Datas */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '12px',
                  color: 'var(--brown-light)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={13} />
                    {obra.localizacao || '—'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} />
                    {formatDateRange(obra.data_inicio, obra.data_prevista_conclusao)}
                  </span>
                </div>

                {/* Tipo Badge - pequeno */}
                {obra.tipo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 8px',
                      fontSize: '10px',
                      fontWeight: 500,
                      borderRadius: '4px',
                      background: 'var(--stone)',
                      color: 'var(--brown)'
                    }}>
                      {obra.tipo}
                    </span>
                    {obra.projetos?.codigo && (
                      <span style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 500,
                        borderRadius: '4px',
                        background: 'var(--blush)',
                        color: 'var(--brown)'
                      }}>
                        {obra.projetos.codigo}
                      </span>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '3px',
                  background: 'var(--stone)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginTop: '4px'
                }}>
                  <div style={{
                    width: `${obra.progresso || 0}%`,
                    height: '100%',
                    background: getStatusColor(obra.status),
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Footer: Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '4px'
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--brown-light)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getStatusColor(obra.status)
                    }} />
                    {getStatusLabel(obra.status)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingObra ? 'Editar Obra' : 'Nova Obra'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome da Obra *</label>
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Remodelação Apartamento Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Projeto Associado</label>
                    <select value={formData.projeto_id} onChange={(e) => setFormData({...formData, projeto_id: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                      <option value="">Sem projeto</option>
                      {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Tipo</label>
                    <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                      <option value="Construção Nova">Construção Nova</option>
                      <option value="Remodelação">Remodelação</option>
                      <option value="Ampliação">Ampliação</option>
                      <option value="Fit-out">Fit-out</option>
                    </select>
                  </div>
                  {editingObra && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Código da Obra</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                          placeholder="OB00XXX"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--stone)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            letterSpacing: '0.5px'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px', display: 'block' }}>
                          Formato: OB00XXX (ex: OB00001)
                        </span>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Status</label>
                        <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                          <option value="planeamento">Planeamento</option>
                          <option value="em_curso">Em Curso</option>
                          <option value="pausada">Pausada</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Progresso (%)</label>
                        <input type="number" min="0" max="100" value={formData.progresso} onChange={(e) => setFormData({...formData, progresso: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                    </>
                  )}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Localização</label>
                    <input type="text" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} placeholder="Ex: Av. da Liberdade, Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Data Início</label>
                    <input type="date" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Data Prevista Conclusão</label>
                    <input type="date" value={formData.data_prevista_conclusao} onChange={(e) => setFormData({...formData, data_prevista_conclusao: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Encarregado</label>
                    <input type="text" value={formData.encarregado} onChange={(e) => setFormData({...formData, encarregado: e.target.value})} placeholder="Nome do encarregado" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Orçamento (€)</label>
                    <input type="number" value={formData.orcamento} onChange={(e) => setFormData({...formData, orcamento: e.target.value})} placeholder="0" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Notas</label>
                    <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} rows={3} placeholder="Notas adicionais..." style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !formData.nome.trim()}>
                  {saving ? <Loader2 size={16} className="spin" /> : editingObra ? 'Guardar Alterações' : <><Plus size={16} /> Criar Obra</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteModal(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(184, 138, 138, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Eliminar Obra</h3>
            </div>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', lineHeight: 1.5 }}>
              Tem a certeza que deseja eliminar <strong>{showDeleteModal.nome}</strong> ({showDeleteModal.codigo})? Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteModal(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => handleDeleteObra(showDeleteModal)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menu */}
      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}
    </div>
  )
}
