import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Upload, Image, X, ChevronLeft, ChevronRight,
  Star, Trash2, Edit, Loader2, Palette, Link2,
  AlertCircle, RefreshCw, Eye, Tag, ExternalLink,
  ChevronDown, ChevronUp, FolderOpen, Settings, FolderPlus
} from 'lucide-react'
import './ProjetoInspiracoes.css'

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
    <div ref={containerRef} className="inspiracoes-image-wrapper" onClick={onClick}>
      {error ? (
        <div className="inspiracoes-image-error">
          <AlertCircle size={24} />
          <span>Erro ao carregar</span>
          <button className="btn btn-sm btn-ghost" onClick={handleRetry}>
            <RefreshCw size={14} /> Tentar
          </button>
        </div>
      ) : !shouldLoad ? (
        <div className="inspiracoes-image-placeholder">
          <Image size={24} />
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="inspiracoes-image-loading">
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

// Predefined sources
const FONTES_SUGERIDAS = [
  'Pinterest',
  'Archdaily',
  'Dezeen',
  'Behance',
  'Instagram',
  'Houzz',
  'Outro'
]

export default function ProjetoInspiracoes({ projeto, userId, userName, compartimentosProjeto = [], onCompartimentosChange }) {
  // State
  const [inspiracoes, setInspiracoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCompartimentosModal, setShowCompartimentosModal] = useState(false)
  const [editingInspiracao, setEditingInspiracao] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxImages, setLightboxImages] = useState([])

  // Compartimento management state
  const [novoCompartimento, setNovoCompartimento] = useState('')
  const [savingCompartimento, setSavingCompartimento] = useState(false)
  const [localCompartimentos, setLocalCompartimentos] = useState([])

  // Form states
  const [uploadForm, setUploadForm] = useState({
    compartimento: 'Geral',
    titulo: '',
    descricao: '',
    fonte: '',
    tags: '',
    arquivos: []
  })

  const [editForm, setEditForm] = useState({
    compartimento: 'Geral',
    titulo: '',
    descricao: '',
    fonte: '',
    tags: ''
  })

  // Filter and sort
  const [filterCompartimento, setFilterCompartimento] = useState('todos')

  // LocalStorage key for collapsed state
  const collapseStorageKey = projeto?.id ? `inspiracoes_collapsed_${projeto.id}` : null

  // Initialize collapsed state from localStorage
  const [collapsedCompartimentos, setCollapsedCompartimentos] = useState(() => {
    if (typeof window !== 'undefined' && projeto?.id) {
      const saved = localStorage.getItem(`inspiracoes_collapsed_${projeto.id}`)
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  // Refs
  const fileInputRef = useRef(null)

  // Compartimentos list (from project or predefined)
  const compartimentosDisponiveis = useMemo(() => {
    const defaultCompartimentos = ['Geral', 'Sala de Estar', 'Cozinha', 'Quarto', 'Casa de Banho', 'Escritorio', 'Exterior']
    const fromProject = compartimentosProjeto.map(c => c.nome || c)
    const fromLocal = localCompartimentos.map(c => c.nome || c)
    const allCompartimentos = [...new Set([...defaultCompartimentos, ...fromProject, ...fromLocal])]
    return allCompartimentos.sort()
  }, [compartimentosProjeto, localCompartimentos])

  // Sync collapsed state with localStorage
  useEffect(() => {
    if (collapseStorageKey) {
      localStorage.setItem(collapseStorageKey, JSON.stringify(collapsedCompartimentos))
    }
  }, [collapsedCompartimentos, collapseStorageKey])

  // Initialize localCompartimentos from compartimentosProjeto
  useEffect(() => {
    setLocalCompartimentos(compartimentosProjeto.map(c => typeof c === 'string' ? { nome: c } : c))
  }, [compartimentosProjeto])

  // Load data on mount
  useEffect(() => {
    if (projeto?.id) {
      loadInspiracoes()
    }
  }, [projeto?.id])

  const loadInspiracoes = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('projeto_inspiracoes')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('compartimento')
        .order('created_at', { ascending: false })

      if (error) throw error

      setInspiracoes(data || [])
    } catch (err) {
      // Table may not exist yet - show empty state
    } finally {
      setLoading(false)
    }
  }

  // Group inspiracoes by compartimento
  const inspiracoesByCompartimento = useMemo(() => {
    const grouped = {}
    inspiracoes.forEach(insp => {
      const comp = insp.compartimento || 'Geral'
      if (!grouped[comp]) grouped[comp] = []
      grouped[comp].push(insp)
    })
    return grouped
  }, [inspiracoes])

  // Filter inspiracoes
  const filteredCompartimentos = useMemo(() => {
    if (filterCompartimento === 'todos') {
      return Object.entries(inspiracoesByCompartimento)
    }
    return Object.entries(inspiracoesByCompartimento).filter(([comp]) => comp === filterCompartimento)
  }, [inspiracoesByCompartimento, filterCompartimento])

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`${file.name} nao e uma imagem`)
        return false
      }
      if (file.size > 20 * 1024 * 1024) {
        console.warn(`${file.name} demasiado grande`)
        return false
      }
      return true
    })
    setUploadForm(prev => ({ ...prev, arquivos: validFiles }))
  }

  // Handle upload
  const handleUpload = async () => {
    if (uploadForm.arquivos.length === 0) return

    setUploading(true)

    try {
      const uploadedInspiracoes = []

      for (const file of uploadForm.arquivos) {
        // Generate unique filename
        const timestamp = Date.now()
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `inspiracoes/${projeto.id}/${timestamp}_${cleanName}`

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

        // Parse tags
        const tagsArray = uploadForm.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0)

        // Create inspiracao record
        const { data, error } = await supabase
          .from('projeto_inspiracoes')
          .insert({
            projeto_id: projeto.id,
            compartimento: uploadForm.compartimento || 'Geral',
            titulo: uploadForm.titulo || file.name.replace(/\.[^.]+$/, ''),
            descricao: uploadForm.descricao || null,
            url: urlData.publicUrl,
            fonte: uploadForm.fonte || null,
            tags: tagsArray,
            created_by: userId,
            created_by_name: userName
          })
          .select()
          .single()

        if (error) {
          console.error('Erro ao criar inspiracao:', error)
          continue
        }

        uploadedInspiracoes.push(data)
      }

      if (uploadedInspiracoes.length > 0) {
        setInspiracoes(prev => [...uploadedInspiracoes, ...prev])
      }

      // Reset form and close modal
      setUploadForm({
        compartimento: 'Geral',
        titulo: '',
        descricao: '',
        fonte: '',
        tags: '',
        arquivos: []
      })
      setShowUploadModal(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Open edit modal
  const openEditModal = (inspiracao) => {
    setEditingInspiracao(inspiracao)
    setEditForm({
      compartimento: inspiracao.compartimento || 'Geral',
      titulo: inspiracao.titulo || '',
      descricao: inspiracao.descricao || '',
      fonte: inspiracao.fonte || '',
      tags: (inspiracao.tags || []).join(', ')
    })
    setShowEditModal(true)
  }

  // Handle edit
  const handleEdit = async () => {
    if (!editingInspiracao) return

    try {
      const tagsArray = editForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const { error } = await supabase
        .from('projeto_inspiracoes')
        .update({
          compartimento: editForm.compartimento,
          titulo: editForm.titulo || null,
          descricao: editForm.descricao || null,
          fonte: editForm.fonte || null,
          tags: tagsArray
        })
        .eq('id', editingInspiracao.id)

      if (error) throw error

      setInspiracoes(prev => prev.map(insp =>
        insp.id === editingInspiracao.id
          ? { ...insp, ...editForm, tags: tagsArray }
          : insp
      ))

      setShowEditModal(false)
      setEditingInspiracao(null)
    } catch (err) {
      console.error('Erro ao editar:', err)
      alert('Erro ao editar: ' + err.message)
    }
  }

  // Handle delete
  const handleDelete = async (inspiracao) => {
    if (!confirm('Eliminar esta inspiracao?')) return

    try {
      // Extract file path from URL to delete from storage
      const urlParts = inspiracao.url.split('/projeto-files/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0]
        await supabase.storage.from('projeto-files').remove([filePath])
      }

      const { error } = await supabase
        .from('projeto_inspiracoes')
        .delete()
        .eq('id', inspiracao.id)

      if (error) throw error

      setInspiracoes(prev => prev.filter(i => i.id !== inspiracao.id))
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar: ' + err.message)
    }
  }

  // Lightbox functions
  const openLightbox = (inspiracao, allInspiracoes) => {
    const index = allInspiracoes.findIndex(i => i.id === inspiracao.id)
    setLightboxImages(allInspiracoes)
    setLightboxImage(inspiracao)
    setLightboxIndex(index >= 0 ? index : 0)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    setLightboxImages([])
  }

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex)
      setLightboxImage(lightboxImages[newIndex])
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      if (!lightboxImage) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'ArrowRight') navigateLightbox(1)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [lightboxImage, lightboxIndex, lightboxImages])

  // Toggle compartimento collapse
  const toggleCompartimento = (comp) => {
    setCollapsedCompartimentos(prev => ({
      ...prev,
      [comp]: !prev[comp]
    }))
  }

  // Toggle all compartimentos
  const toggleAllCompartimentos = (collapse) => {
    const newState = {}
    Object.keys(inspiracoesByCompartimento).forEach(comp => {
      newState[comp] = collapse
    })
    setCollapsedCompartimentos(newState)
  }

  // Open upload modal with specific compartimento pre-selected
  const openUploadForCompartimento = (compartimento, e) => {
    if (e) e.stopPropagation()
    setUploadForm(prev => ({
      ...prev,
      compartimento: compartimento
    }))
    setShowUploadModal(true)
  }

  // Add new compartimento
  const handleAddCompartimento = async () => {
    if (!novoCompartimento.trim()) return

    const nome = novoCompartimento.trim()
    setSavingCompartimento(true)
    try {
      const { data, error } = await supabase
        .from('projeto_compartimentos')
        .insert({
          projeto_id: projeto.id,
          nome: nome,
          created_by: userId,
          created_by_name: userName
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          alert('Este compartimento ja existe neste projeto')
        } else {
          throw error
        }
      } else {
        // Update local state without page reload
        setLocalCompartimentos(prev => [...prev, { nome: nome, id: data?.id }])
        // Notify parent component if callback exists
        if (onCompartimentosChange) {
          onCompartimentosChange([...localCompartimentos, { nome: nome, id: data?.id }])
        }
        setNovoCompartimento('')
      }
    } catch (err) {
      console.error('Erro ao adicionar compartimento:', err)
      alert('Erro ao adicionar compartimento: ' + err.message)
    } finally {
      setSavingCompartimento(false)
    }
  }

  // Delete compartimento
  const handleDeleteCompartimento = async (compartimento) => {
    // Check if compartimento has inspiracoes
    const count = inspiracoesByCompartimento[compartimento]?.length || 0
    if (count > 0) {
      const confirmMsg = `Este compartimento tem ${count} inspiracao(oes). As inspiracoes serao movidas para "Geral". Continuar?`
      if (!confirm(confirmMsg)) return

      // Move inspiracoes to "Geral"
      const { error: updateError } = await supabase
        .from('projeto_inspiracoes')
        .update({ compartimento: 'Geral' })
        .eq('projeto_id', projeto.id)
        .eq('compartimento', compartimento)

      if (updateError) {
        alert('Erro ao mover inspiracoes: ' + updateError.message)
        return
      }

      // Update local inspiracoes state
      setInspiracoes(prev => prev.map(insp =>
        insp.compartimento === compartimento
          ? { ...insp, compartimento: 'Geral' }
          : insp
      ))
    }

    // Delete compartimento from database
    const { error } = await supabase
      .from('projeto_compartimentos')
      .delete()
      .eq('projeto_id', projeto.id)
      .eq('nome', compartimento)

    if (error) {
      alert('Erro ao eliminar compartimento: ' + error.message)
    } else {
      // Update local state without page reload
      const updatedCompartimentos = localCompartimentos.filter(c => (c.nome || c) !== compartimento)
      setLocalCompartimentos(updatedCompartimentos)
      // Notify parent component if callback exists
      if (onCompartimentosChange) {
        onCompartimentosChange(updatedCompartimentos)
      }
      // Remove from collapsed state
      setCollapsedCompartimentos(prev => {
        const newState = { ...prev }
        delete newState[compartimento]
        return newState
      })
    }
  }

  // Count total
  const totalInspiracoes = inspiracoes.length
  const totalCompartimentos = Object.keys(inspiracoesByCompartimento).length

  if (loading) {
    return (
      <div className="inspiracoes-loading">
        <Loader2 size={32} className="spin" />
        <p>A carregar inspiracoes...</p>
      </div>
    )
  }

  return (
    <div className="inspiracoes-container">
      {/* Header */}
      <div className="inspiracoes-header">
        <div className="inspiracoes-title">
          <Palette size={20} />
          <div>
            <h2>Inspiracoes & Referencias</h2>
            <p>{totalInspiracoes} {totalInspiracoes !== 1 ? 'imagens' : 'imagem'} em {totalCompartimentos} compartimento{totalCompartimentos !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="inspiracoes-header-actions">
          {/* Filter */}
          {totalCompartimentos > 1 && (
            <select
              className="inspiracoes-filter"
              value={filterCompartimento}
              onChange={(e) => setFilterCompartimento(e.target.value)}
            >
              <option value="todos">Todos os compartimentos</option>
              {Object.keys(inspiracoesByCompartimento).map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          )}
          {/* Collapse/Expand buttons */}
          {totalCompartimentos > 1 && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => toggleAllCompartimentos(true)}
                title="Colapsar todos"
              >
                <ChevronUp size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => toggleAllCompartimentos(false)}
                title="Expandir todos"
              >
                <ChevronDown size={16} />
              </button>
            </>
          )}
          {/* Manage Compartimentos button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCompartimentosModal(true)}
            title="Gerir Compartimentos"
          >
            <Settings size={16} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={16} />
            Adicionar Inspiracao
          </button>
        </div>
      </div>

      {/* Empty State */}
      {inspiracoes.length === 0 ? (
        <div className="inspiracoes-empty">
          <Palette size={48} />
          <h3>Sem inspiracoes</h3>
          <p>Adicione imagens de referencia e inspiracao para guiar o desenvolvimento visual do projeto</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={16} />
            Adicionar Primeira Inspiracao
          </button>
        </div>
      ) : (
        /* Compartimentos List */
        <div className="inspiracoes-sections">
          {filteredCompartimentos.map(([compartimento, items]) => {
            const isCollapsed = collapsedCompartimentos[compartimento]

            return (
              <div key={compartimento} className="inspiracoes-section">
                {/* Section Header */}
                <div
                  className="inspiracoes-section-header"
                  onClick={() => toggleCompartimento(compartimento)}
                >
                  <div className="inspiracoes-section-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderOpen size={16} />
                      <h3>{compartimento}</h3>
                    </div>
                    <span className="inspiracoes-section-count">
                      {items.length} {items.length !== 1 ? 'imagens' : 'imagem'}
                    </span>
                  </div>
                  <div className="inspiracoes-section-actions">
                    <button
                      className="btn-icon btn-add-to-compartimento"
                      onClick={(e) => openUploadForCompartimento(compartimento, e)}
                      title={`Adicionar inspiracao a ${compartimento}`}
                    >
                      <Plus size={16} />
                    </button>
                    <div className="inspiracoes-section-toggle">
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </div>
                </div>

                {/* Photos Grid with Animation */}
                <div className={`inspiracoes-grid-wrapper ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                  <div className="inspiracoes-grid">
                    {items.map((inspiracao) => (
                      <div key={inspiracao.id} className="inspiracoes-card">
                        <LazyImage
                          src={inspiracao.url}
                          alt={inspiracao.titulo || 'Inspiracao'}
                          className="inspiracoes-card-image"
                          onClick={() => openLightbox(inspiracao, items)}
                        />

                        {/* Source Badge */}
                        {inspiracao.fonte && (
                          <span className="inspiracoes-fonte-badge">
                            <Link2 size={10} />
                            {inspiracao.fonte}
                          </span>
                        )}

                        {/* Tags */}
                        {inspiracao.tags && inspiracao.tags.length > 0 && (
                          <div className="inspiracoes-tags">
                            {inspiracao.tags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="inspiracoes-tag">{tag}</span>
                            ))}
                            {inspiracao.tags.length > 2 && (
                              <span className="inspiracoes-tag">+{inspiracao.tags.length - 2}</span>
                            )}
                          </div>
                        )}

                        <div className="inspiracoes-card-overlay">
                          <button
                            className="inspiracoes-action-btn"
                            title="Ver"
                            onClick={() => openLightbox(inspiracao, items)}
                          >
                            <Eye size={18} />
                          </button>
                        </div>

                        <div className="inspiracoes-card-actions">
                          <button
                            className="btn-icon"
                            onClick={(e) => { e.stopPropagation(); openEditModal(inspiracao) }}
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            onClick={(e) => { e.stopPropagation(); handleDelete(inspiracao) }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {inspiracao.titulo && (
                          <div className="inspiracoes-card-title">
                            {inspiracao.titulo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Inspiracao</h3>
              <button className="btn-close" onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* File Upload */}
              <div className="form-group">
                <label>Imagens *</label>
                <div
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="upload-loading">
                      <Loader2 size={32} className="spin" />
                      <span>A fazer upload...</span>
                    </div>
                  ) : uploadForm.arquivos.length > 0 ? (
                    <div className="upload-preview">
                      <Image size={24} />
                      <span>{uploadForm.arquivos.length} ficheiro{uploadForm.arquivos.length !== 1 ? 's' : ''} selecionado{uploadForm.arquivos.length !== 1 ? 's' : ''}</span>
                      <span className="upload-hint">{uploadForm.arquivos.map(f => f.name).join(', ')}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} />
                      <span>Clique para selecionar imagens</span>
                      <span className="upload-hint">JPG, PNG, WEBP (max. 20MB por ficheiro)</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    hidden
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Compartimento */}
              <div className="form-group">
                <label>Compartimento</label>
                <select
                  className="form-input"
                  value={uploadForm.compartimento}
                  onChange={e => setUploadForm(prev => ({ ...prev, compartimento: e.target.value }))}
                >
                  {compartimentosDisponiveis.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="form-group">
                <label>Titulo (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome ou descricao curta"
                  value={uploadForm.titulo}
                  onChange={e => setUploadForm(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>

              {/* Source */}
              <div className="form-group">
                <label>Fonte (opcional)</label>
                <div className="form-input-with-suggestions">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pinterest, Archdaily, etc."
                    value={uploadForm.fonte}
                    onChange={e => setUploadForm(prev => ({ ...prev, fonte: e.target.value }))}
                  />
                  <div className="suggestions-inline">
                    {FONTES_SUGERIDAS.map(fonte => (
                      <button
                        key={fonte}
                        type="button"
                        className={`suggestion-chip ${uploadForm.fonte === fonte ? 'active' : ''}`}
                        onClick={() => setUploadForm(prev => ({ ...prev, fonte }))}
                      >
                        {fonte}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label>Tags (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="moderna, minimalista, madeira (separadas por virgula)"
                  value={uploadForm.tags}
                  onChange={e => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Notas (opcional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Notas adicionais sobre esta inspiracao..."
                  value={uploadForm.descricao}
                  onChange={e => setUploadForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUploadModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploadForm.arquivos.length === 0 || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingInspiracao && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Inspiracao</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Preview */}
              <div className="edit-preview">
                <img src={getThumbnailUrl(editingInspiracao.url, 200)} alt="Preview" />
              </div>

              {/* Compartimento */}
              <div className="form-group">
                <label>Compartimento</label>
                <select
                  className="form-input"
                  value={editForm.compartimento}
                  onChange={e => setEditForm(prev => ({ ...prev, compartimento: e.target.value }))}
                >
                  {compartimentosDisponiveis.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="form-group">
                <label>Titulo</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.titulo}
                  onChange={e => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>

              {/* Source */}
              <div className="form-group">
                <label>Fonte</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.fonte}
                  onChange={e => setEditForm(prev => ({ ...prev, fonte: e.target.value }))}
                />
              </div>

              {/* Tags */}
              <div className="form-group">
                <label>Tags</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="separadas por virgula"
                  value={editForm.tags}
                  onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Notas</label>
                <textarea
                  className="form-textarea"
                  value={editForm.descricao}
                  onChange={e => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleEdit}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="inspiracoes-lightbox" onClick={closeLightbox}>
          <div className="inspiracoes-lightbox-content" onClick={e => e.stopPropagation()}>
            {/* Counter */}
            <span className="inspiracoes-lightbox-counter">
              {lightboxIndex + 1} / {lightboxImages.length}
            </span>

            {/* Close button */}
            <button className="inspiracoes-lightbox-close" onClick={closeLightbox}>
              <X size={24} />
            </button>

            {/* Navigation */}
            <button
              className="inspiracoes-lightbox-nav inspiracoes-lightbox-prev"
              onClick={() => navigateLightbox(-1)}
              disabled={lightboxIndex === 0}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Image */}
            <div className="inspiracoes-lightbox-image-container">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.titulo || 'Inspiracao'}
              />

              {/* Info */}
              <div className="inspiracoes-lightbox-info">
                <div className="inspiracoes-lightbox-details">
                  {lightboxImage.titulo && (
                    <span className="inspiracoes-lightbox-title">{lightboxImage.titulo}</span>
                  )}
                  {lightboxImage.fonte && (
                    <span className="inspiracoes-lightbox-fonte">
                      <Link2 size={14} /> {lightboxImage.fonte}
                    </span>
                  )}
                </div>
                {lightboxImage.tags && lightboxImage.tags.length > 0 && (
                  <div className="inspiracoes-lightbox-tags">
                    {lightboxImage.tags.map((tag, idx) => (
                      <span key={idx} className="inspiracoes-lightbox-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              className="inspiracoes-lightbox-nav inspiracoes-lightbox-next"
              onClick={() => navigateLightbox(1)}
              disabled={lightboxIndex === lightboxImages.length - 1}
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Compartimentos Management Modal */}
      {showCompartimentosModal && (
        <div className="modal-overlay" onClick={() => setShowCompartimentosModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gerir Compartimentos</h3>
              <button className="btn-close" onClick={() => setShowCompartimentosModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Add new compartimento */}
              <div className="form-group">
                <label>Adicionar Novo Compartimento</label>
                <div className="compartimento-add-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nome do compartimento..."
                    value={novoCompartimento}
                    onChange={e => setNovoCompartimento(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCompartimento()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAddCompartimento}
                    disabled={!novoCompartimento.trim() || savingCompartimento}
                  >
                    {savingCompartimento ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Existing compartimentos */}
              <div className="form-group">
                <label>Compartimentos Existentes</label>
                <div className="compartimentos-list">
                  {compartimentosDisponiveis.map(comp => {
                    const count = inspiracoesByCompartimento[comp]?.length || 0
                    const isFromProject = compartimentosProjeto.some(c => (c.nome || c) === comp) ||
                                          localCompartimentos.some(c => (c.nome || c) === comp)
                    const isDefault = ['Geral', 'Sala de Estar', 'Cozinha', 'Quarto', 'Casa de Banho', 'Escritorio', 'Exterior'].includes(comp)

                    return (
                      <div key={comp} className="compartimento-item">
                        <div className="compartimento-item-info">
                          <FolderOpen size={16} />
                          <span className="compartimento-item-name">{comp}</span>
                          {count > 0 && (
                            <span className="compartimento-item-count">{count}</span>
                          )}
                          {isFromProject && !isDefault && (
                            <span className="compartimento-item-badge">Deste Projeto</span>
                          )}
                          {isDefault && (
                            <span className="compartimento-item-badge default">Predefinido</span>
                          )}
                        </div>
                        <div className="compartimento-item-actions">
                          <button
                            className="btn-icon"
                            onClick={() => openUploadForCompartimento(comp)}
                            title="Adicionar inspiracao"
                          >
                            <Plus size={14} />
                          </button>
                          {isFromProject && !isDefault && comp !== 'Geral' && (
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleDeleteCompartimento(comp)}
                              title="Eliminar compartimento"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="compartimentos-hint">
                Os compartimentos predefinidos estao sempre disponiveis. Pode criar compartimentos personalizados para este projeto que aparecerao em primeiro lugar na lista.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowCompartimentosModal(false)}>
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
