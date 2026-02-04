// =====================================================
// EMOJI PICKER COMPONENT
// Seletor de emojis organizado por categorias
// =====================================================

import { X } from 'lucide-react'
import { EMOJI_CATEGORIES } from '../../utils/constants'

export default function EmojiPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  position = { top: 'auto', bottom: '100%', left: 0 },
  activeCategory = 'Frequentes',
  onCategoryChange
}) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        ...position,
        background: 'var(--white)',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        border: '1px solid var(--stone)',
        width: '320px',
        zIndex: 1000
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header with categories */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid var(--stone)',
        overflowX: 'auto'
      }}>
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => onCategoryChange?.(cat.name)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeCategory === cat.name ? 'var(--accent-olive)' : 'transparent',
              color: activeCategory === cat.name ? 'white' : 'var(--brown-light)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            padding: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--brown-light)'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Emoji Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
        padding: '12px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {EMOJI_CATEGORIES.find(cat => cat.name === activeCategory)?.emojis.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => onSelectEmoji(emoji)}
            style={{
              padding: '6px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.target.style.background = 'var(--cream)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
