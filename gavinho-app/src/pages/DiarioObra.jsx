import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Sun, Cloud, CloudRain, Wind, CloudFog,
  Plus, Trash2, Edit2, Check, X, Upload, ChevronRight, ChevronLeft,
  Save, Send, Clock, Users, AlertTriangle, Camera, ArrowRight,
  Loader2, Download, Image as ImageIcon, MapPin, Calendar,
  AlertCircle, Info
} from 'lucide-react'

// =====================================================
// CONSTANTS
// =====================================================

const WEATHER_OPTIONS = [
  { id: 'sol', label: 'Sol', labelDisplay: 'Céu limpo', icon: Sun, color: '#f59e0b' },
  { id: 'nublado', label: 'Nublado', labelDisplay: 'Nublado', icon: Cloud, color: '#9ca3af' },
  { id: 'chuva', label: 'Chuva', labelDisplay: 'Chuva ligeira', icon: CloudRain, color: '#3b82f6' },
  { id: 'vento', label: 'Vento', labelDisplay: 'Vento', icon: Wind, color: '#8b5cf6' },
  { id: 'neblina', label: 'Neblina', labelDisplay: 'Neblina', icon: CloudFog, color: '#6b7280' },
]

const ESPECIALIDADE_COLORS = {
  'Carpintaria': '#2563eb',
  'Eletricidade': '#d97706',
  'Elétrico': '#d97706',
  'Pedra Natural': '#78716c',
  'Revestimentos': '#78716c',
  'AVAC': '#059669',
  'Canalização': '#0891b2',
  'Hidráulica': '#0891b2',
  'Serralharia': '#475569',
  'Alvenaria': '#92400e',
  'Alvenarias': '#92400e',
  'Pintura': '#7c3aed',
  'Estrutura': '#dc2626',
  'Impermeabilização': '#0d9488',
  'Caixilharia': '#4f46e5',
  'Vidros': '#06b6d4',
  'Gás': '#ea580c',
  'Paisagismo': '#16a34a',
  'Piscina': '#0284c7',
}

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'diario', label: 'Diário' },
  { id: 'fotografias', label: 'Fotografias' },
  { id: 'nao-conformidades', label: 'Não Conformidades' },
  { id: 'documentos', label: 'Documentos' },
]

const FUNCOES = [
  'Encarregado de Obra',
  'Diretor de Obra',
  'Engenheiro',
  'Técnico de Segurança',
  'Fiscal de Obra'
]

const SEVERIDADES_NC = ['MENOR', 'MAIOR', 'CRÍTICA']

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_FULL_PT = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function getEspecialidadeColor(nome) {
  return ESPECIALIDADE_COLORS[nome] || '#8B8670'
}

