import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Camera, BookOpen, FileText, AlertTriangle,
  Upload, Trash2, Edit, Send, FileCheck, ChevronDown,
  ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, Wind, CloudFog,
  Users, Save, Check, Loader2, ArrowRight, Thermometer, Clock,
  MapPin, Info, AlertCircle, Calendar, Download, BarChart3,
  Circle, CheckCircle2, XCircle, Flag
} from 'lucide-react'
import { colors } from './constants'
import { formatDate } from './utils'

const WEATHER_OPTIONS = [
  { key: 'sol', label: 'Sol', icon: Sun, color: '#f59e0b' },
  { key: 'nublado', label: 'Nublado', icon: Cloud, color: '#6b7280' },
  { key: 'chuva', label: 'Chuva', icon: CloudRain, color: '#3b82f6' },
  { key: 'vento', label: 'Vento', icon: Wind, color: '#8b5cf6' },
  { key: 'neblina', label: 'Neblina', icon: CloudFog, color: '#64748b' },
]

const DIARIO_FUNCOES = ['Encarregado de Obra', 'Diretor de Obra', 'Engenheiro', 'Técnico de Segurança', 'Fiscal de Obra']

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS_FULL_PT = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']

const ESPECIALIDADE_COLORS = {
  'Carpintaria': '#2563eb', 'Eletricidade': '#d97706', 'Elétrico': '#d97706',
  'Pedra Natural': '#78716c', 'Revestimentos': '#78716c', 'AVAC': '#059669',
  'Canalização': '#0891b2', 'Hidráulica': '#0891b2', 'Serralharia': '#475569',
  'Alvenaria': '#92400e', 'Alvenarias': '#92400e', 'Pintura': '#7c3aed',
  'Estrutura': '#dc2626', 'Impermeabilização': '#0d9488', 'Caixilharia': '#4f46e5',
  'Vidros': '#06b6d4', 'Gás': '#ea580c', 'Paisagismo': '#16a34a', 'Piscina': '#0284c7',
}

