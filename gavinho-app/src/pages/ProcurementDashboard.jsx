import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, Plus, Search, Loader2, Filter, FileText,
  Package, Truck, CheckCircle2, Clock, AlertTriangle, Euro,
  ArrowRight, ChevronDown, ChevronUp, ClipboardList, Eye,
  TrendingUp, TrendingDown, BarChart3, Building2, X
} from 'lucide-react'
import { useProcurement } from '../hooks/useProcurement'

// ═══════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════

const REQ_STATES = {
  rascunho: { label: 'Rascunho', color: '#6B7280', icon: FileText },
  aberta: { label: 'Aberta', color: '#3B82F6', icon: Clock },
  em_cotacao: { label: 'Em Cotação', color: '#D97706', icon: ClipboardList },
  em_comparacao: { label: 'Em Comparação', color: '#8B5CF6', icon: BarChart3 },
  decidida: { label: 'Decidida', color: '#059669', icon: CheckCircle2 },
  em_encomenda: { label: 'Em Encomenda', color: '#0284C7', icon: Package },
  entrega_parcial: { label: 'Entrega Parcial', color: '#D97706', icon: Truck },
  entregue: { label: 'Entregue', color: '#059669', icon: CheckCircle2 },
  facturada: { label: 'Facturada', color: '#10B981', icon: Euro },
  fechada: { label: 'Fechada', color: '#374151', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: '#DC2626', icon: X },
}

const PO_STATES = {
  rascunho: { label: 'Rascunho', color: '#6B7280' },
  pendente_aprovacao: { label: 'Pend. Aprovação', color: '#D97706' },
  aprovada: { label: 'Aprovada', color: '#3B82F6' },
  enviada: { label: 'Enviada', color: '#0284C7' },
  confirmada: { label: 'Confirmada', color: '#059669' },
  entrega_parcial: { label: 'Entrega Parcial', color: '#D97706' },
  entregue: { label: 'Entregue', color: '#10B981' },
  em_revisao: { label: 'Em Revisão', color: '#8B5CF6' },
  concluida: { label: 'Concluída', color: '#374151' },
  cancelada: { label: 'Cancelada', color: '#DC2626' },
}

