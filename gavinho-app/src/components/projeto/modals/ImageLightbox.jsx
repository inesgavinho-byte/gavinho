// =====================================================
// IMAGE LIGHTBOX
// Visualizador de imagens em tela cheia
// =====================================================

import { X, Pencil, Edit, CheckCircle } from 'lucide-react'

export default function ImageLightbox({
  image,
  onClose,
  onEditRender,
  onOpenMoleskine
}) {
  if (!image) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        cursor: 'zoom-out'
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(rgba(0,0,0,0.8), transparent)'
      }}>
        <div style={{ color: 'white' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{image.compartimento}</h3>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>
            v{image.versao} • {image.data_upload ? new Date(image.data_upload).toLocaleDateString('pt-PT') : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMoleskine(image) }}
            style={{
              padding: '8px 16px',
              background: '#8B8670',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Pencil size={14} /> Moleskine
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEditRender(image) }}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Edit size={14} /> Editar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{
              padding: '8px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Imagem */}
      <img
        src={image.imagem_url}
        alt={image.compartimento}
        style={{
          maxWidth: '95vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: '8px'
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Descrição (se existir) */}
      {image.descricao && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: '8px',
          maxWidth: '80vw',
          textAlign: 'center',
          fontSize: '13px'
        }}>
          {image.descricao}
        </div>
      )}

      {/* Badge Final */}
      {image.is_final && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          padding: '8px 16px',
          background: 'var(--success)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <CheckCircle size={14} /> Imagem Final
        </div>
      )}
    </div>
  )
}