function formatDatePT(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return WEEKDAYS_FULL_PT[d.getDay()]
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function DiarioObra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Core state
  const [obra, setObra] = useState(null)
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedObra, setSelectedObra] = useState(id || '')
  const [activeTab, setActiveTab] = useState('diario')

  // Timeline data
  const [entries, setEntries] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [zonas, setZonas] = useState([])

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // Modal state
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  // =====================================================
  // DATA FETCHING
  // =====================================================

  useEffect(() => {
    fetchObras()
    fetchEspecialidades()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      fetchObraDetails()
      fetchEntries()
      fetchZonas()
    }
  }, [selectedObra])

  const fetchObras = async () => {
    const { data } = await supabase
      .from('obras')
      .select('id, codigo, nome, localizacao, encarregado, status')
      .order('codigo')
    if (data) {
      setObras(data)
      if (id && !selectedObra) setSelectedObra(id)
    }
    if (!id) setLoading(false)
  }

  const fetchObraDetails = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('obras')
      .select('*')
      .eq('id', selectedObra)
      .single()
    if (data) setObra(data)
    setLoading(false)
  }

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', selectedObra)
      .order('data', { ascending: false })
      .limit(50)

    if (data) setEntries(data)
  }

  const fetchEspecialidades = async () => {
    const { data } = await supabase
      .from('especialidades')
      .select('*')
      .eq('ativo', true)
      .order('ordem')
    if (data) setEspecialidades(data)
  }

  const fetchZonas = async () => {
    const { data } = await supabase
      .from('obra_zonas')
      .select('*')
      .eq('obra_id', selectedObra)
      .eq('ativo', true)
      .order('ordem')
    if (data) setZonas(data)
  }

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const weekSummary = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 4) // Friday

    const startStr = startOfWeek.toISOString().split('T')[0]
    const endStr = endOfWeek.toISOString().split('T')[0]

    const weekEntries = entries.filter(e => e.data >= startStr && e.data <= endStr)
    const totalWorkers = weekEntries.reduce((sum, e) => {
      const trabCount = (e.trabalhadores_gavinho || 0) + (e.trabalhadores_subempreiteiros || 0)
      const trabArray = e.trabalhadores?.filter?.(t => t.estado === 'PRESENTE')?.length
      return sum + (trabArray || trabCount || 0)
    }, 0)
    const totalPhotos = weekEntries.reduce((sum, e) => {
      const ativFotos = (e.atividades || []).reduce((s, a) => s + (a.fotos?.length || 0), 0)
      return sum + (e.fotos?.length || 0) + ativFotos
    }, 0)
    const totalIncidents = weekEntries.reduce((sum, e) => sum + (e.ocorrencias?.length || 0), 0)

    return {
      diasRegistados: weekEntries.length,
      diasTotal: 5,
      mediaEmObra: weekEntries.length > 0 ? (totalWorkers / weekEntries.length).toFixed(1) : '0',
      fotografias: totalPhotos,
      incidentes: totalIncidents
    }
  }, [entries])

  const pendentes = useMemo(() => {
    const items = []
    entries.forEach(e => {
      // Collect from pendentes field
      if (e.pendentes?.length) {
        e.pendentes.forEach(p => items.push({ ...p, data_entrada: e.data }))
      }
      // Collect from atividades with alerts
      if (e.atividades?.length) {
        e.atividades.forEach(a => {
          if (a.alerta) {
            items.push({
              tipo: a.alerta.tipo || 'decisao',
              descricao: a.alerta.descricao || a.alerta,
              data_registo: e.data,
              data_entrada: e.data
            })
          }
        })
      }
      // Collect NCs
      if (e.nao_conformidades?.length) {
        e.nao_conformidades.forEach(nc => {
          items.push({
            tipo: 'nc',
            descricao: nc.descricao,
            severidade: nc.severidade,
            data_registo: e.data,
            data_entrada: e.data
          })
        })
      }
    })
    return items.slice(0, 6)
  }, [entries])

  const activeEspecialidades = useMemo(() => {
    const names = new Set()
    entries.forEach(e => {
      if (e.atividades?.length) {
        e.atividades.forEach(a => {
          if (a.especialidade_nome) names.add(a.especialidade_nome)
        })
      }
    })
    return Array.from(names)
  }, [entries])

  const calendarDots = useMemo(() => {
    const dots = new Set()
    entries.forEach(e => {
      const d = new Date(e.data + 'T12:00:00')
      if (d.getMonth() === calendarMonth.getMonth() && d.getFullYear() === calendarMonth.getFullYear()) {
        dots.add(d.getDate())
      }
    })
    return dots
  }, [entries, calendarMonth])

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleNewEntry = () => {
    setEditingEntry(null)
    setShowEntryForm(true)
  }

  const handleEditEntry = (entry) => {
    setEditingEntry(entry)
    setShowEntryForm(true)
  }

  const handleEntrySaved = () => {
    setShowEntryForm(false)
    setEditingEntry(null)
    fetchEntries()
  }

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Tem a certeza que deseja apagar este registo?')) return
    await supabase.from('obra_diario').delete().eq('id', entryId)
    fetchEntries()
  }

  // =====================================================
  // LOADING / SELECTION
  // =====================================================

  if (!selectedObra) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--brown)', marginBottom: 8 }}>Diário de Obra</h2>
        <p style={{ color: 'var(--brown-light)', marginBottom: 24 }}>Selecione uma obra para ver o diário</p>
        <select
          value={selectedObra}
          onChange={(e) => {
            setSelectedObra(e.target.value)
            if (e.target.value) navigate(`/obras/${e.target.value}/diario`)
          }}
          className="select"
          style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}
        >
          <option value="">Selecionar obra...</option>
          {obras.map(o => (
            <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
          ))}
        </select>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--blush)' }} />
      </div>
    )
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: 12 }}>
        <Link to="/obras" style={{ color: 'var(--brown-light)', textDecoration: 'none' }}>Obras</Link>
        <span style={{ margin: '0 8px', color: 'var(--brown-light)' }}>&rsaquo;</span>
        {obra && (
          <>
            <Link to={`/obras/${obra.id}`} style={{ color: 'var(--brown-light)', textDecoration: 'none' }}>{obra.codigo}</Link>
            <span style={{ margin: '0 8px', color: 'var(--brown-light)' }}>&rsaquo;</span>
          </>
        )}
        <span style={{ color: 'var(--brown)' }}>Diário de Obra</span>
      </div>

      {/* Obra Header */}
      {obra && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', margin: 0 }}>{obra.codigo}</h1>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: obra.status === 'em_curso' ? 'var(--success)' : obra.status === 'concluida' ? 'var(--info)' : 'var(--warning)',
                  display: 'inline-block'
                }} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--brown)', margin: '0 0 4px 0' }}>{obra.nome}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--brown-light)' }}>
                {obra.localizacao && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> {obra.localizacao}
                  </span>
                )}
                {obra.encarregado && (
                  <span>Dir. Obra: <strong style={{ color: 'var(--brown)' }}>{obra.encarregado}</strong></span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ gap: 6, fontSize: 13 }}>
              <Download size={15} /> Exportar
            </button>
            <button onClick={handleNewEntry} className="btn btn-primary" style={{ gap: 6, fontSize: 13, background: 'var(--olive-gray)' }}>
              <Plus size={15} /> Nova Entrada
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid var(--stone)',
        marginBottom: 24
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--olive-gray)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Main Content */}
        <div>
          {activeTab === 'diario' && (
            <DiarioTimeline
              entries={entries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          )}
          {activeTab === 'resumo' && (
            <ResumoTab entries={entries} obra={obra} weekSummary={weekSummary} />
          )}
          {activeTab === 'fotografias' && (
            <FotografiasTab entries={entries} />
          )}
          {activeTab === 'nao-conformidades' && (
            <NaoConformidadesTab entries={entries} />
          )}
          {activeTab === 'documentos' && (
            <DocumentosTab />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 20 }}>
          <SidebarWeekSummary summary={weekSummary} />
          <SidebarCalendar
            month={calendarMonth}
            onChangeMonth={setCalendarMonth}
            dots={calendarDots}
            today={new Date().getDate()}
            currentMonth={new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear()}
          />
          <SidebarPendentes pendentes={pendentes} />
          <SidebarEspecialidades especialidades={activeEspecialidades} />
        </div>
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <EntryFormModal
          obra={obra}
          entry={editingEntry}
          especialidades={especialidades}
          zonas={zonas}
          onClose={() => { setShowEntryForm(false); setEditingEntry(null) }}
          onSaved={handleEntrySaved}
        />
      )}
    </div>
  )
}