const URGENCY_COLORS = {
  critica: '#DC2626',
  alta: '#D97706',
  media: '#3B82F6',
  baixa: '#6B7280',
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════

export default function ProcurementDashboard() {
  const {
    requisicoes, cotacoes, purchaseOrders, facturas,
    stats, loading, error, refetch
  } = useProcurement()

  const [activeSection, setActiveSection] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [showCreateReq, setShowCreateReq] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projetos, setProjetos] = useState([])
  const [obras, setObras] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [formData, setFormData] = useState({
    titulo: '', descricao: '', projeto_id: '', obra_id: '',
    urgencia: 'media', data_necessidade: '', notas: ''
  })

  useEffect(() => {
    loadRefs()
  }, [])

  const loadRefs = async () => {
    const [{ data: p }, { data: o }, { data: f }] = await Promise.all([
      supabase.from('projetos').select('id, nome, codigo').order('codigo'),
      supabase.from('obras').select('id, nome, codigo').order('codigo'),
      supabase.from('fornecedores').select('id, nome').order('nome'),
    ])
    setProjetos(p || [])
    setObras(o || [])
    setFornecedores(f || [])
  }

  const handleCreateReq = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('requisicoes')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao,
          projeto_id: formData.projeto_id || null,
          obra_id: formData.obra_id || null,
          urgencia: formData.urgencia,
          data_necessidade: formData.data_necessidade || null,
          notas: formData.notas || null,
          estado: 'rascunho',
        })
      if (err) {
        if (err.code === '42P01') {
          alert('Tabela de requisições ainda não existe. Execute a migração SQL primeiro.')
          return
        }
        throw err
      }
      setShowCreateReq(false)
      setFormData({ titulo: '', descricao: '', projeto_id: '', obra_id: '', urgencia: 'media', data_necessidade: '', notas: '' })
      refetch()
    } catch (err) {
      console.error('Erro ao criar requisição:', err)
      alert('Erro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '—'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-PT')
  }

  const sections = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'requisicoes', label: 'Requisições', icon: ClipboardList, count: stats.total_requisicoes },
    { id: 'cotacoes', label: 'Cotações', icon: FileText, count: stats.total_cotacoes },
    { id: 'pos', label: 'Purchase Orders', icon: Package, count: stats.total_pos },
    { id: 'facturas', label: 'Faturas', icon: Euro, count: stats.total_facturas },
  ]

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', color: 'var(--brown)', margin: 0 }}>
            Procurement Pipeline
          </h1>
          <p style={{ color: 'var(--brown-light)', marginTop: '4px' }}>
            Gestão integrada de requisições, cotações, encomendas e faturas
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateReq(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Nova Requisição
        </button>
      </div>

      {/* Section Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--stone)',
        paddingBottom: '0', overflowX: 'auto'
      }}>
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: activeSection === s.id ? 'var(--accent-olive)' : 'var(--brown-light)',
                borderBottom: activeSection === s.id ? '2px solid var(--accent-olive)' : '2px solid transparent',
                fontWeight: activeSection === s.id ? '600' : '400',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {s.label}
              {s.count > 0 && (
                <span style={{
                  background: activeSection === s.id ? 'var(--accent-olive)' : 'var(--stone)',
                  color: activeSection === s.id ? 'white' : 'var(--brown)',
                  padding: '1px 7px', borderRadius: '10px', fontSize: '11px'
                }}>
                  {s.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeSection === 'overview' && (
        <OverviewSection
          stats={stats}
          requisicoes={requisicoes}
          cotacoes={cotacoes}
          purchaseOrders={purchaseOrders}
          facturas={facturas}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {activeSection === 'requisicoes' && (
        <ListSection
          title="Requisições"
          items={requisicoes}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          states={REQ_STATES}
          columns={[
            { key: 'codigo', label: 'Código', width: '120px' },
            { key: 'titulo', label: 'Título' },
            { key: 'urgencia', label: 'Urgência', width: '100px', render: (v) => (
              <span style={{ color: URGENCY_COLORS[v] || '#6B7280', fontWeight: 600, fontSize: '12px', textTransform: 'capitalize' }}>{v || '—'}</span>
            )},
            { key: 'estado', label: 'Estado', width: '140px', render: (v) => <StatusBadge state={v} states={REQ_STATES} /> },
            { key: 'data_necessidade', label: 'Data Necessidade', width: '130px', render: (v) => formatDate(v) },
            { key: 'created_at', label: 'Criada em', width: '110px', render: (v) => formatDate(v) },
          ]}
          searchField="titulo"
          statusField="estado"
        />
      )}

      {activeSection === 'cotacoes' && (
        <ListSection
          title="Cotações"
          items={cotacoes}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          states={{
            recebida: { label: 'Recebida', color: '#3B82F6' },
            em_analise: { label: 'Em Análise', color: '#D97706' },
            aceite: { label: 'Aceite', color: '#059669' },
            rejeitada: { label: 'Rejeitada', color: '#DC2626' },
            expirada: { label: 'Expirada', color: '#6B7280' },
          }}
          columns={[
            { key: 'codigo', label: 'Código', width: '130px' },
            { key: 'valor_total', label: 'Valor', width: '120px', render: (v) => formatCurrency(v) },
            { key: 'prazo_entrega_dias', label: 'Prazo Entrega', width: '120px', render: (v) => v ? `${v} dias` : '—' },
            { key: 'estado', label: 'Estado', width: '120px', render: (v) => (
              <span style={{
                padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                background: v === 'aceite' ? '#ECFDF5' : v === 'rejeitada' ? '#FEF2F2' : '#EFF6FF',
                color: v === 'aceite' ? '#059669' : v === 'rejeitada' ? '#DC2626' : '#3B82F6'
              }}>{v || '—'}</span>
            )},
            { key: 'validade_dias', label: 'Validade', width: '100px', render: (v) => v ? `${v} dias` : '—' },
            { key: 'created_at', label: 'Recebida em', width: '110px', render: (v) => formatDate(v) },
          ]}
          searchField="codigo"
          statusField="estado"
        />
      )}

      {activeSection === 'pos' && (
        <ListSection
          title="Purchase Orders"
          items={purchaseOrders}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          states={PO_STATES}
          columns={[
            { key: 'codigo', label: 'Código', width: '130px' },
            { key: 'valor_total', label: 'Valor Total', width: '130px', render: (v) => formatCurrency(v) },
            { key: 'estado', label: 'Estado', width: '140px', render: (v) => <StatusBadge state={v} states={PO_STATES} /> },
            { key: 'data_entrega_prevista', label: 'Entrega Prev.', width: '120px', render: (v) => formatDate(v) },
            { key: 'data_entrega_real', label: 'Entrega Real', width: '120px', render: (v) => formatDate(v) },
            { key: 'created_at', label: 'Criada em', width: '110px', render: (v) => formatDate(v) },
          ]}
          searchField="codigo"
          statusField="estado"
        />
      )}

      {activeSection === 'facturas' && (
        <ListSection
          title="Faturas de Procurement"
          items={facturas}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          states={{
            pendente_validacao: { label: 'Pend. Validação', color: '#D97706' },
            validada: { label: 'Validada', color: '#3B82F6' },
            aprovada: { label: 'Aprovada', color: '#059669' },
            em_pagamento: { label: 'Em Pagamento', color: '#0284C7' },
            paga: { label: 'Paga', color: '#10B981' },
            contestada: { label: 'Contestada', color: '#DC2626' },
            sem_po: { label: 'Sem PO', color: '#6B7280' },
          }}
          columns={[
            { key: 'codigo', label: 'Código', width: '140px' },
            { key: 'numero_fatura_fornecedor', label: 'N.º Fatura', width: '130px' },
            { key: 'valor_com_iva', label: 'Valor c/IVA', width: '130px', render: (v) => formatCurrency(v) },
            { key: 'desvio_percentagem', label: 'Desvio', width: '100px', render: (v) => {
              if (v === null || v === undefined) return '—'
              const color = Math.abs(v) > 10 ? '#DC2626' : Math.abs(v) > 5 ? '#D97706' : '#059669'
              return <span style={{ color, fontWeight: 600, fontSize: '12px' }}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
            }},
            { key: 'estado', label: 'Estado', width: '130px', render: (v) => (
              <span style={{
                padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                background: v === 'paga' ? '#ECFDF5' : v === 'contestada' ? '#FEF2F2' : '#FFF7ED',
                color: v === 'paga' ? '#059669' : v === 'contestada' ? '#DC2626' : '#D97706'
              }}>{v || '—'}</span>
            )},
            { key: 'data_fatura', label: 'Data', width: '110px', render: (v) => formatDate(v) },
          ]}
          searchField="codigo"
          statusField="estado"
        />
      )}

      {/* Create Requisição Modal */}
      {showCreateReq && (
        <div className="modal-overlay" onClick={() => setShowCreateReq(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Nova Requisição</h3>
              <button onClick={() => setShowCreateReq(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateReq}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Título *</label>
                  <input
                    className="form-input"
                    value={formData.titulo}
                    onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    required
                    placeholder="Ex: Caixilharia em alumínio para piso 2"
                  />
                </div>
                <div>
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-input"
                    value={formData.descricao}
                    onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={3}
                    placeholder="Detalhes da requisição, especificações, quantidades..."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Projeto</label>
                    <select
                      className="form-input"
                      value={formData.projeto_id}
                      onChange={e => setFormData(prev => ({ ...prev, projeto_id: e.target.value }))}
                    >
                      <option value="">Nenhum</option>
                      {projetos.map(p => (
                        <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Obra</label>
                    <select
                      className="form-input"
                      value={formData.obra_id}
                      onChange={e => setFormData(prev => ({ ...prev, obra_id: e.target.value }))}
                    >
                      <option value="">Nenhuma</option>
                      {obras.map(o => (
                        <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Urgência</label>
                    <select
                      className="form-input"
                      value={formData.urgencia}
                      onChange={e => setFormData(prev => ({ ...prev, urgencia: e.target.value }))}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Data Necessidade</label>
                    <input
                      className="form-input"
                      type="date"
                      value={formData.data_necessidade}
                      onChange={e => setFormData(prev => ({ ...prev, data_necessidade: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Notas</label>
                  <textarea
                    className="form-input"
                    value={formData.notas}
                    onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                    rows={2}
                    placeholder="Notas adicionais..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateReq(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  Criar Requisição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// OVERVIEW SECTION
// ═══════════════════════════════════════

function OverviewSection({ stats, requisicoes, cotacoes, purchaseOrders, facturas, formatCurrency, formatDate }) {
  const activeReqs = requisicoes.filter(r => !['fechada', 'cancelada'].includes(r.estado))
  const pendingCots = cotacoes.filter(c => c.estado === 'recebida')
  const activePOs = purchaseOrders.filter(p => !['concluida', 'cancelada'].includes(p.estado))
  const pendingFats = facturas.filter(f => ['pendente_validacao', 'sem_po'].includes(f.estado))

  const kpis = [
    { label: 'Requisições Ativas', value: activeReqs.length, icon: ClipboardList, color: '#3B82F6' },
    { label: 'Cotações Pendentes', value: pendingCots.length, icon: FileText, color: '#D97706' },
    { label: 'POs Ativas', value: activePOs.length, icon: Package, color: '#059669' },
    { label: 'Faturas Pendentes', value: pendingFats.length, icon: AlertTriangle, color: '#DC2626' },
    { label: 'Valor POs Aprovadas', value: formatCurrency(stats.valor_pos_aprovadas), icon: Euro, color: '#10B981', large: true },
    { label: 'Valor Faturas Pend.', value: formatCurrency(stats.valor_facturas_pendentes), icon: Euro, color: '#D97706', large: true },
  ]

  return (
    <div>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={i} className="card" style={{
              padding: '16px 20px',
              borderLeft: `3px solid ${kpi.color}`,
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={20} style={{ color: kpi.color }} />
              </div>
              <div>
                <div style={{ fontSize: kpi.large ? '18px' : '24px', fontWeight: 700, color: 'var(--brown)' }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{kpi.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pipeline Visual */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--brown)' }}>
          Pipeline de Procurement
        </h3>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {[
            { label: 'Requisição', count: requisicoes.filter(r => ['rascunho', 'aberta'].includes(r.estado)).length, color: '#3B82F6' },
            { label: 'Cotação', count: requisicoes.filter(r => r.estado === 'em_cotacao').length + pendingCots.length, color: '#D97706' },
            { label: 'Comparação', count: requisicoes.filter(r => r.estado === 'em_comparacao').length, color: '#8B5CF6' },
            { label: 'Decisão', count: requisicoes.filter(r => r.estado === 'decidida').length, color: '#059669' },
            { label: 'Encomenda', count: activePOs.length, color: '#0284C7' },
            { label: 'Entrega', count: purchaseOrders.filter(p => ['entrega_parcial', 'entregue'].includes(p.estado)).length, color: '#10B981' },
            { label: 'Fatura', count: facturas.length, color: '#6366F1' },
          ].map((stage, i, arr) => (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '100px' }}>
              <div style={{
                flex: 1, textAlign: 'center', padding: '12px 8px',
                background: `${stage.color}10`, borderRadius: '8px',
                border: `1px solid ${stage.color}30`
              }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: stage.color }}>{stage.count}</div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>{stage.label}</div>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight size={16} style={{ color: 'var(--stone)', margin: '0 4px', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Recent Requisições */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--brown)' }}>
            Últimas Requisições
          </h4>
          {activeReqs.length === 0 ? (
            <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Nenhuma requisição ativa</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeReqs.slice(0, 5).map(req => (
                <div key={req.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: '6px', background: 'var(--cream)', fontSize: '13px'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-olive)', marginRight: '8px' }}>{req.codigo}</span>
                    <span style={{ color: 'var(--brown)' }}>{req.titulo}</span>
                  </div>
                  <StatusBadge state={req.estado} states={REQ_STATES} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent POs */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--brown)' }}>
            Últimas Purchase Orders
          </h4>
          {activePOs.length === 0 ? (
            <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Nenhuma PO ativa</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activePOs.slice(0, 5).map(po => (
                <div key={po.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: '6px', background: 'var(--cream)', fontSize: '13px'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-olive)', marginRight: '8px' }}>{po.codigo}</span>
                    <span style={{ color: 'var(--brown)' }}>{formatCurrency(po.valor_total)}</span>
                  </div>
                  <StatusBadge state={po.estado} states={PO_STATES} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// GENERIC LIST SECTION
// ═══════════════════════════════════════

function ListSection({ title, items, searchTerm, setSearchTerm, statusFilter, setStatusFilter, states, columns, searchField, statusField }) {
  const stateKeys = ['Todos', ...Object.keys(states)]

  const filtered = items.filter(item => {
    const matchSearch = !searchTerm ||
      String(item[searchField] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.titulo || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'Todos' || item[statusField] === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            className="form-input"
            placeholder={`Pesquisar ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          className="form-input"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {stateKeys.map(k => (
            <option key={k} value={k}>{k === 'Todos' ? 'Todos os estados' : (states[k]?.label || k)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--stone)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--brown)', margin: '0 0 8px 0' }}>Sem registos</h3>
          <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>
            {searchTerm || statusFilter !== 'Todos'
              ? 'Nenhum resultado corresponde aos filtros aplicados.'
              : `Não existem ${title.toLowerCase()} registadas.`}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                  {columns.map(col => (
                    <th key={col.key} style={{
                      textAlign: 'left', padding: '10px 12px', fontSize: '11px',
                      fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase',
                      letterSpacing: '0.5px', width: col.width || 'auto'
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid var(--cream)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: '10px 12px', color: 'var(--brown)' }}>
                        {col.render ? col.render(item[col.key], item) : (item[col.key] || '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{
            padding: '10px 16px', borderTop: '1px solid var(--stone)',
            fontSize: '12px', color: 'var(--brown-light)', textAlign: 'right'
          }}>
            {filtered.length} de {items.length} registos
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════

function StatusBadge({ state, states }) {
  const config = states[state] || { label: state, color: '#6B7280' }
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 500,
      background: `${config.color}15`,
      color: config.color,
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}