function getEspecColor(nome) { return ESPECIALIDADE_COLORS[nome] || '#8B8670' }
function formatDatePT(dateStr) { const d = new Date(dateStr + 'T12:00:00'); return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}` }
function getDayOfWeek(dateStr) { const d = new Date(dateStr + 'T12:00:00'); return WEEKDAYS_FULL_PT[d.getDay()] }

export default function AcompanhamentoTab({ obraId, activeSubtab, currentUser }) {
  // ============================================
  // FOTOGRAFIAS: STATE
  // ============================================
  const [fotos, setFotos] = useState([])
  const [fotosLoading, setFotosLoading] = useState(false)
  const [zonas, setZonas] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [fotoFiltroZona, setFotoFiltroZona] = useState('')
  const [fotoFiltroEspec, setFotoFiltroEspec] = useState('')
  const [showFotoModal, setShowFotoModal] = useState(false)
  const [fotoUploading, setFotoUploading] = useState(false)
  const [fotoForm, setFotoForm] = useState({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', files: [] })
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fotoInputRef = useRef(null)

  // ============================================
  // FOTOGRAFIAS: LOGIC
  // ============================================
  const loadFotos = useCallback(async () => {
    if (!obraId) return
    setFotosLoading(true)
    try {
      const [fotosRes, zonasRes, especRes] = await Promise.all([
        supabase.from('obra_fotografias').select('*, obra_zonas(nome), especialidades(nome, cor)').eq('obra_id', obraId).order('data_fotografia', { ascending: false }),
        supabase.from('obra_zonas').select('id, nome, piso').eq('obra_id', obraId).order('nome'),
        supabase.from('especialidades').select('id, nome, cor, categoria').eq('ativo', true).order('ordem')
      ])
      if (fotosRes.error) throw fotosRes.error
      setFotos(fotosRes.data || [])
      setZonas(zonasRes.data || [])
      // Deduplicate especialidades by nome (DB may have duplicates)
      const seen = new Set()
      const uniqueEspec = (especRes.data || []).filter(e => {
        if (seen.has(e.nome)) return false
        seen.add(e.nome)
        return true
      })
      setEspecialidades(uniqueEspec)
    } catch (err) { console.error('Erro fotos:', err) }
    finally { setFotosLoading(false) }
  }, [obraId])

  useEffect(() => {
    if ((activeSubtab === 'fotografias' || activeSubtab === 'resumo') && obraId) loadFotos()
  }, [activeSubtab, obraId, loadFotos])

  const handleFotoUpload = async () => {
    if (!fotoForm.files.length || !obraId) return
    setFotoUploading(true)
    try {
      for (const file of fotoForm.files) {
        const ext = file.name.split('.').pop()
        const fileName = `${obraId}/fotos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('obras').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(fileName)

        await supabase.from('obra_fotografias').insert({
          obra_id: obraId,
          url: urlData.publicUrl,
          filename: file.name,
          tamanho_bytes: file.size,
          titulo: fotoForm.titulo || null,
          descricao: fotoForm.descricao || null,
          zona_id: fotoForm.zona_id || null,
          especialidade_id: fotoForm.especialidade_id || null,
          data_fotografia: new Date().toISOString().split('T')[0],
          autor_nome: currentUser?.nome || null,
          autor_id: currentUser?.id || null
        })
      }
      setShowFotoModal(false)
      setFotoForm({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', files: [] })
      loadFotos()
    } catch (err) {
      console.error('Erro upload:', err)
      alert('Erro ao fazer upload: ' + err.message)
    } finally { setFotoUploading(false) }
  }

  const handleDeleteFoto = async (foto) => {
    if (!confirm('Eliminar esta fotografia?')) return
    try {
      const path = foto.url.split('/obras/')[1]
      if (path) await supabase.storage.from('obras').remove([path])
      await supabase.from('obra_fotografias').delete().eq('id', foto.id)
      loadFotos()
    } catch (err) { console.error('Erro delete foto:', err) }
  }

  const filteredFotos = fotos.filter(f => {
    if (fotoFiltroZona && f.zona_id !== fotoFiltroZona) return false
    if (fotoFiltroEspec && f.especialidade_id !== fotoFiltroEspec) return false
    return true
  })

  // Group filtered photos by date for timeline
  const groupedByDate = (() => {
    const groups = {}
    filteredFotos.forEach(f => {
      const key = f.data_fotografia || 'sem-data'
      if (!groups[key]) groups[key] = []
      groups[key].push(f)
    })
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, fotos]) => ({ date, fotos }))
  })()

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight' && lightboxIndex < filteredFotos.length - 1) setLightboxIndex(i => i + 1)
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(i => i - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, filteredFotos.length])

  // Get the flat index of a photo in filteredFotos
  const openLightbox = (foto) => {
    const idx = filteredFotos.findIndex(f => f.id === foto.id)
    if (idx !== -1) setLightboxIndex(idx)
  }

  // ============================================
  // DIARIO DE OBRA: STATE
  // ============================================
  const [diarioEntradas, setDiarioEntradas] = useState([])
  const [diarioLoading, setDiarioLoading] = useState(false)
  const [showDiarioModal, setShowDiarioModal] = useState(false)
  const [diarioSaving, setDiarioSaving] = useState(false)
  const [diarioEditId, setDiarioEditId] = useState(null)
  const [expandedDiario, setExpandedDiario] = useState(null)
  const [diarioFiltroMes, setDiarioFiltroMes] = useState('')
  const [diarioPhotoFiles, setDiarioPhotoFiles] = useState([])
  const [diarioPhotoPreviews, setDiarioPhotoPreviews] = useState([])
  const diarioPhotoRef = useRef(null)
  const [diarioForm, setDiarioForm] = useState({
    data: new Date().toISOString().split('T')[0],
    funcao: 'Encarregado de Obra',
    condicoes_meteo: 'sol',
    temperatura: '',
    observacoes_meteo: '',
    trabalhadores: [],
    tarefas: [],
    ocorrencias: [],
    nao_conformidades: [],
    fotos: [],
    proximos_passos: [],
    status: 'rascunho'
  })
  // Temp fields for inline adds
  const [diarioTempTrab, setDiarioTempTrab] = useState({ nome: '', funcao: '', tipo: 'Equipa', estado: 'PRESENTE' })
  const [diarioTempTarefa, setDiarioTempTarefa] = useState('')
  const [diarioTempOcorrencia, setDiarioTempOcorrencia] = useState({ severidade: 'Baixa', descricao: '' })
  const [diarioTempPasso, setDiarioTempPasso] = useState('')

  // ============================================
  // DIARIO DE OBRA: LOGIC
  // ============================================
  const loadDiario = useCallback(async () => {
    if (!obraId) return
    setDiarioLoading(true)
    try {
      const { data, error } = await supabase
        .from('obra_diario')
        .select('*')
        .eq('obra_id', obraId)
        .order('data', { ascending: false })
      if (error) throw error
      setDiarioEntradas(data || [])
    } catch (err) { console.error('Erro diario:', err) }
    finally { setDiarioLoading(false) }
  }, [obraId])

  useEffect(() => {
    if ((activeSubtab === 'diario' || activeSubtab === 'resumo') && obraId) loadDiario()
  }, [activeSubtab, obraId, loadDiario])

  const openDiarioModal = (entry = null) => {
    if (entry) {
      setDiarioEditId(entry.id)
      setDiarioForm({
        data: entry.data || new Date().toISOString().split('T')[0],
        funcao: entry.funcao || 'Encarregado de Obra',
        condicoes_meteo: entry.condicoes_meteo || 'sol',
        temperatura: entry.temperatura || '',
        observacoes_meteo: entry.observacoes_meteo || '',
        hora_inicio: entry.hora_inicio ? entry.hora_inicio.substring(0, 5) : '',
        hora_fim: entry.hora_fim ? entry.hora_fim.substring(0, 5) : '',
        trabalhadores: entry.trabalhadores || [],
        trabalhadores_gavinho: entry.trabalhadores_gavinho || 0,
        trabalhadores_subempreiteiros: entry.trabalhadores_subempreiteiros || 0,
        atividades: entry.atividades || [],
        tarefas: entry.tarefas || [],
        ocorrencias: entry.ocorrencias || [],
        nao_conformidades: entry.nao_conformidades || [],
        fotos: entry.fotos || [],
        proximos_passos: entry.proximos_passos || [],
        status: entry.status || 'rascunho'
      })
    } else {
      setDiarioEditId(null)
      setDiarioForm({
        data: new Date().toISOString().split('T')[0],
        funcao: 'Encarregado de Obra',
        condicoes_meteo: 'sol', temperatura: '', observacoes_meteo: '',
        hora_inicio: '', hora_fim: '',
        trabalhadores: [], trabalhadores_gavinho: 0, trabalhadores_subempreiteiros: 0,
        atividades: [], tarefas: [], ocorrencias: [],
        nao_conformidades: [], fotos: [], proximos_passos: [],
        status: 'rascunho'
      })
    }
    setDiarioPhotoFiles([])
    setDiarioPhotoPreviews([])
    setShowDiarioModal(true)
  }

  const handleDiarioPhotoSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
    setDiarioPhotoFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setDiarioPhotoPreviews(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  const handleDiarioSave = async (status = 'rascunho') => {
    setDiarioSaving(true)
    try {
      // Upload new photos
      let allFotos = [...diarioForm.fotos]
      for (const file of diarioPhotoFiles) {
        const ext = file.name.split('.').pop()
        const fileName = `diario/${obraId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('obra-fotos').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('obra-fotos').getPublicUrl(fileName)
        allFotos.push({ id: Date.now() + Math.random(), url: urlData.publicUrl, descricao: '' })
      }

      // Convert atividades to tarefas format for backward compat
      const atividades = diarioForm.atividades || []
      const tarefasFromAtiv = atividades.map(a => ({
        id: Date.now() + Math.random(),
        titulo: `[${a.especialidade_nome || 'Geral'}]${a.zona ? ' ' + a.zona + ' —' : ''} ${a.descricao}`,
        concluida: false,
        _especialidade: a.especialidade_nome,
        _zona: a.zona,
        _fotos: a.fotos,
        _alerta: a.alerta,
        _nota: a.nota
      }))
      const allTarefas = [...(diarioForm.tarefas || []), ...tarefasFromAtiv]

      // Base payload (columns that always exist)
      const payload = {
        obra_id: obraId,
        data: diarioForm.data,
        funcao: diarioForm.funcao,
        condicoes_meteo: diarioForm.condicoes_meteo,
        temperatura: diarioForm.temperatura ? parseFloat(diarioForm.temperatura) : null,
        observacoes_meteo: diarioForm.observacoes_meteo || null,
        trabalhadores: diarioForm.trabalhadores,
        trabalhadores_gavinho: diarioForm.trabalhadores_gavinho || diarioForm.trabalhadores.filter(t => t.tipo === 'Equipa' && t.estado === 'PRESENTE').length,
        trabalhadores_subempreiteiros: diarioForm.trabalhadores_subempreiteiros || diarioForm.trabalhadores.filter(t => t.tipo === 'Subempreiteiro' && t.estado === 'PRESENTE').length,
        tarefas: allTarefas,
        ocorrencias: diarioForm.ocorrencias,
        nao_conformidades: diarioForm.nao_conformidades,
        fotos: allFotos,
        proximos_passos: diarioForm.proximos_passos,
        status,
        updated_at: new Date().toISOString()
      }

      // New columns (from migration 20260217_obra_diario_atividades)
      const newCols = {
        atividades,
        hora_inicio: diarioForm.hora_inicio || null,
        hora_fim: diarioForm.hora_fim || null,
        registado_por_nome: diarioForm.funcao,
      }

      // Try with new columns, fallback without if migration not applied
      const fullPayload = { ...payload, ...newCols }
      let saveErr
      if (diarioEditId) {
        const { error } = await supabase.from('obra_diario').update(fullPayload).eq('id', diarioEditId)
        saveErr = error
      } else {
        const { error } = await supabase.from('obra_diario').insert([fullPayload])
        saveErr = error
      }

      // Fallback: save without new columns if schema error
      if (saveErr && saveErr.message?.includes('schema cache')) {
        if (diarioEditId) {
          const { error } = await supabase.from('obra_diario').update(payload).eq('id', diarioEditId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('obra_diario').insert([payload])
          if (error) throw error
        }
      } else if (saveErr) {
        throw saveErr
      }

      setShowDiarioModal(false)
      setExpandedDiario(null)
      loadDiario()
    } catch (err) {
      console.error('Erro diario:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally { setDiarioSaving(false) }
  }

  const handleDiarioDelete = async (id) => {
    if (!confirm('Apagar esta entrada do diário?')) return
    try {
      const { error } = await supabase.from('obra_diario').delete().eq('id', id)
      if (error) throw error
      setExpandedDiario(null)
      loadDiario()
    } catch (err) { console.error('Erro delete diario:', err) }
  }

  const diarioStats = {
    total: diarioEntradas.length,
    submetidos: diarioEntradas.filter(d => d.status === 'submetido').length,
    rascunhos: diarioEntradas.filter(d => d.status === 'rascunho').length,
  }

  const filteredDiario = diarioEntradas.filter(d => {
    if (diarioFiltroMes) {
      const entryMonth = d.data?.substring(0, 7)
      if (entryMonth !== diarioFiltroMes) return false
    }
    return true
  })

  const diarioMonths = [...new Set(diarioEntradas.map(d => d.data?.substring(0, 7)).filter(Boolean))].sort().reverse()

  // ============================================
  // RELATORIOS: STATE
  // ============================================
  const [relatorios, setRelatorios] = useState([])
  const [relatoriosLoading, setRelatoriosLoading] = useState(false)
  const [showRelModal, setShowRelModal] = useState(false)
  const [editingRel, setEditingRel] = useState(null)
  const [relSaving, setRelSaving] = useState(false)
  const [relForm, setRelForm] = useState({ titulo: '', tipo: 'semanal', data_inicio: '', data_fim: '', resumo_executivo: '', trabalhos_realizados: '', trabalhos_proxima_semana: '', problemas_identificados: '', progresso_global: 0 })

  // ============================================
  // RELATORIOS: LOGIC
  // ============================================
  const loadRelatorios = useCallback(async () => {
    if (!obraId) return
    setRelatoriosLoading(true)
    try {
      const { data, error } = await supabase.from('obra_relatorios')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_fim', { ascending: false })
      if (error) throw error
      setRelatorios(data || [])
    } catch (err) { console.error('Erro relatorios:', err) }
    finally { setRelatoriosLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'relatorios' && obraId) loadRelatorios()
  }, [activeSubtab, obraId, loadRelatorios])

  const getNextRelCodigo = () => {
    const maxNum = relatorios.reduce((max, r) => {
      const num = parseInt(r.codigo?.replace('REL-', ''))
      return num > max ? num : max
    }, 0)
    return `REL-${String(maxNum + 1).padStart(3, '0')}`
  }

  const openRelModal = (rel = null) => {
    if (rel) {
      setEditingRel(rel)
      setRelForm({
        titulo: rel.titulo || '', tipo: rel.tipo || 'semanal',
        data_inicio: rel.data_inicio || '', data_fim: rel.data_fim || '',
        resumo_executivo: rel.resumo_executivo || '',
        trabalhos_realizados: rel.trabalhos_realizados || '',
        trabalhos_proxima_semana: rel.trabalhos_proxima_semana || '',
        problemas_identificados: rel.problemas_identificados || '',
        progresso_global: rel.progresso_global || 0,
      })
    } else {
      setEditingRel(null)
      const hoje = new Date()
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1)
      setRelForm({
        titulo: '', tipo: 'semanal',
        data_inicio: inicioSemana.toISOString().split('T')[0],
        data_fim: hoje.toISOString().split('T')[0],
        resumo_executivo: '', trabalhos_realizados: '',
        trabalhos_proxima_semana: '', problemas_identificados: '',
        progresso_global: 0,
      })
    }
    setShowRelModal(true)
  }

  const handleRelSave = async () => {
    if (!relForm.titulo || !relForm.data_inicio || !relForm.data_fim) return
    setRelSaving(true)
    try {
      const data = {
        obra_id: obraId, titulo: relForm.titulo, tipo: relForm.tipo,
        data_inicio: relForm.data_inicio, data_fim: relForm.data_fim,
        resumo_executivo: relForm.resumo_executivo || null,
        trabalhos_realizados: relForm.trabalhos_realizados || null,
        trabalhos_proxima_semana: relForm.trabalhos_proxima_semana || null,
        problemas_identificados: relForm.problemas_identificados || null,
        progresso_global: relForm.progresso_global,
      }
      if (editingRel) {
        await supabase.from('obra_relatorios').update(data).eq('id', editingRel.id)
      } else {
        data.codigo = getNextRelCodigo()
        data.estado = 'rascunho'
        data.autor_id = currentUser?.id || null
        await supabase.from('obra_relatorios').insert(data)
      }
      setShowRelModal(false)
      loadRelatorios()
    } catch (err) {
      console.error('Erro relatorio:', err)
      alert('Erro: ' + err.message)
    } finally { setRelSaving(false) }
  }

  const handleRelEstadoChange = async (rel, novoEstado) => {
    try {
      const update = { estado: novoEstado }
      if (novoEstado === 'publicado') update.data_publicacao = new Date().toISOString()
      await supabase.from('obra_relatorios').update(update).eq('id', rel.id)
      loadRelatorios()
    } catch (err) { console.error('Erro estado rel:', err) }
  }

  const relEstados = {
    rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6' },
    em_revisao: { label: 'Em Revisao', color: '#F59E0B', bg: '#FEF3C7' },
    publicado: { label: 'Publicado', color: '#10B981', bg: '#D1FAE5' },
  }

  // ============================================
  // NAO CONFORMIDADES: STATE
  // ============================================
  const [ncs, setNcs] = useState([])
  const [ncsLoading, setNcsLoading] = useState(false)
  const [ncFiltroEstado, setNcFiltroEstado] = useState('')
  const [ncFiltroGravidade, setNcFiltroGravidade] = useState('')
  const [showNcModal, setShowNcModal] = useState(false)
  const [editingNc, setEditingNc] = useState(null)
  const [ncSaving, setNcSaving] = useState(false)
  const [ncForm, setNcForm] = useState({ titulo: '', descricao: '', tipo: 'execucao', gravidade: 'menor', especialidade_id: '', zona_id: '', data_limite_resolucao: '', responsavel_resolucao: '', acao_corretiva: '', acao_preventiva: '' })
  const [expandedNc, setExpandedNc] = useState(null)

  const ncEstados = [
    { value: 'aberta', label: 'Aberta', color: '#F44336', bg: '#FFEBEE' },
    { value: 'em_resolucao', label: 'Em Resolucao', color: '#FF9800', bg: '#FFF3E0' },
    { value: 'resolvida', label: 'Resolvida', color: '#4CAF50', bg: '#E8F5E9' },
    { value: 'verificada', label: 'Verificada', color: '#2196F3', bg: '#E3F2FD' },
    { value: 'encerrada', label: 'Encerrada', color: '#9E9E9E', bg: '#F5F5F5' },
  ]

  const ncGravidades = [
    { value: 'menor', label: 'Menor', color: '#FF9800' },
    { value: 'maior', label: 'Maior', color: '#F44336' },
    { value: 'critica', label: 'Critica', color: '#9C27B0' },
  ]

  // ============================================
  // NAO CONFORMIDADES: LOGIC
  // ============================================
  const loadNcs = useCallback(async () => {
    if (!obraId) return
    setNcsLoading(true)
    try {
      const { data, error } = await supabase.from('nao_conformidades')
        .select('*, especialidades(nome, cor), obra_zonas(nome)')
        .eq('obra_id', obraId)
        .order('data_identificacao', { ascending: false })
      if (error) throw error
      setNcs(data || [])
    } catch (err) { console.error('Erro NCs:', err) }
    finally { setNcsLoading(false) }
  }, [obraId])

  useEffect(() => {
    if ((activeSubtab === 'nao-conformidades' || activeSubtab === 'resumo') && obraId) loadNcs()
  }, [activeSubtab, obraId, loadNcs])

  const getNextNcCodigo = () => {
    const maxNum = ncs.reduce((max, nc) => {
      const num = parseInt(nc.codigo?.replace('NC-', ''))
      return num > max ? num : max
    }, 0)
    return `NC-${String(maxNum + 1).padStart(3, '0')}`
  }

  const openNcModal = (nc = null) => {
    if (nc) {
      setEditingNc(nc)
      setNcForm({
        titulo: nc.titulo || '', descricao: nc.descricao || '', tipo: nc.tipo || 'execucao',
        gravidade: nc.gravidade || 'menor', especialidade_id: nc.especialidade_id || '',
        zona_id: nc.zona_id || '', data_limite_resolucao: nc.data_limite_resolucao || '',
        responsavel_resolucao: nc.responsavel_resolucao || '',
        acao_corretiva: nc.acao_corretiva || '', acao_preventiva: nc.acao_preventiva || ''
      })
    } else {
      setEditingNc(null)
      setNcForm({ titulo: '', descricao: '', tipo: 'execucao', gravidade: 'menor', especialidade_id: '', zona_id: '', data_limite_resolucao: '', responsavel_resolucao: '', acao_corretiva: '', acao_preventiva: '' })
    }
    setShowNcModal(true)
  }

  const handleNcSave = async () => {
    if (!ncForm.titulo || !ncForm.descricao) return
    setNcSaving(true)
    try {
      const data = {
        obra_id: obraId, titulo: ncForm.titulo, descricao: ncForm.descricao,
        tipo: ncForm.tipo, gravidade: ncForm.gravidade,
        especialidade_id: ncForm.especialidade_id || null,
        zona_id: ncForm.zona_id || null,
        data_limite_resolucao: ncForm.data_limite_resolucao || null,
        responsavel_resolucao: ncForm.responsavel_resolucao || null,
        acao_corretiva: ncForm.acao_corretiva || null,
        acao_preventiva: ncForm.acao_preventiva || null,
      }
      if (editingNc) {
        await supabase.from('nao_conformidades').update(data).eq('id', editingNc.id)
      } else {
        data.codigo = getNextNcCodigo()
        data.identificado_por = currentUser?.id || null
        data.created_by = currentUser?.id || null
        await supabase.from('nao_conformidades').insert(data)
      }
      setShowNcModal(false)
      loadNcs()
    } catch (err) {
      console.error('Erro NC:', err)
      alert('Erro: ' + err.message)
    } finally { setNcSaving(false) }
  }

  const handleNcEstadoChange = async (nc, novoEstado) => {
    try {
      const update = { estado: novoEstado }
      if (novoEstado === 'resolvida') update.data_resolucao = new Date().toISOString().split('T')[0]
      if (novoEstado === 'verificada') { update.data_verificacao = new Date().toISOString().split('T')[0]; update.verificado_por = currentUser?.id || null }
      await supabase.from('nao_conformidades').update(update).eq('id', nc.id)
      loadNcs()
    } catch (err) { console.error('Erro estado NC:', err) }
  }

  const filteredNcs = ncs.filter(nc => {
    if (ncFiltroEstado && nc.estado !== ncFiltroEstado) return false
    if (ncFiltroGravidade && nc.gravidade !== ncFiltroGravidade) return false
    return true
  })

  const ncStats = {
    abertas: ncs.filter(n => n.estado === 'aberta').length,
    emResolucao: ncs.filter(n => n.estado === 'em_resolucao').length,
    resolvidas: ncs.filter(n => ['resolvida', 'verificada', 'encerrada'].includes(n.estado)).length,
    criticas: ncs.filter(n => n.gravidade === 'critica' && !['encerrada', 'verificada'].includes(n.estado)).length,
  }

  // ============================================
  // RENDER: FOTOGRAFIAS (Timeline)
  // ============================================
  const formatDateLabel = (dateStr) => {
    if (!dateStr || dateStr === 'sem-data') return 'Sem data'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const lightboxFoto = lightboxIndex !== null ? filteredFotos[lightboxIndex] : null

  const renderFotografiasTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={fotoFiltroZona} onChange={e => setFotoFiltroZona(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as zonas</option>
            {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}{z.piso ? ` (${z.piso})` : ''}</option>)}
          </select>
          <select value={fotoFiltroEspec} onChange={e => setFotoFiltroEspec(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as especialidades</option>
            {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <button onClick={() => setShowFotoModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Upload size={16} /> Upload Fotos
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>
          {filteredFotos.length} fotografia{filteredFotos.length !== 1 ? 's' : ''}
          {groupedByDate.length > 0 && <> &middot; {groupedByDate.length} data{groupedByDate.length !== 1 ? 's' : ''}</>}
        </span>
      </div>

      {/* Timeline */}
      {fotosLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
      ) : filteredFotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <Camera size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: colors.textMuted }}>Nenhuma fotografia</p>
          <button onClick={() => setShowFotoModal(true)} style={{ marginTop: 8, padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            <Upload size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Adicionar
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 5, top: 6, bottom: 0, width: 2, background: colors.border }} />

          {groupedByDate.map((group, gi) => (
            <div key={group.date} style={{ marginBottom: gi < groupedByDate.length - 1 ? 24 : 0 }}>
              {/* Date header with dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative' }}>
                {/* Dot */}
                <div style={{ position: 'absolute', left: -28, top: 1, width: 12, height: 12, borderRadius: '50%', background: colors.primary, border: `2px solid ${colors.white}`, boxShadow: `0 0 0 2px ${colors.border}`, zIndex: 1 }} />
                {/* Date label */}
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{formatDateLabel(group.date)}</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{group.fotos.length} foto{group.fotos.length !== 1 ? 's' : ''}</span>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
              </div>

              {/* Photo grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {group.fotos.map(foto => (
                  <div key={foto.id} onClick={() => openLightbox(foto)} style={{ background: colors.white, borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ position: 'relative', paddingBottom: '75%', background: '#f0ede8' }}>
                      <img src={foto.url} alt={foto.titulo || foto.filename} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      {foto.especialidades && (
                        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 600, background: foto.especialidades.cor || colors.primary, color: '#fff' }}>
                          {foto.especialidades.nome}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {foto.titulo || foto.filename}
                      </div>
                      {foto.obra_zonas && (
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{foto.obra_zonas.nome}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox with navigation */}
      {lightboxFoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', flexDirection: 'column' }} onClick={() => setLightboxIndex(null)}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {lightboxIndex + 1} de {filteredFotos.length}
            </div>
            <button onClick={() => setLightboxIndex(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* Image area with arrows */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 16, minHeight: 0 }} onClick={e => e.stopPropagation()}>
            {/* Left arrow */}
            <button
              onClick={() => lightboxIndex > 0 && setLightboxIndex(lightboxIndex - 1)}
              disabled={lightboxIndex === 0}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: lightboxIndex === 0 ? 'default' : 'pointer', color: lightboxIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Image */}
            <img
              src={lightboxFoto.url}
              alt={lightboxFoto.titulo || ''}
              style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />

            {/* Right arrow */}
            <button
              onClick={() => lightboxIndex < filteredFotos.length - 1 && setLightboxIndex(lightboxIndex + 1)}
              disabled={lightboxIndex === filteredFotos.length - 1}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: lightboxIndex === filteredFotos.length - 1 ? 'default' : 'pointer', color: lightboxIndex === filteredFotos.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Bottom info bar */}
          <div style={{ padding: '16px 24px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                {lightboxFoto.titulo || lightboxFoto.filename}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {new Date(lightboxFoto.data_fotografia).toLocaleDateString('pt-PT')}
                {lightboxFoto.obra_zonas && <> &middot; {lightboxFoto.obra_zonas.nome}</>}
                {lightboxFoto.especialidades && <> &middot; {lightboxFoto.especialidades.nome}</>}
                {lightboxFoto.autor && <> &middot; {lightboxFoto.autor}</>}
              </div>
              {lightboxFoto.descricao && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{lightboxFoto.descricao}</div>
              )}
            </div>
            <button onClick={() => { const idx = lightboxIndex; handleDeleteFoto(filteredFotos[idx]).then(() => { if (filteredFotos.length <= 1) setLightboxIndex(null); else if (idx >= filteredFotos.length - 1) setLightboxIndex(idx - 1) }) }} style={{ padding: '8px 14px', background: 'rgba(244,67,54,0.15)', color: '#F44336', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <Trash2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showFotoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Upload Fotografias</h2>
              <button onClick={() => setShowFotoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Fotografias *</label>
                <input ref={fotoInputRef} type="file" accept="image/*" multiple onChange={e => setFotoForm({ ...fotoForm, files: Array.from(e.target.files) })} style={{ display: 'none' }} />
                <button onClick={() => fotoInputRef.current?.click()} style={{ width: '100%', padding: 24, border: `2px dashed ${colors.border}`, borderRadius: 10, background: colors.background, cursor: 'pointer', fontSize: 13, color: colors.textMuted }}>
                  <Camera size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                  {fotoForm.files.length ? `${fotoForm.files.length} ficheiro(s) selecionado(s)` : 'Clica para selecionar fotografias'}
                </button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo</label>
                <input type="text" value={fotoForm.titulo} onChange={e => setFotoForm({ ...fotoForm, titulo: e.target.value })} placeholder="Ex: Betonagem laje piso 2" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Descricao</label>
                <textarea value={fotoForm.descricao} onChange={e => setFotoForm({ ...fotoForm, descricao: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Zona</label>
                  <select value={fotoForm.zona_id} onChange={e => setFotoForm({ ...fotoForm, zona_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Especialidade</label>
                  <select value={fotoForm.especialidade_id} onChange={e => setFotoForm({ ...fotoForm, especialidade_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowFotoModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer', color: colors.text }}>Cancelar</button>
              <button onClick={handleFotoUpload} disabled={!fotoForm.files.length || fotoUploading} style={{ flex: 1, padding: '12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !fotoForm.files.length ? 0.5 : 1 }}>
                {fotoUploading ? 'A enviar...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: DIARIO DE OBRA
  // ============================================
  const getWeatherInfo = (key) => WEATHER_OPTIONS.find(w => w.key === key) || WEATHER_OPTIONS[0]

  const renderDiarioTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={diarioFiltroMes} onChange={e => setDiarioFiltroMes(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, background: colors.white }}>
            <option value="">Todos os meses</option>
            {diarioMonths.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: colors.text }}>
            <Download size={14} /> Exportar
          </button>
          <button onClick={() => openDiarioModal()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={14} /> Nova Entrada
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, fontSize: 13, color: colors.textMuted }}>
        <span style={{ padding: '5px 12px', background: colors.background, borderRadius: 6 }}>{diarioStats.total} entrada{diarioStats.total !== 1 ? 's' : ''}</span>
        <span style={{ padding: '5px 12px', background: '#D1FAE5', borderRadius: 6, color: '#059669' }}>{diarioStats.submetidos} submetido{diarioStats.submetidos !== 1 ? 's' : ''}</span>
        {diarioStats.rascunhos > 0 && <span style={{ padding: '5px 12px', background: '#FEF3C7', borderRadius: 6, color: '#D97706' }}>{diarioStats.rascunhos} rascunho{diarioStats.rascunhos !== 1 ? 's' : ''}</span>}
      </div>

      {/* Timeline with dots */}
      {diarioLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
      ) : filteredDiario.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <BookOpen size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: colors.textMuted }}>Nenhuma entrada no diário</p>
          <button onClick={() => openDiarioModal()} style={{ marginTop: 8, padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Criar entrada
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          {/* Vertical timeline line */}
          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 0, width: 2, background: colors.border }} />

          {filteredDiario.map((d, di) => {
            const weather = getWeatherInfo(d.condicoes_meteo)
            const WeatherIcon = weather.icon
            const trabArray = d.trabalhadores || []
            const trabPresentes = trabArray.filter?.(t => t.estado === 'PRESENTE')?.length
            const workerCount = trabPresentes || (d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0)
            const atividades = d.atividades || []
            const displayAtividades = atividades.length > 0 ? atividades : (d.tarefas || []).map(t => ({ especialidade_nome: t._especialidade || 'Geral', zona: t._zona || '', descricao: t._especialidade ? (t.titulo || '').replace(/^\[[^\]]*\]\s*(?:[^—]*—\s*)?/, '') : (t.descricao || t.titulo || t.texto || (typeof t === 'string' ? t : '')), fotos: t._fotos || [], alerta: t._alerta || null, nota: t._nota || '' }))
            const ativFotos = atividades.reduce((s, a) => s + (a.fotos?.length || 0), 0)
            const photoCount = (d.fotos?.length || 0) + ativFotos
            const horaInicio = d.hora_inicio ? d.hora_inicio.substring(0, 5) : null
            const horaFim = d.hora_fim ? d.hora_fim.substring(0, 5) : null
            const isToday = d.data === new Date().toISOString().split('T')[0]

            return (
              <div key={d.id} style={{ position: 'relative', marginBottom: di < filteredDiario.length - 1 ? 24 : 0 }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -32, top: 6,
                  width: 16, height: 16, borderRadius: '50%',
                  background: isToday ? colors.primary : (d.status === 'submetido' ? '#10B981' : colors.white),
                  border: `3px solid ${isToday ? colors.primary : (d.status === 'submetido' ? '#10B981' : colors.border)}`,
                  zIndex: 1
                }} />

                {/* Date header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{formatDatePT(d.data)}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>{getDayOfWeek(d.data)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: colors.text }}>
                      <WeatherIcon size={16} style={{ color: weather.color }} />
                      {d.temperatura ? `${d.temperatura}°C` : ''}{d.temperatura && d.observacoes_meteo ? ' · ' : ''}{d.observacoes_meteo || (!d.temperatura ? weather.label : '')}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => openDiarioModal(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: colors.textMuted }} title="Editar"><Edit size={14} /></button>
                      <button onClick={() => handleDiarioDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: colors.textMuted }} title="Apagar"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>

                {/* Stats pills bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, fontSize: 13, color: colors.textMuted }}>
                  {workerCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={13} /> <strong style={{ color: colors.text }}>{workerCount}</strong> em obra
                    </span>
                  )}
                  {workerCount > 0 && (horaInicio || horaFim) && <span style={{ margin: '0 10px', color: colors.border }}>|</span>}
                  {(horaInicio || horaFim) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {horaInicio || '—'} — {horaFim || '—'}
                    </span>
                  )}
                  {(horaInicio || horaFim || workerCount > 0) && photoCount > 0 && <span style={{ margin: '0 10px', color: colors.border }}>|</span>}
                  {photoCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Camera size={13} /> <strong style={{ color: colors.text }}>{photoCount}</strong> fotos
                    </span>
                  )}
                  {d.status && (
                    <>
                      <span style={{ margin: '0 10px', color: colors.border }}>|</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: d.status === 'submetido' ? '#10B981' : '#D97706', background: d.status === 'submetido' ? '#D1FAE5' : '#FEF3C7' }}>
                        {d.status === 'submetido' ? 'Submetido' : 'Rascunho'}
                      </span>
                    </>
                  )}
                </div>

                {/* Activities card */}
                <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '0 20px' }}>
                    {displayAtividades.map((ativ, idx) => {
                      const espColor = getEspecColor(ativ.especialidade_nome)
                      const aFotos = ativ.fotos || []
                      const maxThumbs = 3
                      const extra = aFotos.length > maxThumbs ? aFotos.length - maxThumbs : 0
                      return (
                        <div key={idx} style={{ padding: '14px 0', borderBottom: idx < displayAtividades.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, background: `${espColor}18`, color: espColor, textTransform: 'uppercase' }}>
                              {ativ.especialidade_nome || 'Geral'}
                            </span>
                            {ativ.zona && <span style={{ fontSize: 12, color: colors.textMuted }}>{ativ.zona}</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{ativ.descricao}</p>
                          {ativ.alerta && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', marginTop: 8, background: (ativ.alerta.tipo || '') === 'bloqueio' ? `${colors.error}12` : '#FEF3C7', borderRadius: 6, borderLeft: `3px solid ${(ativ.alerta.tipo || '') === 'bloqueio' ? colors.error : colors.warning}` }}>
                              <AlertTriangle size={13} color={(ativ.alerta.tipo || '') === 'bloqueio' ? colors.error : colors.warning} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12, color: colors.text }}>{typeof ativ.alerta === 'string' ? ativ.alerta : ativ.alerta.descricao}</span>
                            </div>
                          )}
                          {ativ.nota && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', marginTop: 8, background: colors.background, borderRadius: 6 }}>
                              <Info size={12} color={colors.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12, color: colors.textMuted }}>{ativ.nota}</span>
                            </div>
                          )}
                          {aFotos.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                              {aFotos.slice(0, maxThumbs).map((foto, fi) => (
                                <div key={fi} style={{ width: 56, height: 42, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
                                  <img src={typeof foto === 'string' ? foto : foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                </div>
                              ))}
                              {extra > 0 && (
                                <div style={{ width: 56, height: 42, borderRadius: 5, background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: colors.textMuted, flexShrink: 0 }}>+{extra}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Inline alerts from ocorrencias */}
                    {(d.ocorrencias || []).map((oc, oi) => (
                      <div key={`oc-${oi}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', margin: '6px 0', background: oc.severidade === 'Alta' ? `${colors.error}12` : '#FEF3C7', borderRadius: 6, borderLeft: `3px solid ${oc.severidade === 'Alta' ? colors.error : colors.warning}` }}>
                        <AlertTriangle size={14} color={oc.severidade === 'Alta' ? colors.error : colors.warning} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 13, color: colors.text, lineHeight: 1.4 }}>{oc.descricao}</span>
                      </div>
                    ))}

                    {displayAtividades.length === 0 && (d.ocorrencias || []).length === 0 && (
                      <div style={{ padding: '16px 0', color: colors.textMuted, fontSize: 13 }}>Sem atividades registadas</div>
                    )}
                  </div>

                  {/* Registered By Footer */}
                  <div style={{ padding: '10px 20px', borderTop: `1px solid ${colors.border}`, fontSize: 12, color: colors.textMuted, background: colors.background }}>
                    Registado por <strong style={{ color: colors.text }}>{d.registado_por_nome || d.funcao || 'Utilizador'}</strong>
                    {d.updated_at && <> · {new Date(d.updated_at).toLocaleDateString('pt-PT')} {new Date(d.updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New/Edit Modal */}
      {showDiarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: colors.white, borderRadius: '16px 16px 0 0', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>{diarioEditId ? 'Editar Entrada' : 'Nova Entrada'}</h2>
              <button onClick={() => setShowDiarioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>

            <div style={{ padding: 20 }}>
              {/* Date + Role + Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Data</label>
                  <input type="date" value={diarioForm.data} onChange={e => setDiarioForm({ ...diarioForm, data: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Função</label>
                  <select value={diarioForm.funcao} onChange={e => setDiarioForm({ ...diarioForm, funcao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    {DIARIO_FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horário</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="time" value={diarioForm.hora_inicio || ''} onChange={e => setDiarioForm({ ...diarioForm, hora_inicio: e.target.value })} style={{ flex: 1, padding: '10px 8px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                    <span style={{ color: colors.textMuted }}>–</span>
                    <input type="time" value={diarioForm.hora_fim || ''} onChange={e => setDiarioForm({ ...diarioForm, hora_fim: e.target.value })} style={{ flex: 1, padding: '10px 8px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Weather */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Meteorologia</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {WEATHER_OPTIONS.map(w => {
                    const WIcon = w.icon
                    const sel = diarioForm.condicoes_meteo === w.key
                    return (
                      <button key={w.key} onClick={() => setDiarioForm({ ...diarioForm, condicoes_meteo: w.key })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', background: sel ? colors.background : colors.white, border: sel ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, borderRadius: 10, cursor: 'pointer' }}>
                        <WIcon size={20} style={{ color: sel ? w.color : colors.textMuted }} />
                        <span style={{ fontSize: 11, color: sel ? colors.text : colors.textMuted }}>{w.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                  <input type="number" value={diarioForm.temperatura} onChange={e => setDiarioForm({ ...diarioForm, temperatura: e.target.value })} placeholder="°C" style={{ padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  <input type="text" value={diarioForm.observacoes_meteo} onChange={e => setDiarioForm({ ...diarioForm, observacoes_meteo: e.target.value })} placeholder="Observações meteo..." style={{ padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Workers (simplified) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trabalhadores em Obra</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Equipa Gavinho</label>
                    <input type="number" min="0" value={diarioForm.trabalhadores_gavinho || 0} onChange={e => setDiarioForm({ ...diarioForm, trabalhadores_gavinho: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Subempreiteiros</label>
                    <input type="number" min="0" value={diarioForm.trabalhadores_subempreiteiros || 0} onChange={e => setDiarioForm({ ...diarioForm, trabalhadores_subempreiteiros: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Atividades por Especialidade */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Atividades por Especialidade</label>
                {(diarioForm.atividades || []).map((ativ, idx) => {
                  const espColor = getEspecColor(ativ.especialidade_nome)
                  return (
                    <div key={idx} style={{ padding: 12, background: colors.background, borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${espColor}18`, color: espColor, textTransform: 'uppercase' }}>{ativ.especialidade_nome || 'Geral'}</span>
                        {ativ.zona && <span style={{ fontSize: 11, color: colors.textMuted }}>{ativ.zona}</span>}
                        <X size={14} style={{ marginLeft: 'auto', cursor: 'pointer', color: colors.textMuted }} onClick={() => setDiarioForm({ ...diarioForm, atividades: diarioForm.atividades.filter((_, j) => j !== idx) })} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{ativ.descricao}</p>
                    </div>
                  )
                })}
                <div style={{ padding: 12, background: colors.background, borderRadius: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <select value={diarioTempTarefa.especialidade || ''} onChange={e => setDiarioTempTarefa(typeof diarioTempTarefa === 'object' ? { ...diarioTempTarefa, especialidade: e.target.value } : { especialidade: e.target.value, zona: '', descricao: '' })} style={{ padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
                      <option value="">Especialidade...</option>
                      {especialidades.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
                    </select>
                    <input type="text" value={typeof diarioTempTarefa === 'object' ? (diarioTempTarefa.zona || '') : ''} onChange={e => setDiarioTempTarefa(typeof diarioTempTarefa === 'object' ? { ...diarioTempTarefa, zona: e.target.value } : { especialidade: '', zona: e.target.value, descricao: '' })} placeholder="Zona / Localização" style={{ padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" value={typeof diarioTempTarefa === 'object' ? (diarioTempTarefa.descricao || '') : diarioTempTarefa} onChange={e => setDiarioTempTarefa(typeof diarioTempTarefa === 'object' ? { ...diarioTempTarefa, descricao: e.target.value } : { especialidade: '', zona: '', descricao: e.target.value })} placeholder="Descreva os trabalhos realizados..." onKeyDown={e => { if (e.key === 'Enter') { const t = typeof diarioTempTarefa === 'object' ? diarioTempTarefa : { descricao: diarioTempTarefa }; if (!t.descricao) return; setDiarioForm({ ...diarioForm, atividades: [...(diarioForm.atividades || []), { especialidade_nome: t.especialidade || 'Geral', zona: t.zona || '', descricao: t.descricao, fotos: [] }] }); setDiarioTempTarefa({ especialidade: '', zona: '', descricao: '' }) } }} style={{ flex: 1, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    <button onClick={() => { const t = typeof diarioTempTarefa === 'object' ? diarioTempTarefa : { descricao: diarioTempTarefa }; if (!t.descricao) return; setDiarioForm({ ...diarioForm, atividades: [...(diarioForm.atividades || []), { especialidade_nome: t.especialidade || 'Geral', zona: t.zona || '', descricao: t.descricao, fotos: [] }] }); setDiarioTempTarefa({ especialidade: '', zona: '', descricao: '' }) }} style={{ padding: '8px 12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Plus size={14} /></button>
                  </div>
                </div>
              </div>

              {/* Occurrences */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ocorrências ({diarioForm.ocorrencias.length})</label>
                {diarioForm.ocorrencias.map((o, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '4px 0' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: o.severidade === 'Alta' ? colors.error : o.severidade === 'Média' ? colors.warning : colors.success, background: `${o.severidade === 'Alta' ? colors.error : o.severidade === 'Média' ? colors.warning : colors.success}18` }}>{o.severidade}</span>
                    <span style={{ flex: 1, fontSize: 13, color: colors.text }}>{o.descricao}</span>
                    <X size={14} style={{ cursor: 'pointer', color: colors.textMuted }} onClick={() => setDiarioForm({ ...diarioForm, ocorrencias: diarioForm.ocorrencias.filter((_, j) => j !== oi) })} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={diarioTempOcorrencia.severidade} onChange={e => setDiarioTempOcorrencia({ ...diarioTempOcorrencia, severidade: e.target.value })} style={{ padding: '8px 6px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
                    <option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option>
                  </select>
                  <input type="text" value={diarioTempOcorrencia.descricao} onChange={e => setDiarioTempOcorrencia({ ...diarioTempOcorrencia, descricao: e.target.value })} placeholder="Descrever ocorrência..." onKeyDown={e => { if (e.key === 'Enter' && diarioTempOcorrencia.descricao) { setDiarioForm({ ...diarioForm, ocorrencias: [...diarioForm.ocorrencias, { ...diarioTempOcorrencia, id: Date.now() }] }); setDiarioTempOcorrencia({ severidade: 'Baixa', descricao: '' }) } }} style={{ flex: 1, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                  <button onClick={() => { if (!diarioTempOcorrencia.descricao) return; setDiarioForm({ ...diarioForm, ocorrencias: [...diarioForm.ocorrencias, { ...diarioTempOcorrencia, id: Date.now() }] }); setDiarioTempOcorrencia({ severidade: 'Baixa', descricao: '' }) }} style={{ padding: '8px 12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Plus size={14} /></button>
                </div>
              </div>

              {/* Photos */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fotos ({diarioForm.fotos.length + diarioPhotoPreviews.length})</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {diarioForm.fotos.map((f, fi) => (
                    <div key={fi} style={{ width: 72, height: 54, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <img src={f.url || f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setDiarioForm({ ...diarioForm, fotos: diarioForm.fotos.filter((_, j) => j !== fi) })} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={10} /></button>
                    </div>
                  ))}
                  {diarioPhotoPreviews.map((p, pi) => (
                    <div key={`new-${pi}`} style={{ width: 72, height: 54, borderRadius: 6, overflow: 'hidden', position: 'relative', border: `2px solid ${colors.primary}` }}>
                      <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => { setDiarioPhotoFiles(prev => prev.filter((_, j) => j !== pi)); setDiarioPhotoPreviews(prev => prev.filter((_, j) => j !== pi)) }} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={10} /></button>
                    </div>
                  ))}
                </div>
                <input ref={diarioPhotoRef} type="file" accept="image/*" multiple onChange={handleDiarioPhotoSelect} style={{ display: 'none' }} />
                <button onClick={() => diarioPhotoRef.current?.click()} style={{ padding: '8px 14px', border: `1px dashed ${colors.border}`, borderRadius: 8, background: colors.background, cursor: 'pointer', fontSize: 12, color: colors.textMuted }}>
                  <Camera size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Adicionar fotos
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12, position: 'sticky', bottom: 0, background: colors.white, borderRadius: '0 0 16px 16px' }}>
              <button onClick={() => setShowDiarioModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDiarioSave('rascunho')} disabled={diarioSaving} style={{ flex: 1, padding: 12, background: colors.background, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: colors.text }}>
                {diarioSaving ? 'A guardar...' : 'Rascunho'}
              </button>
              <button onClick={() => handleDiarioSave('submetido')} disabled={diarioSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {diarioSaving ? 'A guardar...' : 'Submeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: RELATORIOS
  // ============================================
  const renderRelatoriosTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>
          {relatorios.length} relatorio{relatorios.length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => openRelModal()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Novo Relatorio
        </button>
      </div>

      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {relatoriosLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        ) : relatorios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhum relatorio</p>
          </div>
        ) : relatorios.map((rel, i) => {
          const estado = relEstados[rel.estado] || relEstados.rascunho
          return (
            <div key={rel.id} style={{ padding: '16px 20px', borderBottom: i < relatorios.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} style={{ color: colors.primary }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{rel.codigo}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{rel.titulo}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                  <span>{rel.tipo}</span>
                  <span>{new Date(rel.data_inicio).toLocaleDateString('pt-PT')} - {new Date(rel.data_fim).toLocaleDateString('pt-PT')}</span>
                  {rel.progresso_global > 0 && <span>Progresso: {rel.progresso_global}%</span>}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: estado.color, background: estado.bg }}>{estado.label}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {rel.estado === 'rascunho' && (
                  <button onClick={() => handleRelEstadoChange(rel, 'em_revisao')} style={{ padding: '6px 10px', background: '#FEF3C7', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#F59E0B' }} title="Enviar para revisao">
                    <Send size={12} />
                  </button>
                )}
                {rel.estado === 'em_revisao' && (
                  <button onClick={() => handleRelEstadoChange(rel, 'publicado')} style={{ padding: '6px 10px', background: '#D1FAE5', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#10B981' }} title="Publicar">
                    <FileCheck size={12} />
                  </button>
                )}
                <button onClick={() => openRelModal(rel)} style={{ padding: '6px 10px', background: colors.background, border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: colors.text }} title="Editar">
                  <Edit size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Relatorio Modal */}
      {showRelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>{editingRel ? 'Editar Relatorio' : 'Novo Relatorio'}</h2>
              <button onClick={() => setShowRelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo *</label>
                <input type="text" value={relForm.titulo} onChange={e => setRelForm({ ...relForm, titulo: e.target.value })} placeholder="Ex: Relatorio Semanal #12" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Tipo</label>
                  <select value={relForm.tipo} onChange={e => setRelForm({ ...relForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option><option value="milestone">Milestone</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Data inicio *</label>
                  <input type="date" value={relForm.data_inicio} onChange={e => setRelForm({ ...relForm, data_inicio: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Data fim *</label>
                  <input type="date" value={relForm.data_fim} onChange={e => setRelForm({ ...relForm, data_fim: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Progresso global (%)</label>
                <input type="range" min="0" max="100" value={relForm.progresso_global} onChange={e => setRelForm({ ...relForm, progresso_global: parseInt(e.target.value) })} style={{ width: '100%' }} />
                <span style={{ fontSize: 13, color: colors.textMuted }}>{relForm.progresso_global}%</span>
              </div>
              {[
                { key: 'resumo_executivo', label: 'Resumo executivo' },
                { key: 'trabalhos_realizados', label: 'Trabalhos realizados' },
                { key: 'trabalhos_proxima_semana', label: 'Trabalhos proxima semana' },
                { key: 'problemas_identificados', label: 'Problemas identificados' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{field.label}</label>
                  <textarea value={relForm[field.key]} onChange={e => setRelForm({ ...relForm, [field.key]: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              ))}
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowRelModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleRelSave} disabled={!relForm.titulo || !relForm.data_inicio || !relForm.data_fim || relSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!relForm.titulo) ? 0.5 : 1 }}>
                {relSaving ? 'A guardar...' : (editingRel ? 'Guardar' : 'Criar Relatorio')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: NAO CONFORMIDADES
  // ============================================
  const renderNaoConformidadesTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={ncFiltroEstado} onChange={e => setNcFiltroEstado(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todos os estados</option>
            {ncEstados.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={ncFiltroGravidade} onChange={e => setNcFiltroGravidade(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as gravidades</option>
            {ncGravidades.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <button onClick={() => openNcModal()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Nova NC
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Abertas', value: ncStats.abertas, color: '#F44336', bg: '#FFEBEE' },
          { label: 'Em Resolucao', value: ncStats.emResolucao, color: '#FF9800', bg: '#FFF3E0' },
          { label: 'Resolvidas', value: ncStats.resolvidas, color: '#4CAF50', bg: '#E8F5E9' },
          { label: 'Criticas', value: ncStats.criticas, color: '#9C27B0', bg: '#F3E5F5' },
        ].map(s => (
          <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {ncsLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        ) : filteredNcs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <AlertTriangle size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma NC encontrada</p>
          </div>
        ) : filteredNcs.map((nc, i) => {
          const estadoInfo = ncEstados.find(e => e.value === nc.estado) || ncEstados[0]
          const gravInfo = ncGravidades.find(g => g.value === nc.gravidade) || ncGravidades[0]
          const isExpanded = expandedNc === nc.id
          return (
            <div key={nc.id} style={{ borderBottom: i < filteredNcs.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedNc(isExpanded ? null : nc.id)}>
                <div style={{ width: 6, height: 36, borderRadius: 3, background: gravInfo.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{nc.codigo}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                    <span>{new Date(nc.data_identificacao).toLocaleDateString('pt-PT')}</span>
                    {nc.especialidades && <span>{nc.especialidades.nome}</span>}
                    {nc.obra_zonas && <span>{nc.obra_zonas.nome}</span>}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: estadoInfo.color, background: estadoInfo.bg }}>{estadoInfo.label}</span>
                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: gravInfo.color }}>{gravInfo.label}</span>
                <ChevronDown size={18} style={{ color: colors.textMuted, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 40px', fontSize: 13 }}>
                  <p style={{ color: colors.text, marginTop: 0 }}>{nc.descricao}</p>
                  {nc.acao_corretiva && <div style={{ marginBottom: 8 }}><strong style={{ color: colors.text }}>Acao corretiva:</strong> <span style={{ color: colors.textMuted }}>{nc.acao_corretiva}</span></div>}
                  {nc.acao_preventiva && <div style={{ marginBottom: 8 }}><strong style={{ color: colors.text }}>Acao preventiva:</strong> <span style={{ color: colors.textMuted }}>{nc.acao_preventiva}</span></div>}
                  {nc.responsavel_resolucao && <div style={{ marginBottom: 8 }}><strong>Responsavel:</strong> {nc.responsavel_resolucao}</div>}
                  {nc.data_limite_resolucao && <div style={{ marginBottom: 8 }}><strong>Prazo:</strong> {new Date(nc.data_limite_resolucao).toLocaleDateString('pt-PT')}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => openNcModal(nc)} style={{ padding: '6px 14px', background: colors.background, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: colors.text }}>
                      <Edit size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Editar
                    </button>
                    {nc.estado === 'aberta' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'em_resolucao')} style={{ padding: '6px 14px', background: '#FFF3E0', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#FF9800' }}>
                        Iniciar Resolucao
                      </button>
                    )}
                    {nc.estado === 'em_resolucao' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'resolvida')} style={{ padding: '6px 14px', background: '#E8F5E9', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4CAF50' }}>
                        Marcar Resolvida
                      </button>
                    )}
                    {nc.estado === 'resolvida' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'verificada')} style={{ padding: '6px 14px', background: '#E3F2FD', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2196F3' }}>
                        Verificar
                      </button>
                    )}
                    {nc.estado === 'verificada' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'encerrada')} style={{ padding: '6px 14px', background: '#F5F5F5', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#9E9E9E' }}>
                        Encerrar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* NC Modal */}
      {showNcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>{editingNc ? 'Editar NC' : 'Nova Nao Conformidade'}</h2>
              <button onClick={() => setShowNcModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo *</label>
                <input type="text" value={ncForm.titulo} onChange={e => setNcForm({ ...ncForm, titulo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Descricao *</label>
                <textarea value={ncForm.descricao} onChange={e => setNcForm({ ...ncForm, descricao: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Tipo</label>
                  <select value={ncForm.tipo} onChange={e => setNcForm({ ...ncForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="execucao">Execucao</option><option value="material">Material</option>
                    <option value="projeto">Projeto</option><option value="seguranca">Seguranca</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Gravidade</label>
                  <select value={ncForm.gravidade} onChange={e => setNcForm({ ...ncForm, gravidade: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="menor">Menor</option><option value="maior">Maior</option><option value="critica">Critica</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Zona</label>
                  <select value={ncForm.zona_id} onChange={e => setNcForm({ ...ncForm, zona_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Especialidade</label>
                  <select value={ncForm.especialidade_id} onChange={e => setNcForm({ ...ncForm, especialidade_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Prazo resolucao</label>
                  <input type="date" value={ncForm.data_limite_resolucao} onChange={e => setNcForm({ ...ncForm, data_limite_resolucao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Responsavel</label>
                  <input type="text" value={ncForm.responsavel_resolucao} onChange={e => setNcForm({ ...ncForm, responsavel_resolucao: e.target.value })} placeholder="Nome do responsavel" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Acao corretiva</label>
                <textarea value={ncForm.acao_corretiva} onChange={e => setNcForm({ ...ncForm, acao_corretiva: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Acao preventiva</label>
                <textarea value={ncForm.acao_preventiva} onChange={e => setNcForm({ ...ncForm, acao_preventiva: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowNcModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleNcSave} disabled={!ncForm.titulo || !ncForm.descricao || ncSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!ncForm.titulo || !ncForm.descricao) ? 0.5 : 1 }}>
                {ncSaving ? 'A guardar...' : (editingNc ? 'Guardar' : 'Criar NC')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // SIDEBAR: Week Summary + Calendar + Pendentes
  // ============================================
  const renderSidebar = () => {
    // Week summary stats
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    const startStr = startOfWeek.toISOString().split('T')[0]
    const endStr = endOfWeek.toISOString().split('T')[0]

    const weekEntries = diarioEntradas.filter(d => d.data >= startStr && d.data <= endStr)
    const weekDays = weekEntries.length
    const weekWorkers = weekEntries.reduce((s, d) => {
      const wc = (d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0)
      return s + wc
    }, 0)
    const avgWorkers = weekEntries.length > 0 ? (weekWorkers / weekEntries.length).toFixed(1) : '0'
    const weekPhotos = weekEntries.reduce((s, d) => s + (d.fotos?.length || 0) + (d.atividades || []).reduce((a, at) => a + (at.fotos?.length || 0), 0), 0)
    const weekIncidents = weekEntries.reduce((s, d) => s + (d.ocorrencias?.length || 0), 0)

    // Calendar
    const calYear = now.getFullYear()
    const calMonth = now.getMonth()
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const today = now.getDate()
    const calStartDay = firstDay === 0 ? 6 : firstDay - 1 // Monday start
    const entryDates = new Set(diarioEntradas.map(d => d.data))

    // Pendentes from NCs
    const openNcs = ncs.filter(n => ['aberta', 'em_resolucao'].includes(n.estado))
    const criticalOcorrencias = diarioEntradas.flatMap(d => (d.ocorrencias || []).filter(o => o.severidade === 'Alta'))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* RESUMO DA SEMANA card */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Resumo da Semana</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: 12, background: colors.background, borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.primary }}>{weekDays}<span style={{ fontSize: 13, fontWeight: 400, color: colors.textMuted }}>/5</span></div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Dias Registados</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: colors.background, borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.primary }}>{avgWorkers}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Media em Obra</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: colors.background, borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.primary }}>{weekPhotos}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Fotografias</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: weekIncidents > 0 ? '#FEF2F2' : colors.background, borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: weekIncidents > 0 ? colors.error : colors.primary }}>{weekIncidents}</div>
              <div style={{ fontSize: 11, color: weekIncidents > 0 ? colors.error : colors.textMuted, marginTop: 2 }}>Incidentes</div>
            </div>
          </div>
        </div>

        {/* CALENDAR card */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            {MONTHS_PT[calMonth]} {calYear}
          </h3>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: colors.textMuted, padding: '4px 0' }}>{d}</div>
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
                  position: 'relative', width: 28, height: 28, lineHeight: '28px',
                  borderRadius: '50%', fontSize: 11, fontWeight: isToday ? 700 : 400, margin: '0 auto',
                  background: isToday ? colors.primary : 'transparent',
                  color: isToday ? '#fff' : (hasEntry ? colors.text : colors.textMuted),
                  cursor: hasEntry ? 'pointer' : 'default'
                }}>
                  {day}
                  {hasEntry && !isToday && (
                    <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: colors.primary }} />
                  )}
                  {hasEntry && isToday && (
                    <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* PENDENTES card */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Pendentes nesta Obra</h3>
          {openNcs.length === 0 && criticalOcorrencias.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>Sem pendentes activos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {openNcs.slice(0, 5).map(nc => {
                const isAberta = nc.estado === 'aberta'
                return (
                  <div key={nc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: nc.gravidade === 'critica' ? colors.error : (isAberta ? colors.warning : '#3B82F6'), flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nc.gravidade === 'critica' ? 'NC Critica' : (isAberta ? 'NC Aberta' : 'NC em Resolucao')}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.titulo}</div>
                    </div>
                  </div>
                )
              })}
              {criticalOcorrencias.slice(0, 3).map((oc, i) => (
                <div key={`oc-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.error, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>Ocorrencia Alta</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oc.descricao}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER: RESUMO TAB (overview)
  // ============================================
  const renderResumoTab = () => {
    const recentEntries = diarioEntradas.slice(0, 5)
    const totalPhotos = diarioEntradas.reduce((s, d) => s + (d.fotos?.length || 0) + (d.atividades || []).reduce((a, at) => a + (at.fotos?.length || 0), 0), 0)
    const totalWorkerDays = diarioEntradas.reduce((s, d) => s + (d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0), 0)
    const totalIncidents = diarioEntradas.reduce((s, d) => s + (d.ocorrencias?.length || 0), 0)

    return (
      <div>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Entradas Diario', value: diarioEntradas.length, icon: BookOpen, color: colors.primary },
            { label: 'Fotografias Total', value: totalPhotos + fotos.length, icon: Camera, color: '#0891b2' },
            { label: 'Homens/Dia Total', value: totalWorkerDays, icon: Users, color: '#059669' },
            { label: 'Incidentes', value: totalIncidents, icon: AlertTriangle, color: totalIncidents > 0 ? colors.error : colors.textMuted },
          ].map((kpi, i) => {
            const Icon = kpi.icon
            return (
              <div key={i} style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${kpi.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color: kpi.color }} />
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: colors.text }}>{kpi.value}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{kpi.label}</div>
              </div>
            )
          })}
        </div>

        {/* Recent entries */}
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>Ultimas Entradas</h3>
        {recentEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
            <BookOpen size={40} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 12 }} />
            <p style={{ color: colors.textMuted, fontSize: 13 }}>Sem entradas no diario</p>
            <button onClick={() => openDiarioModal()} style={{ marginTop: 8, padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Criar entrada
            </button>
          </div>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {recentEntries.map((d, i) => {
              const weather = getWeatherInfo(d.condicoes_meteo)
              const WeatherIcon = weather.icon
              const wc = (d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0)
              const ativCount = (d.atividades?.length || 0) || (d.tarefas?.length || 0)
              return (
                <div key={d.id} style={{ padding: '14px 20px', borderBottom: i < recentEntries.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.status === 'submetido' ? '#10B981' : colors.warning, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{formatDatePT(d.data)}</span>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{getDayOfWeek(d.data)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 12, color: colors.textMuted }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><WeatherIcon size={12} style={{ color: weather.color }} /> {d.temperatura ? `${d.temperatura}°C` : weather.label}</span>
                      {wc > 0 && <span>{wc} trabalhadores</span>}
                      {ativCount > 0 && <span>{ativCount} atividade{ativCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: d.status === 'submetido' ? '#10B981' : '#D97706', background: d.status === 'submetido' ? '#D1FAE5' : '#FEF3C7' }}>
                    {d.status === 'submetido' ? 'Submetido' : 'Rascunho'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* NCs summary */}
        {ncs.length > 0 && (
          <>
            <h3 style={{ margin: '24px 0 12px', fontSize: 14, fontWeight: 700, color: colors.text }}>Nao Conformidades</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {[
                { label: 'Abertas', value: ncStats.abertas, color: '#F44336', bg: '#FFEBEE' },
                { label: 'Em Resolucao', value: ncStats.emResolucao, color: '#FF9800', bg: '#FFF3E0' },
                { label: 'Resolvidas', value: ncStats.resolvidas, color: '#4CAF50', bg: '#E8F5E9' },
              ].map(s => (
                <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ============================================
  // RENDER: DOCUMENTOS TAB (placeholder)
  // ============================================
  const renderDocumentosTab = () => (
    <div style={{ textAlign: 'center', padding: 48, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
      <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
      <p style={{ color: colors.textMuted, fontSize: 14 }}>Documentos da obra</p>
      <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Em desenvolvimento</p>
    </div>
  )

  // ============================================
  // MAIN RETURN — 2-column layout with sidebar
  // ============================================
  const showSidebar = activeSubtab === 'resumo' || activeSubtab === 'diario'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showSidebar ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}>
      {/* Main content column */}
      <div style={{ minWidth: 0 }}>
        {activeSubtab === 'resumo' && renderResumoTab()}
        {activeSubtab === 'diario' && renderDiarioTab()}
        {activeSubtab === 'fotografias' && renderFotografiasTab()}
        {activeSubtab === 'nao-conformidades' && renderNaoConformidadesTab()}
        {activeSubtab === 'documentos' && renderDocumentosTab()}
      </div>

      {/* Sidebar — visible on Resumo + Diario */}
      {showSidebar && (
        <div style={{ position: 'sticky', top: 16 }}>
          {renderSidebar()}
        </div>
      )}
    </div>
  )
}
