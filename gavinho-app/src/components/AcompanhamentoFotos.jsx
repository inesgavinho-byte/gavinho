import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import ConfirmModal from './ui/ConfirmModal'
import {
  Plus, Upload, Image, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Star, Trash2, Edit, Loader2, Calendar, Camera, MapPin,
  AlertCircle, RefreshCw, Eye, MoreVertical, Users, FolderPlus
} from 'lucide-react'

// Generate optimized thumbnail URL
const getThumbnailUrl = (url, width = 400) => {
  if (!url) return ''
  if (url.includes('supabase.co/storage/v1/object/')) {
    const transformUrl = url.replace('/storage/v1/object/', '/storage/v1/render/image/')
    const separator = transformUrl.includes('?') ? '&' : '?'
    return `${transformUrl}${separator}width=${width}&quality=75`
  }
  return url
}

// Lazy loading image
const LazyImage = memo(({ src, alt, onClick, style }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const displayUrl = useMemo(() => getThumbnailUrl(src, 400), [src])

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '75%',
        background: 'var(--cream)',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {error ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--brown-light)'
        }}>
          <AlertCircle size={24} />
          <span style={{ fontSize: '11px' }}>Erro</span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
            </div>
          )}
          <img
            src={displayUrl}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s'
            }}
          />
        </>
      )}
    </div>
  )
})

