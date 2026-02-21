import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  BookOpen, Camera, Users, AlertTriangle, Plus, MapPin,
  Sun, Cloud, CloudRain, Wind, CloudFog
} from 'lucide-react'
import { colors } from '../constants'
import { FONTS, FONT_SIZES } from '../../../styles/designTokens'

// ── Constantes ──────────────────────────────────────
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS_FULL_PT = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']

const WEATHER_MAP = {
  sol: { icon: Sun, label: 'Sol', color: '#f59e0b' },
  nublado: { icon: Cloud, label: 'Nublado', color: '#6b7280' },
  chuva: { icon: CloudRain, label: 'Chuva', color: '#3b82f6' },
  vento: { icon: Wind, label: 'Vento', color: '#8b5cf6' },
  neblina: { icon: CloudFog, label: 'Neblina', color: '#64748b' },
}
const DEFAULT_WEATHER = { icon: Sun, label: 'Sol', color: '#f59e0b' }

const TIPO_LABELS = {
  geral: 'Geral', mao_obra: 'Mão Obra', materiais: 'Materiais',
  equipamentos: 'Equipamentos', ocorrencias: 'Ocorrência',
}
const TIPO_COLORS = {
  geral: { color: '#2C2C2B', bg: 'rgba(44,44,43,0.08)' },
  mao_obra: { color: '#7A8B6E', bg: 'rgba(122,139,110,0.12)' },
  materiais: { color: '#5E7A8B', bg: 'rgba(94,122,139,0.12)' },
  equipamentos: { color: '#C9A86C', bg: 'rgba(201,168,108,0.12)' },
  ocorrencias: { color: '#9A6B5B', bg: 'rgba(154,107,91,0.12)' },
}

function getWeatherInfo(meteo) {
  if (!meteo) return DEFAULT_WEATHER
  const key = typeof meteo === 'string' ? meteo : meteo.condicao || meteo.condição
  return WEATHER_MAP[key] || DEFAULT_WEATHER
}

function formatDatePT(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return WEEKDAYS_FULL_PT[d.getDay()]
}

// ── Estilos ─────────────────────────────────────────
const S = {
  sectionTitle: { margin: '0 0 16px', fontSize: FONT_SIZES.xs, fontWeight: 700, color: '#B0ADA3', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONTS.body },
  card: { background: '#FFFFFF', borderRadius: 10, border: `1px solid ${colors.border}`, padding: 20 },
  kpiValue: { fontSize: 28, fontWeight: 700, color: '#2C2C2B', fontFamily: FONTS.heading },
  kpiLabel: { fontSize: FONT_SIZES.sm, color: '#8B8670', marginTop: 2, fontFamily: FONTS.body },
  muted: { fontSize: FONT_SIZES.xs, color: '#B0ADA3', fontFamily: FONTS.body },
  textSm: { fontSize: FONT_SIZES.sm, color: '#8B8670', fontFamily: FONTS.body },
}

