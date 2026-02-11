import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, Plus, Search, Loader2, Calendar, CheckCircle2,
  Clock, AlertTriangle, Filter, Building2, Truck, FileText
} from 'lucide-react'

const STATUS_OPTIONS = [
  { key: 'pendente', label: 'Pendente', color: '#6B7280' },
  { key: 'aprovada', label: 'Aprovada', color: '#3B82F6' },
  { key: 'encomendada', label: 'Encomendada', color: '#D97706' },
  { key: 'recebida', label: 'Recebida', color: '#059669' },
  { key: 'paga', label: 'Paga', color: '#10B981' },
  { key: 'cancelada', label: 'Cancelada', color: '#DC2626' },
]

export default function ComprasFinanceiro() {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    descricao: '',
    fornecedor: '',
    projeto: '',
    categoria: '',
    valor: '',
    data_encomenda: '',
    data_entrega_prevista: '',
    status: 'pendente',
    notas: ''
  })

  useEffect(() => {
    fetchCompras()
  }, [])

  const fetchCompras = async () => {
    try {
      const { data, error } = await supabase
        .from('compras')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          setCompras([])
          return
        }
        throw error
      }
      setCompras(data || [])
    } catch (error) {
      console.error('Erro ao carregar compras:', error)
      setCompras([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.descricao || !formData.valor) return
    setSaving(true)
    try {
      const { error } = await supabase.from('compras').insert([{
        ...formData,
        valor: parseFloat(formData.valor)
      }])
      if (error) throw error
      setShowModal(false)
      setFormData({ descricao: '', fornecedor: '', projeto: '', categoria: '', valor: '', data_encomenda: '', data_entrega_prevista: '', status: 'pendente', notas: '' })
      fetchCompras()
    } catch (error) {
      console.error('Erro ao guardar:', error)
    } finally {
      setSaving(false)
    }
  }

  const totalCompras = compras.filter(c => c.status !== 'cancelada').reduce((sum, c) => sum + (c.valor || 0), 0)
  const totalPago = compras.filter(c => c.status === 'paga').reduce((sum, c) => sum + (c.valor || 0), 0)
  const totalPendente = compras.filter(c => ['pendente', 'aprovada', 'encomendada'].includes(c.status)).reduce((sum, c) => sum + (c.valor || 0), 0)

  const filteredCompras = compras.filter(c => {
    const matchesSearch = !searchTerm ||
      c.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.projeto?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'Todos' || c.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusStyle = (status) => STATUS_OPTIONS.find(s => s.key === status) || STATUS_OPTIONS[0]
  const formatCurrency = (val) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val || 0)

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
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Gestão financeira de compras e encomendas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nova Compra
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Compras</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalCompras)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pago</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>{formatCurrency(totalPago)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pendente</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{formatCurrency(totalPendente)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar compras..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          <option value="Todos">Todos os estados</option>
          {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Compras list */}
      {filteredCompras.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredCompras.map(compra => {
            const status = getStatusStyle(compra.status)
            return (
              <div key={compra.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${status.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <ShoppingCart size={18} style={{ color: status.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{compra.descricao}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                    {compra.fornecedor && <span><Truck size={11} style={{ verticalAlign: '-1px' }} /> {compra.fornecedor}</span>}
                    {compra.projeto && <span><Building2 size={11} style={{ verticalAlign: '-1px' }} /> {compra.projeto}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--brown)', fontSize: '14px' }}>{formatCurrency(compra.valor)}</div>
                  <span style={{
                    padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                    background: `${status.color}15`, color: status.color
                  }}>
                    {status.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <ShoppingCart size={48} />
            <h3>Nenhuma compra encontrada</h3>
            <p>Registe compras para acompanhar gastos e encomendas.</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Nova Compra</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Descrição *</label>
                <input className="form-input" value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="O que está a comprar" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Fornecedor</label>
                  <input className="form-input" value={formData.fornecedor} onChange={e => setFormData(p => ({ ...p, fornecedor: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Projeto</label>
                  <input className="form-input" value={formData.projeto} onChange={e => setFormData(p => ({ ...p, projeto: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Valor *</label>
                  <input className="form-input" type="number" value={formData.valor} onChange={e => setFormData(p => ({ ...p, valor: e.target.value }))} placeholder="€" />
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Encomenda</label>
                  <input className="form-input" type="date" value={formData.data_encomenda} onChange={e => setFormData(p => ({ ...p, data_encomenda: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data Entrega Prevista</label>
                  <input className="form-input" type="date" value={formData.data_entrega_prevista} onChange={e => setFormData(p => ({ ...p, data_entrega_prevista: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={formData.notas} onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.descricao || !formData.valor}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
