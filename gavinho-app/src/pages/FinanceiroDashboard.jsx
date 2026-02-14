// =====================================================
// PAINEL FINANCEIRO TEMPO REAL
// Real-time financial dashboard per project:
// KPIs, chapter breakdown, drill-down, alerts, extras
// =====================================================

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Euro, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Receipt, CreditCard, Wallet,
  BarChart3, ShieldAlert, FileText, Plus, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Minus, Package, Clock,
  X, Loader2, RefreshCw, CircleDot, ArrowLeft, Info
} from 'lucide-react'
import { useFinanceiroDashboard } from '../hooks/useFinanceiroDashboard'
import SimuladorCenarios from '../components/financeiro/SimuladorCenarios'
import CashFlowChart from '../components/financeiro/CashFlowChart'

// ── Formatters ───────────────────────────────────────
const fmt = (v) => {
  if (v == null) return '€0'
  if (Math.abs(v) >= 1000000) return `€${(v / 1000000).toFixed(1)}M`
  if (Math.abs(v) >= 1000) return `€${(v / 1000).toFixed(0)}K`
  return `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const fmtFull = (v) =>
  v != null ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '€0,00'

const fmtPct = (v) => v != null ? `${v.toFixed(1)}%` : '0%'

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

// ── Health badge ─────────────────────────────────────
const healthConfig = {
  ok: { label: 'OK', color: '#4a5d4a', bg: 'rgba(74, 93, 74, 0.1)', icon: CheckCircle2 },
  atencao: { label: 'Atenção', color: '#c9a882', bg: 'rgba(201, 168, 130, 0.15)', icon: AlertTriangle },
  critico: { label: 'Crítico', color: '#b88a8a', bg: 'rgba(184, 138, 138, 0.15)', icon: ShieldAlert },
  nao_iniciado: { label: 'Não iniciado', color: '#999', bg: 'rgba(150,150,150,0.08)', icon: CircleDot }
}

function HealthBadge({ status }) {
  const cfg = healthConfig[status] || healthConfig.ok
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      color: cfg.color, background: cfg.bg
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

// ── Gravidade badge (alerts) ─────────────────────────
const gravConfig = {
  urgente: { label: 'Urgente', color: '#fff', bg: '#b33' },
  critico: { label: 'Crítico', color: '#fff', bg: '#b88a8a' },
  atencao: { label: 'Atenção', color: '#6b5b3e', bg: 'rgba(201, 168, 130, 0.25)' },
  info: { label: 'Info', color: '#4a5d4a', bg: 'rgba(74, 93, 74, 0.1)' }
}

function GravBadge({ gravidade }) {
  const cfg = gravConfig[gravidade] || gravConfig.info
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
      fontSize: '0.7rem', fontWeight: 700, color: cfg.color, background: cfg.bg
    }}>
      {cfg.label}
    </span>
  )
}

// ── Estado badge (extras) ────────────────────────────
const extraEstadoConfig = {
  pendente: { color: '#c9a882', bg: 'rgba(201,168,130,0.15)' },
  aprovado: { color: '#4a5d4a', bg: 'rgba(74,93,74,0.1)' },
  rejeitado: { color: '#b88a8a', bg: 'rgba(184,138,138,0.1)' },
  absorvido: { color: '#666', bg: 'rgba(150,150,150,0.08)' }
}

// ── KPI Card ─────────────────────────────────────────
function KpiCard({ label, value, sub, trend, color }) {
  return (
    <div style={{
      background: 'var(--cream, #F2F0E7)', borderRadius: '12px', padding: '16px 20px',
      flex: '1 1 140px', minWidth: '140px', border: '1px solid var(--stone, #e0ddd4)'
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--brown-light, #8a7e6e)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--brown, #5a4a3a)', fontFamily: 'Cormorant Garamond, serif' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--brown-light, #8a7e6e)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {trend === 'up' && <ArrowUpRight size={12} color="#b88a8a" />}
          {trend === 'down' && <ArrowDownRight size={12} color="#4a5d4a" />}
          {trend === 'neutral' && <Minus size={12} />}
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────
function ProgressBar({ value, max, color, height = 6 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ width: '100%', height, borderRadius: height / 2, background: 'rgba(150,150,150,0.12)', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: height / 2,
        background: color || (pct >= 95 ? '#b88a8a' : pct >= 85 ? '#c9a882' : '#4a5d4a'),
        transition: 'width 0.4s ease'
      }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CHAPTER DRILL-DOWN
// ═══════════════════════════════════════════════════════
function CapituloDrillDown({ cap }) {
  return (
    <div style={{ padding: '12px 0 8px 0', borderTop: '1px solid var(--stone, #e0ddd4)' }}>
      {/* POs */}
      {cap.pos?.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '6px', letterSpacing: '0.5px' }}>
            Purchase Orders ({cap.pos.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cap.pos.map(po => (
              <div key={po.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                background: 'rgba(150,150,150,0.04)', borderRadius: '8px', fontSize: '0.8rem'
              }}>
                <Package size={13} color="var(--brown-light)" />
                <span style={{ fontWeight: 600, minWidth: '100px' }}>{po.id}</span>
                <span style={{ flex: 1, color: 'var(--brown-light)' }}>
                  {po.referencia_cotacao || '—'}
                </span>
                <span style={{ fontWeight: 600 }}>{fmtFull(po.total)}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600,
                  background: po.estado === 'entregue' || po.estado === 'concluida' ? 'rgba(74,93,74,0.1)' : 'rgba(201,168,130,0.15)',
                  color: po.estado === 'entregue' || po.estado === 'concluida' ? '#4a5d4a' : '#c9a882'
                }}>
                  {po.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facturas */}
      {cap.facturas?.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brown-light)', marginBottom: '6px', letterSpacing: '0.5px' }}>
            Facturas ({cap.facturas.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cap.facturas.map(f => {
              const hasDesvio = f.desvio_percentual && f.desvio_percentual > 5
              return (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                  background: hasDesvio ? 'rgba(184,138,138,0.06)' : 'rgba(150,150,150,0.04)',
                  borderRadius: '8px', fontSize: '0.8rem',
                  borderLeft: hasDesvio ? '3px solid #c9a882' : 'none'
                }}>
                  <Receipt size={13} color="var(--brown-light)" />
                  <span style={{ fontWeight: 600, minWidth: '100px' }}>{f.numero_fatura || f.id}</span>
                  <span style={{ flex: 1, color: 'var(--brown-light)' }}>
                    {f.po_id ? `→ ${f.po_id}` : 'Sem PO'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{fmtFull(f.total)}</span>
                  {hasDesvio && (
                    <span style={{ color: '#b88a8a', fontSize: '0.7rem', fontWeight: 600 }}>
                      +{f.desvio_percentual?.toFixed(1)}%
                    </span>
                  )}
                  <span style={{
                    padding: '1px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600,
                    background: f.estado === 'paga' ? 'rgba(74,93,74,0.1)' : 'rgba(201,168,130,0.15)',
                    color: f.estado === 'paga' ? '#4a5d4a' : '#c9a882'
                  }}>
                    {f.estado}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analysis mini-card */}
      <div style={{
        background: 'rgba(74, 93, 74, 0.04)', borderRadius: '8px', padding: '10px 14px',
        fontSize: '0.8rem', color: 'var(--brown)'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Análise
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          <span>Orçamento (custo):</span><span style={{ fontWeight: 600 }}>{fmtFull(cap.orcamento_custo)}</span>
          <span>Comprometido:</span><span style={{ fontWeight: 600 }}>{fmtFull(cap.comprometido)} ({fmtPct(cap.percentagem_comprometido)})</span>
          <span>Facturado:</span><span style={{ fontWeight: 600 }}>{fmtFull(cap.facturado)}</span>
          <span>Margem restante:</span>
          <span style={{ fontWeight: 600, color: cap.margem_restante < 0 ? '#b88a8a' : '#4a5d4a' }}>
            {fmtFull(cap.margem_restante)}
          </span>
        </div>
      </div>

      {cap.pos?.length === 0 && cap.facturas?.length === 0 && (
        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '0.8rem' }}>
          Nenhuma PO ou factura associada a este capítulo
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function FinanceiroDashboard() {
  const { id: projetoId } = useParams()
  const navigate = useNavigate()
  const {
    loading, error, projeto, capitulos, extras, alertas, totais,
    facturacaoCliente, fetchAll, createExtra, updateExtra, dismissAlerta
  } = useFinanceiroDashboard(projetoId)

  const [expandedCaps, setExpandedCaps] = useState({})
  const [activeSection, setActiveSection] = useState('resumo') // resumo | alertas | extras | cashflow | simulador
  const [showExtraModal, setShowExtraModal] = useState(false)

  // Extra form state
  const [extraForm, setExtraForm] = useState({
    titulo: '', descricao: '', capitulo: '',
    custo_gavinho: '', margem_percentagem: 25, preco_cliente: ''
  })

  const toggleCap = (nome) => setExpandedCaps(prev => ({ ...prev, [nome]: !prev[nome] }))

  // ── Section tabs ──
  const sections = [
    { id: 'resumo', label: 'Resumo', icon: BarChart3 },
    { id: 'alertas', label: `Alertas (${alertas.length})`, icon: AlertTriangle },
    { id: 'extras', label: `Extras (${extras.length})`, icon: FileText },
    { id: 'cashflow', label: 'Cash Flow', icon: Wallet },
    { id: 'simulador', label: 'Simulador', icon: RefreshCw }
  ]

  // ── Margem trend ──
  const margemTrend = useMemo(() => {
    if (!totais.margemProjectada || !totais.margemPctGlobal) return 'neutral'
    return totais.margemProjectada < totais.margemPctGlobal ? 'up' : 'down'
  }, [totais])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} className="spin" color="var(--verde)" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--brown-light)' }}>
        <AlertTriangle size={40} style={{ marginBottom: '12px' }} />
        <p>Erro ao carregar dados financeiros</p>
        <p style={{ fontSize: '0.8rem' }}>{error}</p>
        <button onClick={fetchAll} style={{
          marginTop: '16px', padding: '8px 20px', borderRadius: '8px',
          border: '1px solid var(--verde)', background: 'transparent', color: 'var(--verde)', cursor: 'pointer'
        }}>
          Tentar novamente
        </button>
      </div>
    )
  }

  const handleSaveExtra = async () => {
    try {
      await createExtra({
        titulo: extraForm.titulo,
        descricao: extraForm.descricao,
        capitulo: extraForm.capitulo,
        custo_gavinho: parseFloat(extraForm.custo_gavinho) || 0,
        margem_percentagem: parseFloat(extraForm.margem_percentagem) || 25,
        preco_cliente: parseFloat(extraForm.preco_cliente) || 0
      })
      setShowExtraModal(false)
      setExtraForm({ titulo: '', descricao: '', capitulo: '', custo_gavinho: '', margem_percentagem: 25, preco_cliente: '' })
    } catch (err) {
      console.error('Erro ao criar extra:', err)
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent',
          border: 'none', cursor: 'pointer', color: 'var(--brown-light)', fontSize: '0.85rem'
        }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0, fontSize: '1.5rem', fontFamily: 'Cormorant Garamond, serif',
            color: 'var(--brown, #5a4a3a)'
          }}>
            <Euro size={20} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Financeiro
            {projeto && <span style={{ color: 'var(--brown-light)', fontWeight: 400 }}> &middot; {projeto.codigo} {projeto.nome}</span>}
          </h1>
        </div>
        <button onClick={fetchAll} style={{
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
          borderRadius: '8px', border: '1px solid var(--stone)', background: 'transparent',
          cursor: 'pointer', color: 'var(--brown-light)', fontSize: '0.8rem'
        }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <KpiCard
          label="Orçamento revisto"
          value={fmt(totais.orcamentoRevisto)}
          sub={totais.extrasAprovados > 0 ? `inc. ${fmt(totais.extrasAprovados)} extras` : 'original'}
        />
        <KpiCard
          label="Comprometido"
          value={fmt(totais.comprometido)}
          sub={totais.orcamentoRevisto > 0 ? fmtPct(totais.comprometido / totais.orcamentoRevisto * 100) : '—'}
        />
        <KpiCard
          label="Facturado"
          value={fmt(totais.facturado)}
          sub={totais.orcamentoRevisto > 0 ? fmtPct(totais.facturado / totais.orcamentoRevisto * 100) : '—'}
        />
        <KpiCard
          label="Pago"
          value={fmt(totais.pago)}
          sub={totais.orcamentoRevisto > 0 ? fmtPct(totais.pago / totais.orcamentoRevisto * 100) : '—'}
        />
        <KpiCard
          label="Margem prevista"
          value={fmtPct(totais.margemProjectada)}
          sub={totais.margemProjectada < totais.margemPctGlobal
            ? `${(totais.margemPctGlobal - totais.margemProjectada).toFixed(1)}pp erosão`
            : 'estável'}
          trend={totais.margemProjectada < totais.margemPctGlobal ? 'up' : 'down'}
          color={totais.margemProjectada < 15 ? '#b88a8a' : totais.margemProjectada < 20 ? '#c9a882' : '#4a5d4a'}
        />
        <KpiCard
          label="Custo final projectado"
          value={fmt(totais.eacTotal)}
          sub={totais.desvioProjectado !== 0
            ? `${totais.desvioProjectado > 0 ? '+' : ''}${fmt(totais.desvioProjectado)} desvio`
            : 'no track'}
          trend={totais.desvioProjectado > 0 ? 'up' : totais.desvioProjectado < 0 ? 'down' : 'neutral'}
          color={totais.desvioProjectado > 0 ? '#b88a8a' : undefined}
        />
      </div>

      {/* ── SECTION TABS ── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto',
        borderBottom: '1px solid var(--stone, #e0ddd4)', paddingBottom: '0'
      }}>
        {sections.map(s => {
          const Icon = s.icon
          const active = activeSection === s.id
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: '0.8rem', fontWeight: active ? 700 : 500,
              color: active ? 'var(--verde, #4a5d4a)' : 'var(--brown-light, #8a7e6e)',
              borderBottom: active ? '2px solid var(--verde, #4a5d4a)' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              <Icon size={14} />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* ═══ RESUMO SECTION ═══ */}
      {activeSection === 'resumo' && (
        <div>
          {/* Chapter table */}
          <div style={{
            background: 'var(--cream, #F2F0E7)', borderRadius: '12px',
            border: '1px solid var(--stone, #e0ddd4)', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
              gap: '8px', padding: '10px 16px',
              background: 'rgba(74, 93, 74, 0.06)',
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--brown-light)', letterSpacing: '0.5px'
            }}>
              <span>Capítulo</span>
              <span style={{ textAlign: 'right' }}>Orçamento</span>
              <span style={{ textAlign: 'right' }}>Comprometido</span>
              <span style={{ textAlign: 'right' }}>Facturado</span>
              <span style={{ textAlign: 'right' }}>Pago</span>
              <span style={{ textAlign: 'center' }}>Estado</span>
            </div>

            {/* Rows */}
            {capitulos.map(cap => (
              <div key={cap.capitulo}>
                <div
                  onClick={() => toggleCap(cap.capitulo)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                    gap: '8px', padding: '10px 16px',
                    cursor: 'pointer', fontSize: '0.85rem',
                    borderTop: '1px solid rgba(150,150,150,0.1)',
                    transition: 'background 0.15s',
                    background: expandedCaps[cap.capitulo] ? 'rgba(74, 93, 74, 0.03)' : 'transparent'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(74, 93, 74, 0.03)'}
                  onMouseLeave={e => { if (!expandedCaps[cap.capitulo]) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    {expandedCaps[cap.capitulo] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {cap.capitulo}
                  </span>
                  <span style={{ textAlign: 'right' }}>{fmtFull(cap.orcamento_cliente)}</span>
                  <span style={{ textAlign: 'right' }}>
                    {fmtFull(cap.comprometido)}
                    <div style={{ marginTop: '2px' }}>
                      <ProgressBar
                        value={cap.comprometido}
                        max={cap.orcamento_custo}
                        height={4}
                      />
                    </div>
                  </span>
                  <span style={{ textAlign: 'right' }}>{fmtFull(cap.facturado)}</span>
                  <span style={{ textAlign: 'right' }}>{fmtFull(cap.pago)}</span>
                  <span style={{ textAlign: 'center' }}>
                    <HealthBadge status={cap.estado_health} />
                  </span>
                </div>

                {/* Drill-down */}
                {expandedCaps[cap.capitulo] && (
                  <div style={{ padding: '0 16px 12px 40px' }}>
                    <CapituloDrillDown cap={cap} />
                  </div>
                )}
              </div>
            ))}

            {/* Extras row */}
            {extras.filter(e => e.estado === 'aprovado').length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                gap: '8px', padding: '10px 16px',
                borderTop: '1px solid rgba(150,150,150,0.15)',
                fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--brown-light)'
              }}>
                <span style={{ fontWeight: 600 }}>Extras aprovados</span>
                <span style={{ textAlign: 'right' }}>+{fmtFull(totais.extrasAprovados)}</span>
                <span style={{ textAlign: 'right' }}>—</span>
                <span style={{ textAlign: 'right' }}>—</span>
                <span style={{ textAlign: 'right' }}>—</span>
                <span />
              </div>
            )}

            {/* Totals row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
              gap: '8px', padding: '12px 16px',
              borderTop: '2px solid var(--stone, #e0ddd4)',
              fontSize: '0.9rem', fontWeight: 700, background: 'rgba(74, 93, 74, 0.04)'
            }}>
              <span>TOTAL</span>
              <span style={{ textAlign: 'right' }}>{fmtFull(totais.orcamentoRevisto)}</span>
              <span style={{ textAlign: 'right' }}>{fmtFull(totais.comprometido)}</span>
              <span style={{ textAlign: 'right' }}>{fmtFull(totais.facturado)}</span>
              <span style={{ textAlign: 'right' }}>{fmtFull(totais.pago)}</span>
              <span />
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.7rem', color: 'var(--brown-light)', flexWrap: 'wrap' }}>
            <span><CheckCircle2 size={10} style={{ color: '#4a5d4a' }} /> OK (&lt;85%)</span>
            <span><AlertTriangle size={10} style={{ color: '#c9a882' }} /> Atenção (85–95%)</span>
            <span><ShieldAlert size={10} style={{ color: '#b88a8a' }} /> Crítico (&gt;95%)</span>
            <span><CircleDot size={10} style={{ color: '#999' }} /> Não iniciado</span>
          </div>

          {/* ── Projection summary ── */}
          <div style={{
            marginTop: '20px', background: 'var(--cream, #F2F0E7)', borderRadius: '12px',
            border: '1px solid var(--stone)', padding: '16px 20px'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontFamily: 'Cormorant Garamond, serif', color: 'var(--brown)' }}>
              <TrendingUp size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Projecção Financeira
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Orçamento custo (revisto)</div>
                <div style={{ fontWeight: 600 }}>{fmtFull(totais.orcCustoTotal)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Comprometido (POs)</div>
                <div style={{ fontWeight: 600 }}>{fmtFull(totais.comprometido)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Estimativa restante (ETC)</div>
                <div style={{ fontWeight: 600 }}>{fmtFull(totais.etcTotal)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Custo final projectado (EAC)</div>
                <div style={{ fontWeight: 700, color: totais.desvioProjectado > 0 ? '#b88a8a' : '#4a5d4a' }}>
                  {fmtFull(totais.eacTotal)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Desvio projectado</div>
                <div style={{ fontWeight: 600, color: totais.desvioProjectado > 0 ? '#b88a8a' : '#4a5d4a' }}>
                  {totais.desvioProjectado > 0 ? '+' : ''}{fmtFull(totais.desvioProjectado)}
                  {totais.orcCustoTotal > 0 && ` (${totais.desvioProjectado > 0 ? '+' : ''}${(totais.desvioProjectado / totais.orcCustoTotal * 100).toFixed(1)}%)`}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--brown-light)', fontSize: '0.75rem' }}>Margem projectada</div>
                <div style={{ fontWeight: 700, color: totais.margemProjectada < 15 ? '#b88a8a' : totais.margemProjectada < 20 ? '#c9a882' : '#4a5d4a' }}>
                  {fmtPct(totais.margemProjectada)}
                  {totais.margemProjectada < totais.margemPctGlobal &&
                    <span style={{ fontSize: '0.75rem', marginLeft: '6px' }}>
                      (era {fmtPct(totais.margemPctGlobal)})
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALERTAS SECTION ═══ */}
      {activeSection === 'alertas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alertas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
              <CheckCircle2 size={36} style={{ marginBottom: '8px', color: '#4a5d4a' }} />
              <p>Sem alertas activos — tudo no track!</p>
            </div>
          )}
          {alertas.map((a, i) => (
            <div key={a.id || i} style={{
              background: 'var(--cream)', borderRadius: '10px',
              border: '1px solid var(--stone)', padding: '12px 16px',
              borderLeft: `4px solid ${gravConfig[a.gravidade]?.bg || '#ccc'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <GravBadge gravidade={a.gravidade} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.titulo}</span>
                  </div>
                  {a.descricao && (
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: 'var(--brown-light)' }}>
                      {a.descricao}
                    </p>
                  )}
                  {a.analise_ia && (
                    <div style={{
                      marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(74, 93, 74, 0.04)', fontSize: '0.8rem',
                      color: 'var(--brown)', lineHeight: 1.5
                    }}>
                      <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {a.analise_ia}
                    </div>
                  )}
                </div>
                {a.id && (
                  <button onClick={() => dismissAlerta(a.id)} style={{
                    padding: '4px', background: 'transparent', border: 'none',
                    cursor: 'pointer', color: 'var(--brown-light)'
                  }} title="Marcar como visto">
                    <EyeOff size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ EXTRAS SECTION ═══ */}
      {activeSection === 'extras' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Cormorant Garamond, serif' }}>
              Extras &middot; {projeto?.codigo}
            </h3>
            <button onClick={() => setShowExtraModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'var(--verde, #4a5d4a)', color: '#fff', fontSize: '0.8rem', fontWeight: 600
            }}>
              <Plus size={14} /> Novo extra
            </button>
          </div>

          {/* Pending */}
          {extras.filter(e => e.estado === 'pendente').length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#c9a882', marginBottom: '6px', letterSpacing: '0.5px' }}>
                Pendentes ({extras.filter(e => e.estado === 'pendente').length})
              </div>
              {extras.filter(e => e.estado === 'pendente').map(ext => (
                <div key={ext.id} style={{
                  background: 'var(--cream)', borderRadius: '10px', padding: '12px 16px',
                  border: '1px solid var(--stone)', marginBottom: '6px',
                  borderLeft: '4px solid #c9a882'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {ext.codigo} &middot; {ext.titulo}
                      </div>
                      {ext.descricao && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--brown-light)' }}>{ext.descricao}</p>}
                      <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', marginTop: '4px' }}>
                        Custo: {fmtFull(ext.custo_gavinho)} &middot; Preço cliente: {fmtFull(ext.preco_cliente)} ({ext.margem_percentagem}%)
                        {ext.capitulo && <> &middot; Cap: {ext.capitulo}</>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => updateExtra(ext.id, { estado: 'aprovado', aprovado_em: new Date().toISOString(), aprovado_por: 'cliente' })} style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid #4a5d4a',
                        background: 'transparent', color: '#4a5d4a', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600
                      }}>
                        Aprovar
                      </button>
                      <button onClick={() => updateExtra(ext.id, { estado: 'rejeitado' })} style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid #b88a8a',
                        background: 'transparent', color: '#b88a8a', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600
                      }}>
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved */}
          {extras.filter(e => e.estado === 'aprovado').length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#4a5d4a', marginBottom: '6px', letterSpacing: '0.5px' }}>
                Aprovados ({extras.filter(e => e.estado === 'aprovado').length}) &middot; Total: {fmtFull(totais.extrasAprovados)}
              </div>
              {extras.filter(e => e.estado === 'aprovado').map(ext => (
                <div key={ext.id} style={{
                  background: 'var(--cream)', borderRadius: '10px', padding: '10px 16px',
                  border: '1px solid var(--stone)', marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{ext.codigo} &middot; {ext.titulo}</span>
                    <span style={{ fontWeight: 700, color: '#4a5d4a' }}>+{fmtFull(ext.preco_cliente)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary card */}
          <div style={{
            background: 'rgba(74, 93, 74, 0.04)', borderRadius: '10px', padding: '14px 18px',
            border: '1px solid var(--stone)', fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '0.8rem' }}>Resumo de Extras</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              <span style={{ color: 'var(--brown-light)' }}>Aprovados:</span>
              <span style={{ fontWeight: 600 }}>
                {fmtFull(totais.extrasAprovados)} ({extras.filter(e => e.estado === 'aprovado').length})
              </span>
              <span style={{ color: 'var(--brown-light)' }}>Margem nos extras:</span>
              <span style={{ fontWeight: 600 }}>
                {fmtFull(extras.filter(e => e.estado === 'aprovado').reduce((s, e) => s + (e.preco_cliente - e.custo_gavinho), 0))}
              </span>
              <span style={{ color: 'var(--brown-light)' }}>Pendentes:</span>
              <span style={{ fontWeight: 600 }}>
                {fmtFull(extras.filter(e => e.estado === 'pendente').reduce((s, e) => s + e.preco_cliente, 0))} ({extras.filter(e => e.estado === 'pendente').length})
              </span>
              <span style={{ color: 'var(--brown-light)' }}>Absorvidos GAVINHO:</span>
              <span style={{ fontWeight: 600 }}>
                {fmtFull(extras.filter(e => e.estado === 'absorvido').reduce((s, e) => s + e.custo_gavinho, 0))} ({extras.filter(e => e.estado === 'absorvido').length})
              </span>
            </div>
          </div>

          {extras.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
              <FileText size={36} style={{ marginBottom: '8px' }} />
              <p>Nenhum extra registado neste projecto</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ CASH FLOW SECTION ═══ */}
      {activeSection === 'cashflow' && (
        <div>
          {/* Enhanced Cash Flow Chart */}
          <CashFlowChart
            capitulos={capitulos}
            extras={extras}
            facturacaoCliente={facturacaoCliente}
            totais={totais}
          />

          {/* Upcoming payments */}
          <h3 style={{ margin: '24px 0 12px', fontSize: '0.95rem', fontFamily: 'Cormorant Garamond, serif' }}>
            <CreditCard size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Próximos Pagamentos Previstos
          </h3>

          {/* Facturas pending payment */}
          {(() => {
            const pendentes = (facturacaoCliente || []).filter(f => f.estado !== 'paga')
            return pendentes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {pendentes.map(f => (
                  <div key={f.id} style={{
                    background: 'var(--cream)', borderRadius: '10px', padding: '10px 16px',
                    border: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', fontSize: '0.85rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.descricao}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)' }}>
                        {f.estado === 'em_atraso' && <span style={{ color: '#b88a8a' }}>Em atraso &middot; </span>}
                        Previsto: {fmtDate(f.data_prevista)}
                        {f.data_vencimento && <> &middot; Vencimento: {fmtDate(f.data_vencimento)}</>}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{fmtFull(f.valor)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--brown-light)', marginBottom: '20px', fontSize: '0.85rem' }}>
                Nenhum milestone de facturação registado.
              </div>
            )
          })()}

          {/* Client billing milestones */}
          <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontFamily: 'Cormorant Garamond, serif' }}>
            <Wallet size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Recebimentos do Cliente
          </h3>
          {facturacaoCliente.length > 0 ? (
            <div style={{
              background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--stone)', overflow: 'hidden'
            }}>
              {facturacaoCliente.map((fc, i) => (
                <div key={fc.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 16px', fontSize: '0.85rem',
                  borderTop: i > 0 ? '1px solid rgba(150,150,150,0.1)' : 'none'
                }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: fc.estado === 'paga' ? '#4a5d4a' : fc.estado === 'facturada' ? '#c9a882' : '#ddd',
                    flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{fc.descricao}</span>
                  {fc.percentagem_contrato && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--brown-light)' }}>{fc.percentagem_contrato}%</span>
                  )}
                  <span style={{ fontWeight: 700 }}>{fmtFull(fc.valor)}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600,
                    background: fc.estado === 'paga' ? 'rgba(74,93,74,0.1)' : fc.estado === 'facturada' ? 'rgba(201,168,130,0.15)' : 'rgba(150,150,150,0.08)',
                    color: fc.estado === 'paga' ? '#4a5d4a' : fc.estado === 'facturada' ? '#c9a882' : '#999'
                  }}>
                    {fc.estado}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brown-light)', minWidth: '60px', textAlign: 'right' }}>
                    {fmtDate(fc.data_prevista)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--brown-light)', fontSize: '0.85rem' }}>
              Adicione milestones de facturação ao cliente para acompanhar recebimentos.
            </div>
          )}
        </div>
      )}

      {/* ═══ SIMULADOR CENÁRIOS ═══ */}
      {activeSection === 'simulador' && (
        <SimuladorCenarios
          capitulos={capitulos}
          totais={totais}
          orcamentoRevisto={totais.orcamentoRevisto}
        />
      )}

      {/* ═══ NOVO EXTRA MODAL ═══ */}
      {showExtraModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setShowExtraModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px', width: '440px',
            maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>Novo Extra</h3>
              <button onClick={() => setShowExtraModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Título *</label>
                <input value={extraForm.titulo} onChange={e => setExtraForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Ponto de água adicional na varanda"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Descrição</label>
                <textarea value={extraForm.descricao} onChange={e => setExtraForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Capítulo afectado</label>
                <select value={extraForm.capitulo} onChange={e => setExtraForm(p => ({ ...p, capitulo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
                >
                  <option value="">— Seleccionar —</option>
                  {capitulos.map(c => <option key={c.capitulo} value={c.capitulo}>{c.capitulo}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Custo GAVINHO *</label>
                  <input type="number" value={extraForm.custo_gavinho}
                    onChange={e => {
                      const custo = parseFloat(e.target.value) || 0
                      const margem = parseFloat(extraForm.margem_percentagem) || 25
                      setExtraForm(p => ({ ...p, custo_gavinho: e.target.value, preco_cliente: (custo / (1 - margem / 100)).toFixed(2) }))
                    }}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Margem %</label>
                  <input type="number" value={extraForm.margem_percentagem}
                    onChange={e => {
                      const margem = parseFloat(e.target.value) || 0
                      const custo = parseFloat(extraForm.custo_gavinho) || 0
                      setExtraForm(p => ({ ...p, margem_percentagem: e.target.value, preco_cliente: (custo / (1 - margem / 100)).toFixed(2) }))
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-light)' }}>Preço cliente</label>
                  <input type="number" value={extraForm.preco_cliente}
                    onChange={e => setExtraForm(p => ({ ...p, preco_cliente: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '0.85rem', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowExtraModal(false)} style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--stone)',
                background: 'transparent', cursor: 'pointer', fontSize: '0.85rem'
              }}>
                Cancelar
              </button>
              <button onClick={handleSaveExtra} disabled={!extraForm.titulo || !extraForm.custo_gavinho}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: !extraForm.titulo || !extraForm.custo_gavinho ? '#ccc' : 'var(--verde, #4a5d4a)',
                  color: '#fff', cursor: !extraForm.titulo || !extraForm.custo_gavinho ? 'default' : 'pointer',
                  fontSize: '0.85rem', fontWeight: 600
                }}>
                Criar Extra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