// =====================================================
// DIARIO TIMELINE (Phase 1 + Phase 3)
// =====================================================

function DiarioTimeline({ entries, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--brown-light)' }}>
        <Calendar size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Sem registos</p>
        <p style={{ fontSize: 13 }}>Crie a primeira entrada do diário de obra</p>
      </div>
    )
  }

  return (
    <div>
      {entries.map(entry => (
        <DayEntry key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

function DayEntry({ entry, onEdit, onDelete }) {
  const weather = WEATHER_OPTIONS.find(w => w.id === (entry.condicoes_meteo || '').toLowerCase())
  const WeatherIcon = weather?.icon || Sun

  // Count workers
  const trabArray = entry.trabalhadores || []
  const trabPresentes = trabArray.filter?.(t => t.estado === 'PRESENTE')?.length
  const workerCount = trabPresentes || (entry.trabalhadores_gavinho || 0) + (entry.trabalhadores_subempreiteiros || 0)

  // Count photos across atividades and fotos
  const ativFotos = (entry.atividades || []).reduce((s, a) => s + (a.fotos?.length || 0), 0)
  const photoCount = (entry.fotos?.length || 0) + ativFotos

  // Activities
  const atividades = entry.atividades || []

  // Fallback: convert old tarefas to atividades format for display
  const displayAtividades = atividades.length > 0 ? atividades : (entry.tarefas || []).map(t => ({
    especialidade_nome: 'Geral',
    zona: '',
    descricao: t.descricao || t.titulo || '',
    fotos: []
  }))

  // Time display
  const horaInicio = entry.hora_inicio ? entry.hora_inicio.substring(0, 5) : null
  const horaFim = entry.hora_fim ? entry.hora_fim.substring(0, 5) : null

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      {/* Date Header */}
      <div style={{
        padding: '14px 24px',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)' }}>
            {formatDatePT(entry.data)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brown-light)', letterSpacing: 0.5 }}>
            {getDayOfWeek(entry.data)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(entry)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }} title="Editar">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(entry.id)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, color: 'var(--error)' }} title="Apagar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Weather + Stats Bar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        fontSize: 13,
        color: 'var(--brown-light)'
      }}>
        {weather && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WeatherIcon size={16} color={weather.color} />
            <span style={{ color: 'var(--brown)' }}>
              {entry.temperatura ? `${entry.temperatura}°C` : ''} {entry.temperatura ? '·' : ''} {weather.labelDisplay}
            </span>
          </span>
        )}
        {workerCount > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} /> {workerCount} em obra
          </span>
        )}
        {(horaInicio || horaFim) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> {horaInicio || '—'} – {horaFim || '—'}
          </span>
        )}
        {photoCount > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Camera size={14} /> {photoCount} fotos
          </span>
        )}
      </div>

      {/* Activities */}
      <div style={{ padding: '0 24px' }}>
        {displayAtividades.map((ativ, idx) => (
          <ActivityEntry key={idx} atividade={ativ} isLast={idx === displayAtividades.length - 1} />
        ))}

        {/* Occurrences as inline alerts */}
        {(entry.ocorrencias || []).map((oc, idx) => (
          <div key={`oc-${idx}`} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            margin: '8px 0',
            background: oc.severidade === 'Alta' ? 'var(--error-bg)' : 'var(--alert-warning-bg)',
            borderRadius: 8,
            borderLeft: `3px solid ${oc.severidade === 'Alta' ? 'var(--error)' : 'var(--warning)'}`
          }}>
            <AlertTriangle size={15} color={oc.severidade === 'Alta' ? 'var(--error)' : 'var(--warning)'} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: 'var(--brown)', lineHeight: 1.5 }}>
              {oc.descricao}
            </div>
          </div>
        ))}
      </div>

      {/* Registered By Footer */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid var(--stone)',
        fontSize: 12,
        color: 'var(--brown-light)'
      }}>
        Registado por <strong style={{ color: 'var(--brown)' }}>{entry.registado_por_nome || entry.funcao || 'Utilizador'}</strong>
        {entry.updated_at && (
          <> · {new Date(entry.updated_at).toLocaleDateString('pt-PT')} {new Date(entry.updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>
        )}
      </div>
    </div>
  )
}

// =====================================================
// ACTIVITY ENTRY (Per specialty, Phase 1 + Phase 3)
// =====================================================