export default function ResumoSubtab({ obraUuid, obra }) {
  const [diarioEntradas, setDiarioEntradas] = useState([])
  const [fotosCount, setFotosCount] = useState(0)
  const [pendentes, setPendentes] = useState([])
  const [ncs, setNcs] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch de dados ──────────────────────────────
  const loadData = useCallback(async () => {
    if (!obraUuid) return
    setLoading(true)
    try {
      const [diarioRes, fotosRes, pendentesRes, ncsRes] = await Promise.all([
        supabase
          .from('obra_diario')
          .select('id, data, tipo, descricao, condicoes_meteorologicas, temperatura_min, temperatura_max, mao_obra_propria, mao_obra_subempreiteiro, notas, created_at')
          .eq('obra_id', obraUuid)
          .order('data', { ascending: false }),
        supabase
          .from('obra_fotografias')
          .select('*', { count: 'exact', head: true })
          .eq('obra_id', obraUuid),
        supabase
          .from('obra_pendentes')
          .select('*')
          .eq('obra_id', obraUuid)
          .neq('estado', 'resolvido')
          .order('data_criacao', { ascending: false }),
        supabase
          .from('nao_conformidades')
          .select('id, titulo, estado, gravidade, data_limite_resolucao')
          .eq('obra_id', obraUuid)
          .in('estado', ['aberta', 'em_resolucao'])
          .order('created_at', { ascending: false }),
      ])

      setDiarioEntradas(diarioRes.data || [])
      setFotosCount(fotosRes.count || 0)
      setPendentes(pendentesRes.data || [])
      setNcs(ncsRes.data || [])
    } catch (err) {
      console.error('ResumoSubtab loadData:', err)
    } finally {
      setLoading(false)
    }
  }, [obraUuid])

  useEffect(() => { loadData() }, [loadData])

  // ── Cálculos ────────────────────────────────────
  const totalWorkerDays = diarioEntradas.reduce((s, d) => s + (d.mao_obra_propria || 0) + (d.mao_obra_subempreiteiro || 0), 0)
  const totalIncidents = diarioEntradas.filter(d => d.tipo === 'ocorrencias').length

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: FONT_SIZES.sm, color: '#B0ADA3', marginBottom: 8, fontFamily: FONTS.body }}>
        Obras <span style={{ margin: '0 5px' }}>&rsaquo;</span> {obra?.codigo || '—'} <span style={{ margin: '0 5px' }}>&rsaquo;</span> <span style={{ color: '#6B6B6B' }}>Resumo</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: FONT_SIZES['3xl'], fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.heading, lineHeight: 1.2 }}>
          {obra?.nome || 'Obra'}
        </h2>
        <div style={{ fontSize: FONT_SIZES.base, color: '#8B8670', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6 }}>
          {obra?.localizacao && <><MapPin size={13} style={{ opacity: 0.5 }} /> {obra.localizacao}</>}
          {obra?.localizacao && obra?.diretor_obra && <span style={{ margin: '0 6px', color: '#D4D0C8' }}>·</span>}
          {obra?.diretor_obra && <>Dir. Obra: {obra.diretor_obra}</>}
        </div>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* ── Coluna principal ──────────────────── */}
        <div style={{ minWidth: 0 }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Entradas Diário', value: diarioEntradas.length, icon: BookOpen, color: '#2C2C2B' },
              { label: 'Fotografias Total', value: fotosCount, icon: Camera, color: '#5E7A8B' },
              { label: 'Homens/Dia Total', value: totalWorkerDays, icon: Users, color: '#7A8B6E' },
              { label: 'Incidentes', value: totalIncidents, icon: AlertTriangle, color: totalIncidents > 0 ? '#9A6B5B' : '#B0ADA3' },
            ].map((kpi, i) => {
              const Icon = kpi.icon
              return (
                <div key={i} style={S.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${kpi.color}0D`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div style={S.kpiValue}>{kpi.value}</div>
                  <div style={S.kpiLabel}>{kpi.label}</div>
                </div>
              )
            })}
          </div>

          {/* Últimas Entradas */}
          <h3 style={{ margin: '0 0 12px', fontSize: FONT_SIZES.md, fontWeight: 700, color: '#2C2C2B', fontFamily: FONTS.body }}>Últimas Entradas</h3>
          {diarioEntradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, ...S.card }}>
              <BookOpen size={40} style={{ color: '#B0ADA3', opacity: 0.4, marginBottom: 12 }} />
              <p style={{ color: '#8B8670', fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem entradas no diário</p>
            </div>
          ) : (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              {diarioEntradas.slice(0, 5).map((d, i) => {
                const weather = getWeatherInfo(d.condicoes_meteorologicas)
                const WeatherIcon = weather.icon
                const wc = (d.mao_obra_propria || 0) + (d.mao_obra_subempreiteiro || 0)
                const tipoStyle = TIPO_COLORS[d.tipo] || TIPO_COLORS.geral
                return (
                  <div key={d.id} style={{ padding: '14px 20px', borderBottom: i < Math.min(diarioEntradas.length, 5) - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: tipoStyle.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: FONT_SIZES.md, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.body }}>{formatDatePT(d.data)}</span>
                        <span style={{ fontSize: FONT_SIZES.xs, color: '#B0ADA3', fontFamily: FONTS.body }}>{getDayOfWeek(d.data)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: FONT_SIZES.sm, color: '#8B8670', fontFamily: FONTS.body }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <WeatherIcon size={12} style={{ color: weather.color }} /> {d.temperatura_max ? `${d.temperatura_max}°C` : weather.label}
                        </span>
                        {wc > 0 && <span>{wc} trabalhadores</span>}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: FONT_SIZES.xs, fontWeight: 600, fontFamily: FONTS.body,
                      color: tipoStyle.color,
                      background: tipoStyle.bg,
                    }}>
                      {TIPO_LABELS[d.tipo] || 'Geral'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* NCs summary */}
          {ncs.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 12px', fontSize: FONT_SIZES.md, fontWeight: 700, color: '#2C2C2B', fontFamily: FONTS.body }}>Não Conformidades</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Abertas', value: ncs.filter(n => n.estado === 'aberta').length, color: '#9A6B5B', bg: 'rgba(154,107,91,0.08)' },
                  { label: 'Em Resolução', value: ncs.filter(n => n.estado === 'em_resolucao').length, color: '#C9A86C', bg: 'rgba(201,168,108,0.10)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: FONTS.heading }}>{s.value}</div>
                    <div style={{ fontSize: FONT_SIZES.xs, color: s.color, marginTop: 2, fontFamily: FONTS.body }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────── */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <WeekSummary diarioEntradas={diarioEntradas} />
          <CalendarCard diarioEntradas={diarioEntradas} />
          <PendentesCard pendentes={pendentes} ncs={ncs} diarioEntradas={diarioEntradas} />
        </div>
      </div>
    </div>
  )
}

// ── Sidebar: Resumo da Semana ───────────────────────
function WeekSummary({ diarioEntradas }) {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const startStr = startOfWeek.toISOString().split('T')[0]
  const endStr = endOfWeek.toISOString().split('T')[0]

  const weekEntries = diarioEntradas.filter(d => d.data >= startStr && d.data <= endStr)
  const weekDays = weekEntries.length
  const weekWorkers = weekEntries.reduce((s, d) => s + (d.mao_obra_propria || 0) + (d.mao_obra_subempreiteiro || 0), 0)
  const avgWorkers = weekEntries.length > 0 ? (weekWorkers / weekEntries.length).toFixed(1) : '0'
  const weekIncidents = weekEntries.filter(d => d.tipo === 'ocorrencias').length

  return (
    <div style={S.card}>
      <h3 style={S.sectionTitle}>Resumo da Semana</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Dias Registados', value: weekDays, suffix: '/5' },
          { label: 'Média em Obra', value: avgWorkers },
          { label: 'H/Dia Total', value: weekWorkers },
          { label: 'Ocorrências', value: weekIncidents, alert: weekIncidents > 0 },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 12px' }}>
            <div style={{ fontSize: FONT_SIZES.xs, fontWeight: 700, color: item.alert ? '#9A6B5B' : '#B0ADA3', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: FONTS.body }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: item.alert ? '#9A6B5B' : '#2C2C2B', fontFamily: FONTS.heading }}>
              {item.value}{item.suffix && <span style={{ fontSize: 16, fontWeight: 400, color: '#B0ADA3' }}>{item.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar: Calendário ─────────────────────────────
function CalendarCard({ diarioEntradas }) {
  const now = new Date()
  const calYear = now.getFullYear()
  const calMonth = now.getMonth()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const today = now.getDate()
  const calStartDay = firstDay === 0 ? 6 : firstDay - 1
  const entryDates = new Set(diarioEntradas.map(d => d.data))

  return (
    <div style={S.card}>
      <h3 style={S.sectionTitle}>{MONTHS_PT[calMonth]} {calYear}</h3>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, color: '#B0ADA3', padding: '4px 0', fontFamily: FONTS.body }}>{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {Array.from({ length: calStartDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntry = entryDates.has(dateStr)
          const isToday = day === today
          return (
            <div key={day} style={{
              position: 'relative', width: 30, height: 34, lineHeight: '28px',
              borderRadius: 6, fontSize: 11, fontWeight: isToday ? 700 : 400, margin: '0 auto',
              background: isToday ? '#2C2C2B' : 'transparent',
              color: isToday ? '#fff' : (hasEntry ? '#2C2C2B' : '#B0ADA3'),
              cursor: hasEntry ? 'pointer' : 'default',
              fontFamily: FONTS.body,
            }}>
              {day}
              {hasEntry && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: isToday ? '#fff' : '#7A8B6E',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sidebar: Pendentes ──────────────────────────────
function PendentesCard({ pendentes, ncs, diarioEntradas }) {
  const openNcs = ncs.filter(n => ['aberta', 'em_resolucao'].includes(n.estado))
  const criticalOcorrencias = diarioEntradas.filter(d => d.tipo === 'ocorrencias')

  const hasPendentes = pendentes.length > 0 || openNcs.length > 0 || criticalOcorrencias.length > 0

  return (
    <div style={S.card}>
      <h3 style={S.sectionTitle}>Pendentes nesta Obra</h3>
      {!hasPendentes ? (
        <p style={{ fontSize: FONT_SIZES.base, color: '#B0ADA3', margin: 0, fontFamily: FONTS.body }}>Sem pendentes activos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Pendentes da tabela obra_pendentes */}
          {pendentes.slice(0, 8).map(p => {
            const dotColor = p.tipo === 'bloqueio' ? '#9A6B5B' : '#C9A86C'
            const typeLabel = p.tipo === 'bloqueio' ? 'Bloqueio' : 'Não Conforme'
            const dataCriacao = p.data_criacao ? new Date(p.data_criacao + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : ''
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.body }}>
                    {typeLabel}{p.especialidade ? ` · ${p.especialidade}` : ''}
                  </div>
                  <div style={{ fontSize: FONT_SIZES.xs, color: '#8B8670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, fontFamily: FONTS.body }}>{p.descricao}</div>
                  {dataCriacao && <div style={{ ...S.muted, marginTop: 2 }}>Desde {dataCriacao}</div>}
                </div>
              </div>
            )
          })}
          {/* NCs abertas */}
          {openNcs.slice(0, 3).map(nc => {
            const isAberta = nc.estado === 'aberta'
            const dotColor = nc.gravidade === 'critica' ? '#9A6B5B' : (isAberta ? '#C9A86C' : '#5E7A8B')
            const typeLabel = nc.gravidade === 'critica' ? 'Bloqueio' : (isAberta ? 'NC' : 'Decisão')
            return (
              <div key={nc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: '#2C2C2B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONTS.body }}>{typeLabel}</div>
                  <div style={{ fontSize: FONT_SIZES.xs, color: '#8B8670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, fontFamily: FONTS.body }}>{nc.titulo}</div>
                  {nc.data_limite_resolucao && <div style={{ ...S.muted, marginTop: 2 }}>{new Date(nc.data_limite_resolucao).toLocaleDateString('pt-PT')}</div>}
                </div>
              </div>
            )
          })}
          {/* Ocorrências críticas */}
          {criticalOcorrencias.slice(0, 3).map((oc, i) => (
            <div key={`oc-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9A6B5B', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.body }}>Bloqueio</div>
                <div style={{ fontSize: FONT_SIZES.xs, color: '#8B8670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, fontFamily: FONTS.body }}>{oc.descricao}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
