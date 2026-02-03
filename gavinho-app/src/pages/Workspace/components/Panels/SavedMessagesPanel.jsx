// =====================================================
// SAVED MESSAGES PANEL
// Painel lateral de mensagens guardadas/favoritas
// =====================================================

import { Bookmark, BookmarkCheck, X } from 'lucide-react'
import { formatDateTime, getInitials } from '../../utils/formatters'

export default function SavedMessagesPanel({
  isOpen,
  savedMessages,
  onClose,
  onUnsaveMessage,
  onNavigateToMessage
}) {
  if (!isOpen) return null

  return (
    <div style={{
      width: '320px',
      background: 'var(--white)',
      borderRight: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookmarkCheck size={20} style={{ color: 'var(--accent-olive)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
            Mensagens Guardadas
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--brown-light)'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {savedMessages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--brown-light)'
          }}>
            <Bookmark size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              Nenhuma mensagem guardada
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.7 }}>
              Clica no ícone de bookmark nas mensagens para guardar
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  padding: '12px',
                  background: 'var(--cream)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => onNavigateToMessage(msg)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--brown-dark)'
                  }}>
                    {getInitials(msg.autor?.nome)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                      {msg.autor?.nome}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                      {formatDateTime(msg.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUnsaveMessage(msg)
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--warning)'
                    }}
                  >
                    <BookmarkCheck size={14} />
                  </button>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--brown)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {msg.conteudo}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
