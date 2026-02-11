import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText, Plus, Search, Loader2, Calendar, CheckCircle2,
  Clock, AlertTriangle, Filter, Download, Building2
} from 'lucide-react'

const STATUS_OPTIONS = [
  { key: 'rascunho', label: 'Rascunho', color: '#6B7280' },
  { key: 'emitida', label: 'Emitida', color: '#3B82F6' },
  { key: 'enviada', label: 'Enviada', color: '#D97706' },
  { key: 'paga', label: 'Paga', color: '#059669' },
  { key: 'vencida', label: 'Vencida', color: '#DC2626' },
  { key: 'anulada', label: 'Anulada', color: '#6B7280' },
]

export default function Faturacao() {
  const [faturas, setFaturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    numero: '',
    cliente: '',
    projeto: '',
    descricao: '',
    valor: '',
    iva: '23',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    status: 'rascunho',
    notas: ''
  })

  useEffect(() => {
    fetchFaturas()
  }, [])

  const fetchFaturas = async () => {
    try {
      const { data, error } = await supabase
        .from('faturas')
        .select('*')
        .order('data_emissao', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          setFaturas([])
          return
        }
        throw error
      }
      setFaturas(data || [])
    } catch (error) {
      console.error('Erro ao carregar faturas:', error)
      setFaturas([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.cliente || !formData.valor) return
    setSaving(true)
    try {
      const valor = parseFloat(formData.valor)
      const iva = parseFloat(formData.iva) / 100
      const { error } = await supabase.from('faturas').insert([{
        ...formData,
        valor: valor,
        valor_com_iva: valor * (1 + iva),
        iva: parseFloat(formData.iva)
      }])
      if (error) throw error
      setShowModal(false)
      setFormData({ numero: '', cliente: '', projeto: '', descricao: '', valor: '', iva: '23', data_emissao: new Date().toISOString().split('T')[0], data_vencimento: '', status: 'rascunho', notas: '' })
      fetchFaturas()
    } catch (error) {
      console.error('Erro ao guardar:', error)
    } finally {
      setSaving(false)
    }
  }

  const totalFaturado = faturas.filter(f => f.status !== 'anulada').reduce((sum, f) => sum + (f.valor_com_iva || f.valor || 0), 0)
  const totalPago = faturas.filter(f => f.status === 'paga').reduce((sum, f) => sum + (f.valor_com_iva || f.valor || 0), 0)
  const totalPendente = faturas.filter(f => ['emitida', 'enviada'].includes(f.status)).reduce((sum, f) => sum + (f.valor_com_iva || f.valor || 0), 0)
  const totalVencido = faturas.filter(f => f.status === 'vencida').reduce((sum, f) => sum + (f.valor_com_iva || f.valor || 0), 0)

  const filteredFaturas = faturas.filter(f => {
    const matchesSearch = !searchTerm ||
      f.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.projeto?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'Todos' || f.status === selectedStatus
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
          <h1 className="page-title">Faturação</h1>
          <p className="page-subtitle">Gestão de faturas e cobranças</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nova Fatura
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Faturado</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalFaturado)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pago</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>{formatCurrency(totalPago)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pendente</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{formatCurrency(totalPendente)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Vencido</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626' }}>{formatCurrency(totalVencido)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar faturas..."
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

      {/* Invoices Table */}
      {filteredFaturas.length > 0 ? (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>N.º</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emissão</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vencimento</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaturas.map(fatura => {
                const status = getStatusStyle(fatura.status)
                return (
                  <tr key={fatura.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-olive)' }}>{fatura.numero || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--brown)' }}>{fatura.cliente}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--brown-light)' }}>{fatura.data_emissao ? new Date(fatura.data_emissao).toLocaleDateString('pt-PT') : '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--brown-light)' }}>{fatura.data_vencimento ? new Date(fatura.data_vencimento).toLocaleDateString('pt-PT') : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--brown)' }}>
                      {formatCurrency(fatura.valor_com_iva || fatura.valor)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        background: `${status.color}15`, color: status.color
                      }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} />
            <h3>Nenhuma fatura encontrada</h3>
            <p>Comece a criar faturas para acompanhar a faturação.</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>Nova Fatura</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">N.º Fatura</label>
                  <input className="form-input" value={formData.numero} onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))} placeholder="FT 2025/001" />
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Cliente *</label>
                <input className="form-input" value={formData.cliente} onChange={e => setFormData(p => ({ ...p, cliente: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div>
                <label className="form-label">Projeto</label>
                <input className="form-input" value={formData.projeto} onChange={e => setFormData(p => ({ ...p, projeto: e.target.value }))} placeholder="Projeto associado" />
              </div>
              <div>
                <label className="form-label">Descrição</label>
                <input className="form-input" value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Valor (s/ IVA) *</label>
                  <input className="form-input" type="number" value={formData.valor} onChange={e => setFormData(p => ({ ...p, valor: e.target.value }))} placeholder="€" />
                </div>
                <div>
                  <label className="form-label">IVA (%)</label>
                  <select className="form-input" value={formData.iva} onChange={e => setFormData(p => ({ ...p, iva: e.target.value }))}>
                    <option value="0">0%</option>
                    <option value="6">6%</option>
                    <option value="13">13%</option>
                    <option value="23">23%</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Emissão</label>
                  <input className="form-input" type="date" value={formData.data_emissao} onChange={e => setFormData(p => ({ ...p, data_emissao: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data Vencimento</label>
                  <input className="form-input" type="date" value={formData.data_vencimento} onChange={e => setFormData(p => ({ ...p, data_vencimento: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={formData.notas} onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.cliente || !formData.valor}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
