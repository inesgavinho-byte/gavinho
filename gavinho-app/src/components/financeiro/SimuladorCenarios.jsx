// =====================================================
// SIMULADOR DE CENÁRIOS FINANCEIROS
// Scenario simulator: per-chapter sliders, real-time
// recalculation, presets (optimista/pessimista/actual)
// =====================================================

import { useState, useMemo, useCallback } from 'react'
import {
  SlidersHorizontal, TrendingUp, TrendingDown,
  RotateCcw, Sun, CloudRain, Target, ArrowUpRight,
  ArrowDownRight, Minus, Info
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

const fmtPct = (v) => (v != null ? `${v.toFixed(1)}%` : '0%')

// ── Slider color by risk level ───────────────────────
function sliderColor(pct) {
  if (pct <= 85) return VERDE
  if (pct <= 100) return GOLD
  return RED
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
  impactBanner: (isPositive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '10px',
    marginTop: '16px',
    fontSize: '1.1rem',
    fontWeight: 700,
    fontFamily: 'Cormorant Garamond, serif',
    color: isPositive ? VERDE : '#b33',
    background: isPositive ? 'rgba(74, 93, 74, 0.1)' : 'rgba(184, 138, 138, 0.15)',
    border: `1px solid ${isPositive ? 'rgba(74, 93, 74, 0.2)' : 'rgba(184, 138, 138, 0.25)'}`,
  }),
  presetsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  presetBtn: (active, accent) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1.5px solid ${active ? accent : STONE_BORDER}`,
    background: active ? `${accent}15` : '#fff',
    color: active ? accent : BROWN_LIGHT,
    transition: 'all 0.2s ease',
  }),
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '20px',
  },
  summaryCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '14px 18px',
    border: `1px solid ${STONE_BORDER}`,
  },
  summaryLabel: {
    fontSize: '0.7rem',
    color: BROWN_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    marginBottom: '2px',
  },
  chapterList: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  chapterCard: {
    background: '#fff',
    borderRadius: '10px',
    border: `1px solid ${STONE_BORDER}`,
    padding: '14px 18px',
  },
  chapterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  chapterName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: BROWN,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chapterBudget: {
    fontSize: '0.75rem',
    color: BROWN_LIGHT,
    marginLeft: '12px',
    whiteSpace: 'nowrap',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sliderTrack: {
    flex: 1,
    position: 'relative',
    height: '6px',
  },
  sliderInput: (color) => ({
    width: '100%',
    height: '6px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: `linear-gradient(to right, ${color} 0%, ${color} var(--slider-pct, 50%), rgba(150,150,150,0.15) var(--slider-pct, 50%), rgba(150,150,150,0.15) 100%)`,
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  }),
  sliderValue: (color) => ({
    fontSize: '0.8rem',
    fontWeight: 700,
    color: color,
    minWidth: '48px',
    textAlign: 'right',
  }),
  chapterImpact: (positive) => ({
    fontSize: '0.72rem',
    color: positive ? VERDE : RED,
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),
  sectionLabel: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '1rem',
    fontWeight: 600,
    color: BROWN,
    marginTop: '24px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
}

// ── Component ────────────────────────────────────────
export function SimuladorCenarios({ capitulos = [], totais = {}, orcamentoRevisto = 0 }) {
  // Current percentages per chapter as default values
  const defaultSliders = useMemo(() => {
    const map = {}
    capitulos.forEach((cap, i) => {
      const pct = cap.percentagem_comprometido ?? 0
      map[i] = Math.round(Math.min(Math.max(pct, 0), 150))
    })
    return map
  }, [capitulos])

  const [sliders, setSliders] = useState(defaultSliders)
  const [activePreset, setActivePreset] = useState('actual')

  // Sync sliders when capitulos change
  const resetToActual = useCallback(() => {
    const map = {}
    capitulos.forEach((cap, i) => {
      map[i] = Math.round(Math.min(Math.max(cap.percentagem_comprometido ?? 0, 0), 150))
    })
    setSliders(map)
    setActivePreset('actual')
  }, [capitulos])

  const applyPreset = useCallback((preset) => {
    const map = {}
    capitulos.forEach((_, i) => {
      if (preset === 'optimista') map[i] = 85
      else if (preset === 'pessimista') map[i] = 110
      else map[i] = Math.round(Math.min(Math.max(capitulos[i].percentagem_comprometido ?? 0, 0), 150))
    })
    setSliders(map)
    setActivePreset(preset)
  }, [capitulos])

  const handleSliderChange = useCallback((idx, value) => {
    setSliders((prev) => ({ ...prev, [idx]: Number(value) }))
    setActivePreset(null)
  }, [])

  // ── Recalculation engine ───────────────────────────
  const simulation = useMemo(() => {
    const chapters = capitulos.map((cap, i) => {
      const pct = sliders[i] ?? cap.percentagem_comprometido ?? 0
      const orcCusto = cap.orcamento_custo ?? 0
      const originalComprometido = cap.comprometido ?? 0
      const newComprometido = orcCusto * (pct / 100)
      const delta = newComprometido - originalComprometido

      return {
        ...cap,
        simPct: pct,
        simComprometido: newComprometido,
        delta,
      }
    })

    const originalComprometidoTotal = totais.comprometido ?? 0
    const orcCustoTotal = totais.orcCustoTotal ?? 0
    const newComprometidoTotal = chapters.reduce((s, c) => s + c.simComprometido, 0)
    const budget = orcamentoRevisto || totais.orcamentoRevisto || 0

    const originalMargem = budget > 0
      ? ((budget - originalComprometidoTotal) / budget) * 100
      : 0
    const newMargem = budget > 0
      ? ((budget - newComprometidoTotal) / budget) * 100
      : 0

    const originalDesvio = totais.desvioProjectado ?? (originalComprometidoTotal - orcCustoTotal)
    const newDesvio = newComprometidoTotal - orcCustoTotal

    const margemDelta = (budget - newComprometidoTotal) - (budget - originalComprometidoTotal)

    return {
      chapters,
      originalComprometidoTotal,
      newComprometidoTotal,
      originalMargem,
      newMargem,
      originalDesvio,
      newDesvio,
      margemDelta,
      budget,
    }
  }, [capitulos, sliders, totais, orcamentoRevisto])

  const isPositiveImpact = simulation.margemDelta >= 0

  if (!capitulos.length) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>
          <SlidersHorizontal size={20} color={VERDE} />
          Simulador de Cenários
        </h3>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: BROWN_LIGHT, fontSize: '0.9rem' }}>
          <Info size={32} color={BEIGE} style={{ marginBottom: '12px' }} />
          <p>Sem capítulos disponíveis para simular.</p>
          <p style={{ fontSize: '0.8rem' }}>Adicione capítulos ao orçamento para usar o simulador.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────── */}
      <h3 style={styles.title}>
        <SlidersHorizontal size={20} color={VERDE} />
        Simulador de Cenários
      </h3>
      <p style={styles.subtitle}>
        Ajuste os percentuais de cada capítulo para simular diferentes cenários de custo.
      </p>

      {/* ── Impact Banner ──────────────────────────── */}
      <div style={styles.impactBanner(isPositiveImpact)}>
        {isPositiveImpact
          ? <TrendingUp size={20} />
          : <TrendingDown size={20} />
        }
        Impacto na margem: {isPositiveImpact ? '+' : ''}{fmt(simulation.margemDelta)}
      </div>

      {/* ── Presets ────────────────────────────────── */}
      <div style={styles.presetsRow}>
        <button
          style={styles.presetBtn(activePreset === 'optimista', VERDE)}
          onClick={() => applyPreset('optimista')}
        >
          <Sun size={14} />
          Optimista (85%)
        </button>
        <button
          style={styles.presetBtn(activePreset === 'actual', GOLD)}
          onClick={() => applyPreset('actual')}
        >
          <Target size={14} />
          Actual
        </button>
        <button
          style={styles.presetBtn(activePreset === 'pessimista', RED)}
          onClick={() => applyPreset('pessimista')}
        >
          <CloudRain size={14} />
          Pessimista (110%)
        </button>
        <button
          style={{ ...styles.presetBtn(false, BROWN_LIGHT), marginLeft: 'auto' }}
          onClick={resetToActual}
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* ── Summary Cards ──────────────────────────── */}
      <div style={styles.summaryGrid}>
        <SummaryCard
          label="Margem"
          original={fmtPct(simulation.originalMargem)}
          simulated={fmtPct(simulation.newMargem)}
          improved={simulation.newMargem >= simulation.originalMargem}
        />
        <SummaryCard
          label="Comprometido"
          original={fmt(simulation.originalComprometidoTotal)}
          simulated={fmt(simulation.newComprometidoTotal)}
          improved={simulation.newComprometidoTotal <= simulation.originalComprometidoTotal}
        />
        <SummaryCard
          label="Desvio"
          original={fmt(simulation.originalDesvio)}
          simulated={fmt(simulation.newDesvio)}
          improved={simulation.newDesvio <= simulation.originalDesvio}
        />
      </div>

      {/* ── Chapter Sliders ────────────────────────── */}
      <div style={styles.sectionLabel}>
        <SlidersHorizontal size={16} color={VERDE} />
        Ajustar por Capítulo
      </div>

      <div style={styles.chapterList}>
        {simulation.chapters.map((cap, i) => {
          const color = sliderColor(cap.simPct)
          const pctStr = `${((cap.simPct / 150) * 100).toFixed(0)}%`

          return (
            <div key={i} style={styles.chapterCard}>
              <div style={styles.chapterHeader}>
                <span style={styles.chapterName}>{cap.capitulo || `Capítulo ${i + 1}`}</span>
                <span style={styles.chapterBudget}>
                  Orçamento: {fmt(cap.orcamento_custo)}
                </span>
              </div>

              <div style={styles.sliderRow}>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={cap.simPct}
                  onChange={(e) => handleSliderChange(i, e.target.value)}
                  style={{
                    ...styles.sliderInput(color),
                    '--slider-pct': pctStr,
                  }}
                />
                <span style={styles.sliderValue(color)}>
                  {cap.simPct}%
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: BROWN_LIGHT }}>
                  Simulado: {fmt(cap.simComprometido)}
                </span>
                {cap.delta !== 0 && (
                  <span style={styles.chapterImpact(cap.delta <= 0)}>
                    {cap.delta <= 0
                      ? <ArrowDownRight size={12} />
                      : <ArrowUpRight size={12} />
                    }
                    {cap.delta > 0 ? '+' : ''}{fmt(cap.delta)}
                  </span>
                )}
                {cap.delta === 0 && (
                  <span style={{ fontSize: '0.72rem', color: BROWN_LIGHT, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Minus size={12} />
                    Sem alteração
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Slider thumb CSS (injected once) ───────── */}
      <style>{`
        .simulador-cenarios input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid ${VERDE};
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .simulador-cenarios input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid ${VERDE};
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  )
}

// ── Summary Card sub-component ───────────────────────
function SummaryCard({ label, original, simulated, improved }) {
  const deltaColor = improved ? VERDE : RED
  const Icon = improved ? ArrowDownRight : ArrowUpRight
  const same = original === simulated

  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryRow}>
        <span style={{ color: BROWN_LIGHT }}>Original</span>
        <span style={{ fontWeight: 600, color: BROWN }}>{original}</span>
      </div>
      <div style={styles.summaryRow}>
        <span style={{ color: BROWN_LIGHT }}>Simulado</span>
        <span style={{
          fontWeight: 700,
          color: same ? BROWN : deltaColor,
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}>
          {!same && <Icon size={12} />}
          {simulated}
        </span>
      </div>
    </div>
  )
}

export default SimuladorCenarios
