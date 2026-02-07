// =====================================================
// THREAD PANEL
// Painel lateral de conversa/thread com respostas
// =====================================================

import { X, Send } from 'lucide-react'
import { formatDateTime, formatTime, getInitials } from '../../utils/formatters'

export default function ThreadPanel({
  activeThread,
  threadReplies,
  onClose,
  onSendReply,
  replyInput,
  setReplyInput,
  onReaction
}) {
  if (!activeThread) return null

  const replies = threadReplies[activeThread.id] || []
  const totalMessages = replies.length + 1

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendReply(activeThread.id)
    }
  }

  return (
    <div style={{
      width: '400px',
      borderLeft: '1px solid var(--stone)',
      background: 'var(--white)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Thread header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--brown)' }}>
            Conversa
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            {totalMessages} mensagens
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--brown-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Thread messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Original message */}
        <div style={{
          padding: '16px',
          background: 'var(--cream)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--brown-dark)'
            }}>
              {getInitials(activeThread.autor?.nome)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                {activeThread.autor?.nome}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                {formatDateTime(activeThread.created_at)}
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--brown)', lineHeight: 1.6 }}>
            {activeThread.conteudo}
          </p>
        </div>

        {/* Replies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {replies.map(reply => (
            <div key={reply.id} style={{
              display: 'flex',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--brown-dark)',
                flexShrink: 0
              }}>
                {getInitials(reply.autor?.nome)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                    {reply.autor?.nome}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    {formatTime(reply.created_at)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)', lineHeight: 1.5 }}>
                  {reply.conteudo}
                </p>

                {/* Reply reactions */}
                {reply.reacoes?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    {reply.reacoes.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => onReaction(activeThread.id, reaction.emoji, true, reply.id)}
                        style={{
                          padding: '2px 8px',
                          background: 'var(--stone)',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {reaction.emoji} {reaction.users?.length || 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--stone)'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          background: 'var(--cream)',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid var(--stone)'
        }}>
          <textarea
            value={replyInput}
            onChange={e => setReplyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Responder..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              resize: 'none',
              fontSize: '13px',
              outline: 'none',
              minHeight: '20px',
              maxHeight: '80px'
            }}
            rows={1}
          />
          <button
            onClick={() => onSendReply(activeThread.id)}
            disabled={!replyInput.trim()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: replyInput.trim() ? 'var(--accent-olive)' : 'var(--stone)',
              border: 'none',
              cursor: replyInput.trim() ? 'pointer' : 'default',
              color: replyInput.trim() ? 'white' : 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
