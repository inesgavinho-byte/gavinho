import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { X, Plus, Trash2, Sun, Cloud, CloudRain, Wind, CloudFog } from 'lucide-react'
import { colors } from '../constants'
import { FONTS, FONT_SIZES } from '../../../styles/designTokens'

// ── Constantes ──────────────────────────────────────
const METEO_OPTIONS = [
  { value: 'sol', label: 'Sol', icon: Sun, color: '#f59e0b' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, color: '#6b7280' },
  { value: 'chuva', label: 'Chuva', icon: CloudRain, color: '#3b82f6' },
  { value: 'vento', label: 'Vento', icon: Wind, color: '#8b5cf6' },
  { value: 'neblina', label: 'Neblina', icon: CloudFog, color: '#64748b' },
]
const GRAVIDADE_OPTIONS = ['baixa', 'media', 'alta', 'critica']
const ESTADO_ATIV = ['em_curso', 'concluida', 'suspensa']

// ── Estilos ─────────────────────────────────────────
const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, padding: 32 },
  label: { fontSize: FONT_SIZES.xs, fontWeight: 600, color: '#8B8670', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block', fontFamily: FONTS.body },
  input: { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ADAA96', fontSize: 13, fontFamily: FONTS.body, boxSizing: 'border-box' },
  select: { padding: '10px 12px', borderRadius: 6, border: '1px solid #ADAA96', fontSize: 13, fontFamily: FONTS.body, background: '#fff', boxSizing: 'border-box' },
  btn: { padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONTS.body, border: 'none' },
  btnPrimary: { background: '#1a1a1a', color: '#fff' },
  btnSecondary: { background: 'transparent', border: '1px solid #ADAA96', color: '#1a1a1a' },
  section: { marginBottom: 20 },
  row: { display: 'grid', gap: 12, marginBottom: 12 },
  hr: { border: 'none', borderTop: `1px solid ${colors.border}`, margin: '20px 0' },
}

export default function DiarioEntryModal({ entry, obraUuid, onClose, onSaved }) {
  const isEdit = !!entry?.id
  const [saving, setSaving] = useState(false)

  // ── Form state ────────────────────────────────────
  const [data, setData] = useState(entry.data || new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState(entry.hora_inicio || '08:00')
  const [horaFim, setHoraFim] = useState(entry.hora_fim || '17:30')
  const [meteo, setMeteo] = useState(entry.condicoes_meteo || 'sol')
  const [temperatura, setTemperatura] = useState(entry.temperatura ?? '')
  const [funcao, setFuncao] = useState(entry.funcao || '')
  const [trabG, setTrabG] = useState(entry.trabalhadores_gavinho || 0)
  const [trabS, setTrabS] = useState(entry.trabalhadores_subempreiteiros || 0)
  const [status, setStatus] = useState(entry.status || 'rascunho')
  const [observacoes, setObservacoes] = useState(entry.observacoes_dia || entry.notas || '')

  // Dynamic arrays
  const [atividades, setAtividades] = useState(entry.atividades || [])
  const [ocorrencias, setOcorrencias] = useState(entry.ocorrencias || [])
  const [ncs, setNcs] = useState(entry.nao_conformidades || [])

  // ── Atividades CRUD ───────────────────────────────
  const addAtividade = () => setAtividades(a => [...a, { especialidade_nome: '', zona: '', descricao: '', estado: 'em_curso', fotos: [] }])
  const updateAtividade = (i, field, val) => setAtividades(a => a.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeAtividade = (i) => setAtividades(a => a.filter((_, j) => j !== i))

  // ── Ocorrências CRUD ──────────────────────────────
  const addOcorrencia = () => setOcorrencias(a => [...a, { gravidade: 'media', descricao: '' }])
  const updateOcorrencia = (i, field, val) => setOcorrencias(a => a.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeOcorrencia = (i) => setOcorrencias(a => a.filter((_, j) => j !== i))

  // ── NCs CRUD ──────────────────────────────────────
  const addNC = () => setNcs(a => [...a, { especialidade: '', titulo: '', descricao: '', gravidade: 'media', zona: '' }])
  const updateNC = (i, field, val) => setNcs(a => a.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeNC = (i) => setNcs(a => a.filter((_, j) => j !== i))

  // ── Save ──────────────────────────────────────────
  const handleSave = async () => {
    if (!data) return alert('Data é obrigatória.')
    setSaving(true)
    try {
      const payload = {
        obra_id: obraUuid,
        data,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        condicoes_meteo: meteo,
        temperatura: temperatura !== '' ? parseFloat(temperatura) : null,
        funcao: funcao || null,
        trabalhadores_gavinho: parseInt(trabG) || 0,
        trabalhadores_subempreiteiros: parseInt(trabS) || 0,
        atividades: atividades.filter(a => a.descricao || a.especialidade_nome),
        ocorrencias: ocorrencias.filter(o => o.descricao),
        nao_conformidades: ncs.filter(n => n.titulo || n.descricao),
        observacoes_dia: observacoes || null,
        status,
        updated_at: new Date().toISOString(),
      }

      if (isEdit) {
        const { error } = await supabase.from('obra_diario').update(payload).eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obra_diario').insert([payload])
        if (error) throw error
      }

      // Auto-create NCs in nao_conformidades table
      const validNcs = ncs.filter(n => n.titulo || n.descricao)
      for (const nc of validNcs) {
        await supabase.from('nao_conformidades').insert({
          obra_id: obraUuid,
          titulo: nc.titulo || `NC — ${nc.especialidade || 'Geral'}`,
          descricao: nc.descricao || null,
          gravidade: nc.gravidade || 'media',
          estado: 'aberta',
          zona: nc.zona || null,
        }).then(r => { if (r.error) console.warn('NC auto-create:', r.error.message) })
      }

      onSaved()
    } catch (err) {
      console.error('DiarioEntryModal save:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: FONT_SIZES.lg, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.heading }}>
            {isEdit ? 'Editar Entrada' : 'Nova Entrada'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8670' }}><X size={20} /></button>
        </div>

        {/* ── Cabeçalho: Data + Horário + Estado ──── */}
        <div style={{ ...S.row, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <div>
            <label style={S.label}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Início</label>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Fim</label>
            <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...S.select, width: '100%' }}>
              <option value="rascunho">Rascunho</option>
              <option value="submetido">Submetido</option>
            </select>
          </div>
        </div>

        {/* ── Meteorologia ───────────────────────── */}
        <div style={S.section}>
          <label style={S.label}>Condições Meteo</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {METEO_OPTIONS.map(opt => {
              const Icon = opt.icon
              const active = meteo === opt.value
              return (
                <button key={opt.value} onClick={() => setMeteo(opt.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontFamily: FONTS.body, cursor: 'pointer', border: active ? `2px solid ${opt.color}` : '1px solid #ADAA96', background: active ? `${opt.color}15` : '#fff', color: active ? opt.color : '#8B8670' }}>
                  <Icon size={14} /> {opt.label}
                </button>
              )
            })}
          </div>
          <div style={{ ...S.row, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={S.label}>Temperatura (°C)</label>
              <input type="number" step="0.1" value={temperatura} onChange={e => setTemperatura(e.target.value)} placeholder="Ex: 22" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Função</label>
              <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Encarregado, Director..." style={S.input} />
            </div>
          </div>
        </div>

        {/* ── Trabalhadores ──────────────────────── */}
        <div style={{ ...S.row, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={S.label}>Trab. Gavinho</label>
            <input type="number" min="0" value={trabG} onChange={e => setTrabG(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Trab. Subempreiteiros</label>
            <input type="number" min="0" value={trabS} onChange={e => setTrabS(e.target.value)} style={S.input} />
          </div>
        </div>

        <hr style={S.hr} />

        {/* ── Atividades ─────────────────────────── */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...S.label, margin: 0 }}>Atividades ({atividades.length})</label>
            <button onClick={addAtividade} style={{ ...S.btn, ...S.btnSecondary, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Adicionar</button>
          </div>
          {atividades.map((a, i) => (
            <div key={i} style={{ padding: 12, background: '#F8F7F3', borderRadius: 8, marginBottom: 8, position: 'relative' }}>
              <button onClick={() => removeAtividade(i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9A6B5B' }}><Trash2 size={14} /></button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
                <input placeholder="Especialidade" value={a.especialidade_nome || ''} onChange={e => updateAtividade(i, 'especialidade_nome', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                <input placeholder="Zona" value={a.zona || ''} onChange={e => updateAtividade(i, 'zona', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                <select value={a.estado || 'em_curso'} onChange={e => updateAtividade(i, 'estado', e.target.value)} style={{ ...S.select, fontSize: 12, width: '100%' }}>
                  {ESTADO_ATIV.map(s => <option key={s} value={s}>{s === 'em_curso' ? 'Em Curso' : s === 'concluida' ? 'Concluída' : 'Suspensa'}</option>)}
                </select>
              </div>
              <textarea placeholder="Descrição da atividade..." value={a.descricao || ''} onChange={e => updateAtividade(i, 'descricao', e.target.value)} rows={2} style={{ ...S.input, fontSize: 12, resize: 'vertical' }} />
            </div>
          ))}
        </div>

        <hr style={S.hr} />

        {/* ── Ocorrências ────────────────────────── */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...S.label, margin: 0 }}>Ocorrências ({ocorrencias.length})</label>
            <button onClick={addOcorrencia} style={{ ...S.btn, ...S.btnSecondary, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Adicionar</button>
          </div>
          {ocorrencias.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <select value={o.gravidade || 'media'} onChange={e => updateOcorrencia(i, 'gravidade', e.target.value)} style={{ ...S.select, fontSize: 12, width: 100 }}>
                {GRAVIDADE_OPTIONS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
              <input placeholder="Descrição da ocorrência" value={o.descricao || ''} onChange={e => updateOcorrencia(i, 'descricao', e.target.value)} style={{ ...S.input, fontSize: 12, flex: 1 }} />
              <button onClick={() => removeOcorrencia(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A6B5B', padding: 4 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <hr style={S.hr} />

        {/* ── Não Conformidades ──────────────────── */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...S.label, margin: 0 }}>Não Conformidades ({ncs.length})</label>
            <button onClick={addNC} style={{ ...S.btn, ...S.btnSecondary, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Adicionar</button>
          </div>
          <p style={{ fontSize: 11, color: '#B0ADA3', margin: '0 0 8px', fontFamily: FONTS.body }}>NCs registadas aqui são criadas automaticamente na tabela de Não Conformidades.</p>
          {ncs.map((nc, i) => (
            <div key={i} style={{ padding: 12, background: 'rgba(154,107,91,0.06)', borderRadius: 8, marginBottom: 8, position: 'relative' }}>
              <button onClick={() => removeNC(i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9A6B5B' }}><Trash2 size={14} /></button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
                <input placeholder="Título" value={nc.titulo || ''} onChange={e => updateNC(i, 'titulo', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                <input placeholder="Especialidade" value={nc.especialidade || ''} onChange={e => updateNC(i, 'especialidade', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                <select value={nc.gravidade || 'media'} onChange={e => updateNC(i, 'gravidade', e.target.value)} style={{ ...S.select, fontSize: 12, width: '100%' }}>
                  {GRAVIDADE_OPTIONS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input placeholder="Zona" value={nc.zona || ''} onChange={e => updateNC(i, 'zona', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
                <input placeholder="Descrição" value={nc.descricao || ''} onChange={e => updateNC(i, 'descricao', e.target.value)} style={{ ...S.input, fontSize: 12 }} />
              </div>
            </div>
          ))}
        </div>

        <hr style={S.hr} />

        {/* ── Notas do Dia ───────────────────────── */}
        <div style={S.section}>
          <label style={S.label}>Notas / Observações do Dia</label>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} placeholder="Observações gerais, notas para a equipa..." style={{ ...S.input, resize: 'vertical', background: '#FDFCF7' }} />
        </div>

        {/* ── Footer ─────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
          <button onClick={onClose} style={{ ...S.btn, ...S.btnSecondary }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'A guardar...' : isEdit ? 'Guardar Alterações' : 'Criar Entrada'}
          </button>
        </div>
      </div>
    </div>
  )
}
