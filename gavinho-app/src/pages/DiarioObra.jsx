// =====================================================
// DIÁRIO DE OBRA — Timeline View + Formulário
// Vista cronológica de registos diários com sidebar
// =====================================================

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Sun, Cloud, CloudRain, Wind, CloudFog,
  Plus, Trash2, Edit2, Check, X, Upload, ChevronRight,
  Save, Send, Clock, Users, AlertTriangle, Camera, ArrowRight,
  Download, Calendar, ChevronLeft, Image, FileText, MessageSquare,
  MapPin, Thermometer, Eye
} from 'lucide-react'

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Quattrocento Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
}

const C = {
  success: '#5B7B6A',
  warning: '#C4956A',
  danger: '#A65D57',
  info: '#7A8B9E',
  dark: '#2C2C2B',
  muted: '#9A978A',
  light: '#6B6B6B',
  border: '#E5E2D9',
  cream: '#F5F3EB',
  white: '#FFFFFF',
  bg: '#FAF8F4',
}

const WEATHER_OPTIONS = [
  { id: 'sol', label: 'Sol', icon: Sun, emoji: '☀️', desc: 'Céu limpo' },
  { id: 'nublado', label: 'Nublado', icon: Cloud, emoji: '☁️', desc: 'Nublado' },
  { id: 'chuva', label: 'Chuva', icon: CloudRain, emoji: '🌧️', desc: 'Chuva' },
  { id: 'vento', label: 'Vento', icon: Wind, emoji: '💨', desc: 'Ventoso' },
  { id: 'neblina', label: 'Neblina', icon: CloudFog, emoji: '🌫️', desc: 'Neblina' },
]

const FUNCOES = [
  'Encarregado de Obra',
  'Diretor de Obra',
  'Engenheiro',
  'Técnico de Segurança',
  'Fiscal de Obra'
]

const SEVERIDADES = ['Baixa', 'Média', 'Alta']
const SEVERIDADES_NC = ['MENOR', 'MAIOR', 'CRÍTICA']

const SPECIALTY_COLORS = {
  'CARPINTARIA': { bg: 'rgba(196,149,106,0.12)', color: '#B8834A' },
  'ELETRICIDADE': { bg: 'rgba(122,139,158,0.12)', color: '#5A7A9E' },
  'PEDRA NATURAL': { bg: 'rgba(154,151,138,0.12)', color: '#7A7768' },
  'ALVENARIA': { bg: 'rgba(91,123,106,0.12)', color: '#4A6B5A' },
  'AVAC': { bg: 'rgba(166,93,87,0.12)', color: '#A65D57' },
  'CANALIZAÇÃO': { bg: 'rgba(107,107,107,0.12)', color: '#5A5A5A' },
  'PINTURA': { bg: 'rgba(196,149,106,0.12)', color: '#B8834A' },
  'SERRALHARIA': { bg: 'rgba(122,139,158,0.12)', color: '#5A7A9E' },
  'IMPERMEABILIZAÇÃO': { bg: 'rgba(91,123,106,0.12)', color: '#4A6B5A' },
}

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const TABS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'diario', label: 'Diário' },
  { key: 'fotografias', label: 'Fotografias' },
  { key: 'nao_conformidades', label: 'Não Conformidades' },
  { key: 'documentos', label: 'Documentos' },
]

function getSpecialtyTag(text) {
  if (!text) return null
  const upper = text.toUpperCase()
  for (const key of Object.keys(SPECIALTY_COLORS)) {
    if (upper.includes(key)) return key
  }
  return null
}

function getDefaultSpecialtyColors(tag) {
  return SPECIALTY_COLORS[tag] || { bg: 'rgba(154,151,138,0.12)', color: '#7A7768' }
}

