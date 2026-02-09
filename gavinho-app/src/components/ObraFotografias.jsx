import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Camera, Plus, Upload, X, Calendar, MapPin, Tag, Search, Filter,
  Grid, List, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon,
  Trash2, Edit2, Download, Maximize2, Loader2
} from 'lucide-react'
import PortalToggle from './PortalToggle'

export default function ObraFotografias({ obra }) {
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null })
  const [fotografias, setFotografias] = useState([])
  const [zonas, setZonas] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showLightbox, setShowLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [editingFoto, setEditingFoto] = useState(null)
  const [collapsedDates, setCollapsedDates] = useState({})

  // Filtros
  const [filtroZona, setFiltroZona] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')

  // Form
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data_fotografia: new Date().toISOString().split('T')[0],
    zona_id: '',
    especialidade_id: '',
    tags: [],
    publicar_no_portal: false,
    legenda_portal: '',
    portal_tipo: 'normal'
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])

  useEffect(() => {
    if (obra?.id) loadData()
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fotosRes, zonasRes, especRes] = await Promise.all([
        supabase
          .from('obra_fotografias')
          .select('*, zona:obra_zonas(id, nome, codigo), especialidade:especialidades(id, nome, cor)')
          .eq('obra_id', obra.id)
          .order('data_fotografia', { ascending: false }),
        supabase
          .from('obra_zonas')
          .select('*')
          .eq('obra_id', obra.id)
          .order('ordem'),
        supabase
          .from('especialidades')
          .select('*')
          .eq('ativo', true)
          .order('ordem')
      ])

      setFotografias(fotosRes.data || [])
      setZonas(zonasRes.data || [])
      setEspecialidades(especRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar fotografias:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSelectedFiles(prev => [...prev, ...files])
    const newPreviews = files.map(file => ({
      file, url: URL.createObjectURL(file), name: file.name
    }))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removePreview = (index) => {
    URL.revokeObjectURL(previews[index].url)
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Atenção', 'Selecione pelo menos uma fotografia')
      return
    }
    setUploading(true)
    try {
      for (const file of selectedFiles) {
        const fileName = `${obra.codigo}/fotografias/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage.from('obras').upload(fileName, file)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('obras').getPublicUrl(fileName)

        const { error: dbError } = await supabase
          .from('obra_fotografias')
          .insert({
            obra_id: obra.id,
            url: publicUrl,
            filename: file.name,
            tamanho_bytes: file.size,
            titulo: formData.titulo || file.name.replace(/\.[^/.]+$/, ''),
            descricao: formData.descricao || null,
            data_fotografia: formData.data_fotografia,
            zona_id: formData.zona_id || null,
            especialidade_id: formData.especialidade_id || null,
            tags: formData.tags.length > 0 ? formData.tags : null,
            publicar_no_portal: formData.publicar_no_portal,
            legenda_portal: formData.legenda_portal || null,
            portal_tipo: formData.portal_tipo || 'normal'
          })
        if (dbError) throw dbError
      }
      previews.forEach(p => URL.revokeObjectURL(p.url))
      setPreviews([])
      setSelectedFiles([])
      resetForm()
      setShowModal(false)
      loadData()
      toast.success(`${selectedFiles.length} fotografia(s) adicionada(s)`)
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      toast.error('Erro', 'Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: '', descricao: '', data_fotografia: new Date().toISOString().split('T')[0],
      zona_id: '', especialidade_id: '', tags: [],
      publicar_no_portal: false, legenda_portal: '', portal_tipo: 'normal'
    })
  }

  const handleDelete = (foto) => {
    setConfirmModal({
      isOpen: true, title: 'Apagar Fotografia',
      message: 'Tem certeza que deseja apagar esta fotografia?', type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('obra_fotografias').delete().eq('id', foto.id)
          if (error) throw error
          loadData()
        } catch (err) {
          toast.error('Erro', 'Erro ao apagar fotografia')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleEdit = (foto) => {
    setEditingFoto(foto)
    setFormData({
      titulo: foto.titulo || '', descricao: foto.descricao || '',
      data_fotografia: foto.data_fotografia || '', zona_id: foto.zona_id || '',
      especialidade_id: foto.especialidade_id || '', tags: foto.tags || [],
      publicar_no_portal: foto.publicar_no_portal || false,
      legenda_portal: foto.legenda_portal || '', portal_tipo: foto.portal_tipo || 'normal'
    })
    setShowModal(true)
  }

  const handleUpdate = async () => {
    if (!editingFoto) return
    try {
      const { error } = await supabase
        .from('obra_fotografias')
        .update({
          titulo: formData.titulo, descricao: formData.descricao,
          data_fotografia: formData.data_fotografia,
          zona_id: formData.zona_id || null, especialidade_id: formData.especialidade_id || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          publicar_no_portal: formData.publicar_no_portal,
          legenda_portal: formData.legenda_portal || null,
          portal_tipo: formData.portal_tipo || 'normal'
        })
        .eq('id', editingFoto.id)
      if (error) throw error
      setShowModal(false)
      setEditingFoto(null)
      resetForm()
      loadData()
    } catch (err) {
      toast.error('Erro', 'Erro ao atualizar fotografia')
    }
  }

  // Filtrar
  const fotografiasFiltradas = fotografias.filter(foto => {
    if (filtroZona && foto.zona_id !== filtroZona) return false
    if (filtroEspecialidade && foto.especialidade_id !== filtroEspecialidade) return false
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase()
      if (!(foto.titulo || '').toLowerCase().includes(busca) &&
          !(foto.descricao || '').toLowerCase().includes(busca) &&
          !(foto.filename || '').toLowerCase().includes(busca)) return false
    }
    return true
  })

  // Group by DAY
  const fotografiasAgrupadas = fotografiasFiltradas.reduce((acc, foto) => {
    const data = foto.data_fotografia
    const dia = data
      ? new Date(data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Sem data'
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(foto)
    return acc
  }, {})

  // Lightbox navigation
  const openLightbox = useCallback((foto) => {
    const idx = fotografiasFiltradas.findIndex(f => f.id === foto.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setShowLightbox(foto)
  }, [fotografiasFiltradas])

  const navigateLightbox = useCallback((dir) => {
    const newIdx = lightboxIndex + dir
    if (newIdx >= 0 && newIdx < fotografiasFiltradas.length) {
      setLightboxIndex(newIdx)
      setShowLightbox(fotografiasFiltradas[newIdx])
    }
  }, [lightboxIndex, fotografiasFiltradas])

  useEffect(() => {
    if (!showLightbox) return
    const handler = (e) => {
      if (e.key === 'Escape') setShowLightbox(null)
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'ArrowRight') navigateLightbox(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showLightbox, navigateLightbox])

  const toggleDateCollapse = (key) => {
    setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const collapseAll = () => {
    const all = {}
    Object.keys(fotografiasAgrupadas).forEach(k => { all[k] = true })
    setCollapsedDates(all)
  }
  const expandAll = () => setCollapsedDates({})

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ADAA96' }}>
        <Loader2 className="spin" size={24} style={{ marginBottom: '8px' }} />
        <p>A carregar fotografias...</p>
      </div>
    )
  }

  const dateGroupCount = Object.keys(fotografiasAgrupadas).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#3D3D3D' }}>Fotografias</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#ADAA96' }}>
            {fotografias.length} {fotografias.length === 1 ? 'fotografia' : 'fotografias'}
          </p>
        </div>
        <button onClick={() => { setEditingFoto(null); resetForm(); setPreviews([]); setSelectedFiles([]); setShowModal(true) }} style={S.addBtn}>
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#ADAA96' }} />
          <input type="text" placeholder="Pesquisar..." value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)} style={S.searchInput} />
        </div>
        <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} style={S.selectInput}>
          <option value="">Todas as zonas</option>
          {zonas.map(zona => <option key={zona.id} value={zona.id}>{zona.nome}</option>)}
        </select>
        <select value={filtroEspecialidade} onChange={e => setFiltroEspecialidade(e.target.value)} style={S.selectInput}>
          <option value="">Todas especialidades</option>
          {especialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nome}</option>)}
        </select>
        {dateGroupCount > 1 && (
          <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #E5E2D9', paddingLeft: '8px' }}>
            <button onClick={collapseAll} style={S.collapseBtn}>Colapsar</button>
            <button onClick={expandAll} style={S.collapseBtn}>Expandir</button>
          </div>
        )}
        {(filtroZona || filtroEspecialidade || filtroBusca) && (
          <button onClick={() => { setFiltroZona(''); setFiltroEspecialidade(''); setFiltroBusca('') }}
            style={{ fontSize: '11px', color: '#ADAA96', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Limpar
          </button>
        )}
      </div>

      {/* Gallery */}
      {fotografiasFiltradas.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FAFAF8', borderRadius: '12px', border: '1px solid #E5E2D9' }}>
          <Camera size={48} style={{ color: '#ADAA96', opacity: 0.4, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#3D3D3D', fontSize: '15px' }}>Sem fotografias</h3>
          <p style={{ color: '#8B8670', margin: '0 0 20px', fontSize: '13px' }}>Adicione a primeira fotografia para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(fotografiasAgrupadas).map(([dia, fotos]) => {
            const isCollapsed = collapsedDates[dia]
            return (
              <div key={dia}>
                {/* Day header */}
                <div onClick={() => toggleDateCollapse(dia)} style={S.dateHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ChevronDown size={16} style={{ color: '#ADAA96', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#3D3D3D', textTransform: 'capitalize' }}>{dia}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#ADAA96' }}>
                    {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Masonry grid */}
                {!isCollapsed && (
                  <div style={S.masonry}>
                    {fotos.map(foto => (
                      <div key={foto.id} className="obra-foto-pin" style={S.pin}>
                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
                          onClick={() => openLightbox(foto)}>
                          <img src={foto.url} alt={foto.titulo || foto.filename}
                            style={{ width: '100%', display: 'block', background: '#F0EBE5' }} loading="lazy" />

                          {/* Hover overlay */}
                          <div className="obra-foto-overlay" style={S.pinOverlay}>
                            {/* Top badges */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {foto.zona && (
                                  <span style={S.badge}>{foto.zona.codigo || foto.zona.nome}</span>
                                )}
                                {foto.especialidade && (
                                  <span style={{ ...S.badge, background: foto.especialidade.cor || '#8B8670' }}>
                                    {foto.especialidade.nome}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(foto) }} style={S.overlayBtn} title="Editar">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(foto) }}
                                  style={{ ...S.overlayBtn, background: 'rgba(220,38,38,0.85)', color: '#FFF' }} title="Eliminar">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Caption */}
                        {(foto.titulo || foto.filename) && (
                          <div style={{ padding: '6px 4px 2px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#3D3D3D', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {foto.titulo || foto.filename}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload/Edit Modal */}
      {showModal && (
        <div style={S.modalBackdrop} onClick={() => setShowModal(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #E5E2D9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#3D3D3D', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
                {editingFoto ? 'Editar Fotografia' : 'Adicionar Fotografias'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ADAA96', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* File Upload Area */}
              {!editingFoto && (
                <div>
                  <div
                    style={S.uploadZone}
                    onClick={() => document.getElementById('foto-input')?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#7A8B6E' }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = '#E5E2D9' }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = '#E5E2D9'
                      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                      if (files.length) {
                        setSelectedFiles(prev => [...prev, ...files])
                        setPreviews(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f), name: f.name }))])
                      }
                    }}
                  >
                    {uploading ? (
                      <Loader2 className="spin" size={28} style={{ color: '#ADAA96' }} />
                    ) : (
                      <>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5F3EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={22} style={{ color: '#7A8B6E' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#3D3D3D', fontWeight: 500 }}>
                            Clique ou arraste fotografias
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ADAA96' }}>
                            JPG, PNG, WEBP (max. 20MB)
                          </p>
                        </div>
                      </>
                    )}
                    <input id="foto-input" type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                  </div>

                  {/* Previews masonry */}
                  {previews.length > 0 && (
                    <div style={{ columns: '4 80px', columnGap: '6px', marginTop: '12px' }}>
                      {previews.map((preview, idx) => (
                        <div key={idx} style={{ position: 'relative', breakInside: 'avoid', marginBottom: '6px', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={preview.url} alt={preview.name}
                            style={{ width: '100%', display: 'block', borderRadius: '8px' }} />
                          <button onClick={() => removePreview(idx)} style={S.previewRemoveBtn}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={S.label}>Título</label>
                  <input type="text" value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Descrição breve..." style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Data</label>
                  <input type="date" value={formData.data_fotografia}
                    onChange={e => setFormData({ ...formData, data_fotografia: e.target.value })} style={S.input} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={S.label}>Zona</label>
                  <select value={formData.zona_id}
                    onChange={e => setFormData({ ...formData, zona_id: e.target.value })} style={S.input}>
                    <option value="">Selecionar zona...</option>
                    {zonas.map(zona => <option key={zona.id} value={zona.id}>{zona.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Especialidade</label>
                  <select value={formData.especialidade_id}
                    onChange={e => setFormData({ ...formData, especialidade_id: e.target.value })} style={S.input}>
                    <option value="">Selecionar especialidade...</option>
                    {especialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={S.label}>Descrição</label>
                <textarea value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Notas adicionais..." rows={2}
                  style={{ ...S.input, resize: 'vertical' }} />
              </div>

              {/* Portal Cliente */}
              <div style={{ borderTop: '1px solid #E5E2D9', paddingTop: '12px' }}>
                <PortalToggle checked={formData.publicar_no_portal}
                  onChange={v => setFormData({ ...formData, publicar_no_portal: v })} />
                {formData.publicar_no_portal && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <label style={{ ...S.label, fontSize: '11px' }}>Legenda Portal</label>
                      <input value={formData.legenda_portal}
                        onChange={e => setFormData({ ...formData, legenda_portal: e.target.value })}
                        placeholder="Legenda visível ao cliente..." style={S.input} />
                    </div>
                    <div>
                      <label style={{ ...S.label, fontSize: '11px' }}>Tipo</label>
                      <select value={formData.portal_tipo}
                        onChange={e => setFormData({ ...formData, portal_tipo: e.target.value })} style={S.input}>
                        <option value="normal">Normal</option>
                        <option value="destaque">Destaque</option>
                        <option value="antes">Antes</option>
                        <option value="depois">Depois</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid #E5E2D9' }}>
              <button onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancelar</button>
              <button onClick={editingFoto ? handleUpdate : handleUpload}
                disabled={uploading || (!editingFoto && selectedFiles.length === 0)} style={S.submitBtn}>
                {uploading ? <><Loader2 className="spin" size={14} /> A enviar...</>
                  : editingFoto ? 'Guardar' : `Enviar ${selectedFiles.length || ''} Fotografia${selectedFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox with Navigation */}
      {showLightbox && (
        <div style={S.lightbox} onClick={() => setShowLightbox(null)}>
          <button onClick={() => setShowLightbox(null)} style={S.lightboxClose}><X size={20} /></button>

          {/* Counter */}
          <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: '13px', opacity: 0.7 }}>
            {lightboxIndex + 1} / {fotografiasFiltradas.length}
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(-1) }}
              style={{ ...S.lightboxNav, left: '20px' }}>
              <ChevronLeft size={28} />
            </button>
          )}
          {/* Next */}
          {lightboxIndex < fotografiasFiltradas.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(1) }}
              style={{ ...S.lightboxNav, right: '20px' }}>
              <ChevronRight size={28} />
            </button>
          )}

          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
            <img src={showLightbox.url} alt={showLightbox.titulo || showLightbox.filename}
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
          </div>

          {/* Info bar */}
          <div style={S.lightboxInfo} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                {showLightbox.titulo || showLightbox.filename}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>
                {showLightbox.data_fotografia && new Date(showLightbox.data_fotografia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                {showLightbox.zona && ` · ${showLightbox.zona.nome}`}
                {showLightbox.especialidade && ` · ${showLightbox.especialidade.nome}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { handleEdit(showLightbox); setShowLightbox(null) }}
                style={{ ...S.overlayBtn, background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                <Edit2 size={14} />
              </button>
              <a href={showLightbox.url} download={showLightbox.filename}
                style={{ ...S.overlayBtn, background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none' }}>
                <Download size={14} />
              </a>
              <button onClick={() => { handleDelete(showLightbox); setShowLightbox(null) }}
                style={{ ...S.overlayBtn, background: 'rgba(220,38,38,0.6)', color: 'white' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .obra-foto-overlay { opacity: 0 !important; transition: opacity 0.2s !important; }
        .obra-foto-pin:hover .obra-foto-overlay { opacity: 1 !important; }
      `}</style>

      <ConfirmModal isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm} title={confirmModal.title}
        message={confirmModal.message} type={confirmModal.type} />
    </div>
  )
}

