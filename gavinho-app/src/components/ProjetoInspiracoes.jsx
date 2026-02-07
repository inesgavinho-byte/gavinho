import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Plus, Upload, Trash2, X, Loader2, Search,
  ExternalLink, Tag, Filter, Image as ImageIcon, Maximize2
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

  const handleDelete = (insp) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Inspiração',
      message: `Tem a certeza que quer eliminar "${insp.titulo || 'esta imagem'}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // Delete from storage
          if (insp.imagem_path) {
            await supabase.storage.from('projeto-files').remove([insp.imagem_path])
          }
          // Delete from DB
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

  // Filter inspiracoes
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

  // Group by category
  const grouped = filtered.reduce((acc, insp) => {
    const cat = insp.categoria || 'geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(insp)
    return acc
  }, {})

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Loader2 size={28} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            Inspirações & Referências
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
            {inspiracoes.length} imagem{inspiracoes.length !== 1 ? 'ns' : ''} em {Object.keys(grouped).length} categoria{Object.keys(grouped).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          style={{
            padding: '8px 16px',
            background: 'var(--brown)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={14} /> Adicionar Inspiração
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              fontSize: '12px',
              background: 'var(--cream)',
              color: 'var(--brown)'
            }}
          />
        </div>
        <button
          onClick={() => setCategoriaFiltro('todas')}
          style={{
            padding: '6px 14px',
            background: categoriaFiltro === 'todas' ? 'var(--brown)' : 'transparent',
            color: categoriaFiltro === 'todas' ? 'white' : 'var(--brown-light)',
            border: categoriaFiltro === 'todas' ? 'none' : '1px solid var(--stone)',
            borderRadius: '16px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Todas
        </button>
        {CATEGORIAS.map(cat => {
          const count = inspiracoes.filter(i => i.categoria === cat.id).length
          if (count === 0 && categoriaFiltro !== cat.id) return null
          return (
            <button
              key={cat.id}
              onClick={() => setCategoriaFiltro(cat.id)}
              style={{
                padding: '6px 14px',
                background: categoriaFiltro === cat.id ? 'var(--brown)' : 'transparent',
                color: categoriaFiltro === cat.id ? 'white' : 'var(--brown-light)',
                border: categoriaFiltro === cat.id ? 'none' : '1px solid var(--stone)',
                borderRadius: '16px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Gallery */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <ImageIcon size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Sem inspirações</h3>
          <p style={{ color: 'var(--brown-light)', margin: '0 0 16px' }}>Adicione imagens de referência e inspiração para este projeto</p>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{ padding: '8px 20px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Adicionar Primeira Inspiração
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([categoria, items]) => (
          <div key={categoria} className="card" style={{ marginBottom: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Tag size={14} style={{ color: 'var(--brown-light)' }} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                {CATEGORIAS.find(c => c.id === categoria)?.label || categoria}
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>({items.length})</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {items.map(insp => (
                <div
                  key={insp.id}
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--stone)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <img
                    src={insp.imagem_url}
                    alt={insp.titulo || 'Inspiração'}
                    onClick={() => setLightboxImage(insp)}
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  {/* Overlay actions */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '4px'
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxImage(insp) }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(insp) }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(220,38,38,0.7)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {/* Caption */}
                  {(insp.titulo || insp.fonte) && (
                    <div style={{ padding: '8px 10px', background: 'var(--cream)' }}>
                      {insp.titulo && <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insp.titulo}</div>}
                      {insp.fonte && (
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <ExternalLink size={10} /> {insp.fonte}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowUploadModal(false)}>
          <div className="card" style={{ width: '440px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--brown)' }}>Adicionar Inspiração</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select value={uploadForm.categoria} onChange={e => setUploadForm(p => ({ ...p, categoria: e.target.value }))} style={inputStyle}>
                  {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Título (opcional)</label>
                <input type="text" value={uploadForm.titulo} onChange={e => setUploadForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Sala de estar moderna" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea value={uploadForm.descricao} onChange={e => setUploadForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Notas sobre esta referência..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Fonte / URL (opcional)</label>
                <input type="text" value={uploadForm.fonte} onChange={e => setUploadForm(p => ({ ...p, fonte: e.target.value }))} placeholder="Ex: Pinterest, archdaily.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Imagens</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '24px',
                    border: '2px dashed var(--stone)',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--brown-light)'
                  }}
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
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImage.imagem_url}
            alt={lightboxImage.titulo || 'Inspiração'}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={e => e.stopPropagation()}
          />
          {(lightboxImage.titulo || lightboxImage.descricao) && (
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '12px 24px', borderRadius: '8px', color: 'white', textAlign: 'center', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
              {lightboxImage.titulo && <div style={{ fontSize: '14px', fontWeight: 600 }}>{lightboxImage.titulo}</div>}
              {lightboxImage.descricao && <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{lightboxImage.descricao}</div>}
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
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--brown-light)',
  marginBottom: '4px'
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--stone)',
  borderRadius: '8px',
  fontSize: '13px',
  background: 'var(--cream)',
  color: 'var(--brown)'
}
