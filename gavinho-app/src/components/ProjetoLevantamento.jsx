import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import ConfirmModal from './ui/ConfirmModal'
import {
  Plus, Upload, Image, X, ChevronLeft, ChevronRight, ChevronDown,
  Star, Trash2, Edit, Loader2, FolderPlus, Camera,
  AlertCircle, RefreshCw, Eye, MoreVertical
} from 'lucide-react'
import './ProjetoLevantamento.css'

// Image cache for prefetching
const imageCache = new Map()

// Generate optimized thumbnail URL
const getThumbnailUrl = (url, width = 400) => {
  if (!url) return ''
  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=${width}&quality=75`
  }
  return url
}

// Lazy loading image component
const LazyImage = memo(({ src, alt, className, onClick }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef(null)

  const displayUrl = useMemo(() => getThumbnailUrl(src, 400), [src])

  useEffect(() => {
    setLoaded(false)
    setError(false)
    setShouldLoad(false)
  }, [src])

  useEffect(() => {
    if (!containerRef.current || shouldLoad) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '300px', threshold: 0 }
    )

    observer.observe(containerRef.current)

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.top < window.innerHeight + 300 && rect.bottom > -300) {
      setShouldLoad(true)
      observer.disconnect()
    }

    return () => observer.disconnect()
  }, [shouldLoad])

  const handleRetry = (e) => {
    e.stopPropagation()
    setError(false)
    setLoaded(false)
    setShouldLoad(true)
  }

  return (
    <div ref={containerRef} className="levantamento-image-wrapper" onClick={onClick}>
      {error ? (
        <div className="levantamento-image-error">
          <AlertCircle size={24} />
          <span>Erro ao carregar</span>
          <button className="btn btn-sm btn-ghost" onClick={handleRetry}>
            <RefreshCw size={14} /> Tentar
          </button>
        </div>
      ) : !shouldLoad ? (
        <div className="levantamento-image-placeholder">
          <Image size={24} />
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="levantamento-image-loading">
              <Loader2 size={24} className="spin" />
            </div>
          )}
          <img
            src={displayUrl}
            alt={alt}
            className={`${className} ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
            decoding="async"
          />
        </>
      )}
    </div>
  )
})

