import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Camera, Plus, Upload, X, Calendar, MapPin, Tag, Search, Filter,
  Grid, List, ChevronDown, ChevronRight, Image as ImageIcon,
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
  const [editingFoto, setEditingFoto] = useState(null)

  // Filtros
  const [filtroZona, setFiltroZona] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' ou 'list'

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
    if (obra?.id) {
      loadData()
    }
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

    setSelectedFiles(files)

    // Generate previews
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }))
    setPreviews(newPreviews)
  }

  const removePreview = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)

    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(previews[index].url)

    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Atenção', 'Selecione pelo menos uma fotografia')
      return
    }

    setUploading(true)
    try {
      for (const file of selectedFiles) {
        // Upload to storage
        const fileName = `${obra.codigo}/fotografias/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('obras')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('obras')
          .getPublicUrl(fileName)

        // Create database record
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

      // Clean up
      previews.forEach(p => URL.revokeObjectURL(p.url))
      setPreviews([])
      setSelectedFiles([])
      setFormData({
        titulo: '',
        descricao: '',
        data_fotografia: new Date().toISOString().split('T')[0],
        zona_id: '',
        especialidade_id: '',
        tags: []
      })
      setShowModal(false)
      loadData()
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      toast.error('Erro', 'Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (foto) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Fotografia',
      message: 'Tem certeza que deseja apagar esta fotografia?',
      type: 'danger',
      onConfirm: async () => {
        try {
          // Delete from database
          const { error } = await supabase
            .from('obra_fotografias')
            .delete()
            .eq('id', foto.id)

          if (error) throw error

          // Note: Could also delete from storage, but keeping for now
          loadData()
        } catch (err) {
          console.error('Erro ao apagar:', err)
          toast.error('Erro', 'Erro ao apagar fotografia')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleEdit = (foto) => {
    setEditingFoto(foto)
    setFormData({
      titulo: foto.titulo || '',
      descricao: foto.descricao || '',
      data_fotografia: foto.data_fotografia || '',
      zona_id: foto.zona_id || '',
      especialidade_id: foto.especialidade_id || '',
      tags: foto.tags || [],
      publicar_no_portal: foto.publicar_no_portal || false,
      legenda_portal: foto.legenda_portal || '',
      portal_tipo: foto.portal_tipo || 'normal'
    })
    setShowModal(true)
  }

  const handleUpdate = async () => {
    if (!editingFoto) return

    try {
      const { error } = await supabase
        .from('obra_fotografias')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao,
          data_fotografia: formData.data_fotografia,
          zona_id: formData.zona_id || null,
          especialidade_id: formData.especialidade_id || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          publicar_no_portal: formData.publicar_no_portal,
          legenda_portal: formData.legenda_portal || null,
          portal_tipo: formData.portal_tipo || 'normal'
        })
        .eq('id', editingFoto.id)

      if (error) throw error

      setShowModal(false)
      setEditingFoto(null)
      setFormData({
        titulo: '',
        descricao: '',
        data_fotografia: new Date().toISOString().split('T')[0],
        zona_id: '',
        especialidade_id: '',
        tags: []
      })
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro', 'Erro ao atualizar fotografia')
    }
  }

  // Filtrar fotografias
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

  // Agrupar por mês
  const fotografiasAgrupadas = fotografiasFiltradas.reduce((acc, foto) => {
    const data = foto.data_fotografia
    const mes = data ? new Date(data).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : 'Sem data'
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(foto)
    return acc
  }, {})

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
        <Loader2 className="spin" size={24} style={{ marginBottom: '8px' }} />
        <p>A carregar fotografias...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
            Fotografias
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
            {fotografias.length} {fotografias.length === 1 ? 'fotografia' : 'fotografias'}
          </p>
        </div>
        <button
          onClick={() => { setEditingFoto(null); setShowModal(true) }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', fontSize: '13px' }}
          />
        </div>

        <select
          value={filtroZona}
          onChange={e => setFiltroZona(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todas as zonas</option>
          {zonas.map(zona => (
            <option key={zona.id} value={zona.id}>{zona.nome}</option>
          ))}
        </select>

        <select
          value={filtroEspecialidade}
          onChange={e => setFiltroEspecialidade(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todas especialidades</option>
          {especialidades.map(esp => (
            <option key={esp.id} value={esp.id}>{esp.nome}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
          <button
            onClick={() => setViewMode('grid')}
            className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
            style={{ background: viewMode === 'grid' ? 'var(--stone)' : 'transparent' }}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'active' : ''}`}
            style={{ background: viewMode === 'list' ? 'var(--stone)' : 'transparent' }}
          >
            <List size={16} />
          </button>
        </div>

        {(filtroZona || filtroEspecialidade || filtroBusca) && (
          <button
            onClick={() => { setFiltroZona(''); setFiltroEspecialidade(''); setFiltroBusca('') }}
            style={{ fontSize: '12px', color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Galeria */}
      {fotografiasFiltradas.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Camera size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: 'var(--brown-light)', marginBottom: '8px' }}>Sem fotografias</p>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Adicione a primeira fotografia para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(fotografiasAgrupadas).map(([mes, fotos]) => (
            <div key={mes}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                padding: '8px 12px',
                background: 'var(--cream)',
                borderRadius: '8px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', textTransform: 'capitalize' }}>
                  {mes}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '12px'
                }}>
                  {fotos.map(foto => (
                    <div
                      key={foto.id}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'var(--stone)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setShowLightbox(foto)}
                    >
                      <img
                        src={foto.url}
                        alt={foto.titulo || foto.filename}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {/* Overlay com info */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7))',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }} className="foto-overlay">
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px' }}>
                          {foto.titulo && (
                            <div style={{ color: '#FFF', fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
                              {foto.titulo}
                            </div>
                          )}
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                            {formatDate(foto.data_fotografia)}
                          </div>
                        </div>
                      </div>
                      {/* Badge de zona */}
                      {foto.zona && (
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          padding: '2px 6px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#FFF',
                          fontSize: '10px',
                          borderRadius: '4px'
                        }}>
                          {foto.zona.codigo || foto.zona.nome}
                        </span>
                      )}
                      {/* Badge de especialidade */}
                      {foto.especialidade && (
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          padding: '2px 6px',
                          background: foto.especialidade.cor || 'var(--warning)',
                          color: '#FFF',
                          fontSize: '10px',
                          borderRadius: '4px'
                        }}>
                          {foto.especialidade.nome}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fotos.map(foto => (
                    <div
                      key={foto.id}
                      className="card"
                      style={{
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => setShowLightbox(foto)}
                    >
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: 'var(--stone)',
                        flexShrink: 0
                      }}>
                        <img
                          src={foto.url}
                          alt={foto.titulo || foto.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                          {foto.titulo || foto.filename}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--brown-light)' }}>
                          <span>{formatDate(foto.data_fotografia)}</span>
                          {foto.zona && <span>{foto.zona.nome}</span>}
                          {foto.especialidade && (
                            <span style={{ color: foto.especialidade.cor }}>{foto.especialidade.nome}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleEdit(foto)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleDelete(foto)}
                          style={{ color: 'var(--error)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingFoto ? 'Editar Fotografia' : 'Adicionar Fotografias'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editingFoto && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                    Fotografias *
                  </label>
                  <div
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--cream)'
                    }}
                    onClick={() => document.getElementById('foto-input')?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="spin" size={32} style={{ color: 'var(--brown-light)' }} />
                    ) : (
                      <>
                        <Upload size={32} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown-light)' }}>
                          Clique ou arraste para adicionar fotos
                        </p>
                      </>
                    )}
                    <input
                      id="foto-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Previews */}
                  {previews.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      marginTop: '12px'
                    }}>
                      {previews.map((preview, idx) => (
                        <div key={idx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '6px', overflow: 'hidden', background: 'var(--stone)' }}>
                          <img
                            src={preview.url}
                            alt={preview.name}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            onClick={() => removePreview(idx)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.5)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={14} style={{ color: 'white' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Descrição breve..."
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.data_fotografia}
                    onChange={e => setFormData({ ...formData, data_fotografia: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Zona
                  </label>
                  <select
                    value={formData.zona_id}
                    onChange={e => setFormData({ ...formData, zona_id: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecionar zona...</option>
                    {zonas.map(zona => (
                      <option key={zona.id} value={zona.id}>{zona.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Especialidade
                  </label>
                  <select
                    value={formData.especialidade_id}
                    onChange={e => setFormData({ ...formData, especialidade_id: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecionar especialidade...</option>
                    {especialidades.map(esp => (
                      <option key={esp.id} value={esp.id}>{esp.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Notas adicionais..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Portal Cliente */}
              <div style={{ borderTop: '1px solid #E8E6DF', paddingTop: '12px' }}>
                <PortalToggle
                  checked={formData.publicar_no_portal}
                  onChange={v => setFormData({ ...formData, publicar_no_portal: v })}
                />
                {formData.publicar_no_portal && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8B8670', display: 'block', marginBottom: '2px' }}>Legenda Portal</label>
                      <input
                        value={formData.legenda_portal}
                        onChange={e => setFormData({ ...formData, legenda_portal: e.target.value })}
                        placeholder="Legenda visível ao cliente..."
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #E8E6DF', borderRadius: '6px', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8B8670', display: 'block', marginBottom: '2px' }}>Tipo</label>
                      <select
                        value={formData.portal_tipo}
                        onChange={e => setFormData({ ...formData, portal_tipo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #E8E6DF', borderRadius: '6px', fontSize: '12px' }}
                      >
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

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button
                onClick={editingFoto ? handleUpdate : handleUpload}
                className="btn btn-primary"
                disabled={uploading || (!editingFoto && selectedFiles.length === 0)}
              >
                {uploading ? (
                  <>
                    <Loader2 className="spin" size={14} />
                    A enviar...
                  </>
                ) : editingFoto ? 'Guardar' : 'Enviar Fotografias'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => setShowLightbox(null)}
        >
          <button
            onClick={() => setShowLightbox(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <X size={24} />
          </button>

          <div style={{ maxWidth: '90vw', maxHeight: '80vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img
              src={showLightbox.url}
              alt={showLightbox.titulo || showLightbox.filename}
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }}
            />

            {/* Info panel */}
            <div style={{
              position: 'absolute',
              bottom: '-60px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)'
            }}>
              <div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                  {showLightbox.titulo || showLightbox.filename}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' }}>
                  {formatDate(showLightbox.data_fotografia)}
                  {showLightbox.zona && ` • ${showLightbox.zona.nome}`}
                  {showLightbox.especialidade && ` • ${showLightbox.especialidade.nome}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(showLightbox); setShowLightbox(null) }}
                  className="btn btn-ghost btn-icon"
                  style={{ color: 'white' }}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(showLightbox); setShowLightbox(null) }}
                  className="btn btn-ghost btn-icon"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 size={16} />
                </button>
                <a
                  href={showLightbox.url}
                  download={showLightbox.filename}
                  onClick={e => e.stopPropagation()}
                  className="btn btn-ghost btn-icon"
                  style={{ color: 'white' }}
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .foto-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  )
}
