// =====================================================
// CASH FLOW TIMELINE CHART
// Pure CSS/SVG cash flow visualization:
// monthly bars (income/expenses), cumulative line,
// summary cards, and monthly breakdown table
// =====================================================

import { useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Clock, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Minus, BarChart3, Info
} from 'lucide-react'

// ── Brand ────────────────────────────────────────────
const VERDE = '#4a5d4a'
const BEIGE = '#ADAA96'
const CREAM = '#F2F0E7'
const GOLD = '#c9a882'
const RED = '#b88a8a'
const STONE_BORDER = '#e0ddd4'
const BROWN = '#5a4a3a'
const BROWN_LIGHT = '#8a7e6e'

// ── Formatters ───────────────────────────────────────
const fmt = (v) => {
  if (v == null) return '€0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1000000) return `${sign}€${(abs / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}€${(abs / 1000).toFixed(1)}K`
  return `${sign}€${abs.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const fmtFull = (v) =>
  v != null
    ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '€0,00'

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES_PT[parseInt(month, 10) - 1]} ${year.slice(2)}`
}

// ── Styles ───────────────────────────────────────────
const styles = {
  container: {
    background: CREAM,
    borderRadius: '12px',
    border: `1px solid ${STONE_BORDER}`,
    padding: '24px',
  },
  title: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: BROWN,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: BROWN_LIGHT,
    marginTop: '4px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginTop: '20px',
  },
  kpiCard: (accentColor) => ({
    background: '#fff',
    borderRadius: '10px',
    padding: '14px 18px',
    border: `1px solid ${STONE_BORDER}`,
    borderLeft: `3px solid ${accentColor}`,
  }),
  kpiLabel: {
    fontSize: '0.7rem',
    color: BROWN_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  kpiValue: (color) => ({
    fontSize: '1.35rem',
    fontWeight: 700,
    fontFamily: 'Cormorant Garamond, serif',
    color: color || BROWN,
  }),
  kpiSub: {
    fontSize: '0.72rem',
    color: BROWN_LIGHT,
    marginTop: '2px',
  },
  chartSection: {
    marginTop: '24px',
  },
  sectionLabel: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '1rem',
    fontWeight: 600,
    color: BROWN,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chartContainer: {
    background: '#fff',
    borderRadius: '10px',
    border: `1px solid ${STONE_BORDER}`,
    padding: '20px',
    overflowX: 'auto',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  legendItem: (color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: BROWN_LIGHT,
  }),
  legendDot: (color) => ({
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    background: color,
    flexShrink: 0,
  }),
  barsWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    minHeight: '200px',
    position: 'relative',
    paddingBottom: '28px',
    paddingTop: '20px',
  },
  monthGroup: {
    flex: '1 1 0',
    minWidth: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  barStack: {
    display: 'flex',
    gap: '3px',
    alignItems: 'flex-end',
    width: '100%',
    justifyContent: 'center',
    minHeight: '160px',
  },
  bar: (color, heightPct) => ({
    width: '20px',
    height: `${Math.max(heightPct, 2)}%`,
    minHeight: heightPct > 0 ? '4px' : '0px',
    background: color,
    borderRadius: '3px 3px 0 0',
    position: 'relative',
    transition: 'height 0.3s ease',
  }),
  barLabel: {
    fontSize: '0.6rem',
    color: BROWN_LIGHT,
    position: 'absolute',
    top: '-16px',
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
  },
  monthLabel: {
    fontSize: '0.7rem',
    color: BROWN_LIGHT,
    marginTop: '8px',
    textAlign: 'center',
  },
  // Cumulative line dot
  cumulativeDot: (bottomPct, color) => ({
    position: 'absolute',
    bottom: `calc(28px + ${bottomPct}%)`,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    border: '2px solid #fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    zIndex: 2,
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '24px',
    fontSize: '0.8rem',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: `2px solid ${STONE_BORDER}`,
    color: BROWN_LIGHT,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  td: {
    padding: '8px 12px',
    borderBottom: `1px solid ${STONE_BORDER}`,
    color: BROWN,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 20px',
    color: BROWN_LIGHT,
  },
}

// ── Component ────────────────────────────────────────
export function CashFlowChart({
  capitulos = [],
  extras = [],
  facturacaoCliente = [],
  totais = {},
}) {
  // ── Aggregate data by month ────────────────────────
  const { months, summary, hasData } = useMemo(() => {
    const monthMap = {}

    // Income from facturacaoCliente
    let totalRecebido = 0
    let totalPendente = 0

    facturacaoCliente.forEach((item) => {
      const date = item.data_prevista
      if (!date) return
      const key = monthKey(date)
      if (!monthMap[key]) monthMap[key] = { recebido: 0, pendente: 0, gasto: 0 }

      const valor = Number(item.valor) || 0
      if (item.estado === 'pago' || item.estado === 'paga') {
        monthMap[key].recebido += valor
        totalRecebido += valor
      } else {
        monthMap[key].pendente += valor
        totalPendente += valor
      }
    })

    // Expenses from comprometido per chapter (distributed evenly if no date info)
    // Use totais.comprometido as total expense reference
    const totalComprometido = totais.comprometido ?? 0

    // If we have months from billing, distribute expenses across them
    // Otherwise create current month entry
    const monthKeys = Object.keys(monthMap)

    if (monthKeys.length === 0 && totalComprometido === 0) {
      return {
        months: [],
        summary: { totalRecebido: 0, totalPendente: 0, totalComprometido: 0, saldoProjectado: 0 },
        hasData: false,
      }
    }

    // Ensure we have at least a few months span
    if (monthKeys.length === 0) {
      const now = new Date()
      const key = monthKey(now)
      monthMap[key] = { recebido: 0, pendente: 0, gasto: totalComprometido }
    } else if (totalComprometido > 0) {
      // Distribute expenses across existing months proportionally by count
      const perMonth = totalComprometido / monthKeys.length
      monthKeys.forEach((key) => {
        monthMap[key].gasto += perMonth
      })
    }

    // Sort months chronologically
    const sortedKeys = Object.keys(monthMap).sort()

    // Build month entries with cumulative balance
    let cumulative = 0
    const monthEntries = sortedKeys.map((key) => {
      const m = monthMap[key]
      const income = m.recebido + m.pendente
      const saldo = m.recebido - m.gasto
      cumulative += saldo
      return {
        key,
        label: monthLabel(key),
        recebido: m.recebido,
        pendente: m.pendente,
        gasto: m.gasto,
        saldo,
        cumulative,
      }
    })

    const saldoProjectado = (totalRecebido + totalPendente) - totalComprometido

    return {
      months: monthEntries,
      summary: { totalRecebido, totalPendente, totalComprometido, saldoProjectado },
      hasData: true,
    }
  }, [facturacaoCliente, totais, capitulos, extras])

  // ── Empty state ────────────────────────────────────
  if (!hasData) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>
          <BarChart3 size={20} color={VERDE} />
          Cash Flow
        </h3>
        <div style={styles.emptyState}>
          <Info size={36} color={BEIGE} style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '0.95rem', marginBottom: '4px', color: BROWN }}>
            Sem dados de cash flow
          </p>
          <p style={{ fontSize: '0.82rem' }}>
            Adicione milestones de facturação para visualizar o cash flow.
          </p>
        </div>
      </div>
    )
  }

  // ── Chart scaling ──────────────────────────────────
  const maxValue = Math.max(
    ...months.map((m) => Math.max(m.recebido, m.pendente, m.gasto, 1)),
    1
  )
  const maxCumAbs = Math.max(
    ...months.map((m) => Math.abs(m.cumulative)),
    1
  )

  function barHeight(value) {
    return maxValue > 0 ? (value / maxValue) * 100 : 0
  }

  function cumulativePosition(value) {
    // Map cumulative to 0-100% range (50% = 0 line)
    return 50 + (value / maxCumAbs) * 45
  }

  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────── */}
      <h3 style={styles.title}>
        <BarChart3 size={20} color={VERDE} />
        Cash Flow
      </h3>
      <p style={styles.subtitle}>
        Visualização de entradas e saídas por mês.
      </p>

      {/* ── Summary KPIs ──────────────────────────── */}
      <div style={styles.summaryGrid}>
        <div style={styles.kpiCard(VERDE)}>
          <div style={styles.kpiLabel}>Total Recebido</div>
          <div style={styles.kpiValue(VERDE)}>
            {fmt(summary.totalRecebido)}
          </div>
          <div style={styles.kpiSub}>
            <CheckCircle2 size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            Facturação paga
          </div>
        </div>

        <div style={styles.kpiCard(GOLD)}>
          <div style={styles.kpiLabel}>Total Pendente</div>
          <div style={styles.kpiValue(GOLD)}>
            {fmt(summary.totalPendente)}
          </div>
          <div style={styles.kpiSub}>
            <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            Por receber
          </div>
        </div>

        <div style={styles.kpiCard(RED)}>
          <div style={styles.kpiLabel}>Total Comprometido</div>
          <div style={styles.kpiValue(RED)}>
            {fmt(summary.totalComprometido)}
          </div>
          <div style={styles.kpiSub}>
            <Receipt size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            Despesas
          </div>
        </div>

        <div style={styles.kpiCard(summary.saldoProjectado >= 0 ? VERDE : RED)}>
          <div style={styles.kpiLabel}>Saldo Projectado</div>
          <div style={styles.kpiValue(summary.saldoProjectado >= 0 ? VERDE : RED)}>
            {fmt(summary.saldoProjectado)}
          </div>
          <div style={styles.kpiSub}>
            {summary.saldoProjectado >= 0
              ? <TrendingUp size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
              : <TrendingDown size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            }
            Receita - Despesa
          </div>
        </div>
      </div>

      {/* ── Bar Chart ─────────────────────────────── */}
      <div style={styles.chartSection}>
        <div style={styles.sectionLabel}>
          <BarChart3 size={16} color={VERDE} />
          Timeline Mensal
        </div>

        <div style={styles.chartContainer}>
          {/* Legend */}
          <div style={styles.legend}>
            <div style={styles.legendItem(VERDE)}>
              <span style={styles.legendDot(VERDE)} />
              Recebido
            </div>
            <div style={styles.legendItem(GOLD)}>
              <span style={styles.legendDot(GOLD)} />
              Pendente
            </div>
            <div style={styles.legendItem(RED)}>
              <span style={styles.legendDot(RED)} />
              Despesas
            </div>
            <div style={styles.legendItem(BROWN)}>
              <span style={{ ...styles.legendDot(BROWN), borderRadius: '50%' }} />
              Saldo acumulado
            </div>
          </div>

          {/* Bars */}
          <div style={styles.barsWrapper}>
            {/* Zero line */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '28px',
              height: '1px',
              background: STONE_BORDER,
              zIndex: 0,
            }} />

            {months.map((m, i) => (
              <div key={m.key} style={styles.monthGroup}>
                {/* Cumulative dot */}
                <div
                  style={styles.cumulativeDot(
                    cumulativePosition(m.cumulative),
                    m.cumulative >= 0 ? VERDE : RED
                  )}
                  title={`Acumulado: ${fmt(m.cumulative)}`}
                />

                {/* Connecting line to next dot */}
                {i < months.length - 1 && (
                  <svg
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '28px',
                      width: '100%',
                      height: '160px',
                      overflow: 'visible',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  >
                    <line
                      x1="0"
                      y1={`${160 - (cumulativePosition(m.cumulative) / 100) * 160}`}
                      x2="100%"
                      y2={`${160 - (cumulativePosition(months[i + 1].cumulative) / 100) * 160}`}
                      stroke={BEIGE}
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />
                  </svg>
                )}

                {/* Bar stack */}
                <div style={styles.barStack}>
                  {/* Recebido bar */}
                  {m.recebido > 0 && (
                    <div
                      style={styles.bar(VERDE, barHeight(m.recebido))}
                      title={`Recebido: ${fmt(m.recebido)}`}
                    >
                      {barHeight(m.recebido) > 20 && (
                        <span style={styles.barLabel}>{fmt(m.recebido)}</span>
                      )}
                    </div>
                  )}

                  {/* Pendente bar */}
                  {m.pendente > 0 && (
                    <div
                      style={styles.bar(GOLD, barHeight(m.pendente))}
                      title={`Pendente: ${fmt(m.pendente)}`}
                    >
                      {barHeight(m.pendente) > 20 && (
                        <span style={styles.barLabel}>{fmt(m.pendente)}</span>
                      )}
                    </div>
                  )}

                  {/* Gasto bar */}
                  {m.gasto > 0 && (
                    <div
                      style={styles.bar(RED, barHeight(m.gasto))}
                      title={`Gasto: ${fmt(m.gasto)}`}
                    >
                      {barHeight(m.gasto) > 20 && (
                        <span style={styles.barLabel}>{fmt(m.gasto)}</span>
                      )}
                    </div>
                  )}

                  {/* Empty placeholder if no bars */}
                  {m.recebido === 0 && m.pendente === 0 && m.gasto === 0 && (
                    <div style={{ width: '20px', height: '4px', background: 'rgba(150,150,150,0.1)', borderRadius: '2px' }} />
                  )}
                </div>

                {/* Month label */}
                <div style={styles.monthLabel}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Monthly Breakdown Table ───────────────── */}
      <div style={styles.chartSection}>
        <div style={styles.sectionLabel}>
          <Wallet size={16} color={VERDE} />
          Detalhe Mensal
        </div>

        <div style={{ ...styles.chartContainer, padding: '0' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Mês</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Recebido</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Gasto</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Saldo</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{m.label}</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: VERDE }}>
                    {m.recebido > 0 ? fmt(m.recebido) : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: RED }}>
                    {m.gasto > 0 ? fmt(m.gasto) : '—'}
                  </td>
                  <td style={{
                    ...styles.td,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: m.saldo >= 0 ? VERDE : RED,
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      {m.saldo > 0 && <ArrowUpRight size={12} />}
                      {m.saldo < 0 && <ArrowDownRight size={12} />}
                      {m.saldo === 0 && <Minus size={12} color={BROWN_LIGHT} />}
                      {fmt(m.saldo)}
                    </span>
                  </td>
                  <td style={{
                    ...styles.td,
                    textAlign: 'right',
                    color: m.cumulative >= 0 ? VERDE : RED,
                    fontWeight: 600,
                  }}>
                    {fmt(m.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr>
                <td style={{
                  ...styles.td,
                  fontWeight: 700,
                  borderBottom: 'none',
                  borderTop: `2px solid ${STONE_BORDER}`,
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '0.9rem',
                }}>
                  Total
                </td>
                <td style={{
                  ...styles.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: VERDE,
                  borderBottom: 'none',
                  borderTop: `2px solid ${STONE_BORDER}`,
                }}>
                  {fmt(summary.totalRecebido)}
                </td>
                <td style={{
                  ...styles.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: RED,
                  borderBottom: 'none',
                  borderTop: `2px solid ${STONE_BORDER}`,
                }}>
                  {fmt(summary.totalComprometido)}
                </td>
                <td style={{
                  ...styles.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: summary.saldoProjectado >= 0 ? VERDE : RED,
                  borderBottom: 'none',
                  borderTop: `2px solid ${STONE_BORDER}`,
                }}>
                  {fmt(summary.totalRecebido - summary.totalComprometido)}
                </td>
                <td style={{
                  ...styles.td,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: months.length > 0
                    ? (months[months.length - 1].cumulative >= 0 ? VERDE : RED)
                    : BROWN,
                  borderBottom: 'none',
                  borderTop: `2px solid ${STONE_BORDER}`,
                }}>
                  {months.length > 0 ? fmt(months[months.length - 1].cumulative) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CashFlowChart
