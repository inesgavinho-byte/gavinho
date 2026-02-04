// =====================================================
// IMAGE LIGHTBOX
// Visualizador de imagens em tela cheia com navegação
// =====================================================

import { useEffect, useCallback } from 'react'
import { X, Pencil, Edit, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ImageLightbox({
  image,
  images = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onEditRender,
  onOpenMoleskine
}) {
  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowLeft' && onNavigate && currentIndex > 0) {
      onNavigate(-1)
    } else if (e.key === 'ArrowRight' && onNavigate && currentIndex < images.length - 1) {
      onNavigate(1)
    }
  }, [onClose, onNavigate, currentIndex, images.length])

  useEffect(() => {
    if (image) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [image, handleKeyDown])

  if (!image) return null

  const showNavigation = images.length > 1 && onNavigate
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < images.length - 1

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
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            {image.compartimento}
            {image.vista && <span style={{ fontWeight: 400, opacity: 0.7 }}> • {image.vista}</span>}
          </h3>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>
            v{image.versao} • {image.data_upload ? new Date(image.data_upload).toLocaleDateString('pt-PT') : ''}
            {showNavigation && (
              <span style={{ marginLeft: '12px' }}>
                {currentIndex + 1} / {images.length}
              </span>
            )}
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

      {/* Navigation Arrows */}
      {showNavigation && (
        <>
          {/* Previous Button */}
          <button
            onClick={(e) => { e.stopPropagation(); if (canGoPrev) onNavigate(-1) }}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '16px',
              background: canGoPrev ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: canGoPrev ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '50%',
              cursor: canGoPrev ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            disabled={!canGoPrev}
            title="Anterior (←)"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); if (canGoNext) onNavigate(1) }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '16px',
              background: canGoNext ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: canGoNext ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '50%',
              cursor: canGoNext ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            disabled={!canGoNext}
            title="Próxima (→)"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Imagem */}
      <img
        src={image.imagem_url}
        alt={image.compartimento}
        style={{
          maxWidth: '85vw',
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

      {/* Image Thumbnails (when multiple images) */}
      {showNavigation && images.length <= 10 && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '8px'
        }}>
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={(e) => { e.stopPropagation(); onNavigate(idx - currentIndex) }}
              style={{
                width: '48px',
                height: '32px',
                borderRadius: '4px',
                background: `url(${img.imagem_url}) center/cover`,
                border: idx === currentIndex ? '2px solid white' : '2px solid transparent',
                opacity: idx === currentIndex ? 1 : 0.6,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`${img.compartimento} v${img.versao}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
