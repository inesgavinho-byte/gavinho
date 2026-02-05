// =====================================================
// DIARIO OBRA COMPONENT
// Daily logs for construction site - Mobile version
// Uses obra_diario table (same as admin version)
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Sun, Cloud,
  CloudRain, CloudSnow, Wind, Loader2, Camera, X, Save,
  AlertTriangle, CheckCircle2, Clock, Users, Copy,
  FileText, Image as ImageIcon, Thermometer
} from 'lucide-react'
import { styles, colors } from '../styles'
import { formatDate, formatDateTime } from '../utils'

const WEATHER_OPTIONS = [
  { key: 'sol', label: 'Sol', icon: Sun, color: '#f59e0b' },
  { key: 'nublado', label: 'Nublado', icon: Cloud, color: '#6b7280' },
  { key: 'chuva', label: 'Chuva', icon: CloudRain, color: '#3b82f6' },
  { key: 'neve', label: 'Neve', icon: CloudSnow, color: '#93c5fd' },
  { key: 'vento', label: 'Vento', icon: Wind, color: '#8b5cf6' }
]

export default function DiarioObra({ obra, user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [diarioId, setDiarioId] = useState(null)

  // Form state - mapped to obra_diario table
  const [formData, setFormData] = useState({
    condicoes_meteo: 'sol',
    temperatura: '',
    observacoes_meteo: '',
    trabalhadores_gavinho: 0,
    trabalhadores_subempreiteiros: 0,
    tarefas: [],
    ocorrencias: [],
    fotos: [],
    proximos_passos: []
  })

  // Simple text inputs for mobile
  const [tarefaText, setTarefaText] = useState('')
  const [ocorrenciaText, setOcorrenciaText] = useState('')

  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (obra) {
      loadEntries()
    }
  }, [obra, selectedDate])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('obra_diario')
        .select('*')
        .eq('obra_id', obra.id)
        .gte('data', startOfMonth.toISOString().split('T')[0])
        .lte('data', endOfMonth.toISOString().split('T')[0])
        .order('data', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Erro ao carregar diário:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTodayEntry = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', obra.id)
      .eq('data', today)
      .maybeSingle()

    if (data) {
      setDiarioId(data.id)
      setFormData({
        condicoes_meteo: data.condicoes_meteo || 'sol',
        temperatura: data.temperatura || '',
        observacoes_meteo: data.observacoes_meteo || '',
        trabalhadores_gavinho: data.trabalhadores_gavinho || 0,
        trabalhadores_subempreiteiros: data.trabalhadores_subempreiteiros || 0,
        tarefas: data.tarefas || [],
        ocorrencias: data.ocorrencias || [],
        fotos: data.fotos || [],
        proximos_passos: data.proximos_passos || []
      })
    } else {
      setDiarioId(null)
      resetForm()
    }
  }

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    })

    if (validFiles.length < files.length) {
      alert('Algumas imagens foram ignoradas (formato inválido ou > 10MB)')
    }

    setPhotoFiles(prev => [...prev, ...validFiles])

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }))
  }

  const uploadPhotos = async () => {
    const urls = []
    for (const file of photoFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `diario/${obra.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      const { error } = await supabase.storage
        .from('obra-fotos')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(fileName)

      urls.push(publicUrl)
    }
    return urls
  }

  const addTarefa = () => {
    if (!tarefaText.trim()) return
    setFormData(prev => ({
      ...prev,
      tarefas: [...prev.tarefas, { descricao: tarefaText.trim(), estado: 'em_curso' }]
    }))
    setTarefaText('')
  }

  const removeTarefa = (index) => {
    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.filter((_, i) => i !== index)
    }))
  }

  const addOcorrencia = () => {
    if (!ocorrenciaText.trim()) return
    setFormData(prev => ({
      ...prev,
      ocorrencias: [...prev.ocorrencias, { descricao: ocorrenciaText.trim(), tipo: 'info' }]
    }))
    setOcorrenciaText('')
  }

  const removeOcorrencia = (index) => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      let photoUrls = [...formData.fotos]
      if (photoFiles.length > 0) {
        const newUrls = await uploadPhotos()
        photoUrls = [...photoUrls, ...newUrls]
      }

      const today = new Date().toISOString().split('T')[0]

      // Build entry data with only confirmed columns
      // Note: condicoes_meteo, temperatura, observacoes_meteo removed due to schema issues
      const entryData = {
        obra_id: obra.id,
        data: today,
        trabalhadores_gavinho: parseInt(formData.trabalhadores_gavinho) || 0,
        trabalhadores_subempreiteiros: parseInt(formData.trabalhadores_subempreiteiros) || 0,
        status: 'rascunho',
        updated_at: new Date().toISOString()
      }

      // Add array fields if they have content
      if (formData.tarefas?.length > 0) entryData.tarefas = formData.tarefas
      if (formData.ocorrencias?.length > 0) entryData.ocorrencias = formData.ocorrencias
      if (photoUrls.length > 0) entryData.fotos = photoUrls
      if (formData.proximos_passos?.length > 0) entryData.proximos_passos = formData.proximos_passos

      console.log('Saving diario entry:', entryData)

      if (diarioId) {
        const { error } = await supabase
          .from('obra_diario')
          .update(entryData)
          .eq('id', diarioId)

        if (error) {
          console.error('Erro ao atualizar:', error)
          throw error
        }
      } else {
        const { data, error } = await supabase
          .from('obra_diario')
          .insert([entryData])
          .select()
          .single()

        if (error) {
          console.error('Erro ao inserir:', error)
          throw error
        }
        if (data) setDiarioId(data.id)
      }

      setPhotoFiles([])
      setPhotoPreviews([])
      setShowForm(false)
      loadEntries()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar registo: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      condicoes_meteo: 'sol',
      temperatura: '',
      observacoes_meteo: '',
      trabalhadores_gavinho: 0,
      trabalhadores_subempreiteiros: 0,
      tarefas: [],
      ocorrencias: [],
      fotos: [],
      proximos_passos: []
    })
    setTarefaText('')
    setOcorrenciaText('')
    setPhotoFiles([])
    setPhotoPreviews([])
    setDiarioId(null)
  }

  const openNewEntry = async () => {
    await loadTodayEntry()
    setShowForm(true)
  }

  // Copy yesterday's entry
  const copyYesterday = async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', obra.id)
      .eq('data', yesterdayStr)
      .maybeSingle()

    if (data) {
      setFormData({
        condicoes_meteo: data.condicoes_meteo || 'sol',
        temperatura: '',
        observacoes_meteo: '',
        trabalhadores_gavinho: data.trabalhadores_gavinho || 0,
        trabalhadores_subempreiteiros: data.trabalhadores_subempreiteiros || 0,
        tarefas: data.tarefas || [],
        ocorrencias: [],
        fotos: [],
        proximos_passos: data.proximos_passos || []
      })
      alert('Dados de ontem copiados!')
    } else {
      alert('Não existe registo de ontem')
    }
  }

  const navigateMonth = (direction) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.data === today)
  const totalTrabalhadores = (formData.trabalhadores_gavinho || 0) + (formData.trabalhadores_subempreiteiros || 0)

  // Local styles
  const diarioStyles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      overflow: 'hidden'
    },
    header: {
      padding: 16,
      background: 'white',
      borderBottom: '1px solid #e5e7eb'
    },
    monthNav: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: 600,
      textTransform: 'capitalize'
    },
    navButton: {
      background: 'none',
      border: 'none',
      padding: 8,
      cursor: 'pointer',
      color: '#6b7280',
      borderRadius: 8
    },
    todayButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: 12,
      background: todayEntry ? '#d1fae5' : colors.primary,
      color: todayEntry ? '#065f46' : 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: 16
    },
    entryCard: {
      background: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer'
    },
    entryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    },
    entryDate: {
      fontSize: 14,
      fontWeight: 600,
      color: '#374151'
    },
    weatherBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 12,
      fontSize: 12
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 12,
      fontSize: 11,
      marginRight: 8
    },
    entryMeta: {
      display: 'flex',
      gap: 12,
      marginTop: 8,
      fontSize: 12,
      color: '#9ca3af'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    },
    // Form styles
    formOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 100
    },
    formContainer: {
      background: 'white',
      borderRadius: '16px 16px 0 0',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    formHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 1
    },
    formTitle: {
      fontSize: 16,
      fontWeight: 600,
      margin: 0
    },
    formBody: {
      padding: 16
    },
    fieldGroup: {
      marginBottom: 16
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: 500,
      color: '#374151',
      marginBottom: 8,
      display: 'block'
    },
    weatherGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8
    },
    weatherOption: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: 8,
      border: '2px solid #e5e7eb',
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: 11
    },
    weatherSelected: {
      borderColor: colors.primary,
      background: `${colors.primary}10`
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14
    },
    inputRow: {
      display: 'flex',
      gap: 12
    },
    inputHalf: {
      flex: 1
    },
    textarea: {
      width: '100%',
      padding: 12,
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      resize: 'vertical',
      minHeight: 60,
      fontFamily: 'inherit'
    },
    addItemRow: {
      display: 'flex',
      gap: 8
    },
    addButton: {
      padding: '10px 16px',
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 14
    },
    itemList: {
      marginTop: 8
    },
    itemChip: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: '#f3f4f6',
      borderRadius: 8,
      marginBottom: 6,
      fontSize: 13
    },
    removeChip: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 4,
      color: '#9ca3af'
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8
    },
    photoPreview: {
      position: 'relative',
      paddingBottom: '100%',
      borderRadius: 8,
      overflow: 'hidden'
    },
    photoImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    removePhotoButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      background: 'rgba(0,0,0,0.5)',
      border: 'none',
      borderRadius: '50%',
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'white'
    },
    addPhotoButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: '100%',
      position: 'relative',
      border: '2px dashed #e5e7eb',
      borderRadius: 8,
      cursor: 'pointer',
      background: '#f9fafb'
    },
    addPhotoIcon: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#9ca3af'
    },
    copyButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      background: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: 8,
      fontSize: 12,
      cursor: 'pointer'
    },
    submitButton: {
      width: '100%',
      padding: 14,
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    },
    empty: {
      textAlign: 'center',
      padding: 40,
      color: '#6b7280'
    },
    skeleton: {
      background: '#f3f4f6',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12
    },
    skeletonLine: {
      height: 12,
      background: '#e5e7eb',
      borderRadius: 4,
      marginBottom: 8
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div style={diarioStyles.container}>
        <div style={diarioStyles.header}>
          <div style={{ ...diarioStyles.skeletonLine, width: '60%', height: 20 }} />
          <div style={{ ...diarioStyles.skeletonLine, width: '100%', height: 44, marginTop: 12 }} />
        </div>
        <div style={diarioStyles.content}>
          {[1, 2, 3].map(i => (
            <div key={i} style={diarioStyles.skeleton}>
              <div style={{ ...diarioStyles.skeletonLine, width: '40%' }} />
              <div style={{ ...diarioStyles.skeletonLine, width: '100%' }} />
              <div style={{ ...diarioStyles.skeletonLine, width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={diarioStyles.container}>
      {/* Header */}
      <div style={diarioStyles.header}>
        <div style={diarioStyles.monthNav}>
          <button onClick={() => navigateMonth(-1)} style={diarioStyles.navButton}>
            <ChevronLeft size={20} />
          </button>
          <span style={diarioStyles.monthTitle}>
            {selectedDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navigateMonth(1)} style={diarioStyles.navButton}>
            <ChevronRight size={20} />
          </button>
        </div>

        <button onClick={openNewEntry} style={diarioStyles.todayButton}>
          {todayEntry ? (
            <>
              <CheckCircle2 size={18} />
              Editar registo de hoje
            </>
          ) : (
            <>
              <Plus size={18} />
              Criar registo de hoje
            </>
          )}
        </button>
      </div>

      {/* Entries list */}
      <div style={diarioStyles.content}>
        {entries.length === 0 ? (
          <div style={diarioStyles.empty}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Sem registos este mês</p>
            <p style={{ fontSize: 12 }}>Cria o primeiro registo do dia</p>
          </div>
        ) : (
          entries.map(entry => {
            const weather = WEATHER_OPTIONS.find(w => w.key === entry.condicoes_meteo)
            const WeatherIcon = weather?.icon || Sun
            const totalWorkers = (entry.trabalhadores_gavinho || 0) + (entry.trabalhadores_subempreiteiros || 0)

            return (
              <div
                key={entry.id}
                style={diarioStyles.entryCard}
                onClick={() => setSelectedEntry(entry)}
              >
                <div style={diarioStyles.entryHeader}>
                  <span style={diarioStyles.entryDate}>
                    {new Date(entry.data).toLocaleDateString('pt-PT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                  {weather && (
                    <span style={{
                      ...diarioStyles.weatherBadge,
                      background: `${weather.color}20`,
                      color: weather.color
                    }}>
                      <WeatherIcon size={14} />
                      {weather.label}
                    </span>
                  )}
                </div>

                <div>
                  <span style={{
                    ...diarioStyles.statusBadge,
                    background: entry.status === 'submetido' ? '#d1fae5' : '#fef3c7',
                    color: entry.status === 'submetido' ? '#065f46' : '#92400e'
                  }}>
                    {entry.status === 'submetido' ? 'Submetido' : 'Rascunho'}
                  </span>
                  {entry.tarefas?.length > 0 && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {entry.tarefas.length} tarefa{entry.tarefas.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div style={diarioStyles.entryMeta}>
                  {totalWorkers > 0 && (
                    <span style={diarioStyles.metaItem}>
                      <Users size={12} />
                      {totalWorkers} trabalhadores
                    </span>
                  )}
                  {entry.fotos?.length > 0 && (
                    <span style={diarioStyles.metaItem}>
                      <ImageIcon size={12} />
                      {entry.fotos.length} fotos
                    </span>
                  )}
                  {entry.ocorrencias?.length > 0 && (
                    <span style={{ ...diarioStyles.metaItem, color: '#f59e0b' }}>
                      <AlertTriangle size={12} />
                      {entry.ocorrencias.length} ocorrência{entry.ocorrencias.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <div style={diarioStyles.formOverlay} onClick={() => setShowForm(false)}>
          <div style={diarioStyles.formContainer} onClick={e => e.stopPropagation()}>
            <div style={diarioStyles.formHeader}>
              <h3 style={diarioStyles.formTitle}>
                {diarioId ? 'Editar' : 'Novo'} Registo - {formatDate(new Date())}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyYesterday} style={diarioStyles.copyButton}>
                  <Copy size={14} /> Copiar ontem
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={24} color="#6b7280" />
                </button>
              </div>
            </div>

            <div style={diarioStyles.formBody}>
              {/* Weather */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Condições Meteorológicas</label>
                <div style={diarioStyles.weatherGrid}>
                  {WEATHER_OPTIONS.map(weather => {
                    const Icon = weather.icon
                    return (
                      <div
                        key={weather.key}
                        onClick={() => setFormData(prev => ({ ...prev, condicoes_meteo: weather.key }))}
                        style={{
                          ...diarioStyles.weatherOption,
                          ...(formData.condicoes_meteo === weather.key ? diarioStyles.weatherSelected : {})
                        }}
                      >
                        <Icon size={20} color={weather.color} />
                        {weather.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Temperature */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>
                  <Thermometer size={14} style={{ marginRight: 4 }} />
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  value={formData.temperatura}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperatura: e.target.value }))}
                  placeholder="Ex: 22"
                  style={{ ...diarioStyles.input, width: 100 }}
                />
              </div>

              {/* Workers */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Trabalhadores Presentes</label>
                <div style={diarioStyles.inputRow}>
                  <div style={diarioStyles.inputHalf}>
                    <label style={{ fontSize: 11, color: '#6b7280' }}>Equipa Gavinho</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.trabalhadores_gavinho}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trabalhadores_gavinho: parseInt(e.target.value) || 0
                      }))}
                      style={diarioStyles.input}
                    />
                  </div>
                  <div style={diarioStyles.inputHalf}>
                    <label style={{ fontSize: 11, color: '#6b7280' }}>Subempreiteiros</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.trabalhadores_subempreiteiros}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        trabalhadores_subempreiteiros: parseInt(e.target.value) || 0
                      }))}
                      style={diarioStyles.input}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Total: {totalTrabalhadores} trabalhadores
                </div>
              </div>

              {/* Tasks */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Tarefas Realizadas</label>
                <div style={diarioStyles.addItemRow}>
                  <input
                    type="text"
                    value={tarefaText}
                    onChange={(e) => setTarefaText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTarefa()}
                    placeholder="Adicionar tarefa..."
                    style={{ ...diarioStyles.input, flex: 1 }}
                  />
                  <button onClick={addTarefa} style={diarioStyles.addButton}>+</button>
                </div>
                {formData.tarefas.length > 0 && (
                  <div style={diarioStyles.itemList}>
                    {formData.tarefas.map((t, i) => (
                      <div key={i} style={diarioStyles.itemChip}>
                        <span>{t.descricao}</span>
                        <button onClick={() => removeTarefa(i)} style={diarioStyles.removeChip}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Occurrences */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>
                  <AlertTriangle size={14} style={{ marginRight: 4, color: '#f59e0b' }} />
                  Ocorrências / Incidentes
                </label>
                <div style={diarioStyles.addItemRow}>
                  <input
                    type="text"
                    value={ocorrenciaText}
                    onChange={(e) => setOcorrenciaText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOcorrencia()}
                    placeholder="Registar ocorrência..."
                    style={{ ...diarioStyles.input, flex: 1 }}
                  />
                  <button onClick={addOcorrencia} style={diarioStyles.addButton}>+</button>
                </div>
                {formData.ocorrencias.length > 0 && (
                  <div style={diarioStyles.itemList}>
                    {formData.ocorrencias.map((o, i) => (
                      <div key={i} style={{ ...diarioStyles.itemChip, background: '#fef3c7' }}>
                        <span>{o.descricao}</span>
                        <button onClick={() => removeOcorrencia(i)} style={diarioStyles.removeChip}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observations */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Observações</label>
                <textarea
                  value={formData.observacoes_meteo}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes_meteo: e.target.value }))}
                  placeholder="Notas adicionais..."
                  style={diarioStyles.textarea}
                />
              </div>

              {/* Photos */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Fotos</label>
                <div style={diarioStyles.photoGrid}>
                  {/* Existing photos */}
                  {formData.fotos.map((url, idx) => (
                    <div key={`existing-${idx}`} style={diarioStyles.photoPreview}>
                      <img src={url} alt="" style={diarioStyles.photoImage} />
                      <button
                        onClick={() => removeExistingPhoto(idx)}
                        style={diarioStyles.removePhotoButton}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* New photo previews */}
                  {photoPreviews.map((preview, idx) => (
                    <div key={`new-${idx}`} style={diarioStyles.photoPreview}>
                      <img src={preview} alt="" style={diarioStyles.photoImage} />
                      <button
                        onClick={() => removePhoto(idx)}
                        style={diarioStyles.removePhotoButton}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* Add photo button */}
                  <div
                    style={diarioStyles.addPhotoButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={24} style={diarioStyles.addPhotoIcon} />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  ...diarioStyles.submitButton,
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'A guardar...' : 'Guardar Registo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div style={diarioStyles.formOverlay} onClick={() => setSelectedEntry(null)}>
          <div style={diarioStyles.formContainer} onClick={e => e.stopPropagation()}>
            <div style={diarioStyles.formHeader}>
              <h3 style={diarioStyles.formTitle}>
                {new Date(selectedEntry.data).toLocaleDateString('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            <div style={diarioStyles.formBody}>
              {/* Weather & Status */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {(() => {
                  const weather = WEATHER_OPTIONS.find(w => w.key === selectedEntry.condicoes_meteo)
                  const WeatherIcon = weather?.icon || Sun
                  return weather ? (
                    <span style={{
                      ...diarioStyles.weatherBadge,
                      background: `${weather.color}20`,
                      color: weather.color
                    }}>
                      <WeatherIcon size={14} />
                      {weather.label}
                      {selectedEntry.temperatura && ` ${selectedEntry.temperatura}°C`}
                    </span>
                  ) : null
                })()}
                <span style={{
                  ...diarioStyles.statusBadge,
                  background: selectedEntry.status === 'submetido' ? '#d1fae5' : '#fef3c7',
                  color: selectedEntry.status === 'submetido' ? '#065f46' : '#92400e',
                  margin: 0
                }}>
                  {selectedEntry.status === 'submetido' ? 'Submetido' : 'Rascunho'}
                </span>
                {((selectedEntry.trabalhadores_gavinho || 0) + (selectedEntry.trabalhadores_subempreiteiros || 0)) > 0 && (
                  <span style={diarioStyles.metaItem}>
                    <Users size={14} />
                    {(selectedEntry.trabalhadores_gavinho || 0) + (selectedEntry.trabalhadores_subempreiteiros || 0)} trabalhadores
                  </span>
                )}
              </div>

              {/* Tasks */}
              {selectedEntry.tarefas?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 500 }}>
                    Tarefas ({selectedEntry.tarefas.length})
                  </div>
                  {selectedEntry.tarefas.map((t, i) => (
                    <div key={i} style={diarioStyles.itemChip}>
                      {t.descricao}
                    </div>
                  ))}
                </div>
              )}

              {/* Occurrences */}
              {selectedEntry.ocorrencias?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase', fontWeight: 500 }}>
                    <AlertTriangle size={12} style={{ marginRight: 4 }} />
                    Ocorrências ({selectedEntry.ocorrencias.length})
                  </div>
                  {selectedEntry.ocorrencias.map((o, i) => (
                    <div key={i} style={{ ...diarioStyles.itemChip, background: '#fef3c7' }}>
                      {o.descricao}
                    </div>
                  ))}
                </div>
              )}

              {/* Observations */}
              {selectedEntry.observacoes_meteo && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 500 }}>
                    Observações
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selectedEntry.observacoes_meteo}
                  </p>
                </div>
              )}

              {/* Photos */}
              {selectedEntry.fotos?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 500 }}>
                    Fotos ({selectedEntry.fotos.length})
                  </div>
                  <div style={{ ...diarioStyles.photoGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {selectedEntry.fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        style={diarioStyles.photoPreview}
                        onClick={() => window.open(foto, '_blank')}
                      >
                        <img src={foto} alt="" style={diarioStyles.photoImage} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
                Última atualização: {formatDateTime(selectedEntry.updated_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