export default function AcompanhamentoFotos({ projeto, userId, userName }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })

  // Data
  const [visitas, setVisitas] = useState([])
  const [fotos, setFotos] = useState({}) // visita_id -> fotos[]
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // UI state
  const [expandedVisitas, setExpandedVisitas] = useState({})
  const [showAddVisita, setShowAddVisita] = useState(false)
  const [uploadingToVisita, setUploadingToVisita] = useState(null)
  const [lightbox, setLightbox] = useState(null) // { fotos, index }

  // Form
  const [visitaForm, setVisitaForm] = useState({
    titulo: '', descricao: '', data_visita: new Date().toISOString().split('T')[0], tipo: 'rotina'
  })

  useEffect(() => {
    if (projeto?.id) loadVisitas()
  }, [projeto?.id])

  const loadVisitas = async () => {
    try {
      setLoading(true)
      const { data: visitasData, error } = await supabase
        .from('projeto_acompanhamento_visitas')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('data_visita', { ascending: false })

      if (error) throw error
      setVisitas(visitasData || [])

      // Auto-expand first visit
      if (visitasData?.length > 0) {
        setExpandedVisitas({ [visitasData[0].id]: true })
      }

      // Load fotos for all visits
      if (visitasData?.length > 0) {
        const ids = visitasData.map(v => v.id)
        const { data: fotosData } = await supabase
          .from('projeto_acompanhamento_fotos')
          .select('*')
          .in('visita_id', ids)
          .order('ordem')
          .order('created_at', { ascending: false })

        const map = {}
        ids.forEach(id => { map[id] = [] })
        fotosData?.forEach(f => {
          if (map[f.visita_id]) map[f.visita_id].push(f)
        })
        setFotos(map)
      }
    } catch (err) {
      console.error('Erro ao carregar visitas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVisita = async () => {
    if (!visitaForm.titulo.trim()) return
    try {
      const { data, error } = await supabase
        .from('projeto_acompanhamento_visitas')
        .insert({
          projeto_id: projeto.id,
          titulo: visitaForm.titulo.trim(),
          descricao: visitaForm.descricao.trim() || null,
          data_visita: visitaForm.data_visita,
          tipo: visitaForm.tipo,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      setVisitas(prev => [data, ...prev])
      setFotos(prev => ({ ...prev, [data.id]: [] }))
      setExpandedVisitas(prev => ({ ...prev, [data.id]: true }))
      setVisitaForm({ titulo: '', descricao: '', data_visita: new Date().toISOString().split('T')[0], tipo: 'rotina' })
      setShowAddVisita(false)
      toast.success('Visita criada')
    } catch (err) {
      toast.error('Erro', err.message)
    }
  }

  const handleDeleteVisita = (visita) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Visita',
      message: `Eliminar "${visita.titulo}" e todas as suas fotos?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const visitaFotos = fotos[visita.id] || []
          for (const f of visitaFotos) {
            if (f.file_path) await supabase.storage.from('projeto-files').remove([f.file_path])
          }
          const { error } = await supabase
            .from('projeto_acompanhamento_visitas')
            .delete()
            .eq('id', visita.id)
          if (error) throw error

          setVisitas(prev => prev.filter(v => v.id !== visita.id))
          setFotos(prev => { const n = { ...prev }; delete n[visita.id]; return n })
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleUploadFotos = async (visitaId, files) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const newFotos = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `projetos/${projeto.id}/acompanhamento/${visitaId}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('projeto-files')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('projeto-files')
          .getPublicUrl(path)

        const { data: fotoData, error: insertError } = await supabase
          .from('projeto_acompanhamento_fotos')
          .insert({
            visita_id: visitaId,
            projeto_id: projeto.id,
            url: publicUrl,
            file_path: path,
            filename: file.name,
            created_by: userId
          })
          .select()
          .single()

        if (insertError) throw insertError
        newFotos.push(fotoData)
      }

      setFotos(prev => ({
        ...prev,
        [visitaId]: [...newFotos, ...(prev[visitaId] || [])]
      }))
      toast.success(`${newFotos.length} foto${newFotos.length > 1 ? 's' : ''} adicionada${newFotos.length > 1 ? 's' : ''}`)
    } catch (err) {
      toast.error('Erro no upload', err.message)
    } finally {
      setUploading(false)
      setUploadingToVisita(null)
    }
  }

  const handleDeleteFoto = (foto) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Foto',
      message: 'Eliminar esta fotografia?',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (foto.file_path) await supabase.storage.from('projeto-files').remove([foto.file_path])
          await supabase.from('projeto_acompanhamento_fotos').delete().eq('id', foto.id)
          setFotos(prev => ({
            ...prev,
            [foto.visita_id]: (prev[foto.visita_id] || []).filter(f => f.id !== foto.id)
          }))
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const toggleDestaque = async (foto) => {
    try {
      const { error } = await supabase
        .from('projeto_acompanhamento_fotos')
        .update({ destaque: !foto.destaque })
        .eq('id', foto.id)
      if (error) throw error
      setFotos(prev => ({
        ...prev,
        [foto.visita_id]: (prev[foto.visita_id] || []).map(f =>
          f.id === foto.id ? { ...f, destaque: !f.destaque } : f
        )
      }))
    } catch (err) {
      toast.error('Erro', err.message)
    }
  }

  const formatDate = (d) => {
    if (!d) return ''
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const tipoColors = {
    rotina: { bg: '#E8F5E9', color: '#2E7D32', label: 'Rotina' },
    milestone: { bg: '#E3F2FD', color: '#1565C0', label: 'Milestone' },
    problema: { bg: '#FBE9E7', color: '#C62828', label: 'Problema' },
    entrega: { bg: '#FFF3E0', color: '#E65100', label: 'Entrega' }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--verde)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--brown-light)', margin: 0 }}>A carregar fotografias...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: 'var(--brown)', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px' }}>
              Fotografias de Acompanhamento
            </h3>
            <p style={{ margin: 0, color: 'var(--brown-light)', fontSize: '13px' }}>
              {visitas.length} visita{visitas.length !== 1 ? 's' : ''} • {Object.values(fotos).flat().length} fotos
            </p>
          </div>
          <button
            onClick={() => setShowAddVisita(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: 'var(--verde)', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Nova Visita
          </button>
        </div>
      </div>

      {/* Add Visit Modal */}
      {showAddVisita && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px', border: '2px solid var(--verde)' }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--brown)' }}>Nova Visita de Acompanhamento</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Título *</label>
              <input
                value={visitaForm.titulo}
                onChange={e => setVisitaForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Visita de acompanhamento #3"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                  borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Data</label>
                <input
                  type="date"
                  value={visitaForm.data_visita}
                  onChange={e => setVisitaForm(prev => ({ ...prev, data_visita: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                    borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Tipo</label>
                <select
                  value={visitaForm.tipo}
                  onChange={e => setVisitaForm(prev => ({ ...prev, tipo: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                    borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                  }}
                >
                  <option value="rotina">Rotina</option>
                  <option value="milestone">Milestone</option>
                  <option value="problema">Problema</option>
                  <option value="entrega">Entrega</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Descrição</label>
            <textarea
              value={visitaForm.descricao}
              onChange={e => setVisitaForm(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Observações da visita..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)', resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddVisita(false)}
              style={{
                padding: '8px 16px', background: 'transparent', color: 'var(--brown-light)',
                border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAddVisita}
              disabled={!visitaForm.titulo.trim()}
              style={{
                padding: '8px 16px', background: 'var(--verde)', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: !visitaForm.titulo.trim() ? 0.5 : 1
              }}
            >
              Criar Visita
            </button>
          </div>
        </div>
      )}

      {/* Visits List */}
      {visitas.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Camera size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Sem visitas registadas</h3>
          <p style={{ color: 'var(--brown-light)', margin: '0 0 16px', fontSize: '13px' }}>
            Registe visitas de acompanhamento de obra com fotografias
          </p>
          <button
            onClick={() => setShowAddVisita(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', background: 'var(--verde)', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Primeira Visita
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visitas.map(visita => {
            const visitaFotos = fotos[visita.id] || []
            const isExpanded = expandedVisitas[visita.id]
            const tipo = tipoColors[visita.tipo] || tipoColors.rotina

            return (
              <div key={visita.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Visit Header */}
                <div
                  onClick={() => setExpandedVisitas(prev => ({ ...prev, [visita.id]: !prev[visita.id] }))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--stone)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--brown-light)' }} /> : <ChevronDown size={18} style={{ color: 'var(--brown-light)' }} />}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: 'var(--brown)', fontSize: '14px' }}>{visita.titulo}</h4>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                          background: tipo.bg, color: tipo.color
                        }}>
                          {tipo.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {formatDate(visita.data_visita)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Camera size={12} /> {visitaFotos.length} foto{visitaFotos.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setUploadingToVisita(visita.id)
                        fileInputRef.current?.click()
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '6px 12px', background: 'var(--cream)', color: 'var(--brown)',
                        border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      <Upload size={14} /> Fotos
                    </button>
                    <button
                      onClick={() => handleDeleteVisita(visita)}
                      style={{
                        padding: '6px', background: 'transparent', border: 'none',
                        color: 'var(--brown-light)', cursor: 'pointer', borderRadius: '6px'
                      }}
                      title="Eliminar visita"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Visit Content - Photos Grid */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px' }}>
                    {visita.descricao && (
                      <p style={{ margin: '0 0 16px', color: 'var(--brown-light)', fontSize: '13px', fontStyle: 'italic' }}>
                        {visita.descricao}
                      </p>
                    )}

                    {visitaFotos.length === 0 ? (
                      <div style={{
                        padding: '32px', textAlign: 'center', border: '2px dashed var(--stone)',
                        borderRadius: '8px', cursor: 'pointer'
                      }}
                        onClick={() => { setUploadingToVisita(visita.id); fileInputRef.current?.click() }}
                      >
                        <Upload size={24} style={{ color: 'var(--brown-light)', opacity: 0.5, marginBottom: '8px' }} />
                        <p style={{ margin: 0, color: 'var(--brown-light)', fontSize: '13px' }}>
                          Clique para adicionar fotografias
                        </p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px'
                      }}>
                        {visitaFotos.map((foto, idx) => (
                          <div key={foto.id} style={{ position: 'relative' }}>
                            <LazyImage
                              src={foto.url}
                              alt={foto.titulo || foto.filename}
                              onClick={() => setLightbox({ fotos: visitaFotos, index: idx })}
                            />
                            {/* Overlay actions */}
                            <div style={{
                              position: 'absolute', top: '6px', right: '6px',
                              display: 'flex', gap: '4px'
                            }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleDestaque(foto) }}
                                style={{
                                  padding: '4px', background: foto.destaque ? '#FFC107' : 'rgba(0,0,0,0.4)',
                                  border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex'
                                }}
                                title={foto.destaque ? 'Remover destaque' : 'Marcar destaque'}
                              >
                                <Star size={12} style={{ color: '#fff' }} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFoto(foto) }}
                                style={{
                                  padding: '4px', background: 'rgba(0,0,0,0.4)',
                                  border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex'
                                }}
                                title="Eliminar"
                              >
                                <Trash2 size={12} style={{ color: '#fff' }} />
                              </button>
                            </div>
                            {foto.destaque && (
                              <div style={{
                                position: 'absolute', bottom: '6px', left: '6px',
                                padding: '2px 6px', background: '#FFC107', borderRadius: '4px',
                                fontSize: '10px', fontWeight: 600, color: '#333'
                              }}>
                                Destaque
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Add more photos button */}
                        <div
                          onClick={() => { setUploadingToVisita(visita.id); fileInputRef.current?.click() }}
                          style={{
                            position: 'relative', paddingBottom: '75%', background: 'var(--cream)',
                            borderRadius: '8px', border: '2px dashed var(--stone)', cursor: 'pointer',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}>
                            <Plus size={20} style={{ color: 'var(--brown-light)' }} />
                            <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Adicionar</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (uploadingToVisita && e.target.files?.length) {
            handleUploadFotos(uploadingToVisita, Array.from(e.target.files))
          }
          e.target.value = ''
        }}
      />

      {/* Upload indicator */}
      {uploading && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px',
          background: 'var(--brown)', color: '#fff', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <Loader2 size={16} className="spin" /> A carregar fotos...
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
            style={{
              position: 'absolute', top: '20px', right: '20px', padding: '8px',
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              cursor: 'pointer', color: '#fff', display: 'flex'
            }}
          >
            <X size={24} />
          </button>

          {lightbox.fotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox(prev => ({
                    ...prev,
                    index: (prev.index - 1 + prev.fotos.length) % prev.fotos.length
                  }))
                }}
                style={{
                  position: 'absolute', left: '20px', padding: '12px',
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                  cursor: 'pointer', color: '#fff', display: 'flex'
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox(prev => ({
                    ...prev,
                    index: (prev.index + 1) % prev.fotos.length
                  }))
                }}
                style={{
                  position: 'absolute', right: '20px', padding: '12px',
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                  cursor: 'pointer', color: '#fff', display: 'flex'
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            src={lightbox.fotos[lightbox.index]?.url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }}
          />

          <div style={{
            position: 'absolute', bottom: '20px', color: '#fff', fontSize: '13px',
            textAlign: 'center'
          }}>
            {lightbox.index + 1} / {lightbox.fotos.length}
            {lightbox.fotos[lightbox.index]?.filename && (
              <span style={{ opacity: 0.7, marginLeft: '8px' }}>
                {lightbox.fotos[lightbox.index].filename}
              </span>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
