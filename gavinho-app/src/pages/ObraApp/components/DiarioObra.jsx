// =====================================================
// DIARIO OBRA COMPONENT
// Daily logs for construction site
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Sun, Cloud,
  CloudRain, CloudSnow, Wind, Loader2, Camera, X, Save,
  AlertTriangle, CheckCircle2, Clock, Users, Wrench,
  FileText, Image as ImageIcon
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

const WORK_STATUS = [
  { key: 'normal', label: 'Trabalho Normal', color: '#10b981' },
  { key: 'parcial', label: 'Trabalho Parcial', color: '#f59e0b' },
  { key: 'parado', label: 'Trabalho Parado', color: '#ef4444' }
]

export default function DiarioObra({ obra, user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    tempo: 'sol',
    estado_trabalho: 'normal',
    trabalhadores_presentes: 0,
    descricao: '',
    trabalhos_realizados: '',
    incidentes: '',
    observacoes: '',
    fotos: []
  })
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
      // Get entries for current month
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('diario_obra')
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

    // Create previews
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

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      alert('Preenche a descrição do dia')
      return
    }

    setSaving(true)
    try {
      let photoUrls = []
      if (photoFiles.length > 0) {
        photoUrls = await uploadPhotos()
      }

      const today = new Date().toISOString().split('T')[0]

      // Check if entry already exists for today
      const { data: existing } = await supabase
        .from('diario_obra')
        .select('id')
        .eq('obra_id', obra.id)
        .eq('data', today)
        .single()

      const entryData = {
        obra_id: obra.id,
        data: today,
        autor_id: user.id,
        autor_nome: user.nome,
        tempo: formData.tempo,
        estado_trabalho: formData.estado_trabalho,
        trabalhadores_presentes: formData.trabalhadores_presentes || 0,
        descricao: formData.descricao,
        trabalhos_realizados: formData.trabalhos_realizados,
        incidentes: formData.incidentes,
        observacoes: formData.observacoes,
        fotos: photoUrls.length > 0 ? photoUrls : null,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('diario_obra')
          .update(entryData)
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Create new entry
        const { error } = await supabase
          .from('diario_obra')
          .insert(entryData)

        if (error) throw error
      }

      // Reset form and reload
      resetForm()
      setShowForm(false)
      loadEntries()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar registo')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tempo: 'sol',
      estado_trabalho: 'normal',
      trabalhadores_presentes: 0,
      descricao: '',
      trabalhos_realizados: '',
      incidentes: '',
      observacoes: '',
      fotos: []
    })
    setPhotoFiles([])
    setPhotoPreviews([])
  }

  const openNewEntry = () => {
    resetForm()
    setShowForm(true)
  }

  const navigateMonth = (direction) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  // Check if today's entry exists
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.data === today)

  // Get entries by date for calendar dots
  const entriesByDate = entries.reduce((acc, entry) => {
    acc[entry.data] = entry
    return acc
  }, {})

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
      fontSize: 12,
      marginBottom: 8
    },
    entryDescription: {
      fontSize: 14,
      color: '#6b7280',
      lineHeight: 1.4,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
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
    statusGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8
    },
    statusOption: {
      padding: '10px 8px',
      border: '2px solid #e5e7eb',
      borderRadius: 8,
      cursor: 'pointer',
      textAlign: 'center',
      fontSize: 12,
      transition: 'all 0.2s'
    },
    textarea: {
      width: '100%',
      padding: 12,
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      resize: 'vertical',
      minHeight: 80,
      fontFamily: 'inherit'
    },
    numberInput: {
      width: 80,
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      textAlign: 'center'
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
    // Detail modal
    detailOverlay: {
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
    detailContainer: {
      background: 'white',
      borderRadius: '16px 16px 0 0',
      width: '100%',
      maxHeight: '85vh',
      overflow: 'auto'
    },
    detailSection: {
      marginBottom: 16
    },
    detailLabel: {
      fontSize: 12,
      color: '#6b7280',
      marginBottom: 4,
      textTransform: 'uppercase',
      fontWeight: 500
    },
    detailText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap'
    },
    detailPhotos: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8
    },
    detailPhoto: {
      paddingBottom: '100%',
      position: 'relative',
      borderRadius: 8,
      overflow: 'hidden'
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
            const weather = WEATHER_OPTIONS.find(w => w.key === entry.tempo)
            const status = WORK_STATUS.find(s => s.key === entry.estado_trabalho)
            const WeatherIcon = weather?.icon || Sun

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

                {status && (
                  <span style={{
                    ...diarioStyles.statusBadge,
                    background: `${status.color}20`,
                    color: status.color
                  }}>
                    {status.label}
                  </span>
                )}

                <p style={diarioStyles.entryDescription}>{entry.descricao}</p>

                <div style={diarioStyles.entryMeta}>
                  {entry.trabalhadores_presentes > 0 && (
                    <span style={diarioStyles.metaItem}>
                      <Users size={12} />
                      {entry.trabalhadores_presentes} trabalhadores
                    </span>
                  )}
                  {entry.fotos && entry.fotos.length > 0 && (
                    <span style={diarioStyles.metaItem}>
                      <ImageIcon size={12} />
                      {entry.fotos.length} fotos
                    </span>
                  )}
                  <span style={diarioStyles.metaItem}>
                    <Clock size={12} />
                    {entry.autor_nome}
                  </span>
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
                {todayEntry ? 'Editar Registo' : 'Novo Registo'} - {formatDate(new Date())}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={24} color="#6b7280" />
              </button>
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
                        onClick={() => setFormData(prev => ({ ...prev, tempo: weather.key }))}
                        style={{
                          ...diarioStyles.weatherOption,
                          ...(formData.tempo === weather.key ? diarioStyles.weatherSelected : {})
                        }}
                      >
                        <Icon size={20} color={weather.color} />
                        {weather.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Work status */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Estado do Trabalho</label>
                <div style={diarioStyles.statusGrid}>
                  {WORK_STATUS.map(status => (
                    <div
                      key={status.key}
                      onClick={() => setFormData(prev => ({ ...prev, estado_trabalho: status.key }))}
                      style={{
                        ...diarioStyles.statusOption,
                        borderColor: formData.estado_trabalho === status.key ? status.color : '#e5e7eb',
                        background: formData.estado_trabalho === status.key ? `${status.color}10` : 'white',
                        color: formData.estado_trabalho === status.key ? status.color : '#374151'
                      }}
                    >
                      {status.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Workers present */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Trabalhadores Presentes</label>
                <input
                  type="number"
                  min="0"
                  value={formData.trabalhadores_presentes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trabalhadores_presentes: parseInt(e.target.value) || 0
                  }))}
                  style={diarioStyles.numberInput}
                />
              </div>

              {/* Description */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Descrição do Dia *</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreve resumidamente o que aconteceu hoje na obra..."
                  style={diarioStyles.textarea}
                />
              </div>

              {/* Work done */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Trabalhos Realizados</label>
                <textarea
                  value={formData.trabalhos_realizados}
                  onChange={(e) => setFormData(prev => ({ ...prev, trabalhos_realizados: e.target.value }))}
                  placeholder="Lista os principais trabalhos realizados..."
                  style={{ ...diarioStyles.textarea, minHeight: 60 }}
                />
              </div>

              {/* Incidents */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>
                  <AlertTriangle size={14} style={{ marginRight: 4 }} />
                  Incidentes / Problemas
                </label>
                <textarea
                  value={formData.incidentes}
                  onChange={(e) => setFormData(prev => ({ ...prev, incidentes: e.target.value }))}
                  placeholder="Regista qualquer incidente ou problema..."
                  style={{ ...diarioStyles.textarea, minHeight: 60 }}
                />
              </div>

              {/* Photos */}
              <div style={diarioStyles.fieldGroup}>
                <label style={diarioStyles.fieldLabel}>Fotos</label>
                <div style={diarioStyles.photoGrid}>
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} style={diarioStyles.photoPreview}>
                      <img src={preview} alt="" style={diarioStyles.photoImage} />
                      <button
                        onClick={() => removePhoto(idx)}
                        style={diarioStyles.removePhotoButton}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
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
        <div style={diarioStyles.detailOverlay} onClick={() => setSelectedEntry(null)}>
          <div style={diarioStyles.detailContainer} onClick={e => e.stopPropagation()}>
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
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {(() => {
                  const weather = WEATHER_OPTIONS.find(w => w.key === selectedEntry.tempo)
                  const WeatherIcon = weather?.icon || Sun
                  return weather ? (
                    <span style={{
                      ...diarioStyles.weatherBadge,
                      background: `${weather.color}20`,
                      color: weather.color
                    }}>
                      <WeatherIcon size={14} />
                      {weather.label}
                    </span>
                  ) : null
                })()}
                {(() => {
                  const status = WORK_STATUS.find(s => s.key === selectedEntry.estado_trabalho)
                  return status ? (
                    <span style={{
                      ...diarioStyles.statusBadge,
                      background: `${status.color}20`,
                      color: status.color,
                      margin: 0
                    }}>
                      {status.label}
                    </span>
                  ) : null
                })()}
                {selectedEntry.trabalhadores_presentes > 0 && (
                  <span style={diarioStyles.metaItem}>
                    <Users size={14} />
                    {selectedEntry.trabalhadores_presentes} trabalhadores
                  </span>
                )}
              </div>

              {/* Description */}
              <div style={diarioStyles.detailSection}>
                <div style={diarioStyles.detailLabel}>Descrição</div>
                <p style={diarioStyles.detailText}>{selectedEntry.descricao}</p>
              </div>

              {/* Work done */}
              {selectedEntry.trabalhos_realizados && (
                <div style={diarioStyles.detailSection}>
                  <div style={diarioStyles.detailLabel}>Trabalhos Realizados</div>
                  <p style={diarioStyles.detailText}>{selectedEntry.trabalhos_realizados}</p>
                </div>
              )}

              {/* Incidents */}
              {selectedEntry.incidentes && (
                <div style={diarioStyles.detailSection}>
                  <div style={diarioStyles.detailLabel}>
                    <AlertTriangle size={12} style={{ marginRight: 4, color: '#ef4444' }} />
                    Incidentes
                  </div>
                  <p style={diarioStyles.detailText}>{selectedEntry.incidentes}</p>
                </div>
              )}

              {/* Observations */}
              {selectedEntry.observacoes && (
                <div style={diarioStyles.detailSection}>
                  <div style={diarioStyles.detailLabel}>Observações</div>
                  <p style={diarioStyles.detailText}>{selectedEntry.observacoes}</p>
                </div>
              )}

              {/* Photos */}
              {selectedEntry.fotos && selectedEntry.fotos.length > 0 && (
                <div style={diarioStyles.detailSection}>
                  <div style={diarioStyles.detailLabel}>Fotos ({selectedEntry.fotos.length})</div>
                  <div style={diarioStyles.detailPhotos}>
                    {selectedEntry.fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        style={diarioStyles.detailPhoto}
                        onClick={() => window.open(foto, '_blank')}
                      >
                        <img src={foto} alt="" style={diarioStyles.photoImage} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Author */}
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
                Registado por {selectedEntry.autor_nome} em {formatDateTime(selectedEntry.created_at)}
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
