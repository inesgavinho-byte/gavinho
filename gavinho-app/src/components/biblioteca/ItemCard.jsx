import { useState } from 'react'
import {
  Edit, Trash2, Image, Box, Layers, Eye, Download,
  ExternalLink, Heart, MoreVertical
} from 'lucide-react'

export default function ItemCard({ item, type, tags, categorias, onEdit, onDelete, onPreview, onToggleFavorite, fixedHeight }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const imageUrl = type === 'materiais' ? item.textura_url :
                   type === 'modelos3d' ? item.miniatura_url : item.imagem_url

  const downloadUrl = type === 'materiais' ? (item.ficha_tecnica_url || item.textura_url) :
                      type === 'modelos3d' ? (item.ficheiro_url || item.miniatura_url) : item.imagem_url

  const handleDownload = async (e) => {
    e.stopPropagation()
    if (!downloadUrl) return
    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = downloadUrl.split('.').pop()?.split('?')[0] || 'file'
      a.download = `${item.nome || 'download'}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      window.open(downloadUrl, '_blank')
    }
  }

  const categoria = categorias.find(c => c.id === item.categoria_id)
  const itemTags = tags.filter(t => item.tags?.includes(t.id))

  return (
    <div className="bib-pin-card">
      {/* Image */}
      <div
        onClick={onPreview}
        className="bib-pin-image-wrap"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.nome || ''}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: fixedHeight ? '180px' : 'auto',
              objectFit: fixedHeight ? 'cover' : undefined,
              display: 'block',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        ) : (
          <div style={{
            height: fixedHeight ? '180px' : '140px',
            background: 'linear-gradient(135deg, var(--cream) 0%, var(--stone) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ color: 'var(--brown-light)', textAlign: 'center' }}>
              {type === 'materiais' ? <Layers size={32} /> : type === 'modelos3d' ? <Box size={32} /> : <Image size={32} />}
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Sem imagem</div>
            </div>
          </div>
        )}

        {imageUrl && !imgLoaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Layers size={24} style={{ color: 'var(--stone)', opacity: 0.5 }} />
          </div>
        )}

        <div className="bib-pin-overlay">
          <button className="bib-pin-overlay-btn" onClick={(e) => { e.stopPropagation() }}>
            <Eye size={18} style={{ color: 'var(--brown)' }} />
          </button>
          {downloadUrl && (
            <button
              className="bib-pin-overlay-btn"
              onClick={(e) => { e.stopPropagation(); handleDownload(e) }}
            >
              <Download size={18} style={{ color: 'var(--brown)' }} />
            </button>
          )}
        </div>

        {type === 'inspiracao' && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.() }}
            className="bib-pin-fav-btn"
          >
            <Heart
              size={20}
              fill={item.favorito ? '#e25555' : 'rgba(255,255,255,0.6)'}
              style={{ color: item.favorito ? '#e25555' : 'white' }}
            />
          </button>
        )}

        {type === 'inspiracao' && item.link_original && (
          <a
            href={item.link_original}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="bib-pin-ext-link"
          >
            <ExternalLink size={13} style={{ color: 'var(--brown)' }} />
          </a>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)', marginBottom: '1px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {item.nome || '(sem nome)'}
            </div>
            {categoria && (
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{categoria.nome}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0px', flexShrink: 0 }}>
            {downloadUrl && (
              <button
                onClick={handleDownload}
                title="Download"
                className="bib-pin-action-btn"
              >
                <Download size={14} style={{ color: 'var(--brown-light)' }} />
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="bib-pin-action-btn"
              >
                <MoreVertical size={15} style={{ color: 'var(--brown-light)' }} />
              </button>
              {menuOpen && (
                <div className="bib-pin-menu">
                  {downloadUrl && (
                    <button onClick={(e) => { handleDownload(e); setMenuOpen(false) }} className="bib-pin-menu-item">
                      <Download size={14} /> Download
                    </button>
                  )}
                  <button onClick={() => { onEdit(); setMenuOpen(false) }} className="bib-pin-menu-item">
                    <Edit size={14} /> Editar
                  </button>
                  <button onClick={() => { onDelete(); setMenuOpen(false) }} className="bib-pin-menu-item" style={{ color: 'var(--error)' }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {type === 'materiais' && (item.fornecedor || item.preco_m2) && (
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>
            {item.fornecedor && <span>{item.fornecedor}</span>}
            {item.fornecedor && item.preco_m2 && <span> · </span>}
            {item.preco_m2 && <span style={{ color: 'var(--brown)', fontWeight: 500 }}>€{item.preco_m2}/m²</span>}
          </div>
        )}

        {type === 'modelos3d' && (item.formato || (item.largura_cm && item.altura_cm)) && (
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>
            {item.formato && <span style={{ background: 'var(--stone)', padding: '1px 5px', borderRadius: '4px', marginRight: '5px', fontSize: '10px' }}>{item.formato}</span>}
            {item.largura_cm && item.altura_cm && item.profundidade_cm && (
              <span>{item.largura_cm}×{item.altura_cm}×{item.profundidade_cm}cm</span>
            )}
          </div>
        )}

        {type === 'inspiracao' && item.fonte && (
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>
            {item.fonte}
          </div>
        )}

        {itemTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
            {itemTags.slice(0, 3).map(tag => (
              <span key={tag.id} style={{
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                background: tag.cor + '20',
                color: tag.cor || 'var(--brown)',
                fontWeight: 500,
              }}>
                {tag.nome}
              </span>
            ))}
            {itemTags.length > 3 && (
              <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>+{itemTags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