// ─── Styles ────────────────────────────────────
const S = {
  addBtn: {
    padding: '8px 16px', background: '#3D3D3D', color: 'white', border: 'none',
    borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  searchInput: {
    width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #E5E2D9',
    borderRadius: '20px', fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', outline: 'none',
  },
  selectInput: {
    padding: '7px 10px', border: '1px solid #E5E2D9', borderRadius: '20px',
    fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', outline: 'none', minWidth: '130px',
  },
  collapseBtn: {
    padding: '5px 10px', background: 'transparent', border: '1px solid #E5E2D9',
    borderRadius: '14px', fontSize: '11px', color: '#8B8670', cursor: 'pointer',
  },
  dateHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 4px', marginBottom: '8px', borderBottom: '1px solid #E5E2D9',
    cursor: 'pointer', userSelect: 'none',
  },
  masonry: {
    columns: '4 220px', columnGap: '14px', marginBottom: '8px',
  },
  pin: {
    breakInside: 'avoid', marginBottom: '14px',
  },
  pinOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 40%, transparent 100%)',
    borderRadius: '12px', display: 'flex', alignItems: 'flex-start', padding: '8px',
    opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none',
  },
  badge: {
    padding: '2px 8px', background: 'rgba(0,0,0,0.6)', color: '#FFF',
    fontSize: '10px', borderRadius: '10px', fontWeight: 500,
  },
  overlayBtn: {
    width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
    color: '#3D3D3D', border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalCard: {
    width: '520px', maxWidth: '95vw', background: '#FFF', borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
    maxHeight: '90vh',
  },
  uploadZone: {
    border: '2px dashed #E5E2D9', borderRadius: '12px', padding: '32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    background: '#FAFAF8',
  },
  previewRemoveBtn: {
    position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B8670', marginBottom: '4px',
  },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #E5E2D9', borderRadius: '8px',
    fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', fontFamily: 'inherit',
  },
  cancelBtn: {
    padding: '8px 16px', background: 'transparent', border: '1px solid #E5E2D9',
    borderRadius: '8px', fontSize: '12px', color: '#8B8670', cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px', background: '#7A8B6E', color: 'white', border: 'none',
    borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  lightbox: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  },
  lightboxClose: {
    position: 'absolute', top: '20px', right: '20px',
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
    width: '40px', height: '40px', cursor: 'pointer', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  lightboxNav: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
    width: '44px', height: '44px', cursor: 'pointer', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  lightboxInfo: {
    position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    padding: '12px 20px', borderRadius: '12px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', gap: '24px',
    minWidth: '400px', maxWidth: '90vw',
  },
}
