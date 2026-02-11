import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  AlertTriangle, CheckCircle2, Clock, Plus, Search, X, Euro, Calendar,
  ChevronRight, ChevronDown, Edit, Trash2, MessageSquare, Check, XCircle
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'

const TIPOS = [
  { id: 'bloqueio', label: 'Bloqueio', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  { id: 'aprovacao', label: 'Aprovação', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  { id: 'selecao', label: 'Seleção', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  { id: 'informacao', label: 'Informação', color: 'var(--brown-light)', bg: 'var(--stone)' }
]

const CATEGORIAS = ['Técnica', 'Design', 'Financeira', 'Cliente', 'Fornecedor', 'Contratual', 'Outra']
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica']

const prioridadeConfig = {
  baixa: { color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  media: { color: 'var(--brown)', bg: 'var(--stone)' },
  alta: { color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  critica: { color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
}

const statusConfig = {
  pendente: { label: 'Pendente', color: 'var(--warning)' },
  rascunho: { label: 'Rascunho', color: 'var(--brown-light)' },
  em_analise: { label: 'Em Análise', color: 'var(--info)' },
  aprovada: { label: 'Aprovada', color: 'var(--success)' },
  rejeitada: { label: 'Rejeitada', color: 'var(--error)' },
  resolvido: { label: 'Resolvido', color: 'var(--success)' },
  implementada: { label: 'Implementada', color: 'var(--success)' }
}

export default function BlockersDecisions() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pendente')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterProjeto, setFilterProjeto] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [modalTipo, setModalTipo] = useState('bloqueio')
  const [editingItem, setEditingItem] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  
  const [form, setForm] = useState({
    titulo: '', descricao: '', projeto_id: '', categoria: 'tecnica', tipo: 'bloqueio',
    prioridade: 'media', impacto_custo: '', impacto_prazo_dias: '', data_limite: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [itemsRes, projetosRes] = await Promise.all([
        supabase.from('decisoes').select('*, projetos(codigo, nome)').order('created_at', { ascending: false }),
        supabase.from('projetos').select('id, codigo, nome').eq('arquivado', false).order('codigo', { ascending: false })
      ])

      if (itemsRes.error) throw itemsRes.error
      setItems(itemsRes.data || [])
      setProjetos(projetosRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // CRUD
  const handleSave = async () => {
    if (!form.titulo.trim() || !form.projeto_id) {
      toast.warning('Aviso', 'Preencha título e projeto')
      return
    }

    try {
      const data = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        projeto_id: form.projeto_id,
        categoria: form.categoria,
        tipo: form.tipo,
        prioridade: form.prioridade,
        impacto_custo: form.impacto_custo ? parseFloat(form.impacto_custo) : null,
        impacto_prazo_dias: form.impacto_prazo_dias ? parseInt(form.impacto_prazo_dias) : null,
        data_limite: form.data_limite || null,
        status: 'pendente'
      }

      if (editingItem) {
        await supabase.from('decisoes').update(data).eq('id', editingItem.id)
      } else {
        await supabase.from('decisoes').insert([data])
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro', 'Erro ao guardar')
    }
  }

  const handleDelete = async (item) => {
    try {
      await supabase.from('decisoes').delete().eq('id', item.id)
      setShowDeleteConfirm(null)
      fetchData()
    } catch (err) {
      toast.error('Erro', 'Erro ao eliminar')
    }
  }

  const handleResolver = async (item) => {
    try {
      const newStatus = item.tipo === 'bloqueio' ? 'resolvido' : 'aprovada'
      await supabase.from('decisoes').update({ 
        status: newStatus, 
        decidido_em: new Date().toISOString() 
      }).eq('id', item.id)
      fetchData()
    } catch (err) {
      toast.error('Erro', 'Erro ao resolver')
    }
  }

  const resetForm = () => {
    setForm({ titulo: '', descricao: '', projeto_id: '', categoria: 'tecnica', tipo: 'bloqueio', prioridade: 'media', impacto_custo: '', impacto_prazo_dias: '', data_limite: '' })
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setForm({
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      projeto_id: item.projeto_id || '',
      categoria: item.categoria || 'tecnica',
      tipo: item.tipo || 'bloqueio',
      prioridade: item.prioridade || 'media',
      impacto_custo: item.impacto_custo || '',
      impacto_prazo_dias: item.impacto_prazo_dias || '',
      data_limite: item.data_limite || ''
    })
    setModalTipo(item.tipo)
    setShowModal(true)
  }

  const handleNew = (tipo) => {
    resetForm()
    setModalTipo(tipo)
    setForm(prev => ({ ...prev, tipo }))
    setShowModal(true)
  }

  // Filtros
  const filteredItems = items.filter(item => {
    const matchSearch = item.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = !filterStatus || 
      (filterStatus === 'pendente' && ['pendente', 'rascunho', 'em_analise'].includes(item.status)) ||
      (filterStatus === 'resolvido' && ['aprovada', 'rejeitada', 'resolvido', 'implementada'].includes(item.status)) ||
      item.status === filterStatus
    const matchTipo = !filterTipo || item.tipo === filterTipo
    const matchProjeto = !filterProjeto || item.projeto_id === filterProjeto
    return matchSearch && matchStatus && matchTipo && matchProjeto
  })

  // Stats
  const pendentes = items.filter(i => ['pendente', 'rascunho', 'em_analise'].includes(i.status)).length
  const bloqueiosAtivos = items.filter(i => i.tipo === 'bloqueio' && !['resolvido', 'aprovada', 'rejeitada'].includes(i.status)).length
  const impactoTotal = items.filter(i => !['resolvido', 'aprovada', 'rejeitada'].includes(i.status)).reduce((sum, i) => sum + (parseFloat(i.impacto_custo) || 0), 0)

  const getTipoConfig = (tipo) => TIPOS.find(t => t.id === tipo) || TIPOS[0]
  const formatCurrency = (v) => v ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : ''

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Bloqueios & Decisões</h1>
          <p style={{ color: 'var(--brown-light)', fontSize: '13px', margin: 0 }}>
            {pendentes} pendentes • {bloqueiosAtivos} bloqueios ativos
            {impactoTotal > 0 && <span> • {formatCurrency(impactoTotal)} em risco</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => handleNew('aprovacao')} style={{ fontSize: '13px', padding: '8px 14px' }}>
            <Plus size={14} /> Decisão
          </button>
          <button className="btn btn-primary" onClick={() => handleNew('bloqueio')} style={{ fontSize: '13px', padding: '8px 14px', background: 'var(--error)' }}>
            <AlertTriangle size={14} /> Bloqueio
          </button>
        </div>
      </div>

      {/* Filtros Inline */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '4px', background: 'var(--stone)', borderRadius: '6px', padding: '2px' }}>
          {[{ id: 'pendente', label: 'Pendentes' }, { id: 'resolvido', label: 'Resolvidos' }, { id: '', label: 'Todos' }].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)}
              style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                background: filterStatus === s.id ? 'var(--white)' : 'transparent', 
                color: filterStatus === s.id ? 'var(--brown)' : 'var(--brown-light)',
                boxShadow: filterStatus === s.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>
              {s.label}
            </button>
          ))}
        </div>

        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}>
          <option value="">Tipo</option>
          {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <select value={filterProjeto} onChange={e => setFilterProjeto(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px' }}>
          <option value="">Projeto</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
        </select>
      </div>

      {/* Lista Compacta */}
      {filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
          <AlertTriangle size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ margin: 0 }}>Sem itens encontrados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredItems.map(item => {
            const tipoConfig = getTipoConfig(item.tipo)
            const prio = prioridadeConfig[item.prioridade] || prioridadeConfig.media
            const status = statusConfig[item.status] || statusConfig.pendente
            const isResolved = ['resolvido', 'aprovada', 'rejeitada', 'implementada'].includes(item.status)
            const isExpanded = expandedItem === item.id
            
            return (
              <div key={item.id} className="card" style={{ padding: 0, opacity: isResolved ? 0.7 : 1 }}>
                {/* Row Principal */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', cursor: 'pointer' }}
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                  
                  {/* Tipo Icon */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: tipoConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.tipo === 'bloqueio' ? <AlertTriangle size={16} style={{ color: tipoConfig.color }} /> : <Clock size={16} style={{ color: tipoConfig.color }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--brown-light)' }}>
                      <span style={{ fontWeight: 500 }}>{item.projetos?.codigo}</span>
                      {item.impacto_custo && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Euro size={10} /> {formatCurrency(item.impacto_custo)}</span>}
                      {item.impacto_prazo_dias && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={10} /> {item.impacto_prazo_dias}d</span>}
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: tipoConfig.bg, color: tipoConfig.color }}>
                      {tipoConfig.label}
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: status.color === 'var(--success)' ? 'rgba(122, 158, 122, 0.15)' : 'var(--stone)', color: status.color }}>
                      {status.label}
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: prio.bg, color: prio.color }}>
                      {item.prioridade?.charAt(0).toUpperCase() + item.prioridade?.slice(1)}
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--brown-light)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--stone)', padding: '12px 16px', background: 'var(--cream)' }}>
                    {item.descricao && <p style={{ fontSize: '13px', margin: '0 0 12px', lineHeight: 1.5 }}>{item.descricao}</p>}
                    
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!isResolved && (
                        <button onClick={(e) => { e.stopPropagation(); handleResolver(item) }} 
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: 'var(--success)', color: 'white' }}>
                          <Check size={14} /> {item.tipo === 'bloqueio' ? 'Resolver' : 'Aprovar'}
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: 'var(--white)' }}>
                        <Edit size={14} /> Editar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(item) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: 'var(--white)', color: 'var(--error)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: Criar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '480px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {editingItem ? 'Editar' : 'Novo'} {modalTipo === 'bloqueio' ? 'Bloqueio' : 'Decisão'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} 
                  placeholder={modalTipo === 'bloqueio' ? 'O que está a bloquear?' : 'Que decisão precisa ser tomada?'}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Projeto *</label>
                  <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
                    <option value="">Selecionar...</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
                    {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Categoria</label>
                  <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
                    {CATEGORIAS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Prioridade</label>
                  <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}>
                    {PRIORIDADES.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Impacto €</label>
                  <input type="number" value={form.impacto_custo} onChange={e => setForm({...form, impacto_custo: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Prazo (dias)</label>
                  <input type="number" value={form.impacto_prazo_dias} onChange={e => setForm({...form, impacto_prazo_dias: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Data Limite</label>
                  <input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={!form.titulo.trim() || !form.projeto_id} style={{ fontSize: '13px', padding: '8px 16px' }}>
                {editingItem ? 'Guardar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminação */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '20px', maxWidth: '360px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Eliminar</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '20px', fontSize: '13px' }}>
              Eliminar "<strong>{showDeleteConfirm.titulo}</strong>"?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ padding: '8px 14px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