export default function ProjetoLevantamento({ projeto, userId, userName }) {
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // State
  const [compartimentos, setCompartimentos] = useState([])
  const [fotos, setFotos] = useState({}) // Mapa de compartimento_id -> fotos[]
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Modal states
  const [showAddCompartimentoModal, setShowAddCompartimentoModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingToCompartimento, setUploadingToCompartimento] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxFotos, setLightboxFotos] = useState([])

  // Form states
  const [novoCompartimento, setNovoCompartimento] = useState({
    nome: '',
    descricao: ''
  })

  // Edit states
  const [editingCompartimento, setEditingCompartimento] = useState(null)
  const [editForm, setEditForm] = useState({ nome: '', descricao: '' })

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({})
  const [collapsedDates, setCollapsedDates] = useState({})
  const ITEMS_PER_SECTION = 8

  // Refs
  const fileInputRef = useRef(null)

  // Load data on mount
  useEffect(() => {
    if (projeto?.id) {
      loadCompartimentos()
    }
  }, [projeto?.id])

  const loadCompartimentos = async () => {
    try {
      setLoading(true)

      // Load compartimentos
      const { data: compData, error: compError } = await supabase
        .from('projeto_levantamento_compartimentos')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('ordem')
        .order('nome')

      if (compError) throw compError

      setCompartimentos(compData || [])

      // Load fotos for all compartimentos
      if (compData && compData.length > 0) {
        const compIds = compData.map(c => c.id)
        const { data: fotosData, error: fotosError } = await supabase
          .from('projeto_levantamento_fotos')
          .select('*')
          .in('compartimento_id', compIds)
          .order('ordem')
          .order('created_at', { ascending: false })

        if (fotosError) throw fotosError

        // Group fotos by compartimento_id
        const fotosMap = {}
        compIds.forEach(id => { fotosMap[id] = [] })
        fotosData?.forEach(foto => {
          if (fotosMap[foto.compartimento_id]) {
            fotosMap[foto.compartimento_id].push(foto)
          }
        })
        setFotos(fotosMap)
      }
    } catch (err) {
      // Table may not exist yet
    } finally {
      setLoading(false)
    }
  }

  // Add compartimento
  const handleAddCompartimento = async () => {
    if (!novoCompartimento.nome.trim()) return

    try {
      const maxOrdem = compartimentos.reduce((max, c) => Math.max(max, c.ordem || 0), 0)

      const { data, error } = await supabase
        .from('projeto_levantamento_compartimentos')
        .insert({
          projeto_id: projeto.id,
          nome: novoCompartimento.nome.trim(),
          descricao: novoCompartimento.descricao.trim() || null,
          ordem: maxOrdem + 1,
          created_by: userId,
          created_by_name: userName
        })
        .select()
        .single()

      if (error) throw error

      setCompartimentos(prev => [...prev, data])
      setFotos(prev => ({ ...prev, [data.id]: [] }))
      setNovoCompartimento({ nome: '', descricao: '' })
      setShowAddCompartimentoModal(false)
    } catch (err) {
      console.error('Erro ao criar compartimento:', err)
      toast.error('Erro', 'Erro ao criar compartimento: ' + err.message)
    }
  }

  // Delete compartimento
  const handleDeleteCompartimento = async (compartimento) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Compartimento',
      message: `Eliminar "${compartimento.nome}" e todas as suas fotos?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // Delete fotos from storage first
          const compartimentoFotos = fotos[compartimento.id] || []
          for (const foto of compartimentoFotos) {
            if (foto.file_path) {
              await supabase.storage.from('projeto-files').remove([foto.file_path])
            }
          }

          // Delete compartimento (cascade will delete fotos records)
          const { error } = await supabase
            .from('projeto_levantamento_compartimentos')
            .delete()
            .eq('id', compartimento.id)

          if (error) throw error

          setCompartimentos(prev => prev.filter(c => c.id !== compartimento.id))
          setFotos(prev => {
            const newFotos = { ...prev }
            delete newFotos[compartimento.id]
            return newFotos
          })
        } catch (err) {
          console.error('Erro ao eliminar compartimento:', err)
          toast.error('Erro', 'Erro ao eliminar: ' + err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  // Edit compartimento
  const handleEditCompartimento = async () => {
    if (!editingCompartimento || !editForm.nome.trim()) return

    try {
      const { error } = await supabase
        .from('projeto_levantamento_compartimentos')
        .update({
          nome: editForm.nome.trim(),
          descricao: editForm.descricao.trim() || null
        })
        .eq('id', editingCompartimento.id)

      if (error) throw error

      setCompartimentos(prev => prev.map(c =>
        c.id === editingCompartimento.id
          ? { ...c, nome: editForm.nome.trim(), descricao: editForm.descricao.trim() || null }
          : c
      ))
      setEditingCompartimento(null)
      setEditForm({ nome: '', descricao: '' })
    } catch (err) {
      console.error('Erro ao editar compartimento:', err)
      toast.error('Erro', 'Erro ao editar: ' + err.message)
    }
  }

  // Open upload modal
  const openUploadModal = (compartimento) => {
    setUploadingToCompartimento(compartimento)
    setShowUploadModal(true)
  }

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !uploadingToCompartimento) return

    setUploading(true)

    try {
      const maxOrdem = (fotos[uploadingToCompartimento.id] || [])
        .reduce((max, f) => Math.max(max, f.ordem || 0), 0)

      const uploadedFotos = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Ficheiro ${file.name} não é uma imagem, ignorado`)
          continue
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
          console.warn(`Ficheiro ${file.name} demasiado grande (>20MB), ignorado`)
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `levantamento/${projeto.id}/${uploadingToCompartimento.id}/${timestamp}_${cleanName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('projeto-files')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Erro upload:', uploadError)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('projeto-files')
          .getPublicUrl(filePath)

        // Create foto record
        const { data: fotoData, error: insertError } = await supabase
          .from('projeto_levantamento_fotos')
          .insert({
            compartimento_id: uploadingToCompartimento.id,
            titulo: file.name.replace(/\.[^.]+$/, ''),
            url: urlData.publicUrl,
            file_path: filePath,
            file_size: file.size,
            ordem: maxOrdem + i + 1,
            uploaded_by: userId,
            uploaded_by_name: userName
          })
          .select()
          .single()

        if (insertError) {
          console.error('Erro ao inserir foto:', insertError)
          continue
        }

        uploadedFotos.push(fotoData)
      }

      // Update state with new fotos
      if (uploadedFotos.length > 0) {
        setFotos(prev => ({
          ...prev,
          [uploadingToCompartimento.id]: [
            ...(prev[uploadingToCompartimento.id] || []),
            ...uploadedFotos
          ]
        }))
      }

      setShowUploadModal(false)
      setUploadingToCompartimento(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Erro no upload:', err)
      toast.error('Erro', 'Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Delete foto
  const handleDeleteFoto = async (compartimentoId, foto) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Foto',
      message: 'Eliminar esta foto?',
      type: 'danger',
      onConfirm: async () => {
        try {
          // Delete from storage
          if (foto.file_path) {
            await supabase.storage.from('projeto-files').remove([foto.file_path])
          }

          // Delete record
          const { error } = await supabase
            .from('projeto_levantamento_fotos')
            .delete()
            .eq('id', foto.id)

          if (error) throw error

          setFotos(prev => ({
            ...prev,
            [compartimentoId]: prev[compartimentoId].filter(f => f.id !== foto.id)
          }))
        } catch (err) {
          console.error('Erro ao eliminar foto:', err)
          toast.error('Erro', 'Erro ao eliminar: ' + err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  // Toggle destaque
  const handleToggleDestaque = async (compartimentoId, foto) => {
    try {
      const { error } = await supabase
        .from('projeto_levantamento_fotos')
        .update({ is_destaque: !foto.is_destaque })
        .eq('id', foto.id)

      if (error) throw error

      setFotos(prev => ({
        ...prev,
        [compartimentoId]: prev[compartimentoId].map(f =>
          f.id === foto.id ? { ...f, is_destaque: !f.is_destaque } : f
        )
      }))
    } catch (err) {
      console.error('Erro ao marcar destaque:', err)
    }
  }

  // Lightbox functions
  const openLightbox = (compartimentoId, foto, index) => {
    const compartimentoFotos = fotos[compartimentoId] || []
    setLightboxFotos(compartimentoFotos)
    setLightboxImage(foto)
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    setLightboxFotos([])
  }

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction
    if (newIndex >= 0 && newIndex < lightboxFotos.length) {
      setLightboxIndex(newIndex)
      setLightboxImage(lightboxFotos[newIndex])
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      if (!lightboxImage) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'ArrowRight') navigateLightbox(1)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [lightboxImage, lightboxIndex, lightboxFotos])

  // Toggle section expansion
  const toggleSection = (compartimentoId) => {
    setExpandedSections(prev => ({
      ...prev,
      [compartimentoId]: !prev[compartimentoId]
    }))
  }

  // Toggle date collapse
  const toggleDateCollapse = (key) => {
    setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Group photos by date
  const groupByDate = (fotosList) => {
    const groups = {}
    fotosList.forEach(foto => {
      const dateKey = foto.created_at
        ? new Date(foto.created_at).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Sem data'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(foto)
    })
    // Sort dates newest first
    return Object.entries(groups).sort((a, b) => {
      const dateA = a[1][0]?.created_at ? new Date(a[1][0].created_at) : new Date(0)
      const dateB = b[1][0]?.created_at ? new Date(b[1][0].created_at) : new Date(0)
      return dateB - dateA
    })
  }

  // Count total fotos
  const totalFotos = Object.values(fotos).reduce((sum, arr) => sum + arr.length, 0)

  if (loading) {
    return (
      <div className="levantamento-loading">
        <Loader2 size={32} className="spin" />
        <p>A carregar levantamento...</p>
      </div>
    )
  }

  return (
    <div className="levantamento-container">
      {/* Header */}
      <div className="levantamento-header">
        <div className="levantamento-title">
          <Camera size={20} />
          <div>
            <h2>Levantamento Fotografico</h2>
            <p>{compartimentos.length} compartimento{compartimentos.length !== 1 ? 's' : ''} • {totalFotos} foto{totalFotos !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddCompartimentoModal(true)}
        >
          <FolderPlus size={16} />
          Novo Compartimento
        </button>
      </div>

      {/* Empty State */}
      {compartimentos.length === 0 ? (
        <div className="levantamento-empty">
          <Camera size={48} />
          <h3>Sem levantamento fotografico</h3>
          <p>Comece por criar compartimentos para organizar as fotografias dos espacos a intervir</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddCompartimentoModal(true)}
          >
            <FolderPlus size={16} />
            Criar Primeiro Compartimento
          </button>
        </div>
      ) : (
        /* Compartimentos List */
        <div className="levantamento-sections">
          {compartimentos.map(compartimento => {
            const compartimentoFotos = fotos[compartimento.id] || []
            const isExpanded = expandedSections[compartimento.id]
            const visibleFotos = isExpanded
              ? compartimentoFotos
              : compartimentoFotos.slice(0, ITEMS_PER_SECTION)
            const hasMore = compartimentoFotos.length > ITEMS_PER_SECTION

            return (
              <div key={compartimento.id} className="levantamento-section">
                {/* Section Header */}
                <div className="levantamento-section-header">
                  <div className="levantamento-section-info">
                    <h3>{compartimento.nome}</h3>
                    {compartimento.descricao && (
                      <p>{compartimento.descricao}</p>
                    )}
                    <span className="levantamento-section-count">
                      {compartimentoFotos.length} foto{compartimentoFotos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="levantamento-section-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openUploadModal(compartimento)}
                      title="Adicionar fotos"
                    >
                      <Plus size={16} />
                      Fotos
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditingCompartimento(compartimento)
                        setEditForm({
                          nome: compartimento.nome,
                          descricao: compartimento.descricao || ''
                        })
                      }}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteCompartimento(compartimento)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Photos by Date */}
                {compartimentoFotos.length === 0 ? (
                  <div className="levantamento-section-empty">
                    <Image size={24} />
                    <span>Sem fotografias</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openUploadModal(compartimento)}
                    >
                      <Upload size={14} />
                      Adicionar fotos
                    </button>
                  </div>
                ) : (
                  <>
                    {groupByDate(compartimentoFotos).map(([dateLabel, dateFotos]) => {
                      const dateKey = `${compartimento.id}_${dateLabel}`
                      const isDateCollapsed = collapsedDates[dateKey]
                      return (
                        <div key={dateLabel} className="levantamento-date-group">
                          <div
                            className="levantamento-date-header"
                            onClick={() => toggleDateCollapse(dateKey)}
                          >
                            <span className="levantamento-date-label">
                              <ChevronDown
                                size={16}
                                className={`levantamento-date-chevron${isDateCollapsed ? ' collapsed' : ''}`}
                              />
                              {dateLabel}
                              <span className="levantamento-date-count">
                                ({dateFotos.length} foto{dateFotos.length !== 1 ? 's' : ''})
                              </span>
                            </span>
                          </div>
                          {!isDateCollapsed && (
                            <div className="levantamento-grid">
                              {dateFotos.map((foto, index) => {
                                const globalIndex = compartimentoFotos.indexOf(foto)
                                return (
                                  <div key={foto.id} className="levantamento-card">
                                    <LazyImage
                                      src={foto.url}
                                      alt={foto.titulo || 'Foto'}
                                      className="levantamento-card-image"
                                      onClick={() => openLightbox(compartimento.id, foto, globalIndex)}
                                    />

                                    {foto.is_destaque && (
                                      <span className="levantamento-destaque-badge">
                                        <Star size={12} /> Destaque
                                      </span>
                                    )}

                                    <div className="levantamento-card-overlay">
                                      <button
                                        className="levantamento-action-btn"
                                        title="Ver"
                                        onClick={() => openLightbox(compartimento.id, foto, globalIndex)}
                                      >
                                        <Eye size={18} />
                                      </button>
                                    </div>

                                    <div className="levantamento-card-actions">
                                      <button
                                        className={`btn-icon ${foto.is_destaque ? 'active' : ''}`}
                                        onClick={() => handleToggleDestaque(compartimento.id, foto)}
                                        title={foto.is_destaque ? 'Remover destaque' : 'Marcar como destaque'}
                                      >
                                        <Star size={14} />
                                      </button>
                                      <button
                                        className="btn-icon btn-danger"
                                        onClick={() => handleDeleteFoto(compartimento.id, foto)}
                                        title="Eliminar"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    {foto.titulo && (
                                      <div className="levantamento-card-title">
                                        {foto.titulo}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Compartimento Modal */}
      {showAddCompartimentoModal && (
        <div className="modal-overlay" onClick={() => setShowAddCompartimentoModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Compartimento</h3>
              <button className="btn-close" onClick={() => setShowAddCompartimentoModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do compartimento *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Sala de Estar, Cozinha, Quarto Principal..."
                  value={novoCompartimento.nome}
                  onChange={e => setNovoCompartimento(prev => ({ ...prev, nome: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Descricao (opcional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Notas sobre este espaco..."
                  value={novoCompartimento.descricao}
                  onChange={e => setNovoCompartimento(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddCompartimentoModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddCompartimento}
                disabled={!novoCompartimento.nome.trim()}
              >
                <FolderPlus size={16} />
                Criar Compartimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Compartimento Modal */}
      {editingCompartimento && (
        <div className="modal-overlay" onClick={() => setEditingCompartimento(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Compartimento</h3>
              <button className="btn-close" onClick={() => setEditingCompartimento(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do compartimento *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.nome}
                  onChange={e => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Descricao (opcional)</label>
                <textarea
                  className="form-textarea"
                  value={editForm.descricao}
                  onChange={e => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingCompartimento(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditCompartimento}
                disabled={!editForm.nome.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Fotos - {uploadingToCompartimento?.nome}</h3>
              <button className="btn-close" onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="upload-loading">
                    <Loader2 size={32} className="spin" />
                    <span>A fazer upload...</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} />
                    <span>Clique para selecionar fotografias</span>
                    <span className="upload-hint">JPG, PNG, WEBP (max. 20MB por ficheiro)</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  hidden
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="levantamento-lightbox" onClick={closeLightbox}>
          <div className="levantamento-lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              className="levantamento-lightbox-nav levantamento-lightbox-prev"
              onClick={() => navigateLightbox(-1)}
              disabled={lightboxIndex <= 0}
            >
              <ChevronLeft size={32} />
            </button>

            <div className="levantamento-lightbox-image-container">
              <img src={lightboxImage.url} alt={lightboxImage.titulo || 'Foto'} />

              <div className="levantamento-lightbox-info">
                {lightboxImage.titulo && (
                  <span className="levantamento-lightbox-title">{lightboxImage.titulo}</span>
                )}
                <span className="levantamento-lightbox-date">
                  {new Date(lightboxImage.created_at).toLocaleDateString('pt-PT')}
                </span>
                {lightboxImage.is_destaque && (
                  <span className="levantamento-lightbox-destaque">
                    <Star size={14} /> Destaque
                  </span>
                )}
              </div>

              <div className="levantamento-lightbox-counter">
                {lightboxIndex + 1} / {lightboxFotos.length}
              </div>
            </div>

            <button
              className="levantamento-lightbox-nav levantamento-lightbox-next"
              onClick={() => navigateLightbox(1)}
              disabled={lightboxIndex >= lightboxFotos.length - 1}
            >
              <ChevronRight size={32} />
            </button>

            <button className="levantamento-lightbox-close" onClick={closeLightbox}>
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
