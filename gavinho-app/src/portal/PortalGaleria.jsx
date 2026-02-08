import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, X, ChevronLeft, ChevronRight, Calendar, MapPin, ZoomIn } from 'lucide-react'

export default function PortalGaleria() {
  const { config, t } = usePortal()
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroZona, setFiltroZona] = useState('todas')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [lightbox, setLightbox] = useState(null)
  const [zonas, setZonas] = useState([])

  useEffect(() => {
    loadFotos()
  }, [config])

  const loadFotos = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const { data, error } = await supabase
        .from('obra_fotografias')
        .select('id, url, titulo, descricao, legenda_portal, portal_tipo, data_fotografia, created_at, zona_id')
        .eq('publicar_no_portal', true)
        .order('data_fotografia', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setLoading(false); return }
        throw error
      }

      setFotos(data || [])

      // Extract unique zones
      const uniqueZonas = [...new Set((data || []).filter(f => f.zona_id).map(f => f.zona_id))]
      setZonas(uniqueZonas)
    } catch (err) {
      console.error('Gallery error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = fotos.filter(f => {
    if (filtroZona !== 'todas' && f.zona_id !== filtroZona) return false
    if (filtroTipo !== 'todos' && f.portal_tipo !== filtroTipo) return false
    return true
  })

  // Group by month
  const grouped = filtered.reduce((acc, foto) => {
    const date = foto.data_fotografia || foto.created_at
    const key = date ? new Date(date).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : 'Sem data'
    if (!acc[key]) acc[key] = []
    acc[key].push(foto)
    return acc
  }, {})

  const openLightbox = (foto) => {
    setLightbox(foto)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightbox(null)
    document.body.style.overflow = ''
  }

  const navigateLightbox = useCallback((dir) => {
    if (!lightbox) return
    const idx = filtered.findIndex(f => f.id === lightbox.id)
    const next = idx + dir
    if (next >= 0 && next < filtered.length) {
      setLightbox(filtered[next])
    }
  }, [lightbox, filtered])

  useEffect(() => {
    const handleKey = (e) => {
      if (!lightbox) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'ArrowRight') navigateLightbox(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox, navigateLightbox])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={S.h1}>{t('gallery')}</h1>
        <p style={{ fontSize: '14px', color: '#8B8670', marginTop: '4px' }}>
          {fotos.length} {fotos.length === 1 ? 'fotografia' : 'fotografias'}
        </p>
      </div>

      {/* Filters */}
      {fotos.length > 0 && (
        <div style={S.filters}>
          <div style={S.filterGroup}>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={S.select}
            >
              <option value="todos">Todas</option>
              <option value="destaque">Destaques</option>
              <option value="antes">Antes</option>
              <option value="depois">Depois</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          {zonas.length > 1 && (
            <div style={S.filterGroup}>
              <select
                value={filtroZona}
                onChange={e => setFiltroZona(e.target.value)}
                style={S.select}
              >
                <option value="todas">Todas as zonas</option>
                {zonas.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Gallery Grid */}
      {Object.keys(grouped).length === 0 ? (
        <div style={S.empty}>
          <p style={{ color: '#8B8670', fontSize: '14px' }}>Ainda não existem fotografias publicadas.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, photos]) => (
          <div key={month} style={{ marginBottom: '32px' }}>
            <div style={S.monthHeader}>
              <Calendar size={14} style={{ color: '#ADAA96' }} />
              <span>{month.charAt(0).toUpperCase() + month.slice(1)}</span>
            </div>
            <div style={S.grid}>
              {photos.map(foto => (
                <button
                  key={foto.id}
                  onClick={() => openLightbox(foto)}
                  style={S.thumbBtn}
                >
                  <img
                    src={foto.url}
                    alt={foto.legenda_portal || foto.titulo || ''}
                    style={S.thumbImg}
                    loading="lazy"
                  />
                  <div style={S.thumbOverlay}>
                    <ZoomIn size={20} style={{ color: '#FFFFFF' }} />
                  </div>
                  {foto.portal_tipo && foto.portal_tipo !== 'normal' && (
                    <div style={{
                      ...S.badge,
                      background: foto.portal_tipo === 'destaque' ? '#F59E0B' :
                                  foto.portal_tipo === 'antes' ? '#8B8670' : '#10B981'
                    }}>
                      {foto.portal_tipo === 'destaque' ? '★' : foto.portal_tipo === 'antes' ? 'Antes' : 'Depois'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={S.lightboxOverlay} onClick={closeLightbox}>
          <div style={S.lightboxContent} onClick={e => e.stopPropagation()}>
            <button onClick={closeLightbox} style={S.lightboxClose}>
              <X size={24} />
            </button>

            <button
              onClick={() => navigateLightbox(-1)}
              style={{ ...S.lightboxNav, left: '16px' }}
              disabled={filtered.findIndex(f => f.id === lightbox.id) === 0}
            >
              <ChevronLeft size={28} />
            </button>

            <img
              src={lightbox.url}
              alt={lightbox.legenda_portal || lightbox.titulo || ''}
              style={S.lightboxImg}
            />

            <button
              onClick={() => navigateLightbox(1)}
              style={{ ...S.lightboxNav, right: '16px' }}
              disabled={filtered.findIndex(f => f.id === lightbox.id) === filtered.length - 1}
            >
              <ChevronRight size={28} />
            </button>

            {(lightbox.legenda_portal || lightbox.titulo) && (
              <div style={S.lightboxCaption}>
                <p style={{ margin: 0, fontSize: '15px', color: '#FFFFFF' }}>
                  {lightbox.legenda_portal || lightbox.titulo}
                </p>
                {lightbox.data_fotografia && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {new Date(lightbox.data_fotografia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const S = {
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 500,
    color: '#2D2B28',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterGroup: { position: 'relative' },
  select: {
    padding: '8px 32px 8px 12px',
    border: '1px solid #E8E6DF',
    borderRadius: '8px',
    background: '#FFFFFF',
    fontSize: '13px',
    color: '#2D2B28',
    cursor: 'pointer',
    fontFamily: "'Quattrocento Sans', sans-serif",
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B8670' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
  },
  monthHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#8B8670',
    marginBottom: '12px',
    textTransform: 'capitalize',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
  },
  thumbBtn: {
    position: 'relative',
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    borderRadius: '8px',
    overflow: 'hidden',
    aspectRatio: '4/3',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.3s ease',
  },
  thumbOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    opacity: 0,
  },
  badge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#FFFFFF',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
  },
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    zIndex: 10,
    padding: '8px',
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '4px',
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: '12px 8px',
    borderRadius: '8px',
    zIndex: 10,
    transition: 'background 0.2s',
  },
  lightboxCaption: {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    maxWidth: '600px',
    padding: '12px 20px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '8px',
    backdropFilter: 'blur(8px)',
  },
}
