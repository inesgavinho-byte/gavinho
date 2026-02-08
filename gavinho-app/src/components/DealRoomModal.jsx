// =====================================================
// DealRoomModal - Criar e gerir Deal Rooms
// Convidar fornecedores, registar orçamentos, decidir
// =====================================================

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  X, Plus, Search, Users, FileText, CheckCircle, Loader2,
  Calendar, DollarSign, Tag, Building2, Star, Upload,
  ChevronRight, Award, AlertCircle
} from 'lucide-react'

const STATUS_LABELS = {
  aberto: { label: 'Aberto', color: '#2563eb', bg: '#dbeafe' },
  em_analise: { label: 'Em Análise', color: '#d97706', bg: '#fef3c7' },
  negociacao: { label: 'Negociação', color: '#7c3aed', bg: '#ede9fe' },
  decidido: { label: 'Decidido', color: '#16a34a', bg: '#dcfce7' },
  cancelado: { label: 'Cancelado', color: '#78716c', bg: '#f5f5f4' }
}

const SUPPLIER_STATUS = {
  convidado: { label: 'Convidado', color: '#2563eb' },
  contactado: { label: 'Contactado', color: '#d97706' },
  orcamento_recebido: { label: 'Orçamento Recebido', color: '#16a34a' },
  rejeitado: { label: 'Rejeitado', color: '#dc2626' }
}

