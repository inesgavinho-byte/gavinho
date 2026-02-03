import { memo, useState } from 'react'
import {
  MoreHorizontal, Reply, Pin, Bookmark, Tag, Bell, Edit, Trash2,
  Forward, CheckSquare, AlarmClock, FileText, Image as ImageIcon
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { REACTIONS, MESSAGE_TAGS, REMINDER_OPTIONS } from '../../constants'
import { formatTime, getInitials, renderFormattedText } from '../../utils/helpers'

const MessageItem = memo(function MessageItem({
  post,
  onOpenThread,
  onStartReply,
  onStartEdit,
  onDelete,
  onOpenCreateTask,
  onOpenForward,
  onScheduleMeeting
}) {
  const { state, actions, utils, profile } = useWorkspace()
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [showReminderOptions, setShowReminderOptions] = useState(false)

  const isOwn = post.autor?.id === profile?.id || post.autor?.nome === profile?.nome
  const isSaved = utils.isMessageSaved(post.id)
  const isPinned = utils.isMessagePinned(post.id)
  const messageTags = utils.getMessageTags(post.id)

  const handleReaction = (emoji) => {
    actions.handleReaction(post.id, emoji)
    setShowReactions(false)
  }

  const handleSetReminder = (option) => {
    // This would be handled by parent or actions
    setShowReminderOptions(false)
    setShowMenu(false)
  }

  return (
    <div
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--stone-light)',
        position: 'relative'
      }}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => {
        setShowReactions(false)
        setShowMenu(false)
      }}
    >
      {/* Reply To Reference */}
      {post.replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          paddingLeft: '48px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <Reply size={12} />
          <span>Em resposta a <strong>{post.replyTo.autor?.nome}</strong></span>
        </div>
      )}

      {/* Tags */}
      {messageTags.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '8px',
          paddingLeft: '48px'
        }}>
          {messageTags.map(tagId => {
            const tag = MESSAGE_TAGS.find(t => t.id === tagId)
            if (!tag) return null
            return (
              <span
                key={tagId}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '500',
                  background: tag.color + '20',
                  color: tag.color
                }}
              >
                {tag.label}
              </span>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--olive)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '13px',
          fontWeight: '600',
          flexShrink: 0
        }}>
          {post.autor?.avatar_url ? (
            <img
              src={post.autor.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            getInitials(post.autor?.nome)
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--charcoal)', fontSize: '14px' }}>
              {post.autor?.nome || 'Utilizador'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {post.autor?.funcao}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {formatTime(post.created_at)}
            </span>
            {post.editado && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                (editado)
              </span>
            )}
            {isPinned && (
              <Pin size={12} style={{ color: '#f59e0b' }} />
            )}
          </div>

          {/* Message Content */}
          <div style={{
            fontSize: '14px',
            color: 'var(--charcoal)',
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}>
            <span dangerouslySetInnerHTML={{ __html: renderFormattedText(post.conteudo) }} />
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {post.attachments.map((att, idx) => (
                att.type === 'image' ? (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block' }}
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{
                        maxWidth: '300px',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        border: '1px solid var(--stone)'
                      }}
                    />
                  </a>
                ) : (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'var(--off-white)',
                      borderRadius: '8px',
                      border: '1px solid var(--stone)',
                      textDecoration: 'none',
                      color: 'var(--charcoal)'
                    }}
                  >
                    <FileText size={16} style={{ color: 'var(--olive)' }} />
                    <span style={{ fontSize: '13px' }}>{att.name}</span>
                    {att.size && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {att.size}
                      </span>
                    )}
                  </a>
                )
              ))}
            </div>
          )}

          {/* Reactions */}
          {post.reacoes && post.reacoes.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {post.reacoes.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReaction(reaction.emoji)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--off-white)',
                    border: '1px solid var(--stone)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title={reaction.users?.join(', ')}
                >
                  <span>{reaction.emoji}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{reaction.users?.length || 1}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread Preview */}
          {post.replyCount > 0 && (
            <button
              onClick={() => onOpenThread(post)}
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--olive-light)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--olive)'
              }}
            >
              <Reply size={14} />
              {post.replyCount} {post.replyCount === 1 ? 'resposta' : 'respostas'}
            </button>
          )}
        </div>

        {/* Actions (visible on hover) */}
        {showReactions && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '20px',
            display: 'flex',
            gap: '2px',
            background: 'white',
            padding: '4px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid var(--stone)'
          }}>
            {/* Quick Reactions */}
            {REACTIONS.slice(0, 4).map(reaction => (
              <button
                key={reaction.name}
                onClick={() => handleReaction(reaction.emoji)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                title={reaction.name}
              >
                {reaction.emoji}
              </button>
            ))}

            {/* Reply */}
            <button
              onClick={() => onStartReply(post)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: 'var(--text-secondary)'
              }}
              title="Responder"
            >
              <Reply size={16} />
            </button>

            {/* More Actions */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: 'var(--text-secondary)'
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '4px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                border: '1px solid var(--stone)',
                minWidth: '180px',
                zIndex: 100
              }}>
                <button
                  onClick={() => {
                    actions.toggleSaveMessage(post)
                    setShowMenu(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <Bookmark size={14} />
                  {isSaved ? 'Remover dos guardados' : 'Guardar mensagem'}
                </button>

                <button
                  onClick={() => {
                    actions.togglePinMessage(post)
                    setShowMenu(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <Pin size={14} />
                  {isPinned ? 'Desafixar' : 'Fixar mensagem'}
                </button>

                <button
                  onClick={() => setShowTagSelector(!showTagSelector)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <Tag size={14} />
                  Adicionar etiqueta
                </button>

                {showTagSelector && (
                  <div style={{ padding: '4px 8px', borderTop: '1px solid var(--stone)' }}>
                    {MESSAGE_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          actions.addMessageTag(post.id, tag.id)
                          setShowTagSelector(false)
                          setShowMenu(false)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: tag.color,
                          textAlign: 'left',
                          borderRadius: '4px'
                        }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: tag.color
                        }} />
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowReminderOptions(!showReminderOptions)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <AlarmClock size={14} />
                  Lembrar-me
                </button>

                {showReminderOptions && (
                  <div style={{ padding: '4px 8px', borderTop: '1px solid var(--stone)' }}>
                    {REMINDER_OPTIONS.slice(0, 4).map(option => (
                      <button
                        key={option.id}
                        onClick={() => handleSetReminder(option)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          textAlign: 'left',
                          borderRadius: '4px'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    onOpenCreateTask(post)
                    setShowMenu(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <CheckSquare size={14} />
                  Criar tarefa
                </button>

                <button
                  onClick={() => {
                    onOpenForward(post)
                    setShowMenu(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--charcoal)',
                    textAlign: 'left'
                  }}
                >
                  <Forward size={14} />
                  Reencaminhar
                </button>

                {isOwn && (
                  <>
                    <div style={{ borderTop: '1px solid var(--stone)', margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        onStartEdit(post)
                        setShowMenu(false)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--charcoal)',
                        textAlign: 'left'
                      }}
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        onDelete(post.id)
                        setShowMenu(false)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#ef4444',
                        textAlign: 'left'
                      }}
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MessageItem
