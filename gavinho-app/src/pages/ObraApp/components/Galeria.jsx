// =====================================================
// GALERIA COMPONENT
// Photo gallery for obra - from chat and diario
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Image as ImageIcon, X, ChevronLeft, ChevronRight,
  Camera, Upload, Loader2, Calendar, MessageSquare,
  Download, ZoomIn
} from 'lucide-react'
import { styles, colors } from '../styles'
import { formatDate, formatDateTime } from '../utils'

export default function Galeria({ obra, user }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filter, setFilter] = useState('todas') // todas, chat, diario, minhas

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (obra) {
      loadPhotos()
    }
  }, [obra])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      // Get photos from chat messages
      const { data: chatPhotos, error: chatError } = await supabase
        .from('obra_mensagens')
        .select('id, autor_id, autor_nome, anexos, created_at')
        .eq('obra_id', obra.id)
        .eq('tipo', 'foto')
        .not('anexos', 'is', null)
        .order('created_at', { ascending: false })

      if (chatError) throw chatError

      // Get photos from diario (if exists)
      const { data: diarioPhotos, error: diarioError } = await supabase
        .from('diario_obra')
        .select('id, autor_id, autor_nome, fotos, created_at')
        .eq('obra_id', obra.id)
        .not('fotos', 'is', null)
        .order('created_at', { ascending: false })

      // Process and combine photos
      const allPhotos = []

      // Add chat photos
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
                source: 'chat'
              })
            }
          })
        }
      })

      // Add diario photos
      if (!diarioError && diarioPhotos) {
        diarioPhotos.forEach(entry => {
          if (entry.fotos && Array.isArray(entry.fotos)) {
            entry.fotos.forEach((foto, idx) => {
              const url = typeof foto === 'string' ? foto : foto.url
              if (url) {
                allPhotos.push({
                  id: `diario_${entry.id}_${idx}`,
                  url: url,
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

      // Sort by date (newest first)
      allPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setPhotos(allPhotos)
    } catch (err) {
      console.error('Erro ao carregar fotos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleciona uma imagem')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB')
      return
    }

    setUploading(true)
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${obra.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('obra-fotos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(fileName)

      // Create a message with the photo
      const { error: msgError } = await supabase
        .from('obra_mensagens')
        .insert({
          obra_id: obra.id,
          autor_id: user.id,
          autor_nome: user.nome,
          conteudo: '📷 Foto',
          tipo: 'foto',
          anexos: [{ url: publicUrl, tipo: 'image' }]
        })

      if (msgError) throw msgError

      // Add to local photos
      setPhotos(prev => [{
        id: `chat_new_${Date.now()}`,
        url: publicUrl,
        autor_id: user.id,
        autor_nome: user.nome,
        created_at: new Date().toISOString(),
        source: 'chat'
      }, ...prev])

    } catch (err) {
      console.error('Erro ao enviar foto:', err)
      alert('Erro ao enviar foto')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const openPhoto = (photo, index) => {
    setSelectedPhoto(photo)
    setSelectedIndex(index)
  }

  const closePhoto = () => {
    setSelectedPhoto(null)
  }

  const navigatePhoto = (direction) => {
    const filteredPhotos = getFilteredPhotos()
    const newIndex = selectedIndex + direction
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      setSelectedIndex(newIndex)
      setSelectedPhoto(filteredPhotos[newIndex])
    }
  }

  const downloadPhoto = (url) => {
    window.open(url, '_blank')
  }

  // Filter photos
  const getFilteredPhotos = () => {
    return photos.filter(p => {
      if (filter === 'chat') return p.source === 'chat'
      if (filter === 'diario') return p.source === 'diario'
      if (filter === 'minhas') return p.autor_id === user.id
      return true
    })
  }

  const filteredPhotos = getFilteredPhotos()

  // Group photos by date
  const groupedPhotos = filteredPhotos.reduce((groups, photo) => {
    const date = formatDate(photo.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(photo)
    return groups
  }, {})

  // Local styles
  const galeriaStyles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      overflow: 'hidden'
    },
    header: {
      padding: 12,
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
      fontSize: 16,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    },
    uploadButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      cursor: 'pointer'
    },
    filters: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto'
    },
    filterButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: 16,
      fontSize: 12,
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    },
    filterActive: {
      background: colors.primary,
      color: 'white'
    },
    filterInactive: {
      background: '#f3f4f6',
      color: '#6b7280'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: 12
    },
    dateSection: {
      marginBottom: 16
    },
    dateHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      color: '#6b7280',
      fontSize: 13,
      fontWeight: 500
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 4
    },
    photoWrapper: {
      position: 'relative',
      paddingBottom: '100%', // Square aspect ratio
      overflow: 'hidden',
      borderRadius: 8,
      cursor: 'pointer'
    },
    photo: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'transform 0.2s'
    },
    sourceBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 10,
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    },
    // Modal styles
    modal: {
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
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      color: 'white'
    },
    modalInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    },
    modalAutor: {
      fontSize: 14,
      fontWeight: 500
    },
    modalDate: {
      fontSize: 12,
      opacity: 0.7
    },
    modalActions: {
      display: 'flex',
      gap: 8
    },
    modalButton: {
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
    modalContent: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    },
    modalImage: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain'
    },
    navButton: {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      borderRadius: '50%',
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      cursor: 'pointer'
    },
    navPrev: {
      left: 16
    },
    navNext: {
      right: 16
    },
    counter: {
      textAlign: 'center',
      color: 'white',
      padding: 12,
      fontSize: 13,
      opacity: 0.7
    },
    empty: {
      textAlign: 'center',
      padding: 40,
      color: '#6b7280'
    },
    skeleton: {
      paddingBottom: '100%',
      background: '#e5e7eb',
      borderRadius: 8,
      animation: 'pulse 1.5s ease-in-out infinite'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={galeriaStyles.container}>
        <div style={galeriaStyles.header}>
          <div style={galeriaStyles.headerTop}>
            <h3 style={galeriaStyles.title}>
              <ImageIcon size={20} /> Galeria
            </h3>
          </div>
        </div>
        <div style={galeriaStyles.content}>
          <div style={galeriaStyles.grid}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={galeriaStyles.skeleton} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={galeriaStyles.container}>
      {/* Header */}
      <div style={galeriaStyles.header}>
        <div style={galeriaStyles.headerTop}>
          <h3 style={galeriaStyles.title}>
            <ImageIcon size={20} /> Galeria ({filteredPhotos.length})
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              ...galeriaStyles.uploadButton,
              opacity: uploading ? 0.7 : 1
            }}
          >
            {uploading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Camera size={16} />
            )}
            {uploading ? 'A enviar...' : 'Adicionar'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
        </div>

        <div style={galeriaStyles.filters}>
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'chat', label: 'Chat' },
            { key: 'diario', label: 'Diário' },
            { key: 'minhas', label: 'Minhas' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                ...galeriaStyles.filterButton,
                ...(filter === f.key ? galeriaStyles.filterActive : galeriaStyles.filterInactive)
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo grid */}
      <div style={galeriaStyles.content}>
        {filteredPhotos.length === 0 ? (
          <div style={galeriaStyles.empty}>
            <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Sem fotos {filter !== 'todas' ? 'nesta categoria' : ''}</p>
            <p style={{ fontSize: 12 }}>Tira fotos no chat para aparecerem aqui</p>
          </div>
        ) : (
          Object.entries(groupedPhotos).map(([date, datePhotos]) => (
            <div key={date} style={galeriaStyles.dateSection}>
              <div style={galeriaStyles.dateHeader}>
                <Calendar size={14} />
                {date}
              </div>
              <div style={galeriaStyles.grid}>
                {datePhotos.map((photo, idx) => {
                  const globalIndex = filteredPhotos.indexOf(photo)
                  return (
                    <div
                      key={photo.id}
                      style={galeriaStyles.photoWrapper}
                      onClick={() => openPhoto(photo, globalIndex)}
                    >
                      <img
                        src={photo.url}
                        alt=""
                        style={galeriaStyles.photo}
                        loading="lazy"
                      />
                      <span style={galeriaStyles.sourceBadge}>
                        {photo.source === 'chat' ? <MessageSquare size={10} /> : <Calendar size={10} />}
                        {photo.source === 'chat' ? 'Chat' : 'Diário'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Photo modal */}
      {selectedPhoto && (
        <div style={galeriaStyles.modal}>
          <div style={galeriaStyles.modalHeader}>
            <div style={galeriaStyles.modalInfo}>
              <span style={galeriaStyles.modalAutor}>{selectedPhoto.autor_nome}</span>
              <span style={galeriaStyles.modalDate}>{formatDateTime(selectedPhoto.created_at)}</span>
            </div>
            <div style={galeriaStyles.modalActions}>
              <button
                style={galeriaStyles.modalButton}
                onClick={() => downloadPhoto(selectedPhoto.url)}
              >
                <Download size={20} />
              </button>
              <button
                style={galeriaStyles.modalButton}
                onClick={closePhoto}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={galeriaStyles.modalContent}>
            {selectedIndex > 0 && (
              <button
                style={{ ...galeriaStyles.navButton, ...galeriaStyles.navPrev }}
                onClick={() => navigatePhoto(-1)}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              src={selectedPhoto.url}
              alt=""
              style={galeriaStyles.modalImage}
            />

            {selectedIndex < filteredPhotos.length - 1 && (
              <button
                style={{ ...galeriaStyles.navButton, ...galeriaStyles.navNext }}
                onClick={() => navigatePhoto(1)}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          <div style={galeriaStyles.counter}>
            {selectedIndex + 1} / {filteredPhotos.length}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
