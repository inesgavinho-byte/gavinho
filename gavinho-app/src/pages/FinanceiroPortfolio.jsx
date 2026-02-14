import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, BarChart3,
  ChevronRight, Building2, Search, SlidersHorizontal
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`

export default function FinanceiroPortfolio() {
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('margem') // margem, comprometido, desvio
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchPortfolioData()
  }, [])

  const fetchPortfolioData = async () => {
    try {
      // Fetch all projects with their orcamentos
      const { data: projetosData, error: projError } = await supabase
        .from('projetos')
        .select('id, nome, codigo, status, fase, tipologia')
        .in('status', ['ativo', 'em_curso', 'em_progresso', 'active'])
        .order('nome')

      if (projError) throw projError

      // For each project, fetch financial data
      const enriched = await Promise.all((projetosData || []).map(async (proj) => {
        // Fetch orcamentos
        const { data: orcamentos } = await supabase
          .from('orcamentos')
          .select('id, valor_total, margem_global')
          .eq('projeto_id', proj.id)
          .eq('is_active', true)
          .limit(1)
          .single()

        // Fetch POs
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('valor_total, estado')
          .eq('projeto_id', proj.id)
          .in('estado', ['aprovada', 'paga', 'parcial'])

        // Fetch facturas
        const { data: facturas } = await supabase
          .from('procurement_facturas')
          .select('valor_total, estado')
          .eq('projeto_id', proj.id)
          .in('estado', ['validada', 'paga'])

        // Fetch active alerts
        const { data: alertas } = await supabase
          .from('alertas_financeiros')
          .select('gravidade')
          .eq('projeto_id', proj.id)
          .eq('estado', 'activo')

        const orcamentoRevisto = orcamentos?.valor_total || 0
        const margemGlobal = orcamentos?.margem_global || 25
        const orcCusto = orcamentoRevisto * (1 - margemGlobal / 100)
        const comprometido = (pos || []).reduce((s, p) => s + (p.valor_total || 0), 0)
        const facturado = (facturas || []).reduce((s, f) => s + (f.valor_total || 0), 0)
        const margemActual = orcamentoRevisto > 0 ? ((orcamentoRevisto - comprometido) / orcamentoRevisto) * 100 : 0
        const desvio = orcCusto > 0 ? ((comprometido - orcCusto) / orcCusto) * 100 : 0
        const alertasUrgentes = (alertas || []).filter(a => a.gravidade === 'urgente').length
        const alertasCriticos = (alertas || []).filter(a => a.gravidade === 'critico').length

        return {
          ...proj,
          orcamentoRevisto,
          orcCusto,
          comprometido,
          facturado,
          margemActual,
          desvio,
          alertasUrgentes,
          alertasCriticos,
          alertasTotal: (alertas || []).length,
          risco: alertasUrgentes > 0 ? 'alto' : alertasCriticos > 0 ? 'medio' : desvio > 5 ? 'medio' : 'baixo'
        }
      }))

      setProjetos(enriched.filter(p => p.orcamentoRevisto > 0))
    } catch (err) {
      console.error('Erro ao carregar portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let list = projetos
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(p => p.nome.toLowerCase().includes(term) || p.codigo?.toLowerCase().includes(term))
    }
    if (filterStatus !== 'all') {
      list = list.filter(p => p.risco === filterStatus)
    }

    list.sort((a, b) => {
      if (sortBy === 'margem') return a.margemActual - b.margemActual
      if (sortBy === 'comprometido') return b.comprometido - a.comprometido
      if (sortBy === 'desvio') return b.desvio - a.desvio
      return 0
    })
    return list
  }, [projetos, searchTerm, filterStatus, sortBy])

  // Portfolio aggregates
  const totals = useMemo(() => {
    const t = projetos.reduce((acc, p) => ({
      orcamento: acc.orcamento + p.orcamentoRevisto,
      comprometido: acc.comprometido + p.comprometido,
      facturado: acc.facturado + p.facturado,
      alertas: acc.alertas + p.alertasTotal
    }), { orcamento: 0, comprometido: 0, facturado: 0, alertas: 0 })
    t.margem = t.orcamento > 0 ? ((t.orcamento - t.comprometido) / t.orcamento) * 100 : 0
    return t
  }, [projetos])

  const getRiscoColor = (risco) => {
    if (risco === 'alto') return '#c44'
    if (risco === 'medio') return '#c9a882'
    return '#4a5d4a'
  }

  const getRiscoLabel = (risco) => {
    if (risco === 'alto') return 'Alto Risco'
    if (risco === 'medio') return 'Atenção'
    return 'Saudável'
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '48px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--brown-light)' }}>A carregar portfolio financeiro...</p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', border: '1px solid var(--stone)', borderRadius: '8px',
          padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center'
        }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--brown)' }}>
            Portfolio Financeiro
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--brown-light)' }}>
            Visão consolidada de {projetos.length} projetos ativos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Orçamento Total', value: fmt(totals.orcamento), icon: BarChart3, color: '#4a5d4a' },
          { label: 'Comprometido', value: fmt(totals.comprometido), icon: TrendingDown, color: totals.comprometido > totals.orcamento * 0.8 ? '#c44' : '#c9a882' },
          { label: 'Margem Portfolio', value: fmtPct(totals.margem), icon: TrendingUp, color: totals.margem > 15 ? '#4a5d4a' : '#c44' },
          { label: 'Alertas Ativos', value: totals.alertas, icon: AlertTriangle, color: totals.alertas > 5 ? '#c44' : '#c9a882' }
        ].map((kpi, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '12px', padding: '16px',
            border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: `${kpi.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <kpi.icon size={20} style={{ color: kpi.color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--brown-light)', fontWeight: 500 }}>{kpi.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar projetos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px',
              border: '1px solid var(--stone)', fontSize: '0.85rem', boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'alto', label: 'Alto Risco', color: '#c44' },
            { key: 'medio', label: 'Atenção', color: '#c9a882' },
            { key: 'baixo', label: 'Saudável', color: '#4a5d4a' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                border: filterStatus === f.key ? 'none' : '1px solid var(--stone)',
                background: filterStatus === f.key ? (f.color || '#4a5d4a') : 'transparent',
                color: filterStatus === f.key ? '#fff' : 'var(--brown)',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--brown-light)' }}>
          <SlidersHorizontal size={14} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              border: '1px solid var(--stone)', borderRadius: '6px', padding: '4px 8px',
              fontSize: '0.75rem', background: 'transparent'
            }}
          >
            <option value="margem">Margem (menor primeiro)</option>
            <option value="comprometido">Comprometido (maior primeiro)</option>
            <option value="desvio">Desvio (maior primeiro)</option>
          </select>
        </div>
      </div>

      {/* Project Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(proj => {
          const pctUsed = proj.orcamentoRevisto > 0 ? (proj.comprometido / proj.orcamentoRevisto) * 100 : 0
          return (
            <div
              key={proj.id}
              onClick={() => navigate(`/financeiro/projeto/${proj.id}`)}
              style={{
                background: '#fff', borderRadius: '12px', padding: '16px 20px',
                border: `1px solid ${proj.risco === 'alto' ? 'rgba(204,68,68,0.3)' : 'var(--stone)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Building2 size={14} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '0.9rem' }}>{proj.nome}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--brown-light)' }}>{proj.codigo}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 600,
                    background: `${getRiscoColor(proj.risco)}15`,
                    color: getRiscoColor(proj.risco)
                  }}>
                    {getRiscoLabel(proj.risco)}
                  </span>
                  {proj.alertasUrgentes > 0 && (
                    <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 600, background: '#c4415', color: '#c44' }}>
                      {proj.alertasUrgentes} urgente{proj.alertasUrgentes > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Budget bar */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{
                    height: '6px', background: 'var(--cream)', borderRadius: '3px',
                    overflow: 'hidden', position: 'relative'
                  }}>
                    <div style={{
                      width: `${Math.min(pctUsed, 100)}%`, height: '100%', borderRadius: '3px',
                      background: pctUsed > 95 ? '#c44' : pctUsed > 80 ? '#c9a882' : '#4a5d4a',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'var(--brown-light)' }}>
                  <span>Orç: <strong style={{ color: 'var(--brown)' }}>{fmt(proj.orcamentoRevisto)}</strong></span>
                  <span>Compr: <strong style={{ color: 'var(--brown)' }}>{fmt(proj.comprometido)}</strong> ({fmtPct(pctUsed)})</span>
                  <span>Margem: <strong style={{ color: proj.margemActual < 10 ? '#c44' : '#4a5d4a' }}>{fmtPct(proj.margemActual)}</strong></span>
                  {proj.desvio > 0 && (
                    <span>Desvio: <strong style={{ color: '#c44' }}>+{fmtPct(proj.desvio)}</strong></span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--brown-light)' }} />
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--brown-light)' }}>
            <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Nenhum projeto encontrado com os filtros selecionados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
