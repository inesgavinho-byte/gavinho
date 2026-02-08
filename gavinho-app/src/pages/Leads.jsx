import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Search, Plus, Phone, Mail, Building2, Calendar,
  ChevronRight, Loader2, User, ArrowRight, Filter
} from 'lucide-react'

const LEAD_STAGES = [
  { key: 'contacto_inicial', label: 'Contacto Inicial', color: '#6B7280' },
  { key: 'qualificacao', label: 'Qualificação', color: '#D97706' },
  { key: 'proposta', label: 'Proposta', color: '#3B82F6' },
  { key: 'negociacao', label: 'Negociação', color: '#8B5CF6' },
  { key: 'ganho', label: 'Ganho', color: '#059669' },
  { key: 'perdido', label: 'Perdido', color: '#DC2626' },
]

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    origem: '',
    fase: 'contacto_inicial',
    valor_estimado: '',
    notas: ''
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          setLeads([])
          return
        }
        throw error
      }
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.nome) return
    setSaving(true)
    try {
      const { error } = await supabase.from('leads').insert([{
        ...formData,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null
      }])
      if (error) throw error
      setShowModal(false)
      setFormData({ nome: '', empresa: '', email: '', telefone: '', origem: '', fase: 'contacto_inicial', valor_estimado: '', notas: '' })
      fetchLeads()
    } catch (error) {
      console.error('Erro ao guardar lead:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm ||
      lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStage = selectedStage === 'Todos' || lead.fase === selectedStage
    return matchesSearch && matchesStage
  })

  const getStageColor = (fase) => LEAD_STAGES.find(s => s.key === fase) || LEAD_STAGES[0]

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Pipeline comercial e gestão de oportunidades</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Lead
        </button>
      </div>

      {/* Pipeline summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {LEAD_STAGES.filter(s => s.key !== 'perdido').map(stage => {
          const count = leads.filter(l => l.fase === stage.key).length
          return (
            <div key={stage.key} className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: stage.color }}>{count}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>{stage.label}</div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          <option value="Todos">Todas as fases</option>
          {LEAD_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Leads list */}
      {filteredLeads.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredLeads.map(lead => {
            const stage = getStageColor(lead.fase)
            return (
              <div key={lead.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: `${stage.color}15`, color: stage.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{lead.nome}</div>
                  {lead.empresa && <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{lead.empresa}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {lead.valor_estimado && (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>
                      {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(lead.valor_estimado)}
                    </span>
                  )}
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                    background: `${stage.color}15`, color: stage.color
                  }}>
                    {stage.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>Nenhum lead encontrado</h3>
            <p>Comece a registar leads para acompanhar o pipeline comercial.</p>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Novo Lead</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Nome *</label>
                <input className="form-input" value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do contacto" />
              </div>
              <div>
                <label className="form-label">Empresa</label>
                <input className="form-input" value={formData.empresa} onChange={e => setFormData(p => ({ ...p, empresa: e.target.value }))} placeholder="Nome da empresa" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={formData.telefone} onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Fase</label>
                  <select className="form-input" value={formData.fase} onChange={e => setFormData(p => ({ ...p, fase: e.target.value }))}>
                    {LEAD_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Valor Estimado</label>
                  <input className="form-input" type="number" value={formData.valor_estimado} onChange={e => setFormData(p => ({ ...p, valor_estimado: e.target.value }))} placeholder="€" />
                </div>
              </div>
              <div>
                <label className="form-label">Origem</label>
                <input className="form-input" value={formData.origem} onChange={e => setFormData(p => ({ ...p, origem: e.target.value }))} placeholder="Referência, website, etc." />
              </div>
              <div>
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={3} value={formData.notas} onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.nome}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
