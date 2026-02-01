import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Upload, Image, X, ChevronLeft, ChevronRight, Trash2,
  Star, MessageSquare, Edit2, Eye, Download, Loader2, Send,
  User, Calendar, Clock, Check, AlertCircle, HelpCircle,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, RefreshCw
} from 'lucide-react'

// Image cache for prefetching
const imageCache = new Map()

// Generate optimized thumbnail URL with Supabase transformations
const getThumbnailUrl = (url, width = 400) => {
  if (!url) return ''
  // If using Supabase storage with image transformations
  if (url.includes('supabase.co/storage')) {
    // Add render/image transformation params
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=${width}&quality=75`
  }
  return url
}

// Prefetch image into cache
const prefetchImage = (url) => {
  if (!url || imageCache.has(url)) return
  const img = new window.Image()
  img.src = url
  imageCache.set(url, img)
}

// Lazy loading image component with error handling and thumbnail support
const LazyImage = memo(({ src, alt, className, onClick, useThumbnail = true }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef(null)

  // Use thumbnail for grid view, full image otherwise
  const displayUrl = useMemo(() => {
    return useThumbnail ? getThumbnailUrl(src, 400) : src
  }, [src, useThumbnail])

  useEffect(() => {
    // Reset state when src changes
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

    // Check if already visible
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
    <div ref={containerRef} className="archviz-image-wrapper" onClick={onClick}>
      {error ? (
        <div className="archviz-image-error">
          <AlertCircle size={24} />
          <span>Erro ao carregar</span>
          <button className="btn btn-sm btn-ghost" onClick={handleRetry}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : !shouldLoad ? (
        <div className="archviz-image-placeholder">
          <Image size={24} />
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="archviz-image-loading">
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

export default function ProjetoArchviz({ projeto, userId, userName }) {
  // State
  const [renders, setRenders] = useState([])
  const [compartimentos, setCompartimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDuvidaModal, setShowDuvidaModal] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Form states
  const [newRender, setNewRender] = useState({
    compartimento: '',
    novoCompartimento: '',
    vista: '',
    arquivo: null
  })

  const [novaDuvida, setNovaDuvida] = useState({
    utilizador_id: '',
    titulo: '',
    entregavel_id: '',
    descricao: '',
    imagem: null
  })

  // Comments state
  const [showComments, setShowComments] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState({})

  // Pagination per section - show only 4 initially
  const [expandedSections, setExpandedSections] = useState({})
  const ITEMS_PER_SECTION = 4

  // Team members for @mentions and assignees
  const [teamMembers, setTeamMembers] = useState([])

  // Refs
  const fileInputRef = useRef(null)
  const duvidaImageRef = useRef(null)

  // Load data on mount
  useEffect(() => {
    if (projeto?.id) {
      loadRenders()
      loadTeamMembers()
    }
  }, [projeto?.id])

  const loadRenders = async (retryCount = 0) => {
    try {
      setLoading(true)
      setLoadError(null)

      console.log('=== CARREGANDO RENDERS ===')
      console.log('Projeto ID:', projeto.id)

      // Query renders
      const { data: rendersData, error: rendersError } = await supabase
        .from('projeto_renders')
        .select('id, compartimento, vista, created_at')
        .eq('projeto_id', projeto.id)
        .order('compartimento')
        .order('vista')

      console.log('Renders encontrados:', rendersData?.length || 0)
      console.log('Renders data:', rendersData)
      console.log('Renders error:', rendersError)

      if (rendersError) throw rendersError

      // Query versions separately
      const renderIds = (rendersData || []).map(r => r.id)
      let versoesData = []

      if (renderIds.length > 0) {
        const { data: versoes, error: versoesError } = await supabase
          .from('projeto_render_versoes')
          .select('id, render_id, versao, url, is_final, created_at')
          .in('render_id', renderIds)
          .order('versao', { ascending: false })

        console.log('Versões encontradas:', versoes?.length || 0)
        console.log('Versões error:', versoesError)

        if (versoesError) throw versoesError
        versoesData = versoes || []
      }

      // Join renders with versions in JavaScript
      const sortedData = (rendersData || []).map(render => ({
        ...render,
        versoes: versoesData
          .filter(v => v.render_id === render.id)
          .sort((a, b) => b.versao - a.versao)
      }))

      // Group by compartimento
      const grouped = sortedData.reduce((acc, render) => {
        const key = render.compartimento || 'Sem Compartimento'
        if (!acc[key]) acc[key] = []
        acc[key].push(render)
        return acc
      }, {})

      console.log('Renders agrupados:', Object.keys(grouped).length, 'compartimentos')
      console.log('=== FIM CARREGAMENTO ===')

      setRenders(grouped)

      // Extract compartimentos from the data (avoid extra query)
      const uniqueCompartimentos = [...new Set(sortedData.map(r => r.compartimento).filter(Boolean))]
      setCompartimentos(uniqueCompartimentos)
    } catch (err) {
      console.error('Erro ao carregar renders:', err)
      setLoadError(err.message)

      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        setTimeout(() => {
          loadRenders(retryCount + 1)
        }, Math.pow(2, retryCount) * 1000)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('utilizadores')
        .select('id, nome, email, cargo, avatar_url')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    }
  }

  const loadComments = async (renderId) => {
    try {
      const { data, error } = await supabase
        .from('projeto_render_comentarios')
        .select('*')
        .eq('render_id', renderId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(prev => ({ ...prev, [renderId]: data || [] }))
    } catch (err) {
      console.error('Erro ao carregar comentarios:', err)
    }
  }

  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewRender(prev => ({ ...prev, arquivo: file }))
  }

  const handleAddRender = async () => {
    if (!newRender.arquivo) {
      alert('Por favor selecione uma imagem')
      return
    }

    const compartimento = newRender.novoCompartimento || newRender.compartimento
    if (!compartimento) {
      alert('Por favor selecione ou crie um compartimento')
      return
    }

    console.log('=== INICIANDO UPLOAD RENDER ===')
    console.log('Projeto ID:', projeto.id)
    console.log('Compartimento:', compartimento)
    console.log('Vista:', newRender.vista || 'Vista Principal')
    console.log('User ID:', userId)
    console.log('User Name:', userName)

    setUploading(true)
    try {
      // Upload file to storage
      const fileExt = newRender.arquivo.name.split('.').pop()
      const fileName = `${projeto.id}/${Date.now()}.${fileExt}`
      console.log('1. Uploading file:', fileName)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('renders')
        .upload(fileName, newRender.arquivo)

      console.log('1. Upload result:', { uploadData, uploadError })
      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('renders')
        .getPublicUrl(fileName)
      console.log('2. Public URL:', urlData.publicUrl)

      // Create render record
      console.log('3. Inserting into projeto_renders...')
      const insertData = {
        projeto_id: projeto.id,
        compartimento: compartimento,
        vista: newRender.vista || 'Vista Principal',
        created_by: userId,
        created_by_name: userName
      }
      console.log('3. Insert data:', insertData)

      const { data: renderData, error: renderError } = await supabase
        .from('projeto_renders')
        .insert([insertData])
        .select()
        .single()

      console.log('3. projeto_renders result:', { renderData, renderError })
      if (renderError) throw renderError

      // Create first version
      console.log('4. Inserting into projeto_render_versoes...')
      const versaoData = {
        render_id: renderData.id,
        versao: 1,
        url: urlData.publicUrl,
        uploaded_by: userId,
        uploaded_by_name: userName
      }
      console.log('4. Versao data:', versaoData)

      const { data: versaoResult, error: versaoError } = await supabase
        .from('projeto_render_versoes')
        .insert([versaoData])
        .select()

      console.log('4. projeto_render_versoes result:', { versaoResult, versaoError })
      if (versaoError) throw versaoError

      console.log('=== UPLOAD COMPLETO COM SUCESSO ===')
      console.log('Render ID criado:', renderData.id)

      // Reset and reload
      setNewRender({ compartimento: '', novoCompartimento: '', vista: '', arquivo: null })
      setShowAddModal(false)
      loadRenders()
    } catch (err) {
      console.error('=== ERRO NO UPLOAD ===')
      console.error('Erro completo:', err)
      console.error('Mensagem:', err.message)
      console.error('Detalhes:', err.details)
      console.error('Hint:', err.hint)
      console.error('Code:', err.code)
      alert('Erro ao adicionar render: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Add new version to existing render
  const handleAddVersion = async (renderId, file) => {
    if (!file) return

    setUploading(true)
    try {
      // Get current version count
      const { data: versoes } = await supabase
        .from('projeto_render_versoes')
        .select('versao')
        .eq('render_id', renderId)
        .order('versao', { ascending: false })
        .limit(1)

      const nextVersion = (versoes?.[0]?.versao || 0) + 1

      // Upload file
      const fileExt = file.name.split('.').pop()
      const fileName = `${projeto.id}/${renderId}_v${nextVersion}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('renders')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('renders')
        .getPublicUrl(fileName)

      // Create version record
      const { error: versaoError } = await supabase
        .from('projeto_render_versoes')
        .insert([{
          render_id: renderId,
          versao: nextVersion,
          url: urlData.publicUrl,
          uploaded_by: userId,
          uploaded_by_name: userName
        }])

      if (versaoError) throw versaoError

      loadRenders()
    } catch (err) {
      console.error('Erro ao adicionar versao:', err)
      alert('Erro ao adicionar versao: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Mark as final
  const handleMarkFinal = async (renderId, versaoId) => {
    try {
      // Unmark all versions first
      await supabase
        .from('projeto_render_versoes')
        .update({ is_final: false })
        .eq('render_id', renderId)

      // Mark selected as final
      const { error } = await supabase
        .from('projeto_render_versoes')
        .update({ is_final: true, marked_final_at: new Date().toISOString() })
        .eq('id', versaoId)

      if (error) throw error
      loadRenders()
    } catch (err) {
      console.error('Erro ao marcar como final:', err)
    }
  }

  // Submit duvida (question/definition request)
  const handleSubmitDuvida = async () => {
    if (!novaDuvida.titulo.trim() || !novaDuvida.descricao.trim()) {
      alert('Por favor preencha o titulo e descricao')
      return
    }

    setUploading(true)
    try {
      let imagemUrl = null

      // Upload reference image if provided
      if (novaDuvida.imagem) {
        const fileExt = novaDuvida.imagem.name.split('.').pop()
        const fileName = `duvidas/${projeto.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('renders')
          .upload(fileName, novaDuvida.imagem)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('renders')
            .getPublicUrl(fileName)
          imagemUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('projeto_duvidas')
        .insert([{
          projeto_id: projeto.id,
          utilizador_id: novaDuvida.utilizador_id || null,
          entregavel_id: novaDuvida.entregavel_id || null,
          titulo: novaDuvida.titulo,
          descricao: novaDuvida.descricao,
          imagem_referencia: imagemUrl,
          status: 'pendente',
          created_by: userId,
          created_by_name: userName
        }])

      if (error) throw error

      setNovaDuvida({ utilizador_id: '', titulo: '', entregavel_id: '', descricao: '', imagem: null })
      setShowDuvidaModal(false)
      alert('Duvida submetida com sucesso!')
    } catch (err) {
      console.error('Erro ao submeter duvida:', err)
      alert('Erro ao submeter duvida: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Add comment
  const handleAddComment = async (renderId) => {
    if (!newComment.trim()) return

    try {
      const { error } = await supabase
        .from('projeto_render_comentarios')
        .insert([{
          render_id: renderId,
          comentario: newComment,
          autor_id: userId,
          autor_nome: userName
        }])

      if (error) throw error

      setNewComment('')
      loadComments(renderId)
    } catch (err) {
      console.error('Erro ao adicionar comentario:', err)
    }
  }

  // Memoize all images for lightbox navigation
  const allImages = useMemo(() => {
    return Object.values(renders).flat().flatMap(r =>
      (r.versoes || []).map(v => ({ ...v, render: r }))
    )
  }, [renders])

  const openLightbox = (image, index) => {
    setLightboxImage(image)
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
  }

  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction
    if (newIndex >= 0 && newIndex < allImages.length) {
      setLightboxIndex(newIndex)
      setLightboxImage(allImages[newIndex])
    }
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxImage) return
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'ArrowRight') navigateLightbox(1)
      if (e.key === 'Escape') closeLightbox()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, lightboxIndex])

  // Prefetch adjacent images when lightbox is open
  useEffect(() => {
    if (!lightboxImage || allImages.length === 0) return

    // Prefetch next 2 and previous 2 images
    const prefetchIndexes = [
      lightboxIndex - 2,
      lightboxIndex - 1,
      lightboxIndex + 1,
      lightboxIndex + 2
    ].filter(i => i >= 0 && i < allImages.length && i !== lightboxIndex)

    prefetchIndexes.forEach(i => {
      if (allImages[i]?.url) {
        prefetchImage(allImages[i].url)
      }
    })
  }, [lightboxImage, lightboxIndex, allImages])

  // Memoize stats calculation
  const { totalRenders, totalFinais } = useMemo(() => {
    const allRenders = Object.values(renders).flat()
    return {
      totalRenders: allRenders.length,
      totalFinais: allRenders.filter(r => r.versoes?.some(v => v.is_final)).length
    }
  }, [renders])

  // Preload first batch of visible thumbnails on mount
  useEffect(() => {
    if (Object.keys(renders).length === 0) return

    // Preload thumbnails for first ITEMS_PER_SECTION items of each section
    Object.values(renders).forEach(items => {
      items.slice(0, ITEMS_PER_SECTION).forEach(render => {
        const latestVersion = render.versoes?.[0]
        if (latestVersion?.url) {
          prefetchImage(getThumbnailUrl(latestVersion.url, 400))
        }
      })
    })
  }, [renders])

  if (loading) {
    return (
      <div className="archviz-loading">
        <Loader2 size={32} className="spin" />
        <p>A carregar visualizacoes...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="archviz-error">
        <AlertCircle size={48} />
        <h3>Erro ao carregar renders</h3>
        <p>{loadError}</p>
        <button className="btn btn-primary" onClick={() => loadRenders()}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="archviz-container">
      {/* Header */}
      <div className="archviz-header">
        <div className="archviz-title">
          <Image size={24} />
          <div>
            <h2>Visualizações 3D &amp; Renders</h2>
            <p>{totalRenders} renders · {totalFinais} {totalFinais === 1 ? 'imagem final' : 'imagens finais'}</p>
          </div>
        </div>
        <div className="archviz-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowDuvidaModal(true)}
          >
            <HelpCircle size={16} />
            Nova Duvida
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Adicionar Render
          </button>
        </div>
      </div>

      {/* Renders Grid by Compartimento */}
      {Object.keys(renders).length === 0 ? (
        <div className="archviz-empty">
          <Image size={48} />
          <h3>Sem visualizações</h3>
          <p>Adicione o primeiro render do projeto</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Adicionar Render
          </button>
        </div>
      ) : (
        <div className="archviz-grid">
          {Object.entries(renders).map(([compartimento, items]) => {
            const isExpanded = expandedSections[compartimento]
            const visibleItems = isExpanded ? items : items.slice(0, ITEMS_PER_SECTION)
            const hasMore = items.length > ITEMS_PER_SECTION

            return (
            <div key={compartimento} className="archviz-section">
              <div className="archviz-section-header">
                <h3>{compartimento}</h3>
                <span className="archviz-count">
                  ({items.length} {items.length === 1 ? 'versão' : 'versões'})
                </span>
              </div>

              <div className="archviz-items">
                {visibleItems.map((render, idx) => {
                  const latestVersion = render.versoes?.sort((a, b) => b.versao - a.versao)[0]
                  const isFinal = latestVersion?.is_final
                  const globalIdx = allImages.findIndex(img => img.id === latestVersion?.id)

                  return (
                    <div key={render.id} className={`archviz-card ${isFinal ? 'is-final' : ''}`}>
                      <div
                        className="archviz-thumbnail"
                        onClick={() => latestVersion && openLightbox(latestVersion, globalIdx)}
                      >
                        {latestVersion ? (
                          <LazyImage
                            src={latestVersion.url}
                            alt={render.vista}
                            className="archviz-img"
                            onClick={() => openLightbox(latestVersion, globalIdx)}
                          />
                        ) : (
                          <div className="archviz-placeholder">
                            <Image size={32} />
                          </div>
                        )}

                        {/* Version badge */}
                        <span className="archviz-version-badge">
                          v{latestVersion?.versao || 1}
                        </span>

                        {/* Date badge */}
                        <span className="archviz-date-badge">
                          {latestVersion ? new Date(latestVersion.created_at).toLocaleDateString('pt-PT') : '-'}
                        </span>

                        {/* Final badge */}
                        {isFinal && (
                          <span className="archviz-final-badge">
                            <Star size={12} /> Final
                          </span>
                        )}

                        {/* Hover overlay */}
                        <div className="archviz-overlay">
                          <button className="archviz-action-btn" title="Ver">
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="archviz-card-content">
                        <h4>{render.vista}</h4>

                        <div className="archviz-card-actions">
                          {!isFinal && latestVersion && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleMarkFinal(render.id, latestVersion.id)}
                            >
                              Marcar Final
                            </button>
                          )}

                          <label className="btn btn-sm btn-outline archviz-upload-btn">
                            <Plus size={14} /> Versao
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleAddVersion(render.id, file)
                                e.target.value = ''
                              }}
                              hidden
                            />
                          </label>

                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              if (showComments === render.id) {
                                setShowComments(null)
                              } else {
                                setShowComments(render.id)
                                loadComments(render.id)
                              }
                            }}
                          >
                            <MessageSquare size={14} />
                            {comments[render.id]?.length || 0}
                          </button>
                        </div>

                        {/* Comments Section */}
                        {showComments === render.id && (
                          <div className="archviz-comments">
                            <div className="archviz-comments-list">
                              {(comments[render.id] || []).length === 0 ? (
                                <p className="archviz-no-comments">Sem comentarios</p>
                              ) : (
                                (comments[render.id] || []).map(comment => (
                                  <div key={comment.id} className="archviz-comment">
                                    <div className="archviz-comment-header">
                                      <span className="archviz-comment-author">
                                        <User size={12} /> {comment.autor_nome}
                                      </span>
                                      <span className="archviz-comment-date">
                                        {new Date(comment.created_at).toLocaleDateString('pt-PT')}
                                      </span>
                                    </div>
                                    <p>{comment.comentario}</p>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="archviz-comment-input">
                              <input
                                type="text"
                                placeholder="Adicionar comentario..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newComment.trim()) {
                                    handleAddComment(render.id)
                                  }
                                }}
                              />
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAddComment(render.id)}
                                disabled={!newComment.trim()}
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add to this compartment button */}
                <div
                  className="archviz-card archviz-add-card"
                  onClick={() => {
                    setNewRender(prev => ({ ...prev, compartimento }))
                    setShowAddModal(true)
                  }}
                >
                  <Plus size={32} />
                  <span>Adicionar Versão</span>
                </div>
              </div>

              {/* Show more/less button */}
              {hasMore && (
                <button
                  className="archviz-show-more"
                  onClick={() => setExpandedSections(prev => ({
                    ...prev,
                    [compartimento]: !isExpanded
                  }))}
                >
                  {isExpanded
                    ? `Ver menos`
                    : `Ver mais ${items.length - ITEMS_PER_SECTION} imagens`
                  }
                  <ChevronRight
                    size={16}
                    className={isExpanded ? 'rotated-up' : 'rotated-down'}
                  />
                </button>
              )}
            </div>
          )})}
        </div>
      )}

      {/* Add Render Modal */}
      {showAddModal && (
        <div className="archviz-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="archviz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="archviz-modal-header">
              <h3>Adicionar Render</h3>
              <button className="archviz-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="archviz-modal-body">
              <div className="archviz-form-group">
                <label>Compartimento *</label>
                <select
                  value={newRender.compartimento}
                  onChange={(e) => setNewRender(prev => ({
                    ...prev,
                    compartimento: e.target.value,
                    novoCompartimento: ''
                  }))}
                  className="archviz-select"
                >
                  <option value="">Selecionar compartimento...</option>
                  {compartimentos.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                  <option value="__novo__">+ Criar novo compartimento</option>
                </select>
              </div>

              {newRender.compartimento === '__novo__' && (
                <div className="archviz-form-group">
                  <label>Nome do Compartimento *</label>
                  <input
                    type="text"
                    placeholder="Ex: Hall Elevadores, Corredor dos Quartos..."
                    value={newRender.novoCompartimento}
                    onChange={(e) => setNewRender(prev => ({ ...prev, novoCompartimento: e.target.value }))}
                    className="archviz-input"
                  />
                </div>
              )}

              <div className="archviz-form-group">
                <label>Vista / Nome da Imagem</label>
                <input
                  type="text"
                  placeholder="Ex: Vista Longitudinal, Vista Diagonal..."
                  value={newRender.vista}
                  onChange={(e) => setNewRender(prev => ({ ...prev, vista: e.target.value }))}
                  className="archviz-input"
                />
              </div>

              <div className="archviz-form-group">
                <label>Imagem *</label>
                <div
                  className="archviz-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {newRender.arquivo ? (
                    <div className="archviz-upload-preview">
                      <img src={URL.createObjectURL(newRender.arquivo)} alt="Preview" />
                      <span>{newRender.arquivo.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} />
                      <span>Arraste ou clique para fazer upload</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    hidden
                  />
                </div>
              </div>
            </div>

            <div className="archviz-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddRender}
                disabled={uploading || !newRender.arquivo || (!newRender.compartimento && !newRender.novoCompartimento)}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                Adicionar Render
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nova Duvida Modal */}
      {showDuvidaModal && (
        <div className="archviz-modal-overlay" onClick={() => setShowDuvidaModal(false)}>
          <div className="archviz-modal archviz-modal-duvida" onClick={(e) => e.stopPropagation()}>
            <div className="archviz-modal-header archviz-modal-header-duvida">
              <div className="archviz-modal-header-icon">
                <HelpCircle size={24} />
              </div>
              <h3>Nova Duvida</h3>
              <button className="archviz-modal-close" onClick={() => setShowDuvidaModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="archviz-modal-body">
              <div className="archviz-form-group">
                <label>Quem esta a submeter?</label>
                <select
                  value={novaDuvida.utilizador_id}
                  onChange={(e) => setNovaDuvida(prev => ({ ...prev, utilizador_id: e.target.value }))}
                  className="archviz-select"
                >
                  <option value="">Selecionar utilizador...</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.nome}</option>
                  ))}
                </select>
              </div>

              <div className="archviz-form-group">
                <label>Titulo *</label>
                <input
                  type="text"
                  placeholder="Breve descricao da duvida"
                  value={novaDuvida.titulo}
                  onChange={(e) => setNovaDuvida(prev => ({ ...prev, titulo: e.target.value }))}
                  className="archviz-input"
                />
              </div>

              <div className="archviz-form-group">
                <label>Entregavel Associado</label>
                <select
                  value={novaDuvida.entregavel_id}
                  onChange={(e) => setNovaDuvida(prev => ({ ...prev, entregavel_id: e.target.value }))}
                  className="archviz-select"
                >
                  <option value="">Selecionar entregavel (opcional)...</option>
                  {Object.entries(renders).flatMap(([comp, items]) =>
                    items.map(r => (
                      <option key={r.id} value={r.id}>{comp} - {r.vista}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="archviz-form-group">
                <label>Descricao / Pedido de Definicao *</label>
                <textarea
                  placeholder="Descreva a duvida ou pedido de definicao em detalhe..."
                  value={novaDuvida.descricao}
                  onChange={(e) => setNovaDuvida(prev => ({ ...prev, descricao: e.target.value }))}
                  className="archviz-textarea"
                  rows={4}
                />
              </div>

              <div className="archviz-form-group">
                <label>Imagem de Referencia (opcional)</label>
                <div
                  className="archviz-upload-area archviz-upload-small"
                  onClick={() => duvidaImageRef.current?.click()}
                >
                  {novaDuvida.imagem ? (
                    <div className="archviz-upload-preview">
                      <img src={URL.createObjectURL(novaDuvida.imagem)} alt="Preview" />
                      <button
                        className="archviz-remove-image"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNovaDuvida(prev => ({ ...prev, imagem: null }))
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span>Arraste ou clique para fazer upload</span>
                    </>
                  )}
                  <input
                    ref={duvidaImageRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setNovaDuvida(prev => ({ ...prev, imagem: file }))
                    }}
                    hidden
                  />
                </div>
              </div>
            </div>

            <div className="archviz-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDuvidaModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitDuvida}
                disabled={uploading || !novaDuvida.titulo.trim() || !novaDuvida.descricao.trim()}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                Submeter Duvida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="archviz-lightbox" onClick={closeLightbox}>
          <div className="archviz-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Navigation */}
            <button
              className="archviz-lightbox-nav archviz-lightbox-prev"
              onClick={() => navigateLightbox(-1)}
              disabled={lightboxIndex <= 0}
            >
              <ChevronLeft size={32} />
            </button>

            <div className="archviz-lightbox-image-container">
              <img src={lightboxImage.url} alt="Render" />

              {/* Image info */}
              <div className="archviz-lightbox-info">
                <span className="archviz-lightbox-version">Versão {lightboxImage.versao}</span>
                <span className="archviz-lightbox-date">
                  {new Date(lightboxImage.created_at).toLocaleDateString('pt-PT')}
                </span>
                {lightboxImage.is_final && (
                  <span className="archviz-lightbox-final">
                    <Star size={14} /> Imagem Final
                  </span>
                )}
              </div>

              {/* Counter */}
              <div className="archviz-lightbox-counter">
                {lightboxIndex + 1} / {allImages.length}
              </div>
            </div>

            <button
              className="archviz-lightbox-nav archviz-lightbox-next"
              onClick={() => navigateLightbox(1)}
              disabled={lightboxIndex >= allImages.length - 1}
            >
              <ChevronRight size={32} />
            </button>

            {/* Close button */}
            <button className="archviz-lightbox-close" onClick={closeLightbox}>
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