function ActivityEntry({ atividade, isLast }) {
  const color = getEspecialidadeColor(atividade.especialidade_nome)
  const fotos = atividade.fotos || []
  const maxThumbs = 3
  const extraPhotos = fotos.length > maxThumbs ? fotos.length - maxThumbs : 0

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--stone)'
    }}>
      {/* Specialty Tag + Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          padding: '3px 10px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          background: `${color}18`,
          color: color,
          textTransform: 'uppercase'
        }}>
          {atividade.especialidade_nome || 'Geral'}
        </span>
        {atividade.zona && (
          <span style={{ fontSize: 13, color: 'var(--brown-light)' }}>
            {atividade.zona}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ margin: '0 0 0 0', fontSize: 14, color: 'var(--brown)', lineHeight: 1.6 }}>
        {atividade.descricao}
      </p>

      {/* Inline Alert */}
      {atividade.alerta && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          marginTop: 10,
          background: atividade.alerta.tipo === 'bloqueio' ? 'var(--error-bg)' : 'var(--alert-warning-bg)',
          borderRadius: 8,
          borderLeft: `3px solid ${atividade.alerta.tipo === 'bloqueio' ? 'var(--error)' : 'var(--warning)'}`
        }}>
          <AlertTriangle size={14} color={atividade.alerta.tipo === 'bloqueio' ? 'var(--error)' : 'var(--warning)'} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--brown)' }}>{typeof atividade.alerta === 'string' ? atividade.alerta : atividade.alerta.descricao}</span>
        </div>
      )}

      {/* Note */}
      {atividade.nota && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '8px 12px',
          marginTop: 10,
          background: 'var(--cream)',
          borderRadius: 8
        }}>
          <Info size={14} color="var(--brown-light)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--brown-light)' }}>{atividade.nota}</span>
        </div>
      )}

      {/* Photo Thumbnails */}
      {fotos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {fotos.slice(0, maxThumbs).map((foto, idx) => (
            <div key={idx} style={{
              width: 64, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0
            }}>
              <img src={typeof foto === 'string' ? foto : foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
          {extraPhotos > 0 && (
            <div style={{
              width: 64, height: 48, borderRadius: 6, background: 'var(--stone)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: 'var(--brown-light)', flexShrink: 0
            }}>
              +{extraPhotos}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// SIDEBAR COMPONENTS (Phase 2)
// =====================================================

function SidebarWeekSummary({ summary }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--brown-light)', marginBottom: 16 }}>
        Resumo da Semana
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SummaryStat label="Dias Registados" value={`${summary.diasRegistados}/${summary.diasTotal}`} />
        <SummaryStat label="Média em Obra" value={summary.mediaEmObra} />
        <SummaryStat label="Fotografias" value={summary.fotografias} />
        <SummaryStat label="Incidentes" value={summary.incidentes} highlight={summary.incidentes > 0} />
      </div>
    </div>
  )
}

function SummaryStat({ label, value, highlight }) {
  return (
    <div>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: highlight ? 'var(--error)' : 'var(--brown)',
        marginBottom: 2
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--brown-light)', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function SidebarCalendar({ month, onChangeMonth, dots, today, currentMonth }) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      {/* Month Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button
          onClick={() => {
            const prev = new Date(month)
            prev.setMonth(prev.getMonth() - 1)
            onChangeMonth(prev)
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {MONTHS_PT[m]} {year}
        </span>
        <button
          onClick={() => {
            const next = new Date(month)
            next.setMonth(next.getMonth() + 1)
            onChangeMonth(next)
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS_PT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--brown-light)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const isToday = currentMonth && day === today
          const hasDot = dots.has(day)

          return (
            <div key={idx} style={{
              textAlign: 'center',
              padding: '6px 0',
              fontSize: 12,
              fontWeight: isToday ? 700 : 400,
              color: isToday ? 'white' : hasDot ? 'var(--brown)' : 'var(--brown-light)',
              background: isToday ? 'var(--olive-gray)' : 'none',
              borderRadius: 6,
              position: 'relative'
            }}>
              {day}
              {hasDot && !isToday && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--olive-gray)',
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)'
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidebarPendentes({ pendentes }) {
  if (pendentes.length === 0) return null

  const typeConfig = {
    bloqueio: { label: 'Bloqueio', bg: 'var(--error-bg)', color: 'var(--error)' },
    nc: { label: 'NC', bg: 'var(--error-bg)', color: 'var(--error)' },
    decisao: { label: 'Decisão', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--brown-light)', marginBottom: 14 }}>
        Pendentes nesta Obra
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pendentes.map((p, idx) => {
          const cfg = typeConfig[p.tipo] || typeConfig.decisao
          return (
            <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: cfg.bg, color: cfg.color, flexShrink: 0, marginTop: 2
              }}>
                {cfg.label}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--brown)', lineHeight: 1.4 }}>{p.descricao}</p>
                {p.data_registo && (
                  <span style={{ fontSize: 11, color: 'var(--brown-light)' }}>
                    {p.tipo === 'bloqueio' ? 'Desde' : 'Registada'} {new Date(p.data_registo + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidebarEspecialidades({ especialidades }) {
  if (especialidades.length === 0) return null

  return (
    <div className="card" style={{ padding: 20 }}>
      <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--brown-light)', marginBottom: 14 }}>
        Especialidades em Obra
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {especialidades.map(name => {
          const color = getEspecialidadeColor(name)
          return (
            <span key={name} style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              background: `${color}15`,
              color: color,
              textTransform: 'uppercase'
            }}>
              {name}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// =====================================================
// TAB CONTENT COMPONENTS
// =====================================================

function ResumoTab({ entries, obra, weekSummary }) {
  const totalEntries = entries.length
  const totalPhotos = entries.reduce((s, e) => {
    const ativFotos = (e.atividades || []).reduce((sum, a) => sum + (a.fotos?.length || 0), 0)
    return s + (e.fotos?.length || 0) + ativFotos
  }, 0)
  const totalNC = entries.reduce((s, e) => s + (e.nao_conformidades?.length || 0), 0)
  const totalIncidents = entries.reduce((s, e) => s + (e.ocorrencias?.length || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Registos', value: totalEntries, icon: Calendar },
          { label: 'Fotografias', value: totalPhotos, icon: Camera },
          { label: 'Não Conformidades', value: totalNC, icon: AlertCircle },
          { label: 'Incidentes', value: totalIncidents, icon: AlertTriangle },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Icon size={20} color="var(--brown-light)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brown)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--brown-light)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent entries preview */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brown)', marginBottom: 12 }}>Últimos Registos</h3>
      {entries.slice(0, 5).map(entry => (
        <div key={entry.id} className="card" style={{ padding: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--brown)', fontSize: 14 }}>{formatDatePT(entry.data)}</span>
            <span style={{ fontSize: 12, color: 'var(--brown-light)', marginLeft: 8 }}>{getDayOfWeek(entry.data)}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--brown-light)' }}>
            {(entry.atividades?.length || entry.tarefas?.length || 0) > 0 && (
              <span>{entry.atividades?.length || entry.tarefas?.length} atividades</span>
            )}
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: entry.status === 'submetido' ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: entry.status === 'submetido' ? 'var(--success)' : 'var(--warning)'
            }}>
              {entry.status === 'submetido' ? 'Submetido' : 'Rascunho'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function FotografiasTab({ entries }) {
  const allPhotos = []
  entries.forEach(e => {
    const date = e.data
    if (e.fotos?.length) {
      e.fotos.forEach(f => allPhotos.push({ url: typeof f === 'string' ? f : f.url, descricao: f.descricao, date }))
    }
    if (e.atividades?.length) {
      e.atividades.forEach(a => {
        (a.fotos || []).forEach(f => allPhotos.push({ url: typeof f === 'string' ? f : f.url, especialidade: a.especialidade_nome, date }))
      })
    }
  })

  if (allPhotos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--brown-light)' }}>
        <ImageIcon size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p>Sem fotografias registadas</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {allPhotos.map((photo, idx) => (
        <div key={idx} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
          <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '20px 10px 8px',
            color: 'white', fontSize: 11
          }}>
            {photo.date && formatDatePT(photo.date)}
            {photo.especialidade && <> · {photo.especialidade}</>}
          </div>
        </div>
      ))}
    </div>
  )
}

function NaoConformidadesTab({ entries }) {
  const allNCs = []
  entries.forEach(e => {
    (e.nao_conformidades || []).forEach(nc => allNCs.push({ ...nc, date: e.data }))
  })

  if (allNCs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--brown-light)' }}>
        <AlertCircle size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p>Sem não conformidades registadas</p>
      </div>
    )
  }

  return (
    <div>
      {allNCs.map((nc, idx) => (
        <div key={idx} className="card" style={{ padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: nc.severidade === 'CRÍTICA' ? 'var(--error)' : nc.severidade === 'MAIOR' ? 'var(--error-bg)' : 'var(--warning-bg)',
              color: nc.severidade === 'CRÍTICA' ? 'white' : nc.severidade === 'MAIOR' ? 'var(--error)' : 'var(--warning)'
            }}>
              {nc.severidade}
            </span>
            <span style={{ fontSize: 12, color: 'var(--brown-light)' }}>{formatDatePT(nc.date)}</span>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--brown)', lineHeight: 1.5 }}>{nc.descricao}</p>
          {nc.acaoCorretiva && (
            <div style={{ padding: '10px 12px', background: 'var(--cream)', borderRadius: 8, fontSize: 13, color: 'var(--brown-light)' }}>
              <strong>Ação Corretiva:</strong> {nc.acaoCorretiva}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DocumentosTab() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--brown-light)' }}>
      <Download size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
      <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Documentos</p>
      <p style={{ fontSize: 13 }}>Exportações PDF e relatórios semanais aparecerão aqui</p>
    </div>
  )
}

// =====================================================
// ENTRY FORM MODAL (Restructured for new design)
// =====================================================

function EntryFormModal({ obra, entry, especialidades, zonas, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState(entry?.data || new Date().toISOString().split('T')[0])
  const [funcao, setFuncao] = useState(entry?.funcao || 'Encarregado de Obra')

  // Weather
  const [condicaoMeteo, setCondicaoMeteo] = useState(entry?.condicoes_meteo?.toLowerCase() || 'sol')
  const [temperatura, setTemperatura] = useState(entry?.temperatura || '')
  const [observacoesMeteo, setObservacoesMeteo] = useState(entry?.observacoes_meteo || '')

  // Work hours
  const [horaInicio, setHoraInicio] = useState(entry?.hora_inicio?.substring(0, 5) || '')
  const [horaFim, setHoraFim] = useState(entry?.hora_fim?.substring(0, 5) || '')

  // Workers
  const [trabGavinho, setTrabGavinho] = useState(entry?.trabalhadores_gavinho || 0)
  const [trabSubs, setTrabSubs] = useState(entry?.trabalhadores_subempreiteiros || 0)

  // Atividades (by specialty)
  const [atividades, setAtividades] = useState(entry?.atividades || [])
  const [showAddAtiv, setShowAddAtiv] = useState(false)
  const [novaAtiv, setNovaAtiv] = useState({ especialidade_nome: '', zona: '', descricao: '', fotos: [], alerta: null, nota: '' })

  // Non-conformities
  const [naoConformidades, setNaoConformidades] = useState(entry?.nao_conformidades || [])
  const [showAddNC, setShowAddNC] = useState(false)
  const [novaNC, setNovaNC] = useState({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })

  // Pendentes
  const [pendentes, setPendentes] = useState(entry?.pendentes || [])
  const [showAddPendente, setShowAddPendente] = useState(false)
  const [novoPendente, setNovoPendente] = useState({ tipo: 'decisao', descricao: '' })

  // Photos (global, in addition to per-activity)
  const [fotos, setFotos] = useState(entry?.fotos || [])
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const fileInputRef = useRef(null)

  // Activity photo management
  const ativPhotoInputRef = useRef(null)
  const [ativPhotoTarget, setAtivPhotoTarget] = useState(null)

  // ---- Photo handlers ----
  const handleAddFoto = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
    setPhotoFiles(prev => [...prev, ...validFiles])
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreviews(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  const handleAtivPhoto = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || ativPhotoTarget === null) return

    files.forEach(file => {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setAtividades(prev => prev.map((a, idx) => {
          if (idx !== ativPhotoTarget) return a
          return { ...a, fotos: [...(a.fotos || []), { url: ev.target.result, file, pending: true }] }
        }))
      }
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
    setAtivPhotoTarget(null)
  }

  const uploadPhotos = async (files) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `diario/${obra.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { error } = await supabase.storage.from('obra-fotos').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('obra-fotos').getPublicUrl(fileName)
      urls.push(publicUrl)
    }
    return urls
  }

  // ---- Activity handlers ----
  const handleAddAtividade = () => {
    if (!novaAtiv.descricao) return
    setAtividades([...atividades, { ...novaAtiv, id: Date.now() }])
    setNovaAtiv({ especialidade_nome: '', zona: '', descricao: '', fotos: [], alerta: null, nota: '' })
    setShowAddAtiv(false)
  }

  const handleRemoveAtividade = (idx) => {
    setAtividades(atividades.filter((_, i) => i !== idx))
  }

  // ---- NC handlers ----
  const handleAddNC = () => {
    if (!novaNC.descricao) return
    setNaoConformidades([...naoConformidades, { ...novaNC, id: Date.now() }])
    setNovaNC({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })
    setShowAddNC(false)
  }

  const handleRemoveNC = (id) => {
    setNaoConformidades(naoConformidades.filter(nc => nc.id !== id))
  }

  // ---- Pendente handlers ----
  const handleAddPendente = () => {
    if (!novoPendente.descricao) return
    setPendentes([...pendentes, { ...novoPendente, id: Date.now(), data_registo: data }])
    setNovoPendente({ tipo: 'decisao', descricao: '' })
    setShowAddPendente(false)
  }

  const handleRemovePendente = (idx) => {
    setPendentes(pendentes.filter((_, i) => i !== idx))
  }

  // ---- Save ----
  const handleSave = async (status) => {
    setSaving(true)
    try {
      // Upload pending global photos
      let allFotos = [...fotos]
      if (photoFiles.length > 0) {
        const urls = await uploadPhotos(photoFiles)
        allFotos = [...allFotos, ...urls.map((url, i) => ({ id: Date.now() + i, url, descricao: '' }))]
      }

      // Upload pending activity photos
      const processedAtividades = []
      for (const ativ of atividades) {
        const pendingPhotos = (ativ.fotos || []).filter(f => f.pending && f.file)
        const existingPhotos = (ativ.fotos || []).filter(f => !f.pending)
        let newUrls = []
        if (pendingPhotos.length > 0) {
          newUrls = await uploadPhotos(pendingPhotos.map(f => f.file))
        }
        processedAtividades.push({
          especialidade_nome: ativ.especialidade_nome,
          zona: ativ.zona,
          descricao: ativ.descricao,
          fotos: [...existingPhotos.map(f => typeof f === 'string' ? f : f.url), ...newUrls],
          alerta: ativ.alerta || null,
          nota: ativ.nota || ''
        })
      }

      const payload = {
        obra_id: obra.id,
        data,
        funcao,
        condicoes_meteo: condicaoMeteo,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        observacoes_meteo: observacoesMeteo,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        trabalhadores_gavinho: parseInt(trabGavinho) || 0,
        trabalhadores_subempreiteiros: parseInt(trabSubs) || 0,
        atividades: processedAtividades,
        nao_conformidades: naoConformidades,
        pendentes,
        fotos: allFotos,
        registado_por_nome: funcao,
        status,
        updated_at: new Date().toISOString()
      }

      if (entry?.id) {
        const { error } = await supabase.from('obra_diario').update(payload).eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obra_diario').insert([payload])
        if (error) throw error
      }

      onSaved()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  // ---- Render ----
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'var(--white)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 800,
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--white)',
          borderRadius: '16px 16px 0 0',
          zIndex: 1
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            {entry ? 'Editar Entrada' : 'Nova Entrada'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={22} color="var(--brown-light)" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24 }}>
          {/* Meta Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <FieldLabel>Data</FieldLabel>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="input" />
            </div>
            <div>
              <FieldLabel>Função</FieldLabel>
              <select value={funcao} onChange={e => setFuncao(e.target.value)} className="select" style={{ width: '100%' }}>
                {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Horário</FieldLabel>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input" style={{ flex: 1 }} />
                <span style={{ color: 'var(--brown-light)' }}>–</span>
                <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="input" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          {/* Weather */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Condições Meteorológicas</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {WEATHER_OPTIONS.map(w => {
                const Icon = w.icon
                const sel = condicaoMeteo === w.id
                return (
                  <button key={w.id} onClick={() => setCondicaoMeteo(w.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 18px', borderRadius: 10,
                    border: sel ? '2px solid var(--olive-gray)' : '2px solid var(--stone)',
                    background: sel ? 'var(--cream)' : 'var(--white)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <Icon size={22} strokeWidth={1.5} color={sel ? w.color : 'var(--brown-light)'} />
                    <span style={{ fontSize: 11, color: sel ? 'var(--brown)' : 'var(--brown-light)' }}>{w.label}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div>
                <FieldLabel small>Temperatura (°C)</FieldLabel>
                <input type="number" value={temperatura} onChange={e => setTemperatura(e.target.value)} className="input" placeholder="16" />
              </div>
              <div>
                <FieldLabel small>Observações</FieldLabel>
                <input type="text" value={observacoesMeteo} onChange={e => setObservacoesMeteo(e.target.value)} className="input" placeholder="Ex: Manhã com nevoeiro, tarde limpa" />
              </div>
            </div>
          </div>

          {/* Workers */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Trabalhadores em Obra</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel small>Equipa Gavinho</FieldLabel>
                <input type="number" min="0" value={trabGavinho} onChange={e => setTrabGavinho(e.target.value)} className="input" />
              </div>
              <div>
                <FieldLabel small>Subempreiteiros</FieldLabel>
                <input type="number" min="0" value={trabSubs} onChange={e => setTrabSubs(e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Atividades por Especialidade */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Atividades por Especialidade</FieldLabel>

            {atividades.map((ativ, idx) => {
              const color = getEspecialidadeColor(ativ.especialidade_nome)
              return (
                <div key={idx} style={{ padding: 16, background: 'var(--cream)', borderRadius: 12, marginBottom: 10, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: `${color}18`, color, textTransform: 'uppercase'
                    }}>
                      {ativ.especialidade_nome || 'Geral'}
                    </span>
                    {ativ.zona && <span style={{ fontSize: 12, color: 'var(--brown-light)' }}>{ativ.zona}</span>}
                    <button onClick={() => handleRemoveAtividade(idx)} style={{
                      marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4
                    }}>
                      <X size={14} />
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--brown)', lineHeight: 1.5 }}>{ativ.descricao}</p>

                  {/* Activity photos */}
                  {(ativ.fotos?.length > 0) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {ativ.fotos.map((f, fIdx) => (
                        <div key={fIdx} style={{ width: 48, height: 36, borderRadius: 4, overflow: 'hidden' }}>
                          <img src={typeof f === 'string' ? f : f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add photo to activity */}
                  <button onClick={() => { setAtivPhotoTarget(idx); ativPhotoInputRef.current?.click() }}
                    style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--olive-gray)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Camera size={13} /> Foto
                  </button>

                  {ativ.nota && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--brown-light)', fontStyle: 'italic' }}>{ativ.nota}</div>
                  )}
                </div>
              )
            })}

            {showAddAtiv ? (
              <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <FieldLabel small>Especialidade</FieldLabel>
                    <select value={novaAtiv.especialidade_nome} onChange={e => setNovaAtiv({ ...novaAtiv, especialidade_nome: e.target.value })} className="select" style={{ width: '100%' }}>
                      <option value="">Selecionar...</option>
                      {especialidades.map(esp => <option key={esp.id} value={esp.nome}>{esp.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel small>Zona / Localização</FieldLabel>
                    <select value={novaAtiv.zona} onChange={e => setNovaAtiv({ ...novaAtiv, zona: e.target.value })} className="select" style={{ width: '100%' }}>
                      <option value="">Selecionar...</option>
                      {zonas.map(z => <option key={z.id} value={`${z.piso || ''} ${z.piso ? '·' : ''} ${z.nome}`.trim()}>{z.piso ? `${z.piso} · ` : ''}{z.nome}</option>)}
                      <option value="__custom">Outro (escrever)...</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <FieldLabel small>Descrição</FieldLabel>
                  <textarea
                    value={novaAtiv.descricao}
                    onChange={e => setNovaAtiv({ ...novaAtiv, descricao: e.target.value })}
                    className="textarea"
                    rows={3}
                    placeholder="Descreva os trabalhos realizados..."
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <FieldLabel small>Nota (opcional)</FieldLabel>
                  <input
                    type="text"
                    value={novaAtiv.nota}
                    onChange={e => setNovaAtiv({ ...novaAtiv, nota: e.target.value })}
                    className="input"
                    placeholder="Ex: Amostra aprovada pelo cliente"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddAtividade} className="btn btn-primary" style={{ fontSize: 13 }}>Adicionar</button>
                  <button onClick={() => setShowAddAtiv(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddAtiv(true)} className="btn btn-outline" style={{ gap: 6, fontSize: 13 }}>
                <Plus size={14} /> Adicionar Atividade
              </button>
            )}
          </div>

          {/* Não Conformidades */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Não Conformidades</FieldLabel>
            {naoConformidades.map(nc => (
              <div key={nc.id} style={{ padding: 14, background: 'var(--cream)', borderRadius: 10, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: nc.severidade === 'CRÍTICA' ? 'var(--error)' : nc.severidade === 'MAIOR' ? 'var(--error-bg)' : 'var(--warning-bg)',
                  color: nc.severidade === 'CRÍTICA' ? 'white' : nc.severidade === 'MAIOR' ? 'var(--error)' : 'var(--warning)',
                  flexShrink: 0
                }}>
                  {nc.severidade}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--brown)', flex: 1 }}>{nc.descricao}</p>
                <button onClick={() => handleRemoveNC(nc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            ))}

            {showAddNC ? (
              <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {SEVERIDADES_NC.map(s => (
                    <button key={s} onClick={() => setNovaNC({ ...novaNC, severidade: s })} style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: novaNC.severidade === s ? 'none' : '2px solid var(--stone)',
                      background: novaNC.severidade === s ? (s === 'CRÍTICA' ? 'var(--error)' : s === 'MAIOR' ? 'var(--error-bg)' : 'var(--warning-bg)') : 'var(--white)',
                      color: novaNC.severidade === s ? (s === 'CRÍTICA' ? 'white' : s === 'MAIOR' ? 'var(--error)' : 'var(--warning)') : 'var(--brown)'
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <textarea value={novaNC.descricao} onChange={e => setNovaNC({ ...novaNC, descricao: e.target.value })} className="textarea" rows={2} placeholder="Descreva a não conformidade..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <textarea value={novaNC.acaoCorretiva} onChange={e => setNovaNC({ ...novaNC, acaoCorretiva: e.target.value })} className="textarea" rows={2} placeholder="Ação corretiva proposta..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddNC} className="btn btn-primary" style={{ fontSize: 13 }}>Adicionar</button>
                  <button onClick={() => setShowAddNC(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddNC(true)} className="btn btn-outline" style={{ gap: 6, fontSize: 13 }}>
                <Plus size={14} /> Não Conformidade
              </button>
            )}
          </div>

          {/* Pendentes */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Pendentes / Bloqueios</FieldLabel>
            {pendentes.map((p, idx) => (
              <div key={idx} style={{ padding: 12, background: 'var(--cream)', borderRadius: 10, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0,
                  background: p.tipo === 'bloqueio' ? 'var(--error-bg)' : 'var(--warning-bg)',
                  color: p.tipo === 'bloqueio' ? 'var(--error)' : 'var(--warning)'
                }}>
                  {p.tipo === 'bloqueio' ? 'Bloqueio' : p.tipo === 'nc' ? 'NC' : 'Decisão'}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--brown)', flex: 1 }}>{p.descricao}</p>
                <button onClick={() => handleRemovePendente(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            ))}

            {showAddPendente ? (
              <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {['bloqueio', 'decisao'].map(t => (
                    <button key={t} onClick={() => setNovoPendente({ ...novoPendente, tipo: t })} style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: novoPendente.tipo === t ? 'none' : '2px solid var(--stone)',
                      background: novoPendente.tipo === t ? (t === 'bloqueio' ? 'var(--error-bg)' : 'var(--warning-bg)') : 'var(--white)',
                      color: novoPendente.tipo === t ? (t === 'bloqueio' ? 'var(--error)' : 'var(--warning)') : 'var(--brown)'
                    }}>
                      {t === 'bloqueio' ? 'Bloqueio' : 'Decisão'}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <textarea value={novoPendente.descricao} onChange={e => setNovoPendente({ ...novoPendente, descricao: e.target.value })} className="textarea" rows={2} placeholder="Descreva o pendente..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddPendente} className="btn btn-primary" style={{ fontSize: 13 }}>Adicionar</button>
                  <button onClick={() => setShowAddPendente(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddPendente(true)} className="btn btn-outline" style={{ gap: 6, fontSize: 13 }}>
                <Plus size={14} /> Pendente
              </button>
            )}
          </div>

          {/* Global Photos */}
          <div style={{ marginBottom: 24 }}>
            <FieldLabel>Fotografias Gerais</FieldLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {fotos.map((f, idx) => (
                <div key={idx} style={{ width: 80, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <img src={typeof f === 'string' ? f : f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setFotos(fotos.filter((_, i) => i !== idx))} style={{
                    position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
              {photoPreviews.map((preview, idx) => (
                <div key={`new-${idx}`} style={{ width: 80, height: 60, borderRadius: 8, overflow: 'hidden', border: '2px solid var(--olive-gray)' }}>
                  <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <label style={{
                width: 80, height: 60, borderRadius: 8, border: '2px dashed var(--stone-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'var(--white)'
              }}>
                <input type="file" accept="image/*" multiple onChange={handleAddFoto} style={{ display: 'none' }} ref={fileInputRef} />
                <Camera size={20} color="var(--brown-light)" />
              </label>
            </div>
          </div>

          {/* Hidden file input for activity photos */}
          <input type="file" accept="image/*" multiple onChange={handleAtivPhoto} style={{ display: 'none' }} ref={ativPhotoInputRef} />
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          bottom: 0,
          background: 'var(--white)',
          borderRadius: '0 0 16px 16px'
        }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancelar</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleSave('rascunho')} disabled={saving} className="btn btn-outline" style={{ gap: 6, fontSize: 13 }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Rascunho
            </button>
            <button onClick={() => handleSave('submetido')} disabled={saving} className="btn btn-primary" style={{ gap: 6, fontSize: 13, background: 'var(--olive-gray)' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              Submeter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// UTILITY COMPONENTS
// =====================================================

function FieldLabel({ children, small }) {
  return (
    <label style={{
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: 'var(--brown-light)',
      marginBottom: small ? 4 : 8,
      display: 'block'
    }}>
      {children}
    </label>
  )
}
