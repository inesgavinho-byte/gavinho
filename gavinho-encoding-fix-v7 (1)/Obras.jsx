import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, HardHat, MapPin, Calendar, Users, Euro,
  MoreVertical, Eye, X, Edit, Trash2, Play, Pause, CheckCircle,
  Loader2, AlertTriangle
} from 'lucide-react'
import CalendarioSemanal from '../components/CalendarioSemanal'

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
  
  const [formData, setFormData] = useState({
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
      console.log('Eliminando obra:', obra.id)
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', obra.id)

      if (error) {
        console.error('Erro Supabase:', error)
        throw error
      }
      setShowDeleteModal(null)
      fetchObras()
    } catch (error) {
      console.error('Erro ao eliminar obra:', error)
      alert('Erro ao eliminar obra: ' + (error.message || JSON.stringify(error)))
    }
  }

  const handleStatusChange = async (obra, newStatus) => {
    console.log('=== INICIO handleStatusChange ===')
    console.log('Obra ID:', obra.id)
    console.log('Novo Status:', newStatus)
    
    try {
      const { data, error } = await supabase
        .from('obras')
        .update({ status: newStatus })
        .eq('id', obra.id)
        .select()

      console.log('Resposta Supabase - data:', data)
      console.log('Resposta Supabase - error:', error)

      if (error) {
        throw error
      }
      
      if (!data || data.length === 0) {
        throw new Error('Nenhum registo atualizado - verifique se o ID existe')
      }
      
      setActiveMenu(null)
      fetchObras()
    } catch (error) {
      console.error('Erro completo:', error)
      alert('Erro ao atualizar status: ' + (error.message || error.details || JSON.stringify(error)))
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'planeamento': { bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' },
      'em_curso': { bg: 'rgba(122, 158, 122, 0.15)', color: 'var(--success)' },
      'pausada': { bg: 'rgba(201, 168, 130, 0.15)', color: 'var(--warning)' },
      'concluida': { bg: 'var(--stone)', color: 'var(--brown)' },
      'cancelada': { bg: 'rgba(184, 138, 138, 0.15)', color: 'var(--error)' }
    }
    return colors[status] || colors.planeamento
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

  const filteredObras = obras.filter(obra =>
    obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.localizacao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalObras = obras.length
  const obrasAtivas = obras.filter(o => o.status === 'em_curso').length
  const progressoMedio = obras.length > 0 
    ? Math.round(obras.reduce((sum, o) => sum + (o.progresso || 0), 0) / obras.length) : 0
  const orcamentoTotal = obras.reduce((sum, o) => sum + (o.orcamento || 0), 0)

  const formatCurrency = (value) => {
    if (!value) return 'â‚¬0'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

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
          <p className="page-subtitle">{totalObras} obras registadas</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewObra}>
          <Plus size={18} />
          Nova Obra
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Total Obras</span>
            <HardHat size={18} style={{ color: 'var(--brown-light)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalObras}</div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Em Curso</span>
            <Play size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>{obrasAtivas}</div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Progresso Médio</span>
            <HardHat size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{progressoMedio}%</div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Orçamento Total</span>
            <Euro size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatCurrency(orcamentoTotal)}</div>
        </div>
      </div>

      {/* Calendário Semanal */}
      <CalendarioSemanal tipo="obras" height="280px" />

      {/* Search */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input 
            type="text"
            placeholder="Pesquisar obras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Lista de Obras */}
      {filteredObras.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <HardHat size={48} style={{ color: 'var(--brown-light)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Sem obras</h3>
          <p style={{ color: 'var(--brown-light)', marginBottom: '20px' }}>Cria a primeira obra para começar</p>
          <button className="btn btn-primary" onClick={handleNewObra}>
            <Plus size={18} /> Nova Obra
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredObras.map((obra) => (
            <div 
              key={obra.id} 
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => navigate(`/obras/${obra.codigo}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                {/* Info Principal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '300px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, var(--stone), var(--blush))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HardHat size={22} style={{ color: 'var(--brown)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '12px', fontFamily: 'monospace' }}>{obra.codigo}</span>
                      {obra.projetos?.codigo && (
                        <span style={{ padding: '2px 8px', background: 'var(--stone)', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>{obra.projetos.codigo}</span>
                      )}
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: getStatusColor(obra.status).bg, color: getStatusColor(obra.status).color }}>
                        {getStatusLabel(obra.status)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{obra.nome}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--brown-light)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {obra.localizacao || 'Sem localização'}
                      </span>
                      {obra.data_prevista_conclusao && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> Previsão: {new Date(obra.data_prevista_conclusao).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {obra.encarregado && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {obra.encarregado}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progresso e Ações */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>Progresso</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${obra.progresso || 0}%`, height: '100%', background: 'var(--success)', borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{obra.progresso || 0}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="btn btn-outline"
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/obras/${obra.codigo}`) }}
                    >
                      <Eye size={14} /> Ver
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--brown-light)' }}
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === obra.id ? null : obra.id) }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {/* Menu Dropdown */}
                      {activeMenu === obra.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleEditObra(obra) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}>
                            <Edit size={14} /> Editar
                          </button>
                          <div style={{ borderTop: '1px solid var(--stone)', margin: '4px 0' }} />
                          <div style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--brown-light)', fontWeight: 600 }}>MUDAR STATUS</div>
                          {obra.status !== 'em_curso' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(obra, 'em_curso') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--success)' }}>
                              <Play size={14} /> Em Curso
                            </button>
                          )}
                          {obra.status !== 'pausada' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(obra, 'pausada') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--warning)' }}>
                              <Pause size={14} /> Pausar
                            </button>
                          )}
                          {obra.status !== 'concluida' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(obra, 'concluida') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}>
                              <CheckCircle size={14} /> Concluir
                            </button>
                          )}
                          <div style={{ borderTop: '1px solid var(--stone)', margin: '4px 0' }} />
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(obra); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}>
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Orçamento (â‚¬)</label>
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
