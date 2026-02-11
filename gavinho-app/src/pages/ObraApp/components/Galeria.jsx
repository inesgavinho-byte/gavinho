// =====================================================
// GALERIA COMPONENT - v2
// WhatsApp-style photo gallery with multi-upload
// Auto-registers date/time/user on upload
// Mobile-first responsive design
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Image as ImageIcon, X, ChevronLeft, ChevronRight,
  Camera, Plus, Loader2, Calendar, MessageSquare,
  Download, Layers, ArrowLeftRight, Upload, Check,
  User, Clock, Trash2, ImagePlus
} from 'lucide-react'
import { colors } from '../styles'
import { formatDate, formatDateTime, getRelativeDateLabel } from '../utils'

export default function Galeria({ obra, user }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filter, setFilter] = useState('todas')
  const [compareMode, setCompareMode] = useState(false)
  const [comparePhotos, setComparePhotos] = useState({ before: null, after: null })
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // Preview before upload
  const [showUploadPreview, setShowUploadPreview] = useState(false)
  const [touchStart, setTouchStart] = useState(null)

  const fileInputRef = useRef(null)
  const sliderContainerRef = useRef(null)

  useEffect(() => {
    if (obra) loadPhotos()
  }, [obra])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const { data: chatPhotos } = await supabase
        .from('obra_mensagens')
        .select('id, autor_id, autor_nome, anexos, created_at')
        .eq('obra_id', obra.id)
        .eq('tipo', 'foto')
        .not('anexos', 'is', null)
        .order('created_at', { ascending: false })

      const { data: diarioPhotos } = await supabase
        .from('diario_obra')
        .select('id, autor_id, autor_nome, fotos, created_at')
        .eq('obra_id', obra.id)
        .not('fotos', 'is', null)
        .order('created_at', { ascending: false })

      const allPhotos = []

      chatPhotos?.forEach(msg => {
        if (msg.anexos && Array.isArray(msg.anexos)) {
          msg.anexos.forEach((anexo, idx) => {
            if (anexo.url) {
              allPhotos.push({
                id: `chat_${msg.id}_${idx}`,
                url: anexo.url,
                autor_id: msg.autor_id,
                autor_nome: msg.autor_nome,
                created_at: msg.created_at,
                source: anexo.source === 'galeria' ? 'galeria' : 'chat'
              })
            }
          })
        }
      })

      if (diarioPhotos) {
        diarioPhotos.forEach(entry => {
          if (entry.fotos && Array.isArray(entry.fotos)) {
            entry.fotos.forEach((foto, idx) => {
              const url = typeof foto === 'string' ? foto : foto.url
              if (url) {
                allPhotos.push({
                  id: `diario_${entry.id}_${idx}`,
                  url,
                  autor_id: entry.autor_id,
                  autor_nome: entry.autor_nome,
                  created_at: entry.created_at,
                  source: 'diario'
                })
              }
            })
          }
        })
      }

      allPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setPhotos(allPhotos)
    } catch (err) {
      console.error('Erro ao carregar fotos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Multi-file selection handler
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 15 * 1024 * 1024) return false
      return true
    })

    if (validFiles.length === 0) {
      alert('Nenhuma imagem valida selecionada (max 15MB por foto)')
      return
    }

    // Create preview URLs
    const previews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1)
    }))

    setPendingFiles(previews)
    setShowUploadPreview(true)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Remove a file from pending
  const removePendingFile = (index) => {
    setPendingFiles(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  // Upload all pending files
  const uploadPendingFiles = async () => {
    if (pendingFiles.length === 0) return

    setUploading(true)
    setUploadProgress({ current: 0, total: pendingFiles.length })
    const uploadedPhotos = []

    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: pendingFiles.length })
        const { file } = pendingFiles[i]

        const fileExt = file.name.split('.').pop()
        const fileName = `${obra.id}/${Date.now()}_${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error(`Erro ao enviar ${file.name}:`, uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('obra-fotos')
          .getPublicUrl(fileName)

        uploadedPhotos.push({ url: publicUrl, tipo: 'image', source: 'galeria' })
      }

      if (uploadedPhotos.length > 0) {
        // Create a single message with all photos
        const { error: msgError } = await supabase
          .from('obra_mensagens')
          .insert({
            obra_id: obra.id,
            autor_id: user.id,
            autor_nome: user.nome,
            conteudo: uploadedPhotos.length === 1
              ? `📷 Foto adicionada na galeria`
              : `📷 ${uploadedPhotos.length} fotos adicionadas na galeria`,
            tipo: 'foto',
            anexos: uploadedPhotos
          })

        if (msgError) throw msgError

        // Add to local photos immediately
        const now = new Date().toISOString()
        const newPhotos = uploadedPhotos.map((p, idx) => ({
          id: `galeria_new_${Date.now()}_${idx}`,
          url: p.url,
          autor_id: user.id,
          autor_nome: user.nome,
          created_at: now,
          source: 'galeria'
        }))

        setPhotos(prev => [...newPhotos, ...prev])
      }

      // Cleanup previews
      pendingFiles.forEach(p => URL.revokeObjectURL(p.preview))
      setPendingFiles([])
      setShowUploadPreview(false)
    } catch (err) {
      console.error('Erro ao enviar fotos:', err)
      alert('Erro ao enviar algumas fotos')
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  // Cancel upload preview
  const cancelUploadPreview = () => {
    pendingFiles.forEach(p => URL.revokeObjectURL(p.preview))
    setPendingFiles([])
    setShowUploadPreview(false)
  }

  const openPhoto = (photo, index) => {
    setSelectedPhoto(photo)
    setSelectedIndex(index)
  }

  const closePhoto = () => setSelectedPhoto(null)

  const navigatePhoto = (direction) => {
    const filtered = getFilteredPhotos()
    const newIndex = selectedIndex + direction
    if (newIndex >= 0 && newIndex < filtered.length) {
      setSelectedIndex(newIndex)
      setSelectedPhoto(filtered[newIndex])
    }
  }

  // Swipe support for lightbox
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      navigatePhoto(diff > 0 ? 1 : -1)
    }
    setTouchStart(null)
  }

  // Compare mode
  const toggleCompareMode = () => {
    if (compareMode) {
      setCompareMode(false)
      setComparePhotos({ before: null, after: null })
    } else {
      setCompareMode(true)
    }
  }

  const selectForCompare = (photo) => {
    if (!comparePhotos.before) {
      setComparePhotos({ before: photo, after: null })
    } else if (!comparePhotos.after) {
      const beforeDate = new Date(comparePhotos.before.created_at)
      const afterDate = new Date(photo.created_at)
      if (beforeDate > afterDate) {
        setComparePhotos({ before: photo, after: comparePhotos.before })
      } else {
        setComparePhotos({ before: comparePhotos.before, after: photo })
      }
    } else {
      setComparePhotos({ before: photo, after: null })
    }
  }

  // Slider handlers
  const handleSliderMove = useCallback((clientX) => {
    if (!sliderContainerRef.current) return
    const rect = sliderContainerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    setSliderPosition(Math.min(100, Math.max(0, (x / rect.width) * 100)))
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (isDragging) handleSliderMove(e.clientX)
  }, [isDragging, handleSliderMove])

  const handleTouchMoveSlider = useCallback((e) => {
    if (isDragging && e.touches[0]) handleSliderMove(e.touches[0].clientX)
  }, [isDragging, handleSliderMove])

  const handleDragEnd = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleTouchMoveSlider)
      window.addEventListener('touchend', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleDragEnd)
        window.removeEventListener('touchmove', handleTouchMoveSlider)
        window.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleTouchMoveSlider, handleDragEnd])

  const getFilteredPhotos = () => {
    return photos.filter(p => {
      if (filter === 'chat') return p.source === 'chat'
      if (filter === 'diario') return p.source === 'diario'
      if (filter === 'galeria') return p.source === 'galeria'
      if (filter === 'minhas') return p.autor_id === user.id
      return true
    })
  }

  const filteredPhotos = getFilteredPhotos()

  // Group by relative date
  const groupedPhotos = filteredPhotos.reduce((groups, photo) => {
    const label = getRelativeDateLabel(photo.created_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(photo)
    return groups
  }, {})

  const sourceLabel = (source) => {
    if (source === 'galeria') return 'Upload'
    if (source === 'chat') return 'Chat'
    return 'Diario'
  }

  const sourceColor = (source) => {
    if (source === 'galeria') return '#10b981'
    if (source === 'chat') return '#3b82f6'
    return '#f59e0b'
  }

  // Loading
  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerTop}>
            <h3 style={s.title}><ImageIcon size={18} /> Galeria</h3>
          </div>
        </div>
        <div style={s.content}>
          <div style={s.grid}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        </div>
        <style>{animations}</style>
      </div>
    )
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <h3 style={s.title}>
            <ImageIcon size={18} />
            <span>Galeria</span>
            <span style={s.photoCount}>{filteredPhotos.length}</span>
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {photos.length >= 2 && (
              <button
                onClick={toggleCompareMode}
                style={{
                  ...s.headerButton,
                  background: compareMode ? '#4f46e5' : '#6366f1'
                }}
              >
                <Layers size={14} />
                <span style={s.headerButtonLabel}>{compareMode ? 'Cancelar' : 'Comparar'}</span>
              </button>
            )}
          </div>
        </div>

        {!compareMode && (
          <div style={s.filters}>
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'galeria', label: 'Upload' },
              { key: 'chat', label: 'Chat' },
              { key: 'diario', label: 'Diario' },
              { key: 'minhas', label: 'Minhas' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  ...s.filterChip,
                  ...(filter === f.key ? s.filterChipActive : {})
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compare info bar */}
      {compareMode && (
        <div style={s.compareInfo}>
          <ArrowLeftRight size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, color: '#4338ca' }}>
            {!comparePhotos.before
              ? 'Seleciona a 1a foto (Antes)'
              : !comparePhotos.after
                ? 'Seleciona a 2a foto (Depois)'
                : 'Prontas para comparar'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {comparePhotos.before ? (
              <img src={comparePhotos.before.url} alt="" style={s.compareThumb} />
            ) : (
              <div style={s.compareThumbEmpty}>1</div>
            )}
            {comparePhotos.after ? (
              <img src={comparePhotos.after.url} alt="" style={s.compareThumb} />
            ) : (
              <div style={s.compareThumbEmpty}>2</div>
            )}
          </div>
          {comparePhotos.before && comparePhotos.after && (
            <button
              style={{ ...s.headerButton, background: '#6366f1', marginLeft: 4 }}
              onClick={() => setSliderPosition(50)}
            >
              Ver
            </button>
          )}
        </div>
      )}

      {/* Photo grid */}
      <div style={s.content}>
        {filteredPhotos.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>
              <ImagePlus size={40} color="#9ca3af" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '16px 0 4px' }}>
              Sem fotos{filter !== 'todas' ? ' nesta categoria' : ''}
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
              Toca no botao + para adicionar fotos
            </p>
          </div>
        ) : (
          Object.entries(groupedPhotos).map(([dateLabel, datePhotos]) => (
            <div key={dateLabel} style={s.dateSection}>
              <div style={s.dateHeader}>
                <Calendar size={13} />
                <span>{dateLabel}</span>
                <span style={s.dateCount}>{datePhotos.length}</span>
              </div>
              <div style={s.grid}>
                {datePhotos.map((photo) => {
                  const globalIndex = filteredPhotos.indexOf(photo)
                  const isSelected = comparePhotos.before?.id === photo.id || comparePhotos.after?.id === photo.id
                  const selNum = comparePhotos.before?.id === photo.id ? 1 : comparePhotos.after?.id === photo.id ? 2 : null

                  return (
                    <div
                      key={photo.id}
                      style={s.photoCell}
                      onClick={() => compareMode ? selectForCompare(photo) : openPhoto(photo, globalIndex)}
                    >
                      <img src={photo.url} alt="" style={s.photoImg} loading="lazy" />

                      {/* Metadata overlay at bottom */}
                      <div style={s.photoOverlay}>
                        <span style={s.photoAuthor}>{photo.autor_nome?.split(' ')[0]}</span>
                        <span style={{
                          ...s.sourcePill,
                          background: sourceColor(photo.source)
                        }}>
                          {sourceLabel(photo.source)}
                        </span>
                      </div>

                      {/* Compare selection overlay */}
                      {compareMode && isSelected && (
                        <div style={s.selectedOverlay}>
                          <span style={s.selectedBadge}>
                            {selNum === 1 ? 'Antes' : 'Depois'}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB - Add photos button */}
      {!compareMode && !selectedPhoto && !showUploadPreview && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={s.fab}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </button>
      )}

      {/* Hidden file input - multi-select, no forced capture */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      {/* Upload Preview Modal (WhatsApp-style) */}
      {showUploadPreview && (
        <div style={s.uploadModal}>
          <div style={s.uploadHeader}>
            <button onClick={cancelUploadPreview} style={s.uploadCloseBtn}>
              <X size={22} color="white" />
            </button>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
              {pendingFiles.length} {pendingFiles.length === 1 ? 'foto' : 'fotos'} selecionada{pendingFiles.length > 1 ? 's' : ''}
            </span>
            <div style={{ width: 40 }} />
          </div>

          {/* Preview grid */}
          <div style={s.uploadPreviewGrid}>
            {pendingFiles.map((pf, idx) => (
              <div key={idx} style={s.uploadPreviewItem}>
                <img src={pf.preview} alt="" style={s.uploadPreviewImg} />
                <button
                  onClick={() => removePendingFile(idx)}
                  style={s.uploadRemoveBtn}
                >
                  <X size={14} color="white" />
                </button>
                <div style={s.uploadPreviewInfo}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                    {pf.size} MB
                  </span>
                </div>
              </div>
            ))}

            {/* Add more button */}
            <div
              style={s.uploadAddMore}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={28} color="#9ca3af" />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Mais</span>
            </div>
          </div>

          {/* Auto-metadata info */}
          <div style={s.uploadMeta}>
            <div style={s.uploadMetaItem}>
              <User size={14} color="#6b7280" />
              <span>{user.nome}</span>
            </div>
            <div style={s.uploadMetaItem}>
              <Clock size={14} color="#6b7280" />
              <span>{new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={s.uploadMetaItem}>
              <ImageIcon size={14} color="#6b7280" />
              <span>{obra.codigo} - {obra.nome}</span>
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div style={s.uploadProgressBar}>
              <div style={{
                ...s.uploadProgressFill,
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
              }} />
              <span style={s.uploadProgressText}>
                A enviar {uploadProgress.current}/{uploadProgress.total}...
              </span>
            </div>
          )}

          {/* Send button */}
          <div style={s.uploadFooter}>
            <button
              onClick={uploadPendingFiles}
              disabled={uploading || pendingFiles.length === 0}
              style={{
                ...s.uploadSendBtn,
                opacity: uploading ? 0.7 : 1
              }}
            >
              {uploading ? (
                <Loader2 size={22} color="white" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Upload size={20} />
                  Enviar {pendingFiles.length} {pendingFiles.length === 1 ? 'foto' : 'fotos'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          style={s.lightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={s.lightboxHeader}>
            <div style={s.lightboxInfo}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                {selectedPhoto.autor_nome}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                {formatDateTime(selectedPhoto.created_at)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={s.lightboxBtn}
                onClick={() => window.open(selectedPhoto.url, '_blank')}
              >
                <Download size={18} />
              </button>
              <button style={s.lightboxBtn} onClick={closePhoto}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={s.lightboxBody}>
            {selectedIndex > 0 && (
              <button
                style={{ ...s.lightboxNav, left: 8 }}
                onClick={() => navigatePhoto(-1)}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img src={selectedPhoto.url} alt="" style={s.lightboxImage} />

            {selectedIndex < filteredPhotos.length - 1 && (
              <button
                style={{ ...s.lightboxNav, right: 8 }}
                onClick={() => navigatePhoto(1)}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 10, fontSize: 13 }}>
            {selectedIndex + 1} / {filteredPhotos.length}
          </div>
        </div>
      )}

      {/* Comparison Slider */}
      {compareMode && comparePhotos.before && comparePhotos.after && (
        <div style={s.lightbox}>
          <div style={s.lightboxHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
              <ArrowLeftRight size={18} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>Comparacao de Progresso</span>
            </div>
            <button
              style={s.lightboxBtn}
              onClick={() => setComparePhotos({ before: null, after: null })}
            >
              <X size={18} />
            </button>
          </div>

          <div
            ref={sliderContainerRef}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: 500, aspectRatio: '1', overflow: 'hidden' }}>
              <img src={comparePhotos.after.url} alt="Depois" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: `${sliderPosition}%`, height: '100%', overflow: 'hidden' }}>
                <img
                  src={comparePhotos.before.url}
                  alt="Antes"
                  style={{ position: 'absolute', top: 0, left: 0, height: '100%', objectFit: 'cover', objectPosition: 'left', width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
                />
              </div>
              <div
                style={{ position: 'absolute', top: 0, bottom: 0, width: 3, background: 'white', left: `${sliderPosition}%`, transform: 'translateX(-50%)', cursor: 'ew-resize', zIndex: 10, boxShadow: '0 0 8px rgba(0,0,0,0.5)' }}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  <ArrowLeftRight size={16} color="#6366f1" />
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: 8, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                <span style={{ color: 'white', fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: 4 }}>
                  Antes - {formatDate(comparePhotos.before.created_at)}
                </span>
                <span style={{ color: 'white', fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: 4 }}>
                  Depois - {formatDate(comparePhotos.after.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{animations}</style>
    </div>
  )
}

// =====================================================
// ANIMATIONS
// =====================================================
const animations = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`

// =====================================================
// STYLES - Mobile-first
// =====================================================
const s = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
    overflow: 'hidden',
    position: 'relative'
  },
  header: {
    padding: '10px 12px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#374151'
  },
  photoCount: {
    fontSize: 12,
    fontWeight: 600,
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '2px 8px',
    borderRadius: 10
  },
  headerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500
  },
  headerButtonLabel: {
    fontSize: 12
  },
  filters: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: 2
  },
  filterChip: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 16,
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: '#f3f4f6',
    color: '#6b7280',
    fontWeight: 500,
    transition: 'all 0.15s'
  },
  filterChipActive: {
    background: '#374151',
    color: 'white'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 10,
    WebkitOverflowScrolling: 'touch'
  },
  dateSection: {
    marginBottom: 16
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 600
  },
  dateCount: {
    fontSize: 10,
    background: '#e5e7eb',
    color: '#6b7280',
    padding: '1px 6px',
    borderRadius: 8,
    marginLeft: 2
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 3
  },
  photoCell: {
    position: 'relative',
    paddingBottom: '100%',
    overflow: 'hidden',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#e5e7eb'
  },
  photoImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px 4px 3px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  photoAuthor: {
    fontSize: 9,
    color: 'white',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '60%'
  },
  sourcePill: {
    fontSize: 8,
    color: 'white',
    padding: '1px 5px',
    borderRadius: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(99,102,241,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  selectedBadge: {
    background: '#6366f1',
    color: 'white',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  skeleton: {
    paddingBottom: '100%',
    background: '#e5e7eb',
    borderRadius: 6,
    animation: 'pulse 1.5s ease-in-out infinite'
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: '#4CAF50',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(76,175,80,0.45)',
    cursor: 'pointer',
    zIndex: 50,
    transition: 'transform 0.15s',
    WebkitTapHighlightColor: 'transparent'
  },

  // Upload preview modal
  uploadModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#111827',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  },
  uploadHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  uploadCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadPreviewGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    padding: 8,
    overflow: 'auto',
    alignContent: 'start',
    WebkitOverflowScrolling: 'touch'
  },
  uploadPreviewItem: {
    position: 'relative',
    paddingBottom: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#1f2937'
  },
  uploadPreviewImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  uploadRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadPreviewInfo: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  uploadAddMore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: '2px dashed #374151',
    borderRadius: 8,
    cursor: 'pointer',
    minHeight: 100,
    paddingBottom: 'calc(100% - 104px)'
  },
  uploadMeta: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 12,
    color: '#9ca3af'
  },
  uploadMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  uploadProgressBar: {
    position: 'relative',
    margin: '0 16px',
    height: 28,
    background: '#1f2937',
    borderRadius: 14,
    overflow: 'hidden'
  },
  uploadProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
    borderRadius: 14,
    transition: 'width 0.3s ease'
  },
  uploadProgressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 500,
    color: 'white'
  },
  uploadFooter: {
    padding: '12px 16px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
  },
  uploadSendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px',
    background: '#4CAF50',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  },

  // Lightbox
  lightbox: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.95)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000
  },
  lightboxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    paddingTop: 'max(12px, env(safe-area-inset-top))'
  },
  lightboxInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  lightboxBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    padding: 8,
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  lightboxBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    cursor: 'pointer',
    zIndex: 10
  },

  // Compare
  compareInfo: {
    padding: '10px 12px',
    background: '#eef2ff',
    borderBottom: '1px solid #c7d2fe',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  compareThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    objectFit: 'cover',
    border: '2px solid #6366f1'
  },
  compareThumbEmpty: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: '#e0e7ff',
    border: '2px dashed #a5b4fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 600
  }
}
