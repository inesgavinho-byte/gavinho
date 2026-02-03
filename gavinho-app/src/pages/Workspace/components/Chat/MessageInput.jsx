import { memo } from 'react'
import {
  Send, Paperclip, Image as ImageIcon, Smile, AtSign, X,
  Bold, Italic, Code, List, ListOrdered, Link2, Reply
} from 'lucide-react'
import { EMOJI_CATEGORIES } from '../../constants'

const MessageInput = memo(function MessageInput({
  messageInput,
  onMessageChange,
  onSend,
  replyingTo,
  onCancelReply,
  showEmojiPicker,
  onToggleEmojiPicker,
  emojiCategory,
  onSetEmojiCategory,
  onInsertEmoji,
  showMentions,
  filteredMembros,
  onInsertMention,
  showFormattingToolbar,
  onApplyFormatting,
  selectedFiles,
  onRemoveFile,
  onOpenFileDialog,
  uploading,
  isDragging,
  messageInputRef,
  fileInputRef,
  onFileSelect
}) {
  return (
    <div style={{
      padding: '16px 20px',
      borderTop: '1px solid var(--stone)',
      background: 'white'
    }}>
      {/* Reply indicator */}
      {replyingTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          padding: '8px 12px',
          background: 'var(--olive-light)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--olive)'
        }}>
          <Reply size={14} style={{ color: 'var(--olive)' }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Em resposta a <strong style={{ color: 'var(--olive)' }}>{replyingTo.autor?.nome}</strong>
            </span>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {replyingTo.conteudo?.substring(0, 100)}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(122, 139, 110, 0.1)',
          border: '2px dashed var(--olive)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <span style={{ color: 'var(--olive)', fontWeight: '500' }}>
            Largar ficheiros aqui
          </span>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                background: 'var(--off-white)',
                borderRadius: '6px',
                border: '1px solid var(--stone)'
              }}
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt=""
                  style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                />
              ) : (
                <Paperclip size={14} style={{ color: 'var(--text-secondary)' }} />
              )}
              <span style={{ fontSize: '12px', color: 'var(--charcoal)' }}>
                {file.name}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {file.sizeFormatted}
              </span>
              <button
                onClick={() => onRemoveFile(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      {showFormattingToolbar && (
        <div style={{
          display: 'flex',
          gap: '2px',
          marginBottom: '8px',
          padding: '4px',
          background: 'var(--off-white)',
          borderRadius: '6px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => onApplyFormatting('bold')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Negrito (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => onApplyFormatting('italic')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Itálico (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => onApplyFormatting('code')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Código"
          >
            <Code size={14} />
          </button>
          <button
            onClick={() => onApplyFormatting('list')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Lista"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => onApplyFormatting('numbered')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Lista numerada"
          >
            <ListOrdered size={14} />
          </button>
          <button
            onClick={() => onApplyFormatting('link')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}
            title="Link"
          >
            <Link2 size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        position: 'relative'
      }}>
        {/* Emoji picker */}
        {showEmojiPicker && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            marginBottom: '8px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            border: '1px solid var(--stone)',
            width: '320px',
            zIndex: 100
          }}>
            {/* Category tabs */}
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
                  onClick={() => onSetEmojiCategory(cat.name)}
                  style={{
                    padding: '4px 8px',
                    background: emojiCategory === cat.name ? 'var(--olive-light)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: emojiCategory === cat.name ? 'var(--olive)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '4px',
              padding: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {EMOJI_CATEGORIES.find(c => c.name === emojiCategory)?.emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => onInsertEmoji(emoji)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '18px'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mention suggestions */}
        {showMentions && filteredMembros.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            marginBottom: '8px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            border: '1px solid var(--stone)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100
          }}>
            {filteredMembros.map(membro => (
              <button
                key={membro.id}
                onClick={() => onInsertMention(membro)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--olive)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {membro.nome?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--charcoal)' }}>
                    {membro.nome}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {membro.funcao}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onToggleEmojiPicker}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
            title="Emojis"
          >
            <Smile size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={onOpenFileDialog}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
            title="Anexar ficheiro"
          >
            <Paperclip size={20} />
          </button>
        </div>

        {/* Text input */}
        <textarea
          ref={messageInputRef}
          value={messageInput}
          onChange={onMessageChange}
          placeholder="Escrever mensagem... (@ para mencionar)"
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid var(--stone)',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            minHeight: '42px',
            maxHeight: '120px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={uploading || (!messageInput.trim() && selectedFiles.length === 0)}
          style={{
            background: uploading || (!messageInput.trim() && selectedFiles.length === 0)
              ? 'var(--stone)'
              : 'var(--olive)',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: uploading || (!messageInput.trim() && selectedFiles.length === 0)
              ? 'not-allowed'
              : 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {uploading ? (
            <div className="loading-spinner" style={{ width: '20px', height: '20px' }} />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  )
})

export default MessageInput