export default function DealRoomModal({
  isOpen, onClose, dealRoom = null, fornecedores = [],
  onSave, onInvite, onUpdateSupplierStatus, onSelectWinner
}) {
  const { profile } = useAuth()
  const [activeSection, setActiveSection] = useState('info')
  const [saving, setSaving] = useState(false)
  const [searchForn, setSearchForn] = useState('')
  const [showQuoteForm, setShowQuoteForm] = useState(null)
  const [quoteForm, setQuoteForm] = useState({ valor_total: '', referencia_fornecedor: '', notas: '' })
  const [justificacao, setJustificacao] = useState('')

  const [form, setForm] = useState({
    titulo: '',
    especialidade: '',
    descricao: '',
    orcamento_disponivel: '',
    prazo_necessario: ''
  })

  // Populate form when editing
  useEffect(() => {
    if (dealRoom) {
      setForm({
        titulo: dealRoom.titulo || '',
        especialidade: dealRoom.especialidade || '',
        descricao: dealRoom.descricao || '',
        orcamento_disponivel: dealRoom.orcamento_disponivel || '',
        prazo_necessario: dealRoom.prazo_necessario || ''
      })
    } else {
      setForm({ titulo: '', especialidade: '', descricao: '', orcamento_disponivel: '', prazo_necessario: '' })
    }
  }, [dealRoom])

  if (!isOpen) return null

  const isNew = !dealRoom?.id
  const invited = dealRoom?.deal_room_fornecedores || []
  const invitedIds = invited.map(f => f.fornecedor_id)

  // Filter available suppliers (not already invited)
  const availableSuppliers = fornecedores.filter(f =>
    !invitedIds.includes(f.id) &&
    (searchForn === '' ||
      f.nome?.toLowerCase().includes(searchForn.toLowerCase()) ||
      f.especialidade?.toLowerCase().includes(searchForn.toLowerCase()))
  )

  const handleSave = async () => {
    if (!form.titulo) return
    setSaving(true)
    const result = await onSave({
      ...form,
      orcamento_disponivel: form.orcamento_disponivel ? parseFloat(form.orcamento_disponivel) : null,
      criado_por: profile?.id
    }, dealRoom?.id)
    setSaving(false)
    if (!result?.error && isNew) {
      onClose()
    }
  }

  const handleInvite = async (fornecedorId) => {
    if (dealRoom?.id) {
      await onInvite(dealRoom.id, fornecedorId)
    }
  }

  const handleStatusChange = async (fornecedorId, newStatus) => {
    if (dealRoom?.id) {
      await onUpdateSupplierStatus(dealRoom.id, fornecedorId, newStatus)
    }
  }

  const handleRegisterQuote = async (fornecedorId) => {
    if (!dealRoom?.id || !quoteForm.valor_total) return
    setSaving(true)
    try {
      // Create quote record
      const { error } = await supabase.from('orcamentos_recebidos').insert({
        fornecedor_id: fornecedorId,
        deal_room_id: dealRoom.id,
        projeto_id: dealRoom.projeto_id,
        valor_total: parseFloat(quoteForm.valor_total),
        referencia_fornecedor: quoteForm.referencia_fornecedor,
        notas: quoteForm.notas,
        status: 'pendente'
      })
      if (error) throw error

      // Update supplier status to orcamento_recebido
      await handleStatusChange(fornecedorId, 'orcamento_recebido')
      setShowQuoteForm(null)
      setQuoteForm({ valor_total: '', referencia_fornecedor: '', notas: '' })
    } catch (err) {
      console.error('Quote error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectWinner = async (fornecedorId) => {
    if (!dealRoom?.id || !justificacao.trim()) return
    setSaving(true)
    await onSelectWinner(dealRoom.id, fornecedorId, justificacao)
    setSaving(false)
    setJustificacao('')
  }

  const sections = [
    { id: 'info', label: 'Informação', icon: FileText },
    { id: 'fornecedores', label: `Fornecedores (${invited.length})`, icon: Users },
    ...(invited.length > 0 ? [{ id: 'orcamentos', label: 'Orçamentos', icon: DollarSign }] : []),
    ...(dealRoom?.status !== 'decidido' && invited.some(f => f.status === 'orcamento_recebido')
      ? [{ id: 'decisao', label: 'Decisão', icon: Award }]
      : [])
  ]

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {isNew ? 'Novo Deal Room' : dealRoom.titulo}
            </h3>
            {dealRoom?.codigo && (
              <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{dealRoom.codigo}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {dealRoom?.status && (
              <span style={{
                padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                background: STATUS_LABELS[dealRoom.status]?.bg || '#f5f5f4',
                color: STATUS_LABELS[dealRoom.status]?.color || '#78716c'
              }}>
                {STATUS_LABELS[dealRoom.status]?.label || dealRoom.status}
              </span>
            )}
            <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
          </div>
        </div>

        {/* Section Tabs */}
        {!isNew && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--stone)', padding: '0 24px' }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeSection === s.id ? '2px solid var(--brown)' : '2px solid transparent',
                fontSize: '12px', fontWeight: activeSection === s.id ? 600 : 400,
                color: activeSection === s.id ? 'var(--brown)' : 'var(--brown-light)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <s.icon size={14} /> {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {/* Info Section */}
          {(activeSection === 'info' || isNew) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Caixilharia Casa Myriad" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Especialidade</label>
                  <input type="text" value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                    placeholder="Ex: Caixilharia, Cantaria" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Orçamento Disponível (€)</label>
                  <input type="number" value={form.orcamento_disponivel} onChange={e => setForm({ ...form, orcamento_disponivel: e.target.value })}
                    placeholder="Ex: 50000" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Prazo para Decisão</label>
                <input type="date" value={form.prazo_necessario} onChange={e => setForm({ ...form, prazo_necessario: e.target.value })}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição / Especificações</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={3} placeholder="Descreva o que precisa..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Fornecedores Section */}
          {activeSection === 'fornecedores' && !isNew && (
            <div>
              {/* Invited suppliers */}
              {invited.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={sectionTitleStyle}>Fornecedores Convidados</h4>
                  {invited.map(inv => {
                    const forn = inv.fornecedores || fornecedores.find(f => f.id === inv.fornecedor_id)
                    const statusConf = SUPPLIER_STATUS[inv.status] || SUPPLIER_STATUS.convidado
                    return (
                      <div key={inv.id} style={supplierCardStyle}>
                        <div style={avatarStyle}>{forn?.nome?.substring(0, 2).toUpperCase() || '??'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>{forn?.nome}</div>
                          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                            {forn?.especialidade || 'Geral'}
                            {forn?.rating && <> · <Star size={10} fill="var(--warning)" stroke="var(--warning)" /> {forn.rating}</>}
                          </div>
                        </div>
                        <select
                          value={inv.status}
                          onChange={e => handleStatusChange(inv.fornecedor_id, e.target.value)}
                          style={{
                            ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '11px',
                            color: statusConf.color, fontWeight: 600
                          }}
                        >
                          {Object.entries(SUPPLIER_STATUS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                        {inv.status !== 'orcamento_recebido' && inv.status !== 'rejeitado' && (
                          <button
                            onClick={() => setShowQuoteForm(inv.fornecedor_id)}
                            style={smallBtnStyle}
                          >
                            <Upload size={12} /> Registar Orçamento
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Inline quote form */}
              {showQuoteForm && (
                <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--stone)' }}>
                  <h4 style={{ ...sectionTitleStyle, marginTop: 0 }}>Registar Orçamento</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={labelStyle}>Valor Total (€) *</label>
                      <input type="number" value={quoteForm.valor_total} onChange={e => setQuoteForm({ ...quoteForm, valor_total: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Referência Fornecedor</label>
                      <input type="text" value={quoteForm.referencia_fornecedor} onChange={e => setQuoteForm({ ...quoteForm, referencia_fornecedor: e.target.value })} placeholder="Nº proposta" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Notas</label>
                    <textarea value={quoteForm.notas} onChange={e => setQuoteForm({ ...quoteForm, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleRegisterQuote(showQuoteForm)} disabled={saving || !quoteForm.valor_total} style={{ ...btnPrimary, opacity: saving || !quoteForm.valor_total ? 0.5 : 1 }}>
                      {saving ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Registar
                    </button>
                    <button onClick={() => setShowQuoteForm(null)} style={btnSecondary}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Add supplier */}
              <h4 style={sectionTitleStyle}>Adicionar Fornecedores</h4>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input type="text" placeholder="Pesquisar fornecedor..." value={searchForn}
                  onChange={e => setSearchForn(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '32px' }} />
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {availableSuppliers.slice(0, 15).map(f => (
                  <div key={f.id} style={{ ...supplierCardStyle, cursor: 'pointer' }}
                    onClick={() => handleInvite(f.id)}>
                    <div style={avatarStyle}>{f.nome?.substring(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>{f.nome}</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{f.especialidade || 'Geral'}</div>
                    </div>
                    <Plus size={16} style={{ color: 'var(--accent-olive)' }} />
                  </div>
                ))}
                {availableSuppliers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--brown-light)', fontSize: '12px' }}>
                    Nenhum fornecedor disponível
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orçamentos Section */}
          {activeSection === 'orcamentos' && !isNew && (
            <div>
              <h4 style={sectionTitleStyle}>Comparativo de Orçamentos</h4>
              {invited.filter(f => f.status === 'orcamento_recebido').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--brown-light)', fontSize: '13px' }}>
                  <FileText size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                  Nenhum orçamento recebido ainda.
                </div>
              ) : (
                <QuoteComparison dealRoom={dealRoom} invited={invited} fornecedores={fornecedores} />
              )}
            </div>
          )}

          {/* Decisão Section */}
          {activeSection === 'decisao' && !isNew && (
            <div>
              <h4 style={sectionTitleStyle}>Selecionar Fornecedor Vencedor</h4>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                Escolha o fornecedor para esta deal room e registe a justificação da decisão.
              </p>
              {invited.filter(f => f.status === 'orcamento_recebido').map(inv => {
                const forn = inv.fornecedores || fornecedores.find(f => f.id === inv.fornecedor_id)
                return (
                  <div key={inv.id} style={{
                    ...supplierCardStyle,
                    border: '2px solid var(--stone)',
                    padding: '16px',
                    marginBottom: '8px'
                  }}>
                    <div style={avatarStyle}>{forn?.nome?.substring(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>{forn?.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{forn?.especialidade || 'Geral'}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (justificacao.trim()) handleSelectWinner(inv.fornecedor_id)
                      }}
                      disabled={!justificacao.trim() || saving}
                      style={{
                        ...btnPrimary,
                        background: justificacao.trim() ? 'var(--accent-olive)' : 'var(--stone)',
                        cursor: justificacao.trim() ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <Award size={14} /> Selecionar
                    </button>
                  </div>
                )
              })}
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Justificação da Decisão *</label>
                <textarea value={justificacao} onChange={e => setJustificacao(e.target.value)}
                  rows={3} placeholder="Porque escolheu este fornecedor? (preço, qualidade, prazo, experiência...)"
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={btnSecondary}>
            {isNew ? 'Cancelar' : 'Fechar'}
          </button>
          {(isNew || activeSection === 'info') && (
            <button onClick={handleSave} disabled={saving || !form.titulo} style={{
              ...btnPrimary, opacity: saving || !form.titulo ? 0.5 : 1
            }}>
              {saving && <Loader2 size={14} className="spin" />}
              {isNew ? 'Criar Deal Room' : 'Guardar Alterações'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Quote Comparison sub-component
function QuoteComparison({ dealRoom, invited, fornecedores }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (dealRoom?.id) fetchQuotes()
  }, [dealRoom?.id])

  const fetchQuotes = async () => {
    try {
      const { data } = await supabase
        .from('orcamentos_recebidos')
        .select('*, fornecedores(nome, especialidade)')
        .eq('deal_room_id', dealRoom.id)
        .order('valor_total')

      setQuotes(data || [])
    } catch {
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '16px' }}><Loader2 size={16} className="spin" /></div>

  const minVal = Math.min(...quotes.map(q => q.valor_total || Infinity))
  const maxVal = Math.max(...quotes.map(q => q.valor_total || 0))
  const budget = dealRoom?.orcamento_disponivel

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {quotes.map((q, i) => {
        const isLowest = q.valor_total === minVal
        const overBudget = budget && q.valor_total > budget
        const desvio = budget ? (((q.valor_total - budget) / budget) * 100).toFixed(0) : null

        return (
          <div key={q.id} style={{
            padding: '14px 16px',
            background: isLowest ? 'rgba(122, 139, 110, 0.06)' : 'var(--white)',
            borderRadius: '10px',
            border: isLowest ? '2px solid var(--accent-olive)' : '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brown-light)', width: '24px' }}>#{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>
                {q.fornecedores?.nome || 'Fornecedor'}
              </div>
              {q.referencia_fornecedor && (
                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Ref: {q.referencia_fornecedor}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '20px', fontWeight: 700,
                color: overBudget ? 'var(--error)' : isLowest ? 'var(--accent-olive)' : 'var(--brown)'
              }}>
                €{q.valor_total?.toLocaleString('pt-PT')}
              </div>
              {desvio && (
                <div style={{
                  fontSize: '10px',
                  color: overBudget ? 'var(--error)' : 'var(--accent-olive)',
                  fontWeight: 600
                }}>
                  {desvio > 0 ? '+' : ''}{desvio}% vs orçamento
                </div>
              )}
            </div>
            {isLowest && (
              <div style={{
                padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                background: 'var(--accent-olive)', color: 'white'
              }}>
                Melhor preço
              </div>
            )}
          </div>
        )
      })}
      {budget && (
        <div style={{ fontSize: '12px', color: 'var(--brown-light)', textAlign: 'center', padding: '8px 0' }}>
          Orçamento disponível: <strong>€{parseFloat(budget).toLocaleString('pt-PT')}</strong>
        </div>
      )}
    </div>
  )
}

// Styles
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }
const modalStyle = { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const headerStyle = { padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const footerStyle = { padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--brown-light)' }
const inputStyle = { width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box', fontSize: '13px', color: 'var(--brown)', outline: 'none', background: 'var(--white)' }
const sectionTitleStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }
const supplierCardStyle = { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--stone)', marginBottom: '6px', background: 'var(--white)' }
const avatarStyle = { width: '32px', height: '32px', borderRadius: '8px', background: 'var(--cream)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--brown-light)', flexShrink: 0 }
const btnPrimary = { padding: '8px 20px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }
const btnSecondary = { padding: '8px 16px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }
const smallBtnStyle = { padding: '4px 10px', background: 'rgba(122, 139, 110, 0.08)', border: '1px solid rgba(122, 139, 110, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--accent-olive)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }
