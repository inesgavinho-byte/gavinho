import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  CreditCard, Plus, Search, Loader2, Calendar, Building2,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Edit, Trash2
} from 'lucide-react'

const CATEGORIAS = [
  'Rendas',
  'Seguros',
  'Licenças & Software',
  'Telecomunicações',
  'Eletricidade',
  'Água',
  'Contabilidade',
  'Manutenção',
  'Outros'
]

export default function CustosFixos() {
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'Rendas',
    valor_mensal: '',
    fornecedor: '',
    data_inicio: '',
    data_fim: '',
    notas: ''
  })

  useEffect(() => {
    fetchCustos()
  }, [])

  const fetchCustos = async () => {
    try {
      const { data, error } = await supabase
        .from('custos_fixos')
        .select('*')
        .order('categoria', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          setCustos([])
          return
        }
        throw error
      }
      setCustos(data || [])
    } catch (error) {
      console.error('Erro ao carregar custos fixos:', error)
      setCustos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.descricao || !formData.valor_mensal) return
    setSaving(true)
    try {
      const { error } = await supabase.from('custos_fixos').insert([{
        ...formData,
        valor_mensal: parseFloat(formData.valor_mensal)
      }])
      if (error) throw error
      setShowModal(false)
      setFormData({ descricao: '', categoria: 'Rendas', valor_mensal: '', fornecedor: '', data_inicio: '', data_fim: '', notas: '' })
      fetchCustos()
    } catch (error) {
      console.error('Erro ao guardar:', error)
    } finally {
      setSaving(false)
    }
  }

  const totalMensal = custos.reduce((sum, c) => sum + (c.valor_mensal || 0), 0)
  const totalAnual = totalMensal * 12

  const custosPorCategoria = CATEGORIAS.map(cat => ({
    categoria: cat,
    total: custos.filter(c => c.categoria === cat).reduce((sum, c) => sum + (c.valor_mensal || 0), 0),
    count: custos.filter(c => c.categoria === cat).length
  })).filter(c => c.count > 0)

  const filteredCustos = custos.filter(c =>
    !searchTerm ||
    c.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="page-title">Custos Fixos</h1>
          <p className="page-subtitle">Gestão de custos fixos mensais da empresa</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Custo
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Mensal</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalMensal)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Anual</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalAnual)}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Categorias Ativas</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{custosPorCategoria.length}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {custosPorCategoria.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Por Categoria</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {custosPorCategoria.map(cat => (
              <div key={cat.categoria} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '140px', fontSize: '13px', color: 'var(--brown)' }}>{cat.categoria}</span>
                <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--stone)' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    width: `${totalMensal > 0 ? (cat.total / totalMensal * 100) : 0}%`,
                    background: 'var(--accent-olive)', transition: 'width 0.3s'
                  }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', minWidth: '80px', textAlign: 'right' }}>
                  {formatCurrency(cat.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
        <input
          type="text"
          placeholder="Pesquisar custos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* List */}
      {filteredCustos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredCustos.map(custo => (
            <div key={custo.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(122, 139, 110, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <CreditCard size={18} style={{ color: 'var(--accent-olive)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{custo.descricao}</div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  {custo.categoria}{custo.fornecedor ? ` — ${custo.fornecedor}` : ''}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--brown)', fontSize: '15px' }}>
                {formatCurrency(custo.valor_mensal)}
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--brown-light)' }}>/mês</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <CreditCard size={48} />
            <h3>Sem custos fixos registados</h3>
            <p>Adicione os custos fixos mensais da empresa.</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Novo Custo Fixo</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Descrição *</label>
                <input className="form-input" value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Renda escritório" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={formData.categoria} onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Valor Mensal *</label>
                  <input className="form-input" type="number" value={formData.valor_mensal} onChange={e => setFormData(p => ({ ...p, valor_mensal: e.target.value }))} placeholder="€" />
                </div>
              </div>
              <div>
                <label className="form-label">Fornecedor</label>
                <input className="form-input" value={formData.fornecedor} onChange={e => setFormData(p => ({ ...p, fornecedor: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Início</label>
                  <input className="form-input" type="date" value={formData.data_inicio} onChange={e => setFormData(p => ({ ...p, data_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data Fim</label>
                  <input className="form-input" type="date" value={formData.data_fim} onChange={e => setFormData(p => ({ ...p, data_fim: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={3} value={formData.notas} onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.descricao || !formData.valor_mensal}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
