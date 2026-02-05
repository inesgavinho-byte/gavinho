// =====================================================
// LINK PREVIEW COMPONENT
// Displays Open Graph preview cards for URLs
// =====================================================

import { memo, useState } from 'react'
import { ExternalLink, Image as ImageIcon, Globe, X } from 'lucide-react'

// LinkPreview component displays a rich preview card for a URL
const LinkPreview = memo(function LinkPreview({
  preview,
  loading = false,
  compact = false,
  onDismiss
}) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Don't render anything while loading or if no preview
  if (loading) {
    return (
      <div style={{
        marginTop: '10px',
        padding: '12px',
        background: 'var(--cream)',
        borderRadius: '8px',
        borderLeft: '3px solid var(--stone)',
        maxWidth: compact ? '280px' : '400px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '6px',
            background: 'var(--stone)',
            flexShrink: 0
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              height: '14px',
              width: '70%',
              background: 'var(--stone)',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              height: '10px',
              width: '90%',
              background: 'var(--stone)',
              borderRadius: '4px'
            }} />
          </div>
        </div>
      </div>
    )
  }

  if (!preview) return null

  const { url, domain, title, description, image, siteName } = preview

  // Compact mode for inline previews
  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--cream)',
          borderRadius: '6px',
          textDecoration: 'none',
          marginTop: '8px',
          maxWidth: '280px',
          border: '1px solid var(--stone)',
          transition: 'border-color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-olive)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--stone)'}
      >
        <Globe size={14} style={{ color: 'var(--brown-light)', flexShrink: 0 }} />
        <span style={{
          fontSize: '12px',
          color: 'var(--accent-olive)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {siteName || domain}
        </span>
        <ExternalLink size={12} style={{ color: 'var(--brown-light)', flexShrink: 0, marginLeft: 'auto' }} />
      </a>
    )
  }

  // Full preview card
  return (
    <div style={{
      marginTop: '10px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--stone)',
      background: 'var(--white)',
      maxWidth: '400px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: 'relative'
    }}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={(e) => { e.preventDefault(); onDismiss() }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 10,
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >
          <X size={14} />
        </button>
      )}

      {/* Preview image */}
      {image && !imageError && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block' }}
        >
          <div style={{
            position: 'relative',
            width: '100%',
            height: '160px',
            background: 'var(--stone)',
            overflow: 'hidden'
          }}>
            {!imageLoaded && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--cream)'
              }}>
                <ImageIcon size={32} style={{ color: 'var(--brown-light)', opacity: 0.3 }} />
              </div>
            )}
            <img
              src={image}
              alt=""
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: imageLoaded ? 'block' : 'none'
              }}
            />
          </div>
        </a>
      )}

      {/* Content */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          padding: '12px 14px',
          textDecoration: 'none',
          background: image && !imageError ? 'var(--white)' : 'var(--cream)',
          borderLeft: image && !imageError ? 'none' : '3px solid var(--accent-olive)'
        }}
      >
        {/* Site info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px'
        }}>
          <Globe size={12} style={{ color: 'var(--brown-light)' }} />
          <span style={{
            fontSize: '11px',
            color: 'var(--brown-light)',
            textTransform: 'lowercase'
          }}>
            {siteName || domain}
          </span>
        </div>

        {/* Title */}
        <h4 style={{
          margin: '0 0 4px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--brown)',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {title || domain}
        </h4>

        {/* Description */}
        {description && (
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--brown-light)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {description}
          </p>
        )}

        {/* URL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '8px'
        }}>
          <ExternalLink size={12} style={{ color: 'var(--accent-olive)' }} />
          <span style={{
            fontSize: '11px',
            color: 'var(--accent-olive)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {url.length > 50 ? url.substring(0, 50) + '...' : url}
          </span>
        </div>
      </a>
    </div>
  )
})

export default LinkPreview
