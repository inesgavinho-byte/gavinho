// =====================================================
// KEYBOARD SHORTCUTS MODAL
// Modal que mostra os atalhos de teclado disponíveis
// =====================================================

import { Keyboard, X } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from '../../utils/constants'

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          padding: '24px',
          width: '400px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--brown)'
          }}>
            <Keyboard size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Atalhos de Teclado
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--brown)' }}>
                {shortcut.description}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {shortcut.keys.map((key, kidx) => (
                  <span
                    key={kidx}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--cream)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      border: '1px solid var(--stone)'
                    }}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