export default function DiarioObra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const dataParam = searchParams.get('data')

  // State principal
  const [obra, setObra] = useState(null)
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [diarioId, setDiarioId] = useState(null)
  const [activeTab, setActiveTab] = useState('diario')

  // All diary entries for timeline
  const [allEntries, setAllEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  // Calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())

  // Form state
  const [selectedObra, setSelectedObra] = useState(id || '')
  const [data, setData] = useState(dataParam || new Date().toISOString().split('T')[0])
  const [funcao, setFuncao] = useState('Encarregado de Obra')

  // Secção 1: Condições Meteorológicas
  const [condicaoMeteo, setCondicaoMeteo] = useState('sol')
  const [temperatura, setTemperatura] = useState('')
  const [observacoesMeteo, setObservacoesMeteo] = useState('')

  // Secção 2: Trabalhadores
  const [trabalhadores, setTrabalhadores] = useState([])
  const [showAddTrabalhador, setShowAddTrabalhador] = useState(false)
  const [novoTrabalhador, setNovoTrabalhador] = useState({ nome: '', funcao: '', tipo: 'Equipa', estado: 'PRESENTE' })

  // Secção 3: Tarefas Executadas
  const [tarefas, setTarefas] = useState([])
  const [showAddTarefa, setShowAddTarefa] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', descricao: '', percentagem: '0', concluida: false })

  // Secção 4: Ocorrências
  const [ocorrencias, setOcorrencias] = useState([])
  const [novaOcorrencia, setNovaOcorrencia] = useState({ severidade: 'Baixa', descricao: '' })

  // Secção 5: Não Conformidades
  const [naoConformidades, setNaoConformidades] = useState([])
  const [showAddNC, setShowAddNC] = useState(false)
  const [novaNC, setNovaNC] = useState({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })
  const [editingNC, setEditingNC] = useState(null)

  // Secção 6: Fotos
  const [fotos, setFotos] = useState([])

  // Secção 7: Próximos Passos
  const [proximosPassos, setProximosPassos] = useState([])
  const [showAddPasso, setShowAddPasso] = useState(false)
  const [novoPasso, setNovoPasso] = useState('')

  // Carregar dados iniciais
  useEffect(() => {
    fetchObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      fetchObraDetails()
      fetchAllEntries()
    }
  }, [selectedObra])

  const fetchObras = async () => {
    const { data } = await supabase
      .from('obras')
      .select('id, codigo, nome, morada, diretor_obra')
      .order('codigo')
    if (data) setObras(data)
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

  const fetchAllEntries = async () => {
    setLoadingEntries(true)
    const { data: entries } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', selectedObra)
      .order('data', { ascending: false })
    if (entries) setAllEntries(entries)
    setLoadingEntries(false)
  }

  const fetchExistingDiario = async (targetDate) => {
    const { data: diario } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', selectedObra)
      .eq('data', targetDate)
      .single()

    if (diario) {
      setDiarioId(diario.id)
      setFuncao(diario.funcao || 'Encarregado de Obra')
      setCondicaoMeteo(diario.condicoes_meteo?.toLowerCase() || 'sol')
      setTemperatura(diario.temperatura || '')
      setObservacoesMeteo(diario.observacoes_meteo || '')
      setTrabalhadores(diario.trabalhadores || [])
      setTarefas(diario.tarefas || [])
      setOcorrencias(diario.ocorrencias || [])
      setNaoConformidades(diario.nao_conformidades || [])
      setFotos(diario.fotos || [])
      setProximosPassos(diario.proximos_passos || [])
      setLastSaved(diario.updated_at ? new Date(diario.updated_at) : null)
    } else {
      resetForm()
    }
  }

  const resetForm = () => {
    setDiarioId(null)
    setCondicaoMeteo('sol')
    setTemperatura('')
    setObservacoesMeteo('')
    setTrabalhadores([])
    setTarefas([])
    setOcorrencias([])
    setNaoConformidades([])
    setFotos([])
    setProximosPassos([])
    setLastSaved(null)
  }

  // Calcular estatísticas de trabalhadores
  const trabPresentes = trabalhadores.filter(t => t.estado === 'PRESENTE').length
  const trabAusentes = trabalhadores.filter(t => t.estado === 'AUSENTE').length
  const trabSubempreiteiros = trabalhadores.filter(t => t.tipo === 'Subempreiteiro' && t.estado === 'PRESENTE').length

  // Handlers de Trabalhadores
  const handleAddTrabalhador = () => {
    if (!novoTrabalhador.nome || !novoTrabalhador.funcao) return
    setTrabalhadores([...trabalhadores, { ...novoTrabalhador, id: Date.now() }])
    setNovoTrabalhador({ nome: '', funcao: '', tipo: 'Equipa', estado: 'PRESENTE' })
    setShowAddTrabalhador(false)
  }

  const handleRemoveTrabalhador = (tid) => {
    setTrabalhadores(trabalhadores.filter(t => t.id !== tid))
  }

  const handleToggleTrabalhadorEstado = (tid) => {
    setTrabalhadores(trabalhadores.map(t =>
      t.id === tid ? { ...t, estado: t.estado === 'PRESENTE' ? 'AUSENTE' : 'PRESENTE' } : t
    ))
  }

  // Handlers de Tarefas
  const handleAddTarefa = () => {
    if (!novaTarefa.titulo) return
    setTarefas([...tarefas, { ...novaTarefa, id: Date.now() }])
    setNovaTarefa({ titulo: '', descricao: '', percentagem: '0', concluida: false })
    setShowAddTarefa(false)
  }

  const handleToggleTarefa = (tid) => {
    setTarefas(tarefas.map(t =>
      t.id === tid ? { ...t, concluida: !t.concluida } : t
    ))
  }

  const handleTarefaPercentagem = (tid, percentagem) => {
    setTarefas(tarefas.map(t =>
      t.id === tid ? { ...t, percentagem } : t
    ))
  }

  const handleRemoveTarefa = (tid) => {
    setTarefas(tarefas.filter(t => t.id !== tid))
  }

  // Handlers de Ocorrências
  const handleAddOcorrencia = () => {
    if (!novaOcorrencia.descricao) return
    setOcorrencias([...ocorrencias, { ...novaOcorrencia, id: Date.now() }])
    setNovaOcorrencia({ severidade: 'Baixa', descricao: '' })
  }

  const handleRemoveOcorrencia = (oid) => {
    setOcorrencias(ocorrencias.filter(o => o.id !== oid))
  }

  // Handlers de Não Conformidades
  const handleAddNC = () => {
    if (!novaNC.descricao) return
    if (editingNC) {
      setNaoConformidades(naoConformidades.map(nc =>
        nc.id === editingNC.id ? { ...novaNC, id: nc.id } : nc
      ))
      setEditingNC(null)
    } else {
      setNaoConformidades([...naoConformidades, { ...novaNC, id: Date.now() }])
    }
    setNovaNC({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })
    setShowAddNC(false)
  }

  const handleEditNC = (nc) => {
    setNovaNC({ severidade: nc.severidade, descricao: nc.descricao, acaoCorretiva: nc.acaoCorretiva })
    setEditingNC(nc)
    setShowAddNC(true)
  }

  const handleRemoveNC = (ncid) => {
    setNaoConformidades(naoConformidades.filter(nc => nc.id !== ncid))
  }

  // Handlers de Fotos
  const handleAddFoto = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setFotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          url: ev.target.result,
          descricao: ''
        }])
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFotoDescricao = (fid, descricao) => {
    setFotos(fotos.map(f => f.id === fid ? { ...f, descricao } : f))
  }

  const handleRemoveFoto = (fid) => {
    setFotos(fotos.filter(f => f.id !== fid))
  }

  // Handlers de Próximos Passos
  const handleAddPasso = () => {
    if (!novoPasso) return
    setProximosPassos([...proximosPassos, { id: Date.now(), texto: novoPasso }])
    setNovoPasso('')
    setShowAddPasso(false)
  }

  const handleRemovePasso = (pid) => {
    setProximosPassos(proximosPassos.filter(p => p.id !== pid))
  }

  // Guardar Rascunho
  const handleSaveRascunho = async () => {
    if (!selectedObra) return
    setSaving(true)

    const diarioData = {
      obra_id: selectedObra,
      data,
      funcao,
      condicoes_meteo: condicaoMeteo,
      temperatura: temperatura ? parseFloat(temperatura) : null,
      observacoes_meteo: observacoesMeteo,
      trabalhadores,
      tarefas,
      ocorrencias,
      nao_conformidades: naoConformidades,
      fotos,
      proximos_passos: proximosPassos,
      status: 'rascunho',
      updated_at: new Date().toISOString()
    }

    if (diarioId) {
      await supabase.from('obra_diario').update(diarioData).eq('id', diarioId)
    } else {
      const { data: newDiario } = await supabase.from('obra_diario').insert([diarioData]).select().single()
      if (newDiario) setDiarioId(newDiario.id)
    }

    setLastSaved(new Date())
    setSaving(false)
  }

  // Submeter Registo
  const handleSubmit = async () => {
    if (!selectedObra) return
    setSaving(true)

    const diarioData = {
      obra_id: selectedObra,
      data,
      funcao,
      condicoes_meteo: condicaoMeteo,
      temperatura: temperatura ? parseFloat(temperatura) : null,
      observacoes_meteo: observacoesMeteo,
      trabalhadores,
      trabalhadores_gavinho: trabalhadores.filter(t => t.tipo === 'Equipa' && t.estado === 'PRESENTE').length,
      trabalhadores_subempreiteiros: trabSubempreiteiros,
      tarefas,
      ocorrencias,
      nao_conformidades: naoConformidades,
      fotos,
      proximos_passos: proximosPassos,
      status: 'submetido',
      updated_at: new Date().toISOString()
    }

    if (diarioId) {
      await supabase.from('obra_diario').update(diarioData).eq('id', diarioId)
    } else {
      await supabase.from('obra_diario').insert([diarioData])
    }

    setSaving(false)
    setShowFormModal(false)
    fetchAllEntries()
  }

  // Open form for new entry
  const handleNewEntry = () => {
    resetForm()
    setData(new Date().toISOString().split('T')[0])
    setEditingEntry(null)
    setDiarioId(null)
    setShowFormModal(true)
  }

  // Open form to edit existing entry
  const handleEditEntry = async (entry) => {
    setEditingEntry(entry)
    setData(entry.data)
    setDiarioId(entry.id)
    setFuncao(entry.funcao || 'Encarregado de Obra')
    setCondicaoMeteo(entry.condicoes_meteo?.toLowerCase() || 'sol')
    setTemperatura(entry.temperatura || '')
    setObservacoesMeteo(entry.observacoes_meteo || '')
    setTrabalhadores(entry.trabalhadores || [])
    setTarefas(entry.tarefas || [])
    setOcorrencias(entry.ocorrencias || [])
    setNaoConformidades(entry.nao_conformidades || [])
    setFotos(entry.fotos || [])
    setProximosPassos(entry.proximos_passos || [])
    setLastSaved(entry.updated_at ? new Date(entry.updated_at) : null)
    setShowFormModal(true)
  }

  // Week summary stats
  const weekSummary = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 4) // Friday

    const weekEntries = allEntries.filter(e => {
      const d = new Date(e.data)
      return d >= startOfWeek && d <= endOfWeek
    })

    const totalWorkers = weekEntries.reduce((sum, e) => {
      const present = (e.trabalhadores || []).filter(t => t.estado === 'PRESENTE').length
      return sum + present
    }, 0)

    const totalPhotos = weekEntries.reduce((sum, e) => sum + (e.fotos || []).length, 0)
    const totalIncidents = weekEntries.reduce((sum, e) => sum + (e.ocorrencias || []).length, 0)

    return {
      diasRegistados: weekEntries.length,
      diasTotal: 5,
      mediaObra: weekEntries.length > 0 ? (totalWorkers / weekEntries.length).toFixed(1) : '0',
      fotografias: totalPhotos,
      incidentes: totalIncidents,
    }
  }, [allEntries])

  // Days with entries for calendar
  const entryDates = useMemo(() => {
    return new Set(allEntries.map(e => e.data))
  }, [allEntries])

  // Calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday-start
    const days = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
    return days
  }, [calendarMonth, calendarYear])

  // Pending items for the obra
  const pendingItems = useMemo(() => {
    const items = []
    allEntries.forEach(e => {
      (e.ocorrencias || []).forEach(o => {
        if (o.severidade === 'Alta') {
          items.push({ type: 'bloqueio', text: o.descricao, date: e.data, color: C.danger })
        }
      });
      (e.nao_conformidades || []).forEach(nc => {
        items.push({ type: 'nc', text: nc.descricao, date: e.data, color: C.warning })
      });
      (e.proximos_passos || []).forEach(p => {
        items.push({ type: 'decisao', text: p.texto, date: e.data, color: C.dark })
      })
    })
    return items.slice(0, 5)
  }, [allEntries])

  // No obra selected — show selector
  if (!selectedObra) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: '32px', fontWeight: 600, color: C.dark, marginBottom: '8px' }}>
          Diário de Obra
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: '14px', color: C.light, marginBottom: '32px' }}>
          Selecione a obra para ver o diário
        </p>
        <select
          value={selectedObra}
          onChange={(e) => {
            setSelectedObra(e.target.value)
            if (e.target.value) navigate(`/obras/${e.target.value}/diario`)
          }}
          style={{
            width: '100%', padding: '12px 16px', border: `1px solid ${C.border}`,
            borderRadius: '10px', fontSize: '14px', fontFamily: FONTS.body,
            background: C.white, color: C.dark, cursor: 'pointer',
          }}
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
        <div style={{
          width: '40px', height: '40px', border: `3px solid ${C.border}`,
          borderTopColor: C.success, borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return { day: d.getDate(), month: MESES[d.getMonth()], weekday: DIAS_SEMANA[d.getDay()], year: d.getFullYear() }
  }

  const getWeatherInfo = (meteo) => {
    const w = WEATHER_OPTIONS.find(o => o.id === meteo?.toLowerCase()) || WEATHER_OPTIONS[0]
    return w
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* ═══ BREADCRUMB ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '16px',
        fontFamily: FONTS.body, fontSize: '12px',
      }}>
        <Link to="/obras" style={{ color: C.muted, textDecoration: 'none' }}>Obras</Link>
        <ChevronRight size={12} style={{ color: C.muted }} />
        {obra && (
          <>
            <Link to={`/obras/${obra.id}`} style={{ color: C.muted, textDecoration: 'none' }}>{obra.codigo}</Link>
            <ChevronRight size={12} style={{ color: C.muted }} />
          </>
        )}
        <span style={{ color: C.dark, fontWeight: 600 }}>Diário de Obra</span>
      </div>

      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.success }} />
          <span style={{
            fontFamily: FONTS.mono, fontSize: '12px', fontWeight: 700,
            color: C.light, letterSpacing: '0.04em',
          }}>
            {obra?.codigo}
          </span>
        </div>
        <h1 style={{
          fontFamily: FONTS.heading,
          fontSize: '36px',
          fontWeight: 600,
          color: C.dark,
          letterSpacing: '-0.5px',
          margin: 0,
          lineHeight: 1.1,
        }}>
          {obra?.nome || 'Diário de Obra'}
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginTop: '8px',
        }}>
          {obra?.morada && (
            <span style={{
              fontFamily: FONTS.body, fontSize: '13px', color: C.light,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <MapPin size={12} style={{ color: C.muted }} />
              {obra.morada}
            </span>
          )}
          {obra?.diretor_obra && (
            <span style={{
              fontFamily: FONTS.body, fontSize: '13px', color: C.light,
            }}>
              Dir. Obra: <strong style={{ color: C.dark }}>{obra.diretor_obra}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${C.dark}` : '2px solid transparent',
                fontFamily: FONTS.body,
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? C.dark : C.light,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: C.white,
            border: `1px solid ${C.border}`, borderRadius: '8px',
            fontFamily: FONTS.body, fontSize: '12px', fontWeight: 500,
            color: C.light, cursor: 'pointer',
          }}>
            <Download size={13} />
            Exportar
          </button>
          <button
            onClick={handleNewEntry}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', background: C.dark,
              border: 'none', borderRadius: '8px',
              fontFamily: FONTS.body, fontSize: '12px', fontWeight: 600,
              color: C.white, cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            Nova Entrada
          </button>
        </div>
      </div>

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

        {/* ── LEFT: TIMELINE ── */}
        <div>
          {loadingEntries ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{
                width: '32px', height: '32px', border: `3px solid ${C.border}`,
                borderTopColor: C.success, borderRadius: '50%', animation: 'spin 1s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontFamily: FONTS.body, fontSize: '13px', color: C.light }}>A carregar entradas...</p>
            </div>
          ) : allEntries.length === 0 ? (
            <div style={{
              padding: '64px 24px', textAlign: 'center',
              background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`,
            }}>
              <FileText size={40} style={{ color: C.border, marginBottom: '12px' }} />
              <p style={{ fontFamily: FONTS.body, fontSize: '14px', color: C.light, marginBottom: '16px' }}>
                Sem registos no diário de obra
              </p>
              <button
                onClick={handleNewEntry}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', background: C.dark,
                  border: 'none', borderRadius: '8px',
                  fontFamily: FONTS.body, fontSize: '13px', fontWeight: 600,
                  color: C.white, cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Criar Primeira Entrada
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '28px' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', left: '8px', top: '6px', bottom: '0',
                width: '2px', background: C.border,
              }} />

              {allEntries.map((entry, idx) => {
                const dt = formatDate(entry.data)
                const weather = getWeatherInfo(entry.condicoes_meteo)
                const workers = (entry.trabalhadores || []).filter(t => t.estado === 'PRESENTE').length
                const photosCount = (entry.fotos || []).length
                const tasks = entry.tarefas || []
                const incidents = entry.ocorrencias || []
                const ncs = entry.nao_conformidades || []
                const notes = entry.observacoes_meteo
                const isFirst = idx === 0

                return (
                  <div key={entry.id} style={{ position: 'relative', marginBottom: '32px' }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute', left: '-24px', top: '6px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: isFirst ? C.success : C.white,
                      border: isFirst ? `2px solid ${C.success}` : `2px solid ${C.border}`,
                      zIndex: 1,
                    }} />

                    {/* Day card */}
                    <div style={{
                      background: C.white,
                      borderRadius: '14px',
                      border: `1px solid ${C.border}`,
                      overflow: 'hidden',
                      boxShadow: isFirst ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    }}>
                      {/* Date header */}
                      <div style={{
                        padding: '18px 22px',
                        borderBottom: `1px solid ${C.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <h2 style={{
                            fontFamily: FONTS.heading,
                            fontSize: '24px',
                            fontWeight: 600,
                            color: C.dark,
                            margin: 0,
                            lineHeight: 1.2,
                          }}>
                            {dt.day} {dt.month}
                          </h2>
                          <span style={{
                            fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            color: C.muted,
                          }}>
                            {dt.weekday}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontFamily: FONTS.body, fontSize: '13px', color: C.light,
                            display: 'flex', alignItems: 'center', gap: '5px',
                          }}>
                            {weather.emoji} {entry.temperatura ? `${entry.temperatura}°C` : ''} {entry.temperatura ? '·' : ''} {weather.desc}
                          </span>
                          <button
                            onClick={() => handleEditEntry(entry)}
                            style={{
                              padding: '5px 10px', background: 'transparent',
                              border: `1px solid ${C.border}`, borderRadius: '6px',
                              cursor: 'pointer', color: C.muted,
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontFamily: FONTS.body, fontSize: '11px',
                            }}
                          >
                            <Edit2 size={11} /> Editar
                          </button>
                        </div>
                      </div>

                      {/* Stats bar */}
                      <div style={{
                        padding: '10px 22px',
                        background: C.cream,
                        display: 'flex',
                        gap: '20px',
                        fontSize: '12px',
                        fontFamily: FONTS.body,
                        color: C.light,
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={13} style={{ color: C.muted }} />
                          <strong style={{ color: C.dark }}>{workers}</strong> em obra
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={13} style={{ color: C.muted }} />
                          08:00 — 17:30
                        </span>
                        {photosCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Camera size={13} style={{ color: C.muted }} />
                            <strong style={{ color: C.dark }}>{photosCount}</strong> fotos
                          </span>
                        )}
                      </div>

                      {/* Tasks/Activities */}
                      <div style={{ padding: '16px 22px' }}>
                        {tasks.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            {tasks.map((task, tIdx) => {
                              const specialty = getSpecialtyTag(task.titulo) || getSpecialtyTag(task.descricao)
                              const specColors = specialty ? getDefaultSpecialtyColors(specialty) : null
                              return (
                                <div key={task.id || tIdx} style={{
                                  padding: '10px 0',
                                  borderBottom: tIdx < tasks.length - 1 ? `1px solid ${C.border}` : 'none',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    {specColors && (
                                      <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: specColors.bg,
                                        color: specColors.color,
                                        fontFamily: FONTS.body,
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}>
                                        {specialty}
                                      </span>
                                    )}
                                    <span style={{
                                      fontFamily: FONTS.body, fontSize: '13px',
                                      fontWeight: 600, color: C.dark,
                                    }}>
                                      {task.titulo}
                                    </span>
                                    {task.concluida && (
                                      <Check size={13} style={{ color: C.success }} />
                                    )}
                                    {task.percentagem && task.percentagem !== '0' && !task.concluida && (
                                      <span style={{
                                        fontFamily: FONTS.mono, fontSize: '10px',
                                        color: C.muted, fontWeight: 600,
                                      }}>
                                        {task.percentagem}%
                                      </span>
                                    )}
                                  </div>
                                  {task.descricao && (
                                    <p style={{
                                      fontFamily: FONTS.body, fontSize: '12px',
                                      color: C.light, margin: '2px 0 0', lineHeight: 1.5,
                                    }}>
                                      {task.descricao}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Photos row */}
                        {(entry.fotos || []).length > 0 && (
                          <div style={{
                            display: 'flex', gap: '8px', marginBottom: '14px',
                            overflow: 'hidden',
                          }}>
                            {(entry.fotos || []).slice(0, 4).map((foto, fIdx) => (
                              <div key={fIdx} style={{
                                width: '80px', height: '60px', borderRadius: '8px',
                                overflow: 'hidden', flexShrink: 0,
                              }}>
                                <img src={foto.url} alt="" style={{
                                  width: '100%', height: '100%', objectFit: 'cover',
                                }} />
                              </div>
                            ))}
                            {(entry.fotos || []).length > 4 && (
                              <div style={{
                                width: '80px', height: '60px', borderRadius: '8px',
                                background: C.cream, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontFamily: FONTS.body, fontSize: '12px',
                                fontWeight: 700, color: C.muted, flexShrink: 0,
                              }}>
                                +{(entry.fotos || []).length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Incidents/warnings */}
                        {incidents.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            {incidents.map((inc, iIdx) => (
                              <div key={iIdx} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px', borderRadius: '8px',
                                background: inc.severidade === 'Alta' ? 'rgba(166,93,87,0.06)' : 'rgba(196,149,106,0.06)',
                                marginBottom: iIdx < incidents.length - 1 ? '6px' : 0,
                              }}>
                                <AlertTriangle size={13} style={{
                                  color: inc.severidade === 'Alta' ? C.danger : C.warning,
                                  flexShrink: 0,
                                }} />
                                <span style={{
                                  fontFamily: FONTS.body, fontSize: '12px',
                                  color: inc.severidade === 'Alta' ? C.danger : C.warning,
                                  fontWeight: 500,
                                }}>
                                  {inc.descricao}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Non-conformities */}
                        {ncs.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            {ncs.map((nc, nIdx) => (
                              <div key={nIdx} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px', borderRadius: '8px',
                                background: 'rgba(166,93,87,0.06)',
                                marginBottom: nIdx < ncs.length - 1 ? '6px' : 0,
                              }}>
                                <span style={{
                                  padding: '2px 6px', borderRadius: '4px',
                                  background: nc.severidade === 'CRÍTICA' ? C.danger : nc.severidade === 'MAIOR' ? 'rgba(166,93,87,0.12)' : 'rgba(196,149,106,0.12)',
                                  color: nc.severidade === 'CRÍTICA' ? C.white : nc.severidade === 'MAIOR' ? C.danger : C.warning,
                                  fontFamily: FONTS.body, fontSize: '9px', fontWeight: 700,
                                  flexShrink: 0,
                                }}>
                                  {nc.severidade}
                                </span>
                                <span style={{
                                  fontFamily: FONTS.body, fontSize: '12px', color: C.dark,
                                }}>
                                  {nc.descricao}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {entry.observacoes_meteo && (
                          <div style={{
                            padding: '12px 16px',
                            background: C.cream,
                            borderRadius: '8px',
                            borderLeft: `3px solid ${C.border}`,
                            marginBottom: '14px',
                          }}>
                            <span style={{
                              fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              color: C.muted, display: 'block', marginBottom: '4px',
                            }}>
                              NOTAS DO DIA
                            </span>
                            <p style={{
                              fontFamily: FONTS.body, fontSize: '12px',
                              color: C.light, margin: 0, lineHeight: 1.5,
                              fontStyle: 'italic',
                            }}>
                              {entry.observacoes_meteo}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Entry footer */}
                      <div style={{
                        padding: '10px 22px',
                        borderTop: `1px solid ${C.border}`,
                        fontFamily: FONTS.body, fontSize: '11px', color: C.muted,
                      }}>
                        Registado por <strong style={{ color: C.dark }}>{entry.funcao || 'Encarregado de Obra'}</strong>
                        {entry.updated_at && (
                          <> · {new Date(entry.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} {entry.updated_at ? new Date(entry.updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}</>
                        )}
                        {entry.status === 'rascunho' && (
                          <span style={{
                            marginLeft: '8px', padding: '2px 8px',
                            background: 'rgba(196,149,106,0.12)', borderRadius: '4px',
                            color: C.warning, fontWeight: 600, fontSize: '10px',
                          }}>
                            RASCUNHO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Week Summary */}
          <div style={{
            background: C.white, borderRadius: '14px',
            border: `1px solid ${C.border}`, padding: '20px',
          }}>
            <span style={{
              fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.muted, display: 'block', marginBottom: '16px',
            }}>
              RESUMO DA SEMANA
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'DIAS REGISTADOS', value: `${weekSummary.diasRegistados}/${weekSummary.diasTotal}`, color: C.dark },
                { label: 'MÉDIA EM OBRA', value: weekSummary.mediaObra, color: C.dark },
                { label: 'FOTOGRAFIAS', value: weekSummary.fotografias, color: C.dark },
                { label: 'INCIDENTES', value: weekSummary.incidentes, color: weekSummary.incidentes > 0 ? C.danger : C.dark },
              ].map(item => (
                <div key={item.label}>
                  <span style={{
                    fontFamily: FONTS.body, fontSize: '9px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: C.muted, display: 'block', marginBottom: '4px',
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontFamily: FONTS.body, fontSize: '22px', fontWeight: 700,
                    color: item.color, letterSpacing: '-0.5px',
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div style={{
            background: C.white, borderRadius: '14px',
            border: `1px solid ${C.border}`, padding: '20px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '14px',
            }}>
              <button
                onClick={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
                  else setCalendarMonth(m => m - 1)
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '4px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{
                fontFamily: FONTS.body, fontSize: '12px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: C.dark,
              }}>
                {MESES[calendarMonth].toUpperCase()} {calendarYear}
              </span>
              <button
                onClick={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
                  else setCalendarMonth(m => m + 1)
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '4px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontFamily: FONTS.body,
                  fontSize: '10px', fontWeight: 700, color: C.muted,
                  padding: '4px 0',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasEntry = entryDates.has(dateStr)
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={i}
                    style={{
                      textAlign: 'center',
                      padding: '6px 0',
                      borderRadius: '6px',
                      background: isToday ? C.dark : 'transparent',
                      cursor: hasEntry ? 'pointer' : 'default',
                    }}
                  >
                    <span style={{
                      fontFamily: FONTS.body, fontSize: '12px',
                      fontWeight: isToday || hasEntry ? 600 : 400,
                      color: isToday ? C.white : hasEntry ? C.dark : C.muted,
                    }}>
                      {day}
                    </span>
                    {hasEntry && !isToday && (
                      <div style={{
                        width: '4px', height: '4px', borderRadius: '50%',
                        background: C.success, margin: '2px auto 0',
                      }} />
                    )}
                    {hasEntry && isToday && (
                      <div style={{
                        width: '4px', height: '4px', borderRadius: '50%',
                        background: C.white, margin: '2px auto 0',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div style={{
              background: C.white, borderRadius: '14px',
              border: `1px solid ${C.border}`, padding: '20px',
            }}>
              <span style={{
                fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: C.muted, display: 'block', marginBottom: '14px',
              }}>
                PENDENTES NESTA OBRA
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingItems.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: item.color, flexShrink: 0, marginTop: '5px',
                    }} />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: item.color,
                      }}>
                        {item.type === 'bloqueio' ? 'Bloqueio' : item.type === 'nc' ? 'NC' : 'Decisão'}
                      </span>
                      <p style={{
                        fontFamily: FONTS.body, fontSize: '12px',
                        color: C.dark, margin: '2px 0 0', lineHeight: 1.4,
                      }}>
                        {item.text}
                      </p>
                      <span style={{
                        fontFamily: FONTS.body, fontSize: '10px', color: C.muted,
                      }}>
                        {item.type === 'bloqueio' ? 'Desde' : 'Registada'} {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showFormModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000, padding: '40px 20px', overflowY: 'auto',
        }}>
          <div style={{
            background: C.white, borderRadius: '16px',
            width: '100%', maxWidth: '800px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: C.white,
              borderRadius: '16px 16px 0 0', zIndex: 1,
            }}>
              <div>
                <h3 style={{
                  margin: 0, fontSize: '22px', fontWeight: 600,
                  fontFamily: FONTS.heading, color: C.dark,
                }}>
                  {editingEntry ? 'Editar Registo' : 'Nova Entrada'}
                </h3>
                <p style={{ margin: '2px 0 0', fontFamily: FONTS.body, fontSize: '12px', color: C.light }}>
                  {obra?.codigo} — {obra?.nome}
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                padding: '6px', borderRadius: '8px',
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {/* Meta row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>DATA</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>FUNÇÃO</label>
                  <select value={funcao} onChange={(e) => setFuncao(e.target.value)} style={inputStyle}>
                    {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Section 1: Weather */}
              <FormSection title="Condições Meteorológicas">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {WEATHER_OPTIONS.map(w => {
                    const Icon = w.icon
                    const isSelected = condicaoMeteo === w.id
                    return (
                      <button
                        key={w.id}
                        onClick={() => setCondicaoMeteo(w.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          padding: '12px 18px',
                          background: isSelected ? 'rgba(91,123,106,0.08)' : C.white,
                          border: isSelected ? `2px solid ${C.success}` : `1px solid ${C.border}`,
                          borderRadius: '10px', cursor: 'pointer',
                        }}
                      >
                        <Icon size={22} strokeWidth={1.5} color={isSelected ? C.success : C.muted} />
                        <span style={{ fontSize: '11px', fontFamily: FONTS.body, color: isSelected ? C.dark : C.light }}>{w.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>TEMPERATURA (°C)</label>
                    <input type="number" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ex: 16" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>OBSERVAÇÕES</label>
                    <input type="text" value={observacoesMeteo} onChange={(e) => setObservacoesMeteo(e.target.value)} placeholder="Ex: Manhã com nevoeiro, tarde limpa" style={inputStyle} />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Workers */}
              <FormSection title="Trabalhadores em Obra">
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'PRESENTES', value: trabPresentes, color: C.success },
                    { label: 'AUSENTES', value: trabAusentes, color: C.danger },
                    { label: 'SUBEMPR.', value: trabSubempreiteiros, color: C.info },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, background: C.cream, borderRadius: '10px',
                      padding: '12px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: FONTS.body, fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {trabalhadores.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', borderBottom: `1px solid ${C.border}`,
                    fontFamily: FONTS.body, fontSize: '13px',
                  }}>
                    <span style={{ flex: 1, color: C.dark }}>{t.nome}</span>
                    <span style={{ color: C.light, fontSize: '12px' }}>{t.funcao}</span>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                      background: t.estado === 'PRESENTE' ? 'rgba(91,123,106,0.10)' : 'rgba(166,93,87,0.10)',
                      color: t.estado === 'PRESENTE' ? C.success : C.danger,
                      cursor: 'pointer',
                    }} onClick={() => handleToggleTrabalhadorEstado(t.id)}>
                      {t.estado}
                    </span>
                    <button onClick={() => handleRemoveTrabalhador(t.id)} style={iconBtnStyle}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {showAddTrabalhador ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '8px', marginTop: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Nome</label>
                      <input type="text" value={novoTrabalhador.nome} onChange={(e) => setNovoTrabalhador({...novoTrabalhador, nome: e.target.value})} style={inputStyle} placeholder="Nome" />
                    </div>
                    <div>
                      <label style={labelStyle}>Função</label>
                      <input type="text" value={novoTrabalhador.funcao} onChange={(e) => setNovoTrabalhador({...novoTrabalhador, funcao: e.target.value})} style={inputStyle} placeholder="Função" />
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo</label>
                      <select value={novoTrabalhador.tipo} onChange={(e) => setNovoTrabalhador({...novoTrabalhador, tipo: e.target.value})} style={inputStyle}>
                        <option value="Equipa">Equipa</option>
                        <option value="Subempreiteiro">Subempreiteiro</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={handleAddTrabalhador} style={{ ...smallBtnStyle, background: C.dark, color: C.white }}><Check size={14} /></button>
                      <button onClick={() => setShowAddTrabalhador(false)} style={smallBtnStyle}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddTrabalhador(true)} style={{ ...outlineBtnStyle, marginTop: '12px' }}>
                    <Plus size={14} /> Adicionar Trabalhador
                  </button>
                )}
              </FormSection>

              {/* Section 3: Tasks */}
              <FormSection title="Tarefas Executadas">
                {tarefas.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 0', borderBottom: `1px solid ${C.border}`,
                  }}>
                    <button onClick={() => handleToggleTarefa(t.id)} style={{
                      width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                      border: t.concluida ? 'none' : `2px solid ${C.border}`,
                      background: t.concluida ? C.success : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.concluida && <Check size={12} color="white" />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONTS.body, fontSize: '13px', fontWeight: 600, color: C.dark }}>{t.titulo}</div>
                      {t.descricao && <div style={{ fontFamily: FONTS.body, fontSize: '12px', color: C.light }}>{t.descricao}</div>}
                    </div>
                    <select value={t.percentagem} onChange={(e) => handleTarefaPercentagem(t.id, e.target.value)} style={{ ...inputStyle, width: '80px', padding: '6px 8px', fontSize: '12px' }}>
                      {[0, 25, 50, 75, 100].map(p => <option key={p} value={String(p)}>{p}%</option>)}
                    </select>
                    <button onClick={() => handleRemoveTarefa(t.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                  </div>
                ))}

                {showAddTarefa ? (
                  <div style={{ padding: '14px', background: C.cream, borderRadius: '10px', marginTop: '12px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Título</label>
                      <input type="text" value={novaTarefa.titulo} onChange={(e) => setNovaTarefa({...novaTarefa, titulo: e.target.value})} style={inputStyle} placeholder="Ex: Demolição de parede — Suite" />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Descrição (opcional)</label>
                      <input type="text" value={novaTarefa.descricao} onChange={(e) => setNovaTarefa({...novaTarefa, descricao: e.target.value})} style={inputStyle} placeholder="Detalhes adicionais..." />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleAddTarefa} style={{ ...smallBtnStyle, background: C.dark, color: C.white, padding: '8px 16px' }}>Adicionar</button>
                      <button onClick={() => setShowAddTarefa(false)} style={{ ...smallBtnStyle, padding: '8px 16px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddTarefa(true)} style={{ ...outlineBtnStyle, marginTop: '12px' }}>
                    <Plus size={14} /> Adicionar Tarefa
                  </button>
                )}
              </FormSection>

              {/* Section 4: Occurrences */}
              <FormSection title="Ocorrências / Incidentes">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {SEVERIDADES.map(s => (
                    <button key={s} onClick={() => setNovaOcorrencia({...novaOcorrencia, severidade: s})} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      border: novaOcorrencia.severidade === s ? `2px solid ${s === 'Alta' ? C.danger : s === 'Média' ? C.warning : C.success}` : `1px solid ${C.border}`,
                      background: novaOcorrencia.severidade === s ? (s === 'Alta' ? 'rgba(166,93,87,0.08)' : s === 'Média' ? 'rgba(196,149,106,0.08)' : 'rgba(91,123,106,0.08)') : C.white,
                      fontFamily: FONTS.body, fontSize: '12px', fontWeight: 500, color: C.dark,
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
                <textarea value={novaOcorrencia.descricao} onChange={(e) => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})} placeholder="Descreva a ocorrência..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                {novaOcorrencia.descricao && (
                  <button onClick={handleAddOcorrencia} style={{ ...outlineBtnStyle, marginTop: '8px' }}>
                    <Plus size={14} /> Adicionar Ocorrência
                  </button>
                )}
                {ocorrencias.map(o => (
                  <div key={o.id} style={{ display: 'flex', gap: '10px', padding: '10px', background: C.cream, borderRadius: '8px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                      background: o.severidade === 'Alta' ? 'rgba(166,93,87,0.12)' : o.severidade === 'Média' ? 'rgba(196,149,106,0.12)' : 'rgba(91,123,106,0.12)',
                      color: o.severidade === 'Alta' ? C.danger : o.severidade === 'Média' ? C.warning : C.success,
                    }}>{o.severidade}</span>
                    <span style={{ flex: 1, fontFamily: FONTS.body, fontSize: '12px', color: C.dark }}>{o.descricao}</span>
                    <button onClick={() => handleRemoveOcorrencia(o.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                  </div>
                ))}
              </FormSection>

              {/* Section 5: Non-conformities */}
              <FormSection title="Não Conformidades">
                {naoConformidades.map(nc => (
                  <div key={nc.id} style={{ padding: '12px', background: C.cream, borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                        background: nc.severidade === 'CRÍTICA' ? C.danger : 'rgba(166,93,87,0.12)',
                        color: nc.severidade === 'CRÍTICA' ? C.white : C.danger,
                      }}>{nc.severidade}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditNC(nc)} style={iconBtnStyle}><Edit2 size={12} /></button>
                        <button onClick={() => handleRemoveNC(nc.id)} style={iconBtnStyle}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <p style={{ fontFamily: FONTS.body, fontSize: '12px', color: C.dark, margin: 0 }}>{nc.descricao}</p>
                    {nc.acaoCorretiva && <p style={{ fontFamily: FONTS.body, fontSize: '11px', color: C.light, margin: '4px 0 0' }}>Ação: {nc.acaoCorretiva}</p>}
                  </div>
                ))}
                {showAddNC ? (
                  <div style={{ padding: '14px', background: C.cream, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      {SEVERIDADES_NC.map(s => (
                        <button key={s} onClick={() => setNovaNC({...novaNC, severidade: s})} style={{
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                          border: novaNC.severidade === s ? 'none' : `1px solid ${C.border}`,
                          background: novaNC.severidade === s ? (s === 'CRÍTICA' ? C.danger : 'rgba(166,93,87,0.12)') : C.white,
                          color: novaNC.severidade === s ? (s === 'CRÍTICA' ? C.white : C.danger) : C.dark,
                          fontFamily: FONTS.body, fontSize: '11px', fontWeight: 600,
                        }}>{s}</button>
                      ))}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={labelStyle}>Descrição</label>
                      <textarea value={novaNC.descricao} onChange={(e) => setNovaNC({...novaNC, descricao: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Descreva a não conformidade..." />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Ação Corretiva</label>
                      <textarea value={novaNC.acaoCorretiva} onChange={(e) => setNovaNC({...novaNC, acaoCorretiva: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Ação corretiva proposta..." />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleAddNC} style={{ ...smallBtnStyle, background: C.dark, color: C.white, padding: '8px 16px' }}>{editingNC ? 'Guardar' : 'Adicionar'}</button>
                      <button onClick={() => { setShowAddNC(false); setEditingNC(null); setNovaNC({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' }) }} style={{ ...smallBtnStyle, padding: '8px 16px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddNC(true)} style={outlineBtnStyle}>
                    <Plus size={14} /> Adicionar NC
                  </button>
                )}
              </FormSection>

              {/* Section 6: Photos */}
              <FormSection title="Registo Fotográfico">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {fotos.map(f => (
                    <div key={f.id} style={{ position: 'relative' }}>
                      <div style={{ aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                        <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => handleRemoveFoto(f.id)} style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none',
                          color: 'white', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><X size={14} /></button>
                      </div>
                      <input type="text" value={f.descricao} onChange={(e) => handleFotoDescricao(f.id, e.target.value)} placeholder="Descrição..." style={{ ...inputStyle, fontSize: '11px', padding: '6px 8px' }} />
                    </div>
                  ))}
                  <label style={{
                    aspectRatio: '4/3', border: `2px dashed ${C.border}`,
                    borderRadius: '10px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '6px',
                    cursor: 'pointer', background: C.cream,
                  }}>
                    <input type="file" accept="image/*" multiple onChange={handleAddFoto} style={{ display: 'none' }} />
                    <Upload size={20} color={C.muted} />
                    <span style={{ fontFamily: FONTS.body, fontSize: '11px', color: C.light }}>Adicionar foto</span>
                  </label>
                </div>
              </FormSection>

              {/* Section 7: Next Steps */}
              <FormSection title="Próximos Passos">
                {proximosPassos.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <ArrowRight size={14} color={C.success} />
                    <span style={{ flex: 1, fontFamily: FONTS.body, fontSize: '13px', color: C.dark }}>{p.texto}</span>
                    <button onClick={() => handleRemovePasso(p.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                  </div>
                ))}
                {showAddPasso ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <input type="text" value={novoPasso} onChange={(e) => setNovoPasso(e.target.value)} style={inputStyle} placeholder="Próximo passo..." onKeyDown={(e) => e.key === 'Enter' && handleAddPasso()} />
                    </div>
                    <button onClick={handleAddPasso} style={{ ...smallBtnStyle, background: C.dark, color: C.white, padding: '9px 14px' }}>Adicionar</button>
                    <button onClick={() => setShowAddPasso(false)} style={{ ...smallBtnStyle, padding: '9px 14px' }}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddPasso(true)} style={{ ...outlineBtnStyle, marginTop: '10px' }}>
                    <Plus size={14} /> Adicionar Passo
                  </button>
                )}
              </FormSection>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', bottom: 0, background: C.white,
              borderRadius: '0 0 16px 16px',
            }}>
              <div style={{ fontFamily: FONTS.body, fontSize: '12px', color: C.muted }}>
                {lastSaved ? (
                  <>Rascunho às <strong style={{ color: C.dark }}>{lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</strong></>
                ) : 'Não guardado'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowFormModal(false)} style={{
                  padding: '10px 18px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: '8px',
                  cursor: 'pointer', fontFamily: FONTS.body, fontSize: '13px',
                  color: C.dark, fontWeight: 500,
                }}>
                  Cancelar
                </button>
                <button onClick={handleSaveRascunho} disabled={saving} style={{
                  padding: '10px 18px', background: C.white,
                  border: `1px solid ${C.border}`, borderRadius: '8px',
                  cursor: 'pointer', fontFamily: FONTS.body, fontSize: '13px',
                  color: C.dark, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Save size={14} />
                  Rascunho
                </button>
                <button onClick={handleSubmit} disabled={saving} style={{
                  padding: '10px 20px', background: C.dark, color: C.white,
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: FONTS.body, fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Send size={14} />
                  Submeter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Form section wrapper
function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{
        fontFamily: "'Quattrocento Sans', sans-serif",
        fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: '#9A978A', marginBottom: '12px',
        paddingBottom: '8px', borderBottom: '1px solid #E5E2D9',
      }}>
        {title}
      </h4>
      {children}
    </div>
  )
}

// Shared styles
const labelStyle = {
  display: 'block', fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: '#9A978A', marginBottom: '5px',
  fontFamily: "'Quattrocento Sans', sans-serif",
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #E5E2D9', borderRadius: '8px',
  boxSizing: 'border-box', fontSize: '13px',
  fontFamily: "'Quattrocento Sans', sans-serif",
  color: '#2C2C2B', outline: 'none', background: '#FFFFFF',
}

const iconBtnStyle = {
  padding: '5px', background: 'transparent', border: 'none',
  borderRadius: '6px', cursor: 'pointer', color: '#9A978A',
}

const smallBtnStyle = {
  padding: '8px 12px', background: '#FFFFFF',
  border: '1px solid #E5E2D9', borderRadius: '8px',
  cursor: 'pointer', fontFamily: "'Quattrocento Sans', sans-serif",
  fontSize: '12px', fontWeight: 500, color: '#2C2C2B',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const outlineBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', background: '#FFFFFF',
  border: '1px solid #E5E2D9', borderRadius: '8px',
  cursor: 'pointer', fontFamily: "'Quattrocento Sans', sans-serif",
  fontSize: '12px', fontWeight: 500, color: '#6B6B6B',
}
