// =====================================================
// MESSAGE INPUT COMPONENT
// Message composition area with formatting, files, emoji, mentions
// =====================================================

import { useRef } from 'react'
import {
  Paperclip, Smile, AtSign, Send, X, CornerUpLeft,
  Bold, Italic, Code, FileCode, List, ListOrdered, Link2, Keyboard, FileText
} from 'lucide-react'

import { EMOJI_CATEGORIES } from '../../utils/constants'
import { getInitials } from '../../utils/formatters'

export default function MessageInput({
  messageInput,
  setMessageInput,
  onSend,
  selectedFiles = [],
  onFileSelect,
  onRemoveFile,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiCategory = 'Frequentes',
  setEmojiCategory,
  onInsertEmoji,
  showMentions,
  setShowMentions,
  filteredMembros = [],
  onInsertMention,
  onMentionTrigger,
  replyingTo,
  onCancelReply,
  showFormattingToolbar,
  onApplyFormatting,
  onShowKeyboardShortcuts,
  uploading,
  messageInputRef: externalInputRef,
  typingUsers = [],
  handleMessageChange
}) {
  // Use external ref if provided, otherwise create internal one
  const internalInputRef = useRef(null)
  const messageInputRef = externalInputRef || internalInputRef
  const fileInputRef = useRef(null)

  // Handle file selection
  const handleFileSelect = (e) => {
    if (onFileSelect) {
      onFileSelect(e)
    }
  }

  // Handle mention button click
  const handleMentionClick = () => {
    if (onMentionTrigger) {
      onMentionTrigger()
    } else {
      const input = messageInputRef.current
      if (input) {
        const pos = input.selectionStart
        const newValue = messageInput.substring(0, pos) + '@' + messageInput.substring(pos)
        setMessageInput(newValue)
        setShowMentions?.(true)
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = pos + 1
          input.focus()
        }, 0)
      }
    }
  }

  // Handle keydown in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault()
      onSend?.()
    }
    if (e.key === 'Escape') {
      setShowEmojiPicker?.(false)
      setShowMentions?.(false)
    }
  }

  // Handle blur on textarea
  const handleBlur = () => {
    // Delay to allow click on mention item
    setTimeout(() => setShowMentions?.(false), 150)
  }

  return (
    <div style={{
      padding: '16px 24px',
      borderTop: '1px solid var(--stone)',
      background: 'var(--white)'
    }}>
      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          marginBottom: '10px',
          fontSize: '12px',
          color: 'var(--brown-light)'
        }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--brown-light)',
              animation: 'bounce 1.4s ease-in-out infinite'
            }} />
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--brown-light)',
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: '0.2s'
            }} />
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--brown-light)',
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: '0.4s'
            }} />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} esta a escrever...`
              : `${typingUsers.slice(0, 2).join(', ')} estao a escrever...`}
          </span>
        </div>
      )}

      {/* Formatting Toolbar */}
      {showFormattingToolbar && (
        <div style={{
          display: 'flex',
          gap: '2px',
          marginBottom: '10px',
          padding: '6px 8px',
          background: 'var(--cream)',
          borderRadius: '8px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => onApplyFormatting?.('bold')}
            title="Negrito (Ctrl+B)"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => onApplyFormatting?.('italic')}
            title="Italico (Ctrl+I)"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => onApplyFormatting?.('code')}
            title="Codigo inline (Ctrl+Shift+C)"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Code size={16} />
          </button>
          <button
            onClick={() => onApplyFormatting?.('codeblock')}
            title="Bloco de codigo"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FileCode size={16} />
          </button>
          <div style={{ width: '1px', height: '20px', background: 'var(--stone)', margin: '0 6px' }} />
          <button
            onClick={() => onApplyFormatting?.('list')}
            title="Lista"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => onApplyFormatting?.('numbered')}
            title="Lista numerada"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => onApplyFormatting?.('link')}
            title="Inserir link"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Link2 size={16} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onShowKeyboardShortcuts}
            title="Atalhos de teclado (?)"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'transparent',
              border: '1px solid var(--stone)',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Keyboard size={12} />
            Atalhos
          </button>
        </div>
      )}

      {/* Reply-to quote */}
      {replyingTo && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px 14px',
          background: 'var(--cream)',
          borderRadius: '10px',
          borderLeft: '4px solid var(--accent-olive)',
          marginBottom: '12px'
        }}>
          <CornerUpLeft size={18} style={{ color: 'var(--accent-olive)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-olive)', marginBottom: '4px' }}>
              A responder a {replyingTo.autor?.nome}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--brown)',
              opacity: 0.8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {replyingTo.conteudo?.substring(0, 150)}{replyingTo.conteudo?.length > 150 ? '...' : ''}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--stone)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {selectedFiles.map((file, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  background: 'var(--cream)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  <FileText size={24} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontSize: '9px', color: 'var(--brown-light)', maxWidth: '70px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {file.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => onRemoveFile?.(idx)}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        background: 'var(--cream)',
        borderRadius: '12px',
        padding: '12px 16px',
        border: '1px solid var(--stone)'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Paperclip size={20} />
          </button>
          {/* Emoji Picker Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPicker?.(!showEmojiPicker)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: showEmojiPicker ? 'var(--stone)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: showEmojiPicker ? 'var(--brown)' : 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Smile size={20} />
            </button>

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
              <div style={{
                position: 'absolute',
                bottom: '48px',
                left: '0',
                width: '320px',
                maxHeight: '350px',
                background: 'var(--white)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                border: '1px solid var(--stone)',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                {/* Category tabs */}
                <div style={{
                  display: 'flex',
                  gap: '2px',
                  padding: '8px',
                  borderBottom: '1px solid var(--stone)',
                  overflowX: 'auto',
                  background: 'var(--off-white)'
                }}>
                  {EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => setEmojiCategory?.(cat.name)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: emojiCategory === cat.name ? 'var(--white)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: emojiCategory === cat.name ? 600 : 400,
                        color: emojiCategory === cat.name ? 'var(--brown)' : 'var(--brown-light)',
                        whiteSpace: 'nowrap',
                        boxShadow: emojiCategory === cat.name ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Emoji grid */}
                <div style={{
                  padding: '8px',
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '4px'
                  }}>
                    {EMOJI_CATEGORIES.find(c => c.name === emojiCategory)?.emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => onInsertEmoji?.(emoji)}
                        style={{
                          width: '36px',
                          height: '36px',
                          border: 'none',
                          background: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mention Button */}
          <button
            onClick={handleMentionClick}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: showMentions ? 'var(--stone)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: showMentions ? 'var(--brown)' : 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AtSign size={20} />
          </button>
        </div>

        {/* Input area with mention autocomplete */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Mention Autocomplete Dropdown */}
          {showMentions && filteredMembros.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '0',
              right: '0',
              marginBottom: '8px',
              background: 'var(--white)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid var(--stone)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000
            }}>
              <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', borderBottom: '1px solid var(--stone)' }}>
                Mencionar alguem
              </div>
              {filteredMembros.map(membro => (
                <button
                  key={membro.id}
                  onClick={() => onInsertMention?.(membro)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: membro.avatar_url
                      ? `url(${membro.avatar_url}) center/cover`
                      : 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--brown-dark)'
                  }}>
                    {!membro.avatar_url && getInitials(membro.nome)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                      {membro.nome}
                    </div>
                    {membro.funcao && (
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {membro.funcao}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={messageInputRef}
            value={messageInput}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Escreve uma mensagem... Use @ para mencionar"
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              resize: 'none',
              fontSize: '14px',
              lineHeight: 1.5,
              outline: 'none',
              minHeight: '24px',
              maxHeight: '120px'
            }}
            rows={1}
          />
        </div>

        <button
          onClick={onSend}
          disabled={uploading || (!messageInput.trim() && selectedFiles.length === 0)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: messageInput.trim() || selectedFiles.length > 0 ? 'var(--accent-olive)' : 'var(--stone)',
            border: 'none',
            cursor: messageInput.trim() || selectedFiles.length > 0 ? 'pointer' : 'default',
            color: messageInput.trim() || selectedFiles.length > 0 ? 'white' : 'var(--brown-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--brown-light)' }}>
        Prima <strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para nova linha
      </div>
    </div>
  )
}
