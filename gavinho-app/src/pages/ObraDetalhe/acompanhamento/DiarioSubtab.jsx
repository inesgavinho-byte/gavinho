import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  BookOpen, Plus, Trash2, Copy, FileDown, Edit2, ChevronLeft, ChevronRight,
  Sun, Cloud, CloudRain, Wind, CloudFog, Clock, Users, AlertTriangle, X
} from 'lucide-react'
import { colors } from '../constants'
import { FONTS, FONT_SIZES } from '../../../styles/designTokens'
import DiarioEntryModal from './DiarioEntryModal'

// ── Constantes ──────────────────────────────────────
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEATHER_MAP = {
  sol: { icon: Sun, label: 'Sol', color: '#f59e0b' },
  nublado: { icon: Cloud, label: 'Nublado', color: '#6b7280' },
  chuva: { icon: CloudRain, label: 'Chuva', color: '#3b82f6' },
  vento: { icon: Wind, label: 'Vento', color: '#8b5cf6' },
  neblina: { icon: CloudFog, label: 'Neblina', color: '#64748b' },
}
const DEFAULT_WEATHER = { icon: Sun, label: 'Sol', color: '#f59e0b' }

function getWeather(meteo) {
  if (!meteo) return DEFAULT_WEATHER
  const key = typeof meteo === 'string' ? meteo : meteo.condicao || meteo.condição
  return WEATHER_MAP[key] || DEFAULT_WEATHER
}

// ── Estilos ─────────────────────────────────────────
const S = {
  card: { background: '#FFFFFF', borderRadius: 10, border: `1px solid ${colors.border}`, padding: 20 },
  btn: { padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONTS.body, border: 'none' },
  btnPrimary: { background: '#1a1a1a', color: '#fff' },
  btnSecondary: { background: 'transparent', border: '1px solid #ADAA96', color: '#1a1a1a' },
  select: { padding: '8px 12px', borderRadius: 6, border: '1px solid #ADAA96', fontSize: 13, fontFamily: FONTS.body, background: '#fff', color: '#2C2C2B' },
}

