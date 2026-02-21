import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Camera, Upload, X, ChevronLeft, ChevronRight, Trash2, MapPin, Download
} from 'lucide-react'
import { colors } from '../constants'
import { FONTS, FONT_SIZES } from '../../../styles/designTokens'

// ── Estilos ─────────────────────────────────────────
const S = {
  card: { background: '#FFFFFF', borderRadius: 10, border: `1px solid ${colors.border}`, padding: 20 },
  btn: { padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONTS.body, border: 'none' },
  btnPrimary: { background: '#1a1a1a', color: '#fff' },
  btnSecondary: { background: 'transparent', border: '1px solid #ADAA96', color: '#1a1a1a' },
  select: { padding: '8px 12px', borderRadius: 6, border: '1px solid #ADAA96', fontSize: 13, fontFamily: FONTS.body, background: '#fff', color: '#2C2C2B' },
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FONT_SIZES.xs, fontWeight: 600, color: '#8B8670', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, fontFamily: FONTS.body },
  input: { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ADAA96', fontSize: 13, fontFamily: FONTS.body, boxSizing: 'border-box' },
}

export default function FotografiasSubtab({ obraUuid, obra, currentUser }) {
  // ── State ─────────────────────────────────────
  const [fotos, setFotos] = useState([])
  const [zonas, setZonas] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroZona, setFiltroZona] = useState('')
  const [filtroEspec, setFiltroEspec] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', data_fotografia: new Date().toISOString().split('T')[0], files: [] })
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fileInputRef = useRef(null)

  // ── Load Data ─────────────────────────────────
  const loadFotos = useCallback(async () => {
    if (!obraUuid) return
    setLoading(true)
    try {
      const [fotosRes, diarioRes, zonasRes, especRes] = await Promise.all([
        supabase.from('obra_fotografias')
          .select('*, obra_zonas(nome), especialidades(nome, cor)')
          .eq('obra_id', obraUuid)
          .order('data_fotografia', { ascending: false })
          .then(r => r.error?.code === '42P01' ? { data: [], error: null } : r),
        supabase.from('obra_diario')
          .select('id, data, fotos, atividades, status')
          .eq('obra_id', obraUuid)
          .order('data', { ascending: false }),
        supabase.from('obra_zonas')
          .select('id, nome, piso')
          .eq('obra_id', obraUuid)
          .order('nome'),
        supabase.from('especialidades')
          .select('id, nome, cor, categoria')
          .eq('ativo', true)
          .order('ordem'),
      ])
      if (fotosRes.error) throw fotosRes.error

      // Merge diary photos into the list
      const diarioFotos = extractDiaryPhotos(diarioRes.data || [], obraUuid)
      const merged = mergeAndDedupe(fotosRes.data || [], diarioFotos)
      setFotos(merged)

      setZonas(zonasRes.data || [])
      const seen = new Set()
      setEspecialidades((especRes.data || []).filter(e => { if (seen.has(e.nome)) return false; seen.add(e.nome); return true }))
    } catch (err) {
      console.error('FotografiasSubtab loadFotos:', err)
    } finally {
      setLoading(false)
    }
  }, [obraUuid])

  useEffect(() => { loadFotos() }, [loadFotos])

  // ── Upload ────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadForm.files.length || !obraUuid) return
    setUploading(true)
    try {
      for (const file of uploadForm.files) {
        const ext = file.name.split('.').pop()
        const fileName = `${obraUuid}/fotos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('obras').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(fileName)

        const { error: insertErr } = await supabase.from('obra_fotografias').insert({
          obra_id: obraUuid,
          url: urlData.publicUrl,
          filename: file.name,
          titulo: uploadForm.titulo || null,
          descricao: uploadForm.descricao || null,
          zona_id: uploadForm.zona_id || null,
          especialidade_id: uploadForm.especialidade_id || null,
          data_fotografia: uploadForm.data_fotografia || new Date().toISOString().split('T')[0],
        })
        if (insertErr) throw insertErr
      }
      setShowUploadModal(false)
      setUploadForm({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', data_fotografia: new Date().toISOString().split('T')[0], files: [] })
      loadFotos()
    } catch (err) {
      console.error('Erro upload:', err)
      alert('Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Delete ────────────────────────────────────
  const handleDelete = async (foto) => {
    if (foto.source === 'diario') {
      alert('Esta foto pertence ao Diário de Obra. Elimine-a a partir do diário.')
      return
    }
    if (!confirm('Eliminar esta fotografia?')) return
    try {
      const path = foto.url.split('/obras/')[1]
      if (path) await supabase.storage.from('obras').remove([path])
      await supabase.from('obra_fotografias').delete().eq('id', foto.id)
      setLightboxIndex(null)
      loadFotos()
    } catch (err) {
      console.error('Erro delete foto:', err)
    }
  }

  // ── Filter + Group ────────────────────────────
  const filtered = fotos.filter(f => {
    if (filtroZona && f.zona_id !== filtroZona) return false
    if (filtroEspec && f.especialidade_id !== filtroEspec) return false
    return true
  })

  const grouped = groupByDate(filtered)

  // ── Lightbox keyboard nav ─────────────────────
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, filtered.length - 1))
      if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, filtered.length])

  // ── Render ────────────────────────────────────
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><div className="spinner" /></div>
  }

  const lightboxFoto = lightboxIndex !== null ? filtered[lightboxIndex] : null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: FONT_SIZES.sm, color: '#B0ADA3', marginBottom: 8, fontFamily: FONTS.body }}>
        Obras &rsaquo; {obra?.codigo || '—'} &rsaquo; <span style={{ color: '#6B6B6B' }}>Fotografias</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: FONT_SIZES['3xl'], fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.heading, lineHeight: 1.2 }}>
          {obra?.nome || 'Obra'}
        </h2>
        {obra?.localizacao && (
          <div style={{ fontSize: FONT_SIZES.base, color: '#8B8670', fontFamily: FONTS.body, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} style={{ opacity: 0.5 }} /> {obra.localizacao}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} style={S.select}>
          <option value="">Todas as zonas</option>
          {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
        </select>
        <select value={filtroEspec} onChange={e => setFiltroEspec(e.target.value)} style={S.select}>
          <option value="">Todas as especialidades</option>
          {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowUploadModal(true)} style={{ ...S.btn, ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> Upload Fotos
        </button>
      </div>

      {/* Counter */}
      <div style={{ fontSize: FONT_SIZES.sm, color: '#8B8670', marginBottom: 16, fontFamily: FONTS.body }}>
        {filtered.length} fotografia{filtered.length !== 1 ? 's' : ''} · {grouped.length} data{grouped.length !== 1 ? 's' : ''}
      </div>

      {/* Timeline Gallery */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, ...S.card }}>
          <Camera size={48} style={{ color: '#B0ADA3', opacity: 0.4, marginBottom: 16 }} />
          <p style={{ color: '#8B8670', fontSize: FONT_SIZES.base, fontFamily: FONTS.body }}>Sem fotografias</p>
          <button onClick={() => setShowUploadModal(true)} style={{ ...S.btn, ...S.btnPrimary, marginTop: 8 }}>
            <Upload size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Carregar fotos
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(group => (
            <div key={group.date}>
              {/* Date header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A8B6E', flexShrink: 0 }} />
                <span style={{ fontSize: FONT_SIZES.md, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.body }}>
                  {group.date !== 'sem-data' ? new Date(group.date + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sem data'}
                </span>
                <span style={{ fontSize: FONT_SIZES.sm, color: '#B0ADA3', fontFamily: FONTS.body }}>{group.fotos.length} foto{group.fotos.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Photo grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, paddingLeft: 18 }}>
                {group.fotos.map(foto => (
                  <div key={foto.id} onClick={() => { const idx = filtered.findIndex(f => f.id === foto.id); if (idx !== -1) setLightboxIndex(idx) }}
                    style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: '#F2F0E7' }}>
                    <img src={foto.url} alt={foto.titulo || ''} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {foto.source === 'diario' && (
                      <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', borderRadius: 4, background: 'rgba(44,44,43,0.7)', color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: FONTS.body }}>Diário</div>
                    )}
                    {foto.especialidades?.nome && (
                      <div style={{ position: 'absolute', bottom: 6, left: 6, padding: '2px 8px', borderRadius: 4, background: `${foto.especialidades.cor || '#8B8670'}CC`, color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: FONTS.body }}>{foto.especialidades.nome}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────── */}
      {lightboxFoto && (
        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.92)', zIndex: 2000, flexDirection: 'column' }}
          onClick={() => setLightboxIndex(null)}>
          {/* Top bar */}
          <div style={{ width: '100%', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={e => e.stopPropagation()}>
            <span style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.body }}>{lightboxIndex + 1} de {filtered.length}</span>
            <button onClick={() => setLightboxIndex(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          {/* Image area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 60px', minHeight: 0 }}
            onClick={e => e.stopPropagation()}>
            {lightboxIndex > 0 && (
              <button onClick={() => setLightboxIndex(i => i - 1)} style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={24} color="#fff" />
              </button>
            )}
            <img src={lightboxFoto.url} alt={lightboxFoto.titulo || ''}
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 180px)', objectFit: 'contain', borderRadius: 4 }} />
            {lightboxIndex < filtered.length - 1 && (
              <button onClick={() => setLightboxIndex(i => i + 1)} style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={24} color="#fff" />
              </button>
            )}
          </div>
          {/* Bottom info */}
          <div style={{ width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: FONTS.body }}>{lightboxFoto.titulo || lightboxFoto.filename || 'Fotografia'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: FONTS.body, marginTop: 2 }}>
                {lightboxFoto.data_fotografia && new Date(lightboxFoto.data_fotografia + 'T12:00:00').toLocaleDateString('pt-PT')}
                {lightboxFoto.obra_zonas?.nome && ` · ${lightboxFoto.obra_zonas.nome}`}
                {lightboxFoto.especialidades?.nome && ` · ${lightboxFoto.especialidades.nome}`}
                {lightboxFoto.source === 'diario' && ' · Diário'}
              </div>
              {lightboxFoto.descricao && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: FONTS.body, marginTop: 2 }}>{lightboxFoto.descricao}</div>}
            </div>
            <button onClick={() => { const a = document.createElement('a'); a.href = lightboxFoto.url; a.download = lightboxFoto.filename || 'foto'; a.click() }}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
              <Download size={18} color="#fff" />
            </button>
            <button onClick={() => handleDelete(lightboxFoto)}
              style={{ background: 'rgba(154,107,91,0.3)', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
              <Trash2 size={18} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* ── Upload Modal ─────────────────────── */}
      {showUploadModal && (
        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowUploadModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: FONT_SIZES.lg, fontWeight: 600, color: '#2C2C2B', fontFamily: FONTS.heading }}>Upload de Fotografias</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8670' }}><X size={20} /></button>
            </div>

            {/* File picker */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => setUploadForm(f => ({ ...f, files: Array.from(e.target.files) }))} />
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', padding: 24, border: '2px dashed #ADAA96', borderRadius: 8, background: '#F2F0E7', cursor: 'pointer', textAlign: 'center', marginBottom: 16 }}>
              <Camera size={24} style={{ color: '#8B8670', marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: '#8B8670', fontFamily: FONTS.body }}>
                {uploadForm.files.length > 0
                  ? `${uploadForm.files.length} ficheiro${uploadForm.files.length > 1 ? 's' : ''} seleccionado${uploadForm.files.length > 1 ? 's' : ''}`
                  : 'Clique para seleccionar imagens'}
              </div>
            </button>

            {/* Data */}
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>Data</div>
              <input type="date" value={uploadForm.data_fotografia}
                onChange={e => setUploadForm(f => ({ ...f, data_fotografia: e.target.value }))}
                style={S.input} />
            </div>

            {/* Titulo */}
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>Título</div>
              <input type="text" placeholder="Título (opcional)" value={uploadForm.titulo}
                onChange={e => setUploadForm(f => ({ ...f, titulo: e.target.value }))}
                style={S.input} />
            </div>

            {/* Descricao */}
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>Descrição</div>
              <textarea placeholder="Descrição (opcional)" value={uploadForm.descricao} rows={2}
                onChange={e => setUploadForm(f => ({ ...f, descricao: e.target.value }))}
                style={{ ...S.input, resize: 'vertical' }} />
            </div>

            {/* Zona + Especialidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={S.label}>Zona</div>
                <select value={uploadForm.zona_id} onChange={e => setUploadForm(f => ({ ...f, zona_id: e.target.value }))} style={{ ...S.select, width: '100%' }}>
                  <option value="">— Nenhuma —</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                </select>
              </div>
              <div>
                <div style={S.label}>Especialidade</div>
                <select value={uploadForm.especialidade_id} onChange={e => setUploadForm(f => ({ ...f, especialidade_id: e.target.value }))} style={{ ...S.select, width: '100%' }}>
                  <option value="">— Nenhuma —</option>
                  {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowUploadModal(false)} style={{ ...S.btn, ...S.btnSecondary }}>Cancelar</button>
              <button onClick={handleUpload} disabled={!uploadForm.files.length || uploading}
                style={{ ...S.btn, ...S.btnPrimary, opacity: (!uploadForm.files.length || uploading) ? 0.5 : 1 }}>
                {uploading ? 'A carregar...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────

function extractDiaryPhotos(entries, obraUuid) {
  const photos = []
  for (const entry of entries) {
    if (Array.isArray(entry.fotos)) {
      entry.fotos.forEach((url, i) => {
        if (!url || typeof url !== 'string') return
        photos.push({
          id: `diario-${entry.id}-g${i}`, url, filename: url.split('/').pop() || 'foto_diario',
          titulo: `Diário ${entry.data}`, data_fotografia: entry.data, obra_id: obraUuid,
          source: 'diario', diario_entry_id: entry.id,
        })
      })
    }
    if (Array.isArray(entry.atividades)) {
      entry.atividades.forEach((ativ, ai) => {
        if (!Array.isArray(ativ.fotos)) return
        ativ.fotos.forEach((url, fi) => {
          if (!url || typeof url !== 'string') return
          photos.push({
            id: `diario-${entry.id}-a${ai}f${fi}`, url, filename: url.split('/').pop() || 'foto_atividade',
            titulo: ativ.descricao || ativ.especialidade_nome || `Atividade ${entry.data}`,
            descricao: ativ.zona ? `Zona: ${ativ.zona}` : null,
            data_fotografia: entry.data, obra_id: obraUuid, source: 'diario',
            diario_entry_id: entry.id,
            _especialidade_nome: ativ.especialidade_nome || null,
            _zona_nome: ativ.zona || null,
          })
        })
      })
    }
  }
  return photos
}

function mergeAndDedupe(dbFotos, diaryFotos) {
  const seenUrls = new Set()
  const all = []
  for (const f of dbFotos) { seenUrls.add(f.url); all.push(f) }
  for (const f of diaryFotos) { if (!seenUrls.has(f.url)) { seenUrls.add(f.url); all.push(f) } }
  all.sort((a, b) => (a.data_fotografia || '').localeCompare(b.data_fotografia || ''))
  return all
}

function groupByDate(fotos) {
  const groups = {}
  fotos.forEach(f => {
    const key = f.data_fotografia || 'sem-data'
    if (!groups[key]) groups[key] = []
    groups[key].push(f)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, fotos]) => ({ date, fotos }))
}
