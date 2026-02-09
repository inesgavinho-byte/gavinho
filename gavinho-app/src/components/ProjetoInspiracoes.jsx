import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Plus, Upload, Trash2, X, Loader2, Search,
  ExternalLink, Tag, Image as ImageIcon, Maximize2,
  Pencil, Check, MoreHorizontal, Link2
} from 'lucide-react'

const CATEGORIAS = [
  { id: 'geral', label: 'Geral' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'cores', label: 'Cores & Paletas' },
  { id: 'espacos', label: 'Espaços' },
  { id: 'mobiliario', label: 'Mobiliário' },
  { id: 'iluminacao', label: 'Iluminação' },
  { id: 'exterior', label: 'Exterior' }
]

export default function ProjetoInspiracoes({ projeto, userId, userName }) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [inspiracoes, setInspiracoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  const [uploadForm, setUploadForm] = useState({
    categoria: 'geral',
    titulo: '',
    descricao: '',
    fonte: ''
  })

  useEffect(() => {
    if (projeto?.id) fetchInspiracoes()
  }, [projeto?.id])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpenId])

  const fetchInspiracoes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projeto_inspiracoes')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInspiracoes(data || [])
    } catch (err) {
      console.error('Erro ao carregar inspirações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    let successCount = 0

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue

        const ext = file.name.split('.').pop()
        const filePath = `projetos/${projeto.id}/inspiracoes/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('projeto-files')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Erro upload:', uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('projeto-files')
          .getPublicUrl(filePath)

        const { error: insertError } = await supabase
          .from('projeto_inspiracoes')
          .insert({
            projeto_id: projeto.id,
            titulo: uploadForm.titulo || file.name.split('.')[0],
            descricao: uploadForm.descricao || null,
            categoria: uploadForm.categoria,
            imagem_url: urlData.publicUrl,
            imagem_path: filePath,
            fonte: uploadForm.fonte || null,
            created_by: userId,
            created_by_name: userName
          })

        if (!insertError) successCount++
      }

      if (successCount > 0) {
        toast.success(`${successCount} imagem(ns) adicionada(s)`)
        fetchInspiracoes()
      }

      setShowUploadModal(false)
      setUploadForm({ categoria: 'geral', titulo: '', descricao: '', fonte: '' })
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro', 'Não foi possível fazer upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startEdit = (insp) => {
    setEditingId(insp.id)
    setEditForm({
      titulo: insp.titulo || '',
      descricao: insp.descricao || '',
      categoria: insp.categoria || 'geral',
      fonte: insp.fonte || ''
    })
    setMenuOpenId(null)
  }

  const saveEdit = async (id) => {
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('projeto_inspiracoes')
        .update({
          titulo: editForm.titulo.trim() || null,
          descricao: editForm.descricao.trim() || null,
          categoria: editForm.categoria,
          fonte: editForm.fonte.trim() || null
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Inspiração actualizada')
      setEditingId(null)
      fetchInspiracoes()
    } catch (err) {
      toast.error('Erro', 'Não foi possível guardar')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = (insp) => {
    setMenuOpenId(null)
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Inspiração',
      message: `Tem a certeza que quer eliminar "${insp.titulo || 'esta imagem'}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          if (insp.imagem_path) {
            await supabase.storage.from('projeto-files').remove([insp.imagem_path])
          }
          const { error } = await supabase
            .from('projeto_inspiracoes')
            .delete()
            .eq('id', insp.id)

          if (error) throw error
          toast.success('Inspiração eliminada')
          fetchInspiracoes()
        } catch (err) {
          toast.error('Erro', 'Não foi possível eliminar')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // Filter
  const filtered = inspiracoes.filter(insp => {
    if (categoriaFiltro !== 'todas' && insp.categoria !== categoriaFiltro) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (insp.titulo || '').toLowerCase().includes(term) ||
             (insp.descricao || '').toLowerCase().includes(term) ||
             (insp.categoria || '').toLowerCase().includes(term)
    }
    return true
  })

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightboxImage) return
    const handler = (e) => {
      if (e.key === 'Escape') setLightboxImage(null)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const idx = filtered.findIndex(i => i.id === lightboxImage.id)
        if (e.key === 'ArrowLeft' && idx > 0) setLightboxImage(filtered[idx - 1])
        if (e.key === 'ArrowRight' && idx < filtered.length - 1) setLightboxImage(filtered[idx + 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxImage, filtered])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Loader2 size={28} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  const catLabel = (id) => CATEGORIAS.find(c => c.id === id)?.label || id

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            Inspirações & Referências
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
            {inspiracoes.length} {inspiracoes.length !== 1 ? 'imagens' : 'imagem'}
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)} style={S.addBtn}>
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#ADAA96' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={S.searchInput}
          />
        </div>
        {[{ id: 'todas', label: 'Todas' }, ...CATEGORIAS].map(cat => {
          const count = cat.id === 'todas' ? inspiracoes.length : inspiracoes.filter(i => i.categoria === cat.id).length
          if (count === 0 && cat.id !== 'todas') return null
          const active = categoriaFiltro === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCategoriaFiltro(cat.id)}
              style={{
                padding: '5px 12px',
                background: active ? '#3D3D3D' : 'transparent',
                color: active ? '#FFF' : '#8B8670',
                border: active ? 'none' : '1px solid #E5E2D9',
                borderRadius: '16px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: active ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              {cat.label}{cat.id !== 'todas' ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Masonry Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FAFAF8', borderRadius: '12px', border: '1px solid #E5E2D9' }}>
          <ImageIcon size={48} style={{ color: '#ADAA96', opacity: 0.4, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#3D3D3D', fontSize: '15px' }}>Sem inspirações</h3>
          <p style={{ color: '#8B8670', margin: '0 0 20px', fontSize: '13px' }}>Adicione imagens de referência e inspiração para este projeto</p>
          <button onClick={() => setShowUploadModal(true)} style={S.addBtn}>
            <Plus size={14} /> Adicionar Primeira Inspiração
          </button>
        </div>
      ) : (
        <div style={S.masonry}>
          {filtered.map(insp => (
            <div key={insp.id} style={S.pin} className="pin-card">
              {/* Image */}
              <div
                style={{ position: 'relative', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden' }}
                onClick={() => { if (editingId !== insp.id) setLightboxImage(insp) }}
              >
                <img
                  src={insp.imagem_url}
                  alt={insp.titulo || 'Inspiração'}
                  style={{ width: '100%', display: 'block', background: '#F0EBE5' }}
                  loading="lazy"
                  onError={e => {
                    e.target.style.minHeight = '120px'
                    e.target.style.objectFit = 'contain'
                    e.target.style.padding = '20px'
                    e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%23f0ebe5"/><path d="M35 65L45 50L55 60L60 55L70 65H35Z" fill="%23c4b5a4" opacity="0.5"/><circle cx="40" cy="40" r="5" fill="%23c4b5a4" opacity="0.5"/></svg>')
                  }}
                />
                {/* Hover overlay */}
                <div style={S.pinOverlay} className="pin-overlay">
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxImage(insp) }}
                      style={S.overlayBtn}
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  {/* Category badge */}
                  <span style={S.catBadge}>{catLabel(insp.categoria)}</span>
                </div>
              </div>

              {/* Caption - edit or view */}
              {editingId === insp.id ? (
                <div style={{ padding: '10px 4px 4px' }}>
                  <input
                    type="text"
                    value={editForm.titulo}
                    onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Título"
                    style={S.editInput}
                    autoFocus
                  />
                  <textarea
                    value={editForm.descricao}
                    onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Descrição..."
                    rows={2}
                    style={{ ...S.editInput, resize: 'vertical', marginTop: '6px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <select
                      value={editForm.categoria}
                      onChange={e => setEditForm(p => ({ ...p, categoria: e.target.value }))}
                      style={{ ...S.editInput, flex: 1 }}
                    >
                      {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={editForm.fonte}
                      onChange={e => setEditForm(p => ({ ...p, fonte: e.target.value }))}
                      placeholder="Fonte / URL"
                      style={{ ...S.editInput, flex: 1 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} style={S.editCancelBtn}>Cancelar</button>
                    <button onClick={() => saveEdit(insp.id)} disabled={savingEdit} style={S.editSaveBtn}>
                      {savingEdit ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '8px 4px 4px', position: 'relative' }}>
                  {/* 3-dot menu */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === insp.id ? null : insp.id) }}
                    style={S.menuBtn}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenId === insp.id && (
                    <div style={S.menuDropdown} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { navigator.clipboard.writeText(insp.imagem_url); toast.success('Link copiado'); setMenuOpenId(null) }} style={S.menuItem}>
                        <Link2 size={12} /> Copiar Link
                      </button>
                      <button onClick={() => { window.open(insp.imagem_url, '_blank'); setMenuOpenId(null) }} style={S.menuItem}>
                        <ExternalLink size={12} /> Abrir em nova aba
                      </button>
                      <button onClick={() => startEdit(insp)} style={S.menuItem}>
                        <Pencil size={12} /> Editar
                      </button>
                      <div style={{ height: '1px', background: '#E5E2D9', margin: '2px 0' }} />
                      <button onClick={() => handleDelete(insp)} style={{ ...S.menuItem, color: '#DC2626' }}>
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  )}

                  {insp.titulo && (
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#3D3D3D', lineHeight: 1.3, paddingRight: '28px' }}>
                      {insp.titulo}
                    </div>
                  )}
                  {insp.fonte && (
                    <div style={{ fontSize: '11px', color: '#ADAA96', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                      <ExternalLink size={9} /> {insp.fonte}
                    </div>
                  )}
                  {insp.descricao && (
                    <div style={{ fontSize: '11px', color: '#8B8670', marginTop: '3px', lineHeight: 1.4 }}>
                      {insp.descricao.length > 80 ? insp.descricao.slice(0, 80) + '...' : insp.descricao}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={S.modalBackdrop} onClick={() => setShowUploadModal(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#3D3D3D', fontFamily: 'Cormorant Garamond, serif' }}>Adicionar Inspiração</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ADAA96' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>Categoria</label>
                <select value={uploadForm.categoria} onChange={e => setUploadForm(p => ({ ...p, categoria: e.target.value }))} style={S.input}>
                  {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Título (opcional)</label>
                <input type="text" value={uploadForm.titulo} onChange={e => setUploadForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Sala de estar moderna" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Descrição (opcional)</label>
                <textarea value={uploadForm.descricao} onChange={e => setUploadForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Notas sobre esta referência..." rows={2} style={{ ...S.input, resize: 'vertical' }} />
              </div>
              <div>
                <label style={S.label}>Fonte / URL (opcional)</label>
                <input type="text" value={uploadForm.fonte} onChange={e => setUploadForm(p => ({ ...p, fonte: e.target.value }))} placeholder="Ex: Pinterest, archdaily.com" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Imagens</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={S.uploadZone}
                >
                  {uploading ? (
                    <><Loader2 size={24} className="spin" /><span style={{ fontSize: '12px' }}>A fazer upload...</span></>
                  ) : (
                    <><Upload size={24} /><span style={{ fontSize: '12px' }}>Clique para selecionar imagens</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div style={S.lightbox} onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} style={S.lightboxClose}>
            <X size={20} />
          </button>
          {/* Nav arrows */}
          {filtered.findIndex(i => i.id === lightboxImage.id) > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); const idx = filtered.findIndex(i => i.id === lightboxImage.id); setLightboxImage(filtered[idx - 1]) }}
              style={{ ...S.lightboxNav, left: '20px' }}
            >&#8249;</button>
          )}
          {filtered.findIndex(i => i.id === lightboxImage.id) < filtered.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); const idx = filtered.findIndex(i => i.id === lightboxImage.id); setLightboxImage(filtered[idx + 1]) }}
              style={{ ...S.lightboxNav, right: '20px' }}
            >&#8250;</button>
          )}
          <img
            src={lightboxImage.imagem_url}
            alt={lightboxImage.titulo || 'Inspiração'}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={e => e.stopPropagation()}
          />
          {(lightboxImage.titulo || lightboxImage.descricao) && (
            <div style={S.lightboxCaption} onClick={e => e.stopPropagation()}>
              {lightboxImage.titulo && <div style={{ fontSize: '15px', fontWeight: 600 }}>{lightboxImage.titulo}</div>}
              {lightboxImage.descricao && <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{lightboxImage.descricao}</div>}
              {lightboxImage.fonte && <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{lightboxImage.fonte}</div>}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />

      {/* CSS for masonry + hover effects */}
      <style>{`
        .pin-overlay {
          opacity: 0 !important;
          transition: opacity 0.2s !important;
        }
        .pin-card:hover .pin-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}

// ─── Styles ────────────────────────────────────
const S = {
  addBtn: {
    padding: '8px 16px',
    background: '#3D3D3D',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  searchInput: {
    width: '100%',
    padding: '7px 10px 7px 30px',
    border: '1px solid #E5E2D9',
    borderRadius: '20px',
    fontSize: '12px',
    background: '#FAFAF8',
    color: '#3D3D3D',
    outline: 'none',
  },
  masonry: {
    columns: '4 220px',
    columnGap: '14px',
  },
  pin: {
    breakInside: 'avoid',
    marginBottom: '14px',
  },
  pinOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.2) 100%)',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '10px',
    opacity: 0,
    transition: 'opacity 0.2s',
    pointerEvents: 'none',
  },
  overlayBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.9)',
    color: '#3D3D3D',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  catBadge: {
    padding: '3px 10px',
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 500,
    color: '#3D3D3D',
  },
  menuBtn: {
    position: 'absolute',
    top: '6px',
    right: '0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ADAA96',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: '28px',
    right: '0',
    background: '#FFF',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    border: '1px solid #E5E2D9',
    zIndex: 20,
    overflow: 'hidden',
    minWidth: '120px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#3D3D3D',
    textAlign: 'left',
  },
  editInput: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #E5E2D9',
    borderRadius: '6px',
    fontSize: '12px',
    background: '#FAFAF8',
    color: '#3D3D3D',
    outline: 'none',
    fontFamily: 'inherit',
  },
  editCancelBtn: {
    padding: '5px 12px',
    background: 'none',
    border: '1px solid #E5E2D9',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#8B8670',
    cursor: 'pointer',
  },
  editSaveBtn: {
    padding: '5px 12px',
    background: '#3D3D3D',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '440px',
    padding: '24px',
    background: '#FFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#8B8670',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E5E2D9',
    borderRadius: '8px',
    fontSize: '13px',
    background: '#FAFAF8',
    color: '#3D3D3D',
    fontFamily: 'inherit',
  },
  uploadZone: {
    width: '100%',
    padding: '28px',
    border: '2px dashed #E5E2D9',
    borderRadius: '12px',
    background: '#FAFAF8',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: '#ADAA96',
    transition: 'border-color 0.2s',
  },
  lightbox: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  lightboxClose: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    cursor: 'pointer',
    color: 'white',
    fontSize: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxCaption: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    padding: '14px 24px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center',
    maxWidth: '500px',
  },
}
