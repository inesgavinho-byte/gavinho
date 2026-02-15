import { useState, useEffect } from 'react'
import {
  FileText, Plus, Search, Loader2, Calendar, CheckCircle2,
  Clock, AlertTriangle, Download, Edit3, Send, Ban, Euro,
  X, ChevronDown, Building2
} from 'lucide-react'
import { useFaturacao } from '../hooks/useFaturacao'

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: '#6B7280' },
  emitida: { label: 'Emitida', color: '#3B82F6' },
  paga: { label: 'Paga', color: '#059669' },
  anulada: { label: 'Anulada', color: '#DC2626' },
  prevista: { label: 'Prevista', color: '#8B5CF6' },
  facturada: { label: 'Facturada', color: '#3B82F6' },
  em_atraso: { label: 'Em Atraso', color: '#DC2626' }
}

const IVA_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '6', label: '6%' },
  { value: '13', label: '13%' },
  { value: '23', label: '23%' }
]

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val || 0)

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('pt-PT') : '—'

export default function Faturacao() {
  const {
    faturas, projetos, capitulosPorProjeto, loading, saving, totais,
    fetchCapitulos, createFatura, updateFatura, emitirFatura, marcarPaga, anularFatura,
    INITIAL_FORM
  } = useFaturacao()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [selectedProjeto, setSelectedProjeto] = useState('Todos')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)

  // Anular modal
  const [showAnularModal, setShowAnularModal] = useState(false)
  const [anularId, setAnularId] = useState(null)
  const [motivoAnulacao, setMotivoAnulacao] = useState('')

  // Toast
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch capítulos when projeto changes in form
  useEffect(() => {
    if (formData.projeto_id) {
      fetchCapitulos(formData.projeto_id)
    }
  }, [formData.projeto_id, fetchCapitulos])

  // ── Computed IVA values ──
  const subtotalNum = parseFloat(formData.subtotal) || 0
  const ivaPctNum = parseFloat(formData.iva_percentagem) || 0
  const ivaValorCalc = Math.round(subtotalNum * (ivaPctNum / 100) * 100) / 100
  const totalCalc = Math.round((subtotalNum + ivaValorCalc) * 100) / 100

  // ── Filters ──
  const filteredFaturas = faturas.filter(f => {
    const matchesSearch = !searchTerm ||
      f.numero_factura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.projetos?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.projetos?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'Todos' || f.estado === selectedStatus
    const matchesProjeto = selectedProjeto === 'Todos' || f.projeto_id === selectedProjeto
    return matchesSearch && matchesStatus && matchesProjeto
  })

  // ── Handlers ──
  const openCreateModal = () => {
    setEditingId(null)
    setFormData(INITIAL_FORM)
    setShowModal(true)
  }

  const openEditModal = (fatura) => {
    if (fatura.estado !== 'rascunho') {
      showToast('Apenas rascunhos podem ser editados', 'error')
      return
    }
    setEditingId(fatura.id)
    setFormData({
      projeto_id: fatura.projeto_id || '',
      capitulo_id: fatura.capitulo_id || '',
      descricao: fatura.descricao || '',
      subtotal: fatura.subtotal?.toString() || fatura.valor?.toString() || '',
      iva_percentagem: fatura.iva_percentagem?.toString() || '23',
      data_facturada: fatura.data_facturada || new Date().toISOString().split('T')[0],
      data_vencimento: fatura.data_vencimento || '',
      condicoes_pagamento_dias: fatura.condicoes_pagamento_dias || 30,
      notas: fatura.notas || ''
    })
    if (fatura.projeto_id) fetchCapitulos(fatura.projeto_id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.descricao || !formData.subtotal) {
      showToast('Preencha descrição e valor', 'error')
      return
    }
    const result = editingId
      ? await updateFatura(editingId, formData)
      : await createFatura(formData)

    if (result.success) {
      showToast(editingId ? 'Fatura atualizada' : 'Fatura criada')
      setShowModal(false)
      setFormData(INITIAL_FORM)
      setEditingId(null)
    } else {
      showToast(result.error || 'Erro ao guardar', 'error')
    }
  }

  const handleEmitir = async (id) => {
    const result = await emitirFatura(id)
    if (result.success) showToast('Fatura emitida')
    else showToast(result.error, 'error')
  }

  const handlePagar = async (id) => {
    const result = await marcarPaga(id)
    if (result.success) showToast('Fatura marcada como paga')
    else showToast(result.error, 'error')
  }

  const openAnularModal = (id) => {
    setAnularId(id)
    setMotivoAnulacao('')
    setShowAnularModal(true)
  }

  const handleAnular = async () => {
    if (!motivoAnulacao.trim()) {
      showToast('Indique o motivo da anulação', 'error')
      return
    }
    const result = await anularFatura(anularId, motivoAnulacao)
    if (result.success) {
      showToast('Fatura anulada')
      setShowAnularModal(false)
    } else {
      showToast(result.error, 'error')
    }
  }

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ['N.º', 'Projeto', 'Capítulo', 'Descrição', 'Subtotal', 'IVA %', 'IVA Valor', 'Total', 'Estado', 'Data Emissão', 'Data Vencimento']
    const rows = filteredFaturas.map(f => [
      f.numero_factura || '',
      f.projetos?.nome || '',
      f.capitulo?.nome || '',
      f.descricao || '',
      f.subtotal || f.valor || 0,
      f.iva_percentagem || 0,
      f.iva_valor || 0,
      f.total || f.valor || 0,
      STATUS_CONFIG[f.estado]?.label || f.estado,
      f.data_facturada || '',
      f.data_vencimento || ''
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `faturacao_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  const capitulos = capitulosPorProjeto[formData.projeto_id] || []

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          background: toast.type === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Faturação</h1>
          <p className="page-subtitle">Gestão de faturas a clientes</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={exportCSV} title="Exportar CSV">
            <Download size={16} /> Exportar
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Nova Fatura
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Faturado</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totais.totalFaturado)}</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>{totais.countTotal} faturas</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pago</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>{formatCurrency(totais.totalPago)}</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>{totais.countPaga} faturas</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Pendente</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{formatCurrency(totais.totalPendente)}</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>{totais.countEmitida} faturas</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Vencido</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626' }}>{formatCurrency(totais.totalVencido)}</div>
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
          <option value="rascunho">Rascunho</option>
          <option value="emitida">Emitida</option>
          <option value="paga">Paga</option>
          <option value="anulada">Anulada</option>
        </select>
        <select
          value={selectedProjeto}
          onChange={e => setSelectedProjeto(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="Todos">Todos os projetos</option>
          {projetos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filteredFaturas.length > 0 ? (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                {['N.º', 'Projeto', 'Capítulo', 'Descrição', 'Emissão', 'Vencimento', 'Subtotal', 'IVA', 'Total', 'Estado', 'Ações'].map(h => (
                  <th key={h} style={{
                    textAlign: ['Subtotal', 'IVA', 'Total'].includes(h) ? 'right' : ['Estado', 'Ações'].includes(h) ? 'center' : 'left',
                    padding: '12px 12px', color: 'var(--brown-light)', fontWeight: 600,
                    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFaturas.map(fatura => {
                const status = STATUS_CONFIG[fatura.estado] || { label: fatura.estado, color: '#6B7280' }
                const isRascunho = fatura.estado === 'rascunho'
                const isEmitida = fatura.estado === 'emitida'
                const isAnulada = fatura.estado === 'anulada'

                return (
                  <tr key={fatura.id} style={{ borderBottom: '1px solid var(--stone)', opacity: isAnulada ? 0.5 : 1 }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--accent-olive)', whiteSpace: 'nowrap' }}>
                      {fatura.numero_factura || '—'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--brown)' }}>
                      <div style={{ fontSize: '13px' }}>{fatura.projetos?.nome || '—'}</div>
                      {fatura.projetos?.codigo && (
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{fatura.projetos.codigo}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--brown-light)', fontSize: '12px' }}>
                      {fatura.capitulo?.nome || '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--brown)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fatura.descricao || '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--brown-light)', whiteSpace: 'nowrap' }}>
                      {formatDate(fatura.data_facturada)}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--brown-light)', whiteSpace: 'nowrap' }}>
                      {formatDate(fatura.data_vencimento)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--brown)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(fatura.subtotal || fatura.valor)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--brown-light)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {fatura.iva_percentagem != null ? `${fatura.iva_percentagem}%` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--brown)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(fatura.total || fatura.valor)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        background: `${status.color}15`, color: status.color, whiteSpace: 'nowrap'
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {isRascunho && (
                          <>
                            <button
                              onClick={() => openEditModal(fatura)}
                              title="Editar"
                              style={{ background: 'none', border: '1px solid var(--stone)', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'var(--brown-light)' }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleEmitir(fatura.id)}
                              title="Emitir"
                              disabled={saving}
                              style={{ background: 'none', border: '1px solid #3B82F6', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#3B82F6' }}
                            >
                              <Send size={14} />
                            </button>
                          </>
                        )}
                        {isEmitida && (
                          <button
                            onClick={() => handlePagar(fatura.id)}
                            title="Marcar como paga"
                            disabled={saving}
                            style={{ background: 'none', border: '1px solid #059669', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#059669' }}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {!isAnulada && (
                          <button
                            onClick={() => openAnularModal(fatura.id)}
                            title="Anular"
                            style={{ background: 'none', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#DC2626' }}
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
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
            <p>Comece a criar faturas para acompanhar a faturação a clientes.</p>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Fatura' : 'Nova Fatura'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Projeto + Capítulo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Projeto</label>
                  <select
                    className="form-input"
                    value={formData.projeto_id}
                    onChange={e => setFormData(p => ({ ...p, projeto_id: e.target.value, capitulo_id: '' }))}
                  >
                    <option value="">— Selecionar —</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Capítulo</label>
                  <select
                    className="form-input"
                    value={formData.capitulo_id}
                    onChange={e => setFormData(p => ({ ...p, capitulo_id: e.target.value }))}
                    disabled={!formData.projeto_id || capitulos.length === 0}
                  >
                    <option value="">— Selecionar —</option>
                    {capitulos.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="form-label">Descrição *</label>
                <input
                  className="form-input"
                  value={formData.descricao}
                  onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição da fatura"
                />
              </div>

              {/* Valor + IVA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Subtotal (s/ IVA) *</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.subtotal}
                    onChange={e => setFormData(p => ({ ...p, subtotal: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="form-label">IVA (%)</label>
                  <select
                    className="form-input"
                    value={formData.iva_percentagem}
                    onChange={e => setFormData(p => ({ ...p, iva_percentagem: e.target.value }))}
                  >
                    {IVA_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Totais calculados */}
              {subtotalNum > 0 && (
                <div style={{
                  background: 'var(--cream)', borderRadius: '8px', padding: '12px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: '1px solid var(--stone-border)'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>IVA ({ivaPctNum}%)</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{formatCurrency(ivaValorCalc)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Total c/ IVA</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-olive)' }}>{formatCurrency(totalCalc)}</div>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Emissão</label>
                  <input
                    className="form-input"
                    type="date"
                    value={formData.data_facturada}
                    onChange={e => setFormData(p => ({ ...p, data_facturada: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Data Vencimento</label>
                  <input
                    className="form-input"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={e => setFormData(p => ({ ...p, data_vencimento: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Prazo (dias)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={formData.condicoes_pagamento_dias}
                    onChange={e => setFormData(p => ({ ...p, condicoes_pagamento_dias: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="form-label">Notas</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formData.notas}
                  onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !formData.descricao || !formData.subtotal}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anular Modal */}
      {showAnularModal && (
        <div className="modal-overlay" onClick={() => setShowAnularModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 style={{ color: '#DC2626' }}>Anular Fatura</h2>
              <button onClick={() => setShowAnularModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px',
                display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#991B1B' }}>
                  Esta ação é irreversível. A fatura será marcada como anulada e não poderá ser reativada.
                </div>
              </div>
              <div>
                <label className="form-label">Motivo da anulação *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={motivoAnulacao}
                  onChange={e => setMotivoAnulacao(e.target.value)}
                  placeholder="Indique o motivo da anulação..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAnularModal(false)}>Cancelar</button>
              <button
                className="btn"
                onClick={handleAnular}
                disabled={saving || !motivoAnulacao.trim()}
                style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: (!motivoAnulacao.trim() || saving) ? 0.5 : 1 }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirmar Anulação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