export default function DiarioSubtab({ obraUuid, obra, currentUser }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current month
  const [modalEntry, setModalEntry] = useState(null) // null=closed, {}=new, {id,...}=edit
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Derived month ──────────────────────────────────
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const monthLabel = `${MONTHS_PT[viewMonth]} ${viewYear}`
  const startStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
  const endDay = new Date(viewYear, viewMonth + 1, 0).getDate()
  const endStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  // ── Fetch entries ─────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!obraUuid) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('obra_diario')
        .select('*')
        .eq('obra_id', obraUuid)
        .gte('data', startStr)
        .lte('data', endStr)
        .order('data', { ascending: false })
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('DiarioSubtab fetch:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [obraUuid, startStr, endStr])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── Delete handler ────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      // Delete storage photos
      const paths = []
      ;(deleteTarget.fotos || []).forEach(f => {
        const url = typeof f === 'string' ? f : f?.url
        if (url?.includes('obra-fotos/')) paths.push(url.split('obra-fotos/').pop())
      })
      ;(deleteTarget.atividades || []).forEach(a => {
        (a.fotos || []).forEach(f => {
          const url = typeof f === 'string' ? f : f?.url
          if (url?.includes('obra-fotos/')) paths.push(url.split('obra-fotos/').pop())
        })
      })
      if (paths.length > 0) await supabase.storage.from('obra-fotos').remove(paths)
      // Delete linked pendentes
      await supabase.from('obra_pendentes').delete().eq('diario_entrada_id', deleteTarget.id)
      // Delete entry
      await supabase.from('obra_diario').delete().eq('id', deleteTarget.id)
      setDeleteTarget(null)
      fetchEntries()
    } catch (err) {
      console.error('DiarioSubtab delete:', err)
    }
  }

  // ── Copy previous day ─────────────────────────────
  const handleCopyPrevious = async () => {
    const sorted = [...entries].sort((a, b) => b.data.localeCompare(a.data))
    const prev = sorted[0]
    if (!prev) return alert('Sem entradas para copiar.')
    const incomplete = (prev.atividades || []).filter(a => a.estado !== 'concluida' && a.estado !== 'Concluída')
    if (incomplete.length === 0) return alert('Sem tarefas pendentes no dia anterior.')
    if (!confirm(`Copiar ${incomplete.length} tarefa(s) não concluída(s) de ${formatDateShort(prev.data)}?`)) return
    const today = new Date().toISOString().split('T')[0]
    setModalEntry({
      data: today,
      hora_inicio: prev.hora_inicio || '08:00',
      hora_fim: prev.hora_fim || '17:30',
      condicoes_meteo: 'sol',
      temperatura: prev.temperatura || '',
      funcao: prev.funcao || '',
      trabalhadores_gavinho: prev.trabalhadores_gavinho || 0,
      trabalhadores_subempreiteiros: prev.trabalhadores_subempreiteiros || 0,
      atividades: incomplete.map(a => ({ ...a, estado: 'em_curso' })),
      ocorrencias: [],
      nao_conformidades: [],
      observacoes_dia: '',
      status: 'rascunho',
    })
  }

  // ── Export PDF (simple print) ─────────────────────
  const handleExportPDF = () => {
    const w = window.open('', '_blank')
    const rows = entries.map(e => {
      const wc = (e.trabalhadores_gavinho || 0) + (e.trabalhadores_subempreiteiros || 0)
      const ativs = (e.atividades || []).map(a => `• ${a.especialidade_nome || 'Geral'}: ${a.descricao || '—'}`).join('\n')
      return `<tr><td>${e.data}</td><td>${e.status}</td><td>${wc}</td><td><pre style="margin:0;white-space:pre-wrap;font-size:11px">${ativs || '—'}</pre></td><td>${e.observacoes_dia || e.notas || '—'}</td></tr>`
    }).join('')
    w.document.write(`<html><head><title>Diário ${obra?.codigo || ''} — ${monthLabel}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f3ef}</style></head><body><h2>Diário de Obra — ${obra?.nome || ''} (${obra?.codigo || ''})</h2><h3>${monthLabel}</h3><table><tr><th>Data</th><th>Estado</th><th>Trab.</th><th>Atividades</th><th>Notas</th></tr>${rows}</table></body></html>`)
    w.document.close()
    w.print()
  }

  // ── Render ────────────────────────────────────────
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Header + Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: FONT_SIZES['2xl'], fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.heading, flex: 1 }}>
          Diário de Obra
        </h2>
        <button onClick={handleCopyPrevious} style={{ ...S.btn, ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: 5 }} title="Copiar tarefas pendentes do dia anterior">
          <Copy size={14} /> Copiar Anterior
        </button>
        <button onClick={handleExportPDF} style={{ ...S.btn, ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: 5 }}>
          <FileDown size={14} /> Exportar
        </button>
        <button onClick={() => setModalEntry({ data: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fim: '17:30', condicoes_meteo: 'sol', temperatura: '', funcao: currentUser?.funcao || '', trabalhadores_gavinho: 0, trabalhadores_subempreiteiros: 0, atividades: [], ocorrencias: [], nao_conformidades: [], observacoes_dia: '', status: 'rascunho' })}
          style={{ ...S.btn, ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> Nova Entrada
        </button>
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8670' }}><ChevronLeft size={20} /></button>
        <span style={{ fontSize: FONT_SIZES.md, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.body, minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
        <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8670' }} disabled={monthOffset >= 0}><ChevronRight size={20} /></button>
        <span style={{ fontSize: FONT_SIZES.sm, color: '#B0ADA3', fontFamily: FONTS.body }}>{entries.length} entrada{entries.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Entries Timeline */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, ...S.card }}>
          <BookOpen size={48} style={{ color: '#B0ADA3', opacity: 0.4, marginBottom: 16 }} />
          <p style={{ color: '#8B8670', fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem entradas neste mês</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => <EntryCard key={entry.id} entry={entry} onEdit={() => setModalEntry(entry)} onDelete={() => setDeleteTarget(entry)} />)}
        </div>
      )}

      {/* Entry Modal */}
      {modalEntry && (
        <DiarioEntryModal
          entry={modalEntry}
          obraUuid={obraUuid}
          onClose={() => setModalEntry(null)}
          onSaved={() => { setModalEntry(null); fetchEntries() }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: FONT_SIZES.lg, fontFamily: FONTS.heading, color: '#2C2C2B' }}>Apagar Entrada</h3>
            <p style={{ fontSize: FONT_SIZES.base, color: '#8B8670', fontFamily: FONTS.body, margin: '0 0 20px' }}>
              Tem a certeza que deseja apagar a entrada de <strong>{formatDateShort(deleteTarget.data)}</strong>? As fotos associadas e pendentes ligados serão eliminados.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ ...S.btn, ...S.btnSecondary }}>Cancelar</button>
              <button onClick={handleDelete} style={{ ...S.btn, background: '#9A6B5B', color: '#fff' }}>Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Entry Card ──────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete }) {
  const weather = getWeather(entry.condicoes_meteo)
  const WeatherIcon = weather.icon
  const wc = (entry.trabalhadores_gavinho || 0) + (entry.trabalhadores_subempreiteiros || 0)
  const ativCount = entry.atividades?.length || 0
  const ocCount = entry.ocorrencias?.length || 0
  const d = new Date(entry.data + 'T12:00:00')
  const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]
  const dayNum = d.getDate()
  const monthShort = MONTHS_PT[d.getMonth()].slice(0, 3)

  return (
    <div style={{ ...S.card, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Date badge */}
      <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#B0ADA3', textTransform: 'uppercase', fontFamily: FONTS.body }}>{dayName}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#2C2C2B', fontFamily: FONTS.heading, lineHeight: 1.1 }}>{dayNum}</div>
        <div style={{ fontSize: 10, color: '#B0ADA3', fontFamily: FONTS.body }}>{monthShort}</div>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {entry.hora_inicio && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: FONT_SIZES.sm, color: '#8B8670', fontFamily: FONTS.body }}><Clock size={11} />{entry.hora_inicio}–{entry.hora_fim || '?'}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: FONT_SIZES.sm, color: '#8B8670', fontFamily: FONTS.body }}><WeatherIcon size={12} style={{ color: weather.color }} />{entry.temperatura ? `${entry.temperatura}°C` : weather.label}</span>
          {wc > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: FONT_SIZES.sm, color: '#8B8670', fontFamily: FONTS.body }}><Users size={11} />{wc}</span>}
          {ocCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: FONT_SIZES.sm, color: '#9A6B5B', fontFamily: FONTS.body }}><AlertTriangle size={11} />{ocCount}</span>}
        </div>
        {ativCount > 0 && (
          <div style={{ fontSize: FONT_SIZES.sm, color: '#6B6B6B', fontFamily: FONTS.body, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(entry.atividades || []).slice(0, 3).map(a => a.especialidade_nome || a.descricao || 'Atividade').join(' · ')}
            {ativCount > 3 && ` (+${ativCount - 3})`}
          </div>
        )}
        {entry.observacoes_dia && (
          <div style={{ fontSize: FONT_SIZES.xs, color: '#B0ADA3', fontFamily: FONTS.body, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.observacoes_dia}</div>
        )}
      </div>
      {/* Status badge */}
      <span style={{
        padding: '3px 10px', borderRadius: 6, fontSize: FONT_SIZES.xs, fontWeight: 600, fontFamily: FONTS.body, flexShrink: 0,
        color: entry.status === 'submetido' ? '#7A8B6E' : '#9A7B5B',
        background: entry.status === 'submetido' ? 'rgba(122,139,110,0.12)' : 'rgba(201,168,108,0.12)',
      }}>
        {entry.status === 'submetido' ? 'Submetido' : 'Rascunho'}
      </span>
      {/* Actions */}
      <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8670', padding: 4 }} title="Editar"><Edit2 size={16} /></button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A6B5B', padding: 4 }} title="Apagar"><Trash2 size={16} /></button>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────
function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
