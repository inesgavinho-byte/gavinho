import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { calculateMatchScore } from '../services/garvisMatching'
import {
  ArrowLeft,
  Building2,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  FileText,
  Clock,
  TrendingUp,
  Package,
  Calendar,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  Loader2,
  X,
  Check,
  AlertCircle,
  MoreVertical,
  Shield,
  Users,
  Sparkles
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'historico', label: 'Histórico' },
  { id: 'rfqs', label: 'Consultas' },
  { id: 'avaliacoes', label: 'Avaliações' }
]

export default function FornecedorDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [fornecedor, setFornecedor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [trabalhos, setTrabalhos] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [projetos, setProjetos] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({})
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false)
  const [avaliacaoData, setAvaliacaoData] = useState({
    projeto_id: '',
    descricao: '',
    valor: '',
    avaliacao_qualidade: 5,
    avaliacao_prazos: 5,
    avaliacao_preco: 5,
    avaliacao_comunicacao: 5,
    comentario_avaliacao: ''
  })

  // GARVIS state
  const [garvisData, setGarvisData] = useState({
    certifications: [],
    expiringCerts: [],
    dealRooms: [],
    matchScore: null
  })

  useEffect(() => {
    fetchFornecedor()
    fetchTrabalhos()
    fetchRfqs()
    fetchProjetos()
    fetchGarvisData()
  }, [id])

  // Fetch GARVIS-related data for this supplier
  const fetchGarvisData = async () => {
    try {
      // 1. Certifications
      const { data: certs } = await supabase
        .from('fornecedor_certificacoes')
        .select('*')
        .eq('fornecedor_id', id)
        .order('data_validade')

      const now = new Date()
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)

      const expiring = (certs || []).filter(c => {
        const exp = new Date(c.data_validade)
        return exp >= now && exp <= thirtyDays
      })

      // 2. Deal rooms involving this supplier
      const { data: dealRoomLinks } = await supabase
        .from('deal_room_fornecedores')
        .select('*, deal_rooms(id, titulo, codigo, status, especialidade)')
        .eq('fornecedor_id', id)
        .order('created_at', { ascending: false })
        .limit(10)

      const activeDRs = (dealRoomLinks || [])
        .filter(l => l.deal_rooms && l.deal_rooms.status !== 'cancelado')
        .map(l => ({ ...l.deal_rooms, supplierStatus: l.status }))

      setGarvisData({
        certifications: certs || [],
        expiringCerts: expiring,
        dealRooms: activeDRs,
        matchScore: null
      })
    } catch {
      // GARVIS data is non-critical, tables may not exist
    }
  }

  // Calculate match score once fornecedor is loaded
  useEffect(() => {
    if (fornecedor) {
      const score = calculateMatchScore(fornecedor, {
        especialidade: fornecedor.especialidade || fornecedor.categoria_principal
      })
      setGarvisData(prev => ({ ...prev, matchScore: score }))
    }
  }, [fornecedor])

  const fetchFornecedor = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setFornecedor(data)
      setFormData(data)
    } catch (error) {
      console.error('Erro ao carregar fornecedor:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrabalhos = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedor_trabalhos')
        .select(`
          *,
          projetos:projeto_id (codigo, nome)
        `)
        .eq('fornecedor_id', id)
        .order('data_adjudicacao', { ascending: false })

      if (error && error.code !== 'PGRST116') throw error
      setTrabalhos(data || [])
    } catch (error) {
      console.error('Erro ao carregar trabalhos:', error)
    }
  }

  const fetchRfqs = async () => {
    try {
      const { data, error } = await supabase
        .from('rfq_propostas')
        .select(`
          *,
          rfq:rfq_id (codigo, titulo, status, projeto_id)
        `)
        .eq('fornecedor_id', id)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') throw error
      setRfqs(data || [])
    } catch (error) {
      console.error('Erro ao carregar RFQs:', error)
    }
  }

  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .order('codigo', { ascending: false })
        .limit(50)

      if (error) throw error
      setProjetos(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updateData = {
        nome: formData.nome,
        nome_comercial: formData.nome_comercial,
        nif: formData.nif,
        categoria_principal: formData.categoria_principal,
        especialidades: typeof formData.especialidades === 'string' 
          ? formData.especialidades.split(',').map(s => s.trim())
          : formData.especialidades,
        morada: formData.morada,
        cidade: formData.cidade,
        telefone: formData.telefone,
        email: formData.email,
        website: formData.website,
        contacto_principal: formData.contacto_principal,
        contacto_email: formData.contacto_email,
        contacto_telefone: formData.contacto_telefone,
        condicoes_pagamento: formData.condicoes_pagamento,
        prazo_pagamento: formData.prazo_pagamento,
        notas: formData.notas
      }

      const { error } = await supabase
        .from('fornecedores')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setEditMode(false)
      fetchFornecedor()
    } catch (error) {
      console.error('Erro ao guardar:', error)
      toast.error('Erro', 'Erro ao guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddAvaliacao = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const trabalhoData = {
        fornecedor_id: id,
        projeto_id: avaliacaoData.projeto_id || null,
        descricao: avaliacaoData.descricao,
        valor: parseFloat(avaliacaoData.valor) || null,
        data_adjudicacao: new Date().toISOString().split('T')[0],
        status: 'concluido',
        avaliacao_qualidade: avaliacaoData.avaliacao_qualidade,
        avaliacao_prazos: avaliacaoData.avaliacao_prazos,
        avaliacao_preco: avaliacaoData.avaliacao_preco,
        avaliacao_comunicacao: avaliacaoData.avaliacao_comunicacao,
        comentario_avaliacao: avaliacaoData.comentario_avaliacao
      }

      const { error } = await supabase
        .from('fornecedor_trabalhos')
        .insert([trabalhoData])

      if (error) throw error

      setShowAvaliacaoModal(false)
      setAvaliacaoData({
        projeto_id: '',
        descricao: '',
        valor: '',
        avaliacao_qualidade: 5,
        avaliacao_prazos: 5,
        avaliacao_preco: 5,
        avaliacao_comunicacao: 5,
        comentario_avaliacao: ''
      })
      fetchTrabalhos()
      fetchFornecedor() // Refresh para atualizar médias
    } catch (error) {
      console.error('Erro ao adicionar avaliação:', error)
      toast.error('Erro', 'Erro ao adicionar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Renderizar estrelas
  const renderStars = (rating, size = 16) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={size} 
          fill={i <= rating ? '#C9A882' : 'none'} 
          stroke={i <= rating ? '#C9A882' : '#C5C0BA'} 
        />
      )
    }
    return stars
  }

  // Renderizar estrelas interativas
  const renderInteractiveStars = (value, onChange) => {
    return (
      <div className="flex items-center" style={{ gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <Star 
              size={20} 
              fill={i <= value ? '#C9A882' : 'none'} 
              stroke={i <= value ? '#C9A882' : '#C5C0BA'} 
            />
          </button>
        ))}
      </div>
    )
  }

  const getCategoriaColor = (categoria) => {
    const colors = {
      'Marcenaria': '#8B4513',
      'Pedras': '#708090',
      'AVAC': '#4169E1',
      'Caixilharia': '#2F4F4F',
      'Iluminação': '#DAA520',
      'Têxteis': '#DDA0DD',
      'Faz-Tudo': '#228B22',
      'Montagens': '#FF8C00',
      'Transportes e Mudanças': '#4682B4',
      'Ladrilho': '#CD853F',
      'Vidraceiro': '#5F9EA0',
      'Serralharia': '#696969',
      'Paisagismo': '#32CD32',
      'Piscinas': '#00CED1',
      'Pinturas': '#FF6347',
      'Gesso Cartonado': '#B8860B',
      'Pedreiro': '#A0522D',
      'Climatização': '#6495ED'
    }
    return colors[categoria] || '#ADAA96'
  }

  const getStatusColor = (status) => {
    const colors = {
      'adjudicado': { bg: 'rgba(138, 158, 184, 0.15)', color: '#8A9EB8' },
      'em_curso': { bg: 'rgba(201, 168, 130, 0.2)', color: '#C9A882' },
      'concluido': { bg: 'rgba(122, 158, 122, 0.15)', color: '#7A9E7A' },
      'cancelado': { bg: 'rgba(184, 138, 138, 0.15)', color: '#B88A8A' }
    }
    return colors[status] || colors['adjudicado']
  }

  const formatCurrency = (value) => {
    if (!value) return '""'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--blush)' }} />
      </div>
    )
  }

  if (!fornecedor) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <AlertCircle size={48} style={{ color: 'var(--error)', marginBottom: 'var(--space-md)' }} />
        <h2>Fornecedor não encontrado</h2>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }} onClick={() => navigate('/fornecedores')}>
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/fornecedores')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--brown-light)',
            cursor: 'pointer',
            padding: '0',
            marginBottom: 'var(--space-md)',
            fontSize: '13px'
          }}
        >
          <ArrowLeft size={16} />
          Fornecedores
        </button>

        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div className="flex items-center gap-md">
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${getCategoriaColor(fornecedor.categoria_principal)}33, ${getCategoriaColor(fornecedor.categoria_principal)}11)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={28} style={{ color: getCategoriaColor(fornecedor.categoria_principal) }} />
            </div>
            <div>
              <div className="flex items-center gap-sm">
                <h1 className="page-title" style={{ marginBottom: '4px' }}>{fornecedor.nome}</h1>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: 'var(--brown-light)',
                  fontFamily: 'monospace'
                }}>
                  {fornecedor.codigo}
                </span>
              </div>
              <div className="flex items-center gap-sm">
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: getCategoriaColor(fornecedor.categoria_principal) + '22',
                  color: getCategoriaColor(fornecedor.categoria_principal)
                }}>
                  {fornecedor.categoria_principal}
                </span>
                {fornecedor.avaliacao_media && (
                  <div className="flex items-center gap-xs">
                    {renderStars(Math.round(fornecedor.avaliacao_media), 14)}
                    <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '4px' }}>
                      {fornecedor.avaliacao_media.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            {editMode ? (
              <>
                <button className="btn btn-outline" onClick={() => { setEditMode(false); setFormData(fornecedor) }}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  Guardar
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => setEditMode(true)}>
                  <Edit size={16} />
                  Editar
                </button>
                <button className="btn btn-primary" onClick={() => setShowAvaliacaoModal(true)}>
                  <Plus size={16} />
                  Adicionar Trabalho
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-xs)',
        borderBottom: '1px solid var(--stone)',
        marginBottom: 'var(--space-xl)'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--brown)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)' }}>
          {/* Coluna Principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Informações Gerais */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Informações</h3>
              
              {editMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Nome</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.nome || ''}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Nome Comercial</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.nome_comercial || ''}
                      onChange={e => setFormData({...formData, nome_comercial: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>NIF</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.nif || ''}
                      onChange={e => setFormData({...formData, nif: e.target.value})}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Especialidades</label>
                    <input
                      type="text"
                      className="input"
                      value={Array.isArray(formData.especialidades) ? formData.especialidades.join(', ') : formData.especialidades || ''}
                      onChange={e => setFormData({...formData, especialidades: e.target.value})}
                      placeholder="Separar por vírgulas"
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Nome Comercial</div>
                    <div style={{ fontSize: '14px' }}>{fornecedor.nome_comercial || '""'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>NIF</div>
                    <div style={{ fontSize: '14px' }}>{fornecedor.nif || '""'}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Especialidades</div>
                    <div className="flex items-center" style={{ flexWrap: 'wrap', gap: '6px' }}>
                      {fornecedor.especialidades?.map((esp, i) => (
                        <span key={i} style={{
                          padding: '4px 10px',
                          background: 'var(--cream)',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {esp}
                        </span>
                      )) || <span style={{ color: 'var(--brown-light)' }}>""</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contactos */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Contactos</h3>
              
              {editMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Morada</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.morada || ''}
                      onChange={e => setFormData({...formData, morada: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Cidade</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.cidade || ''}
                      onChange={e => setFormData({...formData, cidade: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Telefone</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.telefone || ''}
                      onChange={e => setFormData({...formData, telefone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Email</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Website</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.website || ''}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {fornecedor.morada && (
                    <div className="flex items-center gap-sm">
                      <MapPin size={16} style={{ color: 'var(--brown-light)' }} />
                      <span>{fornecedor.morada}{fornecedor.cidade && `, ${fornecedor.cidade}`}</span>
                    </div>
                  )}
                  {fornecedor.telefone && (
                    <div className="flex items-center gap-sm">
                      <Phone size={16} style={{ color: 'var(--brown-light)' }} />
                      <a href={`tel:${fornecedor.telefone}`} style={{ color: 'inherit' }}>{fornecedor.telefone}</a>
                    </div>
                  )}
                  {fornecedor.email && (
                    <div className="flex items-center gap-sm">
                      <Mail size={16} style={{ color: 'var(--brown-light)' }} />
                      <a href={`mailto:${fornecedor.email}`} style={{ color: 'inherit' }}>{fornecedor.email}</a>
                    </div>
                  )}
                  {fornecedor.website && (
                    <div className="flex items-center gap-sm">
                      <Globe size={16} style={{ color: 'var(--brown-light)' }} />
                      <a href={fornecedor.website.startsWith('http') ? fornecedor.website : `https://${fornecedor.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>
                        {fornecedor.website}
                        <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Condições Comerciais */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Condições Comerciais</h3>
              
              {editMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Condições de Pagamento</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.condicoes_pagamento || ''}
                      onChange={e => setFormData({...formData, condicoes_pagamento: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Prazo Pagamento (dias)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.prazo_pagamento || 30}
                      onChange={e => setFormData({...formData, prazo_pagamento: parseInt(e.target.value)})}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Notas</label>
                    <textarea
                      className="input"
                      value={formData.notas || ''}
                      onChange={e => setFormData({...formData, notas: e.target.value})}
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Condições de Pagamento</div>
                    <div style={{ fontSize: '14px' }}>{fornecedor.condicoes_pagamento || '""'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Prazo de Pagamento</div>
                    <div style={{ fontSize: '14px' }}>{fornecedor.prazo_pagamento ? `${fornecedor.prazo_pagamento} dias` : '""'}</div>
                  </div>
                  {fornecedor.notas && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Notas</div>
                      <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{fornecedor.notas}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Estatísticas */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Estatísticas</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Total Adjudicado</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {formatCurrency(fornecedor.valor_total_adjudicado)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--brown-light)', fontSize: '13px' }}>NÃ‚Âº Trabalhos</span>
                  <span style={{ fontWeight: 600 }}>{fornecedor.total_adjudicacoes || 0}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--stone)', paddingTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: 'var(--space-sm)' }}>Avaliação Média</div>
                  <div className="flex items-center gap-sm">
                    {renderStars(Math.round(fornecedor.avaliacao_media || 0), 18)}
                    <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '8px' }}>
                      {fornecedor.avaliacao_media?.toFixed(1) || '""'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avaliações Detalhadas */}
            {(fornecedor.avaliacao_qualidade || fornecedor.avaliacao_prazos || fornecedor.avaliacao_preco || fornecedor.avaliacao_comunicacao) && (
              <div className="card">
                <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Avaliações</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '13px' }}>Qualidade</span>
                    <div className="flex items-center gap-xs">
                      {renderStars(Math.round(fornecedor.avaliacao_qualidade || 0), 14)}
                      <span style={{ fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>
                        {fornecedor.avaliacao_qualidade?.toFixed(1) || '""'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '13px' }}>Prazos</span>
                    <div className="flex items-center gap-xs">
                      {renderStars(Math.round(fornecedor.avaliacao_prazos || 0), 14)}
                      <span style={{ fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>
                        {fornecedor.avaliacao_prazos?.toFixed(1) || '""'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '13px' }}>Preço</span>
                    <div className="flex items-center gap-xs">
                      {renderStars(Math.round(fornecedor.avaliacao_preco || 0), 14)}
                      <span style={{ fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>
                        {fornecedor.avaliacao_preco?.toFixed(1) || '""'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '13px' }}>Comunicação</span>
                    <div className="flex items-center gap-xs">
                      {renderStars(Math.round(fornecedor.avaliacao_comunicacao || 0), 14)}
                      <span style={{ fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>
                        {fornecedor.avaliacao_comunicacao?.toFixed(1) || '""'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pessoa de Contacto */}
            {(fornecedor.contacto_principal || fornecedor.contacto_email || fornecedor.contacto_telefone) && (
              <div className="card">
                <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Contacto Principal</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {fornecedor.contacto_principal && (
                    <div className="flex items-center gap-sm">
                      <User size={16} style={{ color: 'var(--brown-light)' }} />
                      <span>{fornecedor.contacto_principal}</span>
                    </div>
                  )}
                  {fornecedor.contacto_email && (
                    <div className="flex items-center gap-sm">
                      <Mail size={16} style={{ color: 'var(--brown-light)' }} />
                      <a href={`mailto:${fornecedor.contacto_email}`} style={{ color: 'inherit', fontSize: '13px' }}>
                        {fornecedor.contacto_email}
                      </a>
                    </div>
                  )}
                  {fornecedor.contacto_telefone && (
                    <div className="flex items-center gap-sm">
                      <Phone size={16} style={{ color: 'var(--brown-light)' }} />
                      <a href={`tel:${fornecedor.contacto_telefone}`} style={{ color: 'inherit', fontSize: '13px' }}>
                        {fornecedor.contacto_telefone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* G.A.R.V.I.S. Intelligence */}
            <div className="card" style={{ border: '1px solid rgba(122, 139, 110, 0.3)', background: 'rgba(122, 139, 110, 0.03)' }}>
              <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: 'var(--brown-dark)'
                }}>G</div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>G.A.R.V.I.S.</h3>
              </div>

              {/* Match Score */}
              {garvisData.matchScore && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', background: 'var(--cream)', borderRadius: '10px',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '2px' }}>Match Score</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {garvisData.matchScore.justificacao.slice(0, 3).map((j, i) => (
                        <span key={i} style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          background: 'rgba(122, 139, 110, 0.1)', color: 'var(--accent-olive)'
                        }}>
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '28px', fontWeight: 700,
                    color: garvisData.matchScore.score >= 70 ? 'var(--accent-olive)' :
                           garvisData.matchScore.score >= 40 ? 'var(--warning)' : 'var(--brown-light)',
                    lineHeight: 1
                  }}>
                    {garvisData.matchScore.score}
                    <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--brown-light)' }}>/100</span>
                  </div>
                </div>
              )}

              {/* Expiring Certifications Alert */}
              {garvisData.expiringCerts.length > 0 && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(220, 38, 38, 0.06)',
                  borderRadius: '8px', border: '1px solid rgba(220, 38, 38, 0.15)',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div className="flex items-center gap-xs" style={{ marginBottom: '4px' }}>
                    <Shield size={14} style={{ color: 'var(--error)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--error)' }}>
                      {garvisData.expiringCerts.length} certificação{garvisData.expiringCerts.length > 1 ? 'ões' : ''} a expirar
                    </span>
                  </div>
                  {garvisData.expiringCerts.map(cert => {
                    const daysLeft = Math.ceil((new Date(cert.data_validade) - new Date()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={cert.id} style={{ fontSize: '11px', color: 'var(--brown)', padding: '2px 0' }}>
                        {cert.tipo} — {daysLeft} dias ({new Date(cert.data_validade).toLocaleDateString('pt-PT')})
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Certifications summary */}
              {garvisData.certifications.length > 0 && garvisData.expiringCerts.length === 0 && (
                <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-md)', padding: '8px 0' }}>
                  <Shield size={14} style={{ color: 'var(--accent-olive)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--accent-olive)', fontWeight: 500 }}>
                    {garvisData.certifications.length} certificação{garvisData.certifications.length > 1 ? 'ões' : ''} válida{garvisData.certifications.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Active Deal Rooms */}
              {garvisData.dealRooms.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Deal Rooms
                  </div>
                  {garvisData.dealRooms.map(dr => (
                    <div key={dr.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: '6px', background: 'var(--cream)',
                      marginBottom: '4px', fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--brown)' }}>{dr.titulo}</span>
                        <span style={{ color: 'var(--brown-light)', marginLeft: '6px' }}>{dr.codigo}</span>
                      </div>
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                        background: dr.supplierStatus === 'orcamento_recebido' ? 'rgba(22, 163, 74, 0.1)' :
                                   dr.supplierStatus === 'convidado' ? 'rgba(37, 99, 235, 0.1)' : 'var(--cream)',
                        color: dr.supplierStatus === 'orcamento_recebido' ? '#16a34a' :
                               dr.supplierStatus === 'convidado' ? '#2563eb' : 'var(--brown-light)'
                      }}>
                        {dr.supplierStatus === 'orcamento_recebido' ? 'Orçamento recebido' :
                         dr.supplierStatus === 'contactado' ? 'Contactado' :
                         dr.supplierStatus === 'convidado' ? 'Convidado' :
                         dr.supplierStatus === 'rejeitado' ? 'Rejeitado' : dr.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* No GARVIS data */}
              {garvisData.certifications.length === 0 && garvisData.dealRooms.length === 0 && !garvisData.matchScore && (
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', textAlign: 'center', padding: '8px 0' }}>
                  <Sparkles size={16} style={{ opacity: 0.4, margin: '0 auto 4px', display: 'block' }} />
                  Adicione certificações e participe em deal rooms para ativar insights.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Histórico de Trabalhos</h3>
            <button className="btn btn-outline" onClick={() => setShowAvaliacaoModal(true)}>
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          {trabalhos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--brown-light)' }}>
              <Package size={40} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p>Nenhum trabalho registado</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {trabalhos.map(trabalho => (
                <div key={trabalho.id} style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--cream)',
                  borderRadius: '12px'
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                    <div className="flex items-center gap-sm">
                      {trabalho.projetos && (
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 600,
                          color: 'var(--blush-dark)',
                          fontFamily: 'monospace'
                        }}>
                          {trabalho.projetos.codigo}
                        </span>
                      )}
                      <span style={{ fontWeight: 600 }}>{trabalho.descricao}</span>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: getStatusColor(trabalho.status).bg,
                      color: getStatusColor(trabalho.status).color
                    }}>
                      {trabalho.status?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-lg" style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                    {trabalho.valor && (
                      <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
                        {formatCurrency(trabalho.valor)}
                      </span>
                    )}
                    {trabalho.data_adjudicacao && (
                      <span className="flex items-center gap-xs">
                        <Calendar size={14} />
                        {new Date(trabalho.data_adjudicacao).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>

                  {(trabalho.avaliacao_qualidade || trabalho.avaliacao_prazos || trabalho.avaliacao_preco || trabalho.avaliacao_comunicacao) && (
                    <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--stone)' }}>
                      <div className="flex items-center gap-lg" style={{ fontSize: '12px' }}>
                        <span className="flex items-center gap-xs">
                          Qualidade: {renderStars(trabalho.avaliacao_qualidade, 12)}
                        </span>
                        <span className="flex items-center gap-xs">
                          Prazos: {renderStars(trabalho.avaliacao_prazos, 12)}
                        </span>
                        <span className="flex items-center gap-xs">
                          Preço: {renderStars(trabalho.avaliacao_preco, 12)}
                        </span>
                        <span className="flex items-center gap-xs">
                          Comunicação: {renderStars(trabalho.avaliacao_comunicacao, 12)}
                        </span>
                      </div>
                      {trabalho.comentario_avaliacao && (
                        <p style={{ marginTop: 'var(--space-sm)', fontSize: '13px', fontStyle: 'italic', color: 'var(--brown-light)' }}>
                          "{trabalho.comentario_avaliacao}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rfqs' && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '16px', fontWeight: 600 }}>Consultas & Propostas</h3>
          
          {rfqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--brown-light)' }}>
              <FileText size={40} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p>Nenhuma consulta registada</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {rfqs.map(proposta => (
                <div key={proposta.id} style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--cream)',
                  borderRadius: '12px'
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', fontFamily: 'monospace' }}>
                        {proposta.rfq?.codigo}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                        {proposta.rfq?.titulo}
                      </h4>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>
                      {formatCurrency(proposta.valor_total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'avaliacoes' && (
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Avaliações</h3>
            <button className="btn btn-outline" onClick={() => setShowAvaliacaoModal(true)}>
              <Plus size={16} />
              Nova Avaliação
            </button>
          </div>

          {trabalhos.filter(t => t.avaliacao_qualidade).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--brown-light)' }}>
              <Star size={40} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p>Nenhuma avaliação registada</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {trabalhos.filter(t => t.avaliacao_qualidade).map(trabalho => (
                <div key={trabalho.id} style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--cream)',
                  borderRadius: '12px'
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
                    <div>
                      {trabalho.projetos && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blush-dark)', fontFamily: 'monospace' }}>
                          {trabalho.projetos.codigo} "" {trabalho.projetos.nome}
                        </span>
                      )}
                      <h4 style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{trabalho.descricao}</h4>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                      {trabalho.data_adjudicacao && new Date(trabalho.data_adjudicacao).toLocaleDateString('pt-PT')}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Qualidade</div>
                      <div className="flex items-center gap-xs">{renderStars(trabalho.avaliacao_qualidade, 14)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Prazos</div>
                      <div className="flex items-center gap-xs">{renderStars(trabalho.avaliacao_prazos, 14)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Preço</div>
                      <div className="flex items-center gap-xs">{renderStars(trabalho.avaliacao_preco, 14)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Comunicação</div>
                      <div className="flex items-center gap-xs">{renderStars(trabalho.avaliacao_comunicacao, 14)}</div>
                    </div>
                  </div>

                  {trabalho.comentario_avaliacao && (
                    <p style={{ marginTop: 'var(--space-md)', fontSize: '13px', fontStyle: 'italic', color: 'var(--brown)' }}>
                      "{trabalho.comentario_avaliacao}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Adicionar Trabalho/Avaliação */}
      {showAvaliacaoModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)'
          }}
          onClick={() => setShowAvaliacaoModal(false)}
        >
          <div 
            className="card"
            onClick={e => e.stopPropagation()} 
            style={{ width: '100%', maxWidth: '500px', padding: 0 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-lg)',
              borderBottom: '1px solid var(--stone)'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Adicionar Trabalho & Avaliação</h2>
              <button 
                onClick={() => setShowAvaliacaoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              >
                <X size={20} style={{ color: 'var(--brown-light)' }} />
              </button>
            </div>

            <form onSubmit={handleAddAvaliacao}>
              <div style={{ padding: 'var(--space-lg)' }}>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Projeto</label>
                  <select
                    className="input"
                    value={avaliacaoData.projeto_id}
                    onChange={e => setAvaliacaoData({...avaliacaoData, projeto_id: e.target.value})}
                  >
                    <option value="">Selecionar projeto (opcional)</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} "" {p.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Descrição do Trabalho *</label>
                  <input
                    type="text"
                    className="input"
                    value={avaliacaoData.descricao}
                    onChange={e => setAvaliacaoData({...avaliacaoData, descricao: e.target.value})}
                    placeholder="Ex: Fornecimento e montagem de cozinha"
                    required
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Valor (€)</label>
                  <input
                    type="number"
                    className="input"
                    value={avaliacaoData.valor}
                    onChange={e => setAvaliacaoData({...avaliacaoData, valor: e.target.value})}
                    placeholder="Ex: 25000"
                  />
                </div>

                <h4 style={{ marginBottom: 'var(--space-md)', fontSize: '13px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Avaliação
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Qualidade</label>
                    {renderInteractiveStars(avaliacaoData.avaliacao_qualidade, (v) => setAvaliacaoData({...avaliacaoData, avaliacao_qualidade: v}))}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Prazos</label>
                    {renderInteractiveStars(avaliacaoData.avaliacao_prazos, (v) => setAvaliacaoData({...avaliacaoData, avaliacao_prazos: v}))}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Preço</label>
                    {renderInteractiveStars(avaliacaoData.avaliacao_preco, (v) => setAvaliacaoData({...avaliacaoData, avaliacao_preco: v}))}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Comunicação</label>
                    {renderInteractiveStars(avaliacaoData.avaliacao_comunicacao, (v) => setAvaliacaoData({...avaliacaoData, avaliacao_comunicacao: v}))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Comentário</label>
                  <textarea
                    className="input"
                    value={avaliacaoData.comentario_avaliacao}
                    onChange={e => setAvaliacaoData({...avaliacaoData, comentario_avaliacao: e.target.value})}
                    rows={3}
                    placeholder="Observações sobre o trabalho..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-sm)',
                padding: 'var(--space-lg)',
                borderTop: '1px solid var(--stone)',
                background: 'var(--cream)'
              }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAvaliacaoModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
