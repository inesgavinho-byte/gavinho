// =====================================================
// MESSAGE LIST COMPONENT
// Renders the list of messages with all features
// Optimized with React.memo and useMemo for performance
// =====================================================

import { useState, memo, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Pin, MoreHorizontal, CornerUpLeft, MessageSquare, Bookmark, BookmarkCheck,
  Forward, CheckSquare, Edit, Trash2, Quote, ExternalLink, FileText,
  Check, CheckCheck, ChevronRight, X, Download, Eye, FileSpreadsheet,
  FileImage, File, Share2, Loader
} from 'lucide-react'

import { REACTIONS } from '../../utils/constants'
import { formatDateTime, formatFileSize, getInitials, extractUrls } from '../../utils/formatters'
import { renderFormattedText, isOwnMessage as checkOwnMessage } from '../../utils/messageUtils'
import { getPresenceColor } from '../../utils/presenceUtils'
import LinkPreview from './LinkPreview'
import { generateFallbackPreview } from '../../hooks/useLinkPreview'

// Memoized single message item component for performance
const MessageItem = memo(function MessageItem({
  post,
  showAuthor,
  profile,
  onlineUsers,
  editingMessage,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  onReaction,
  onReply,
  onOpenThread,
  onSaveMessage,
  onPinMessage,
  onForward,
  onCreateTask,
  onEditMessage,
  onDeleteMessage,
  isMessageSaved,
  isMessagePinned,
  getReadStatus,
  showMessageMenu,
  setShowMessageMenu
}) {
  // Check if user owns the message
  const isOwnMessage = checkOwnMessage(post, profile?.id)

  // Memoize attachment processing
  const allAttachments = useMemo(() => {
    if (post.attachments?.length > 0) return post.attachments
    if (post.ficheiro_url) {
      return [{
        url: post.ficheiro_url,
        name: post.ficheiro_nome || 'Ficheiro',
        size: post.ficheiro_tamanho,
        type: post.ficheiro_tipo || (post.tipo === 'imagem' ? 'image' : 'file')
      }]
    }
    return []
  }, [post.attachments, post.ficheiro_url, post.ficheiro_nome, post.ficheiro_tamanho, post.ficheiro_tipo, post.tipo])

  // Memoize URL extraction
  const urls = useMemo(() => extractUrls(post.conteudo), [post.conteudo])

  return (
    <article
      role="article"
      aria-label={`Mensagem de ${post.autor?.nome || 'Utilizador'} às ${formatDateTime(post.created_at)}`}
      tabIndex={0}
      style={{
        padding: showAuthor ? '16px' : '4px 16px 4px 64px',
        borderRadius: '8px',
        background: 'var(--white)',
        marginTop: showAuthor ? '12px' : '0',
        boxShadow: 'var(--shadow-sm)'
      }}
      className="message-card"
    >
      {showAuthor && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: post.autor?.avatar_url
                ? `url(${post.autor.avatar_url}) center/cover`
                : 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brown-dark)',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {!post.autor?.avatar_url && getInitials(post.autor?.nome)}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: getPresenceColor(post.autor?.id, onlineUsers),
              border: '2px solid var(--white)'
            }} title={onlineUsers[post.autor?.id] === 'online' ? 'Online' : onlineUsers[post.autor?.id] === 'away' ? 'Ausente' : 'Offline'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                {post.autor?.nome || 'Utilizador'}
              </span>
              {post.autor?.funcao && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  background: 'var(--stone)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {post.autor.funcao}
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                {formatDateTime(post.created_at)}
              </span>
              {post.pinned && <Pin size={14} style={{ color: 'var(--warning)' }} />}
            </div>
          </div>

          {/* Message actions */}
          <div
            role="toolbar"
            aria-label="Ações da mensagem"
            style={{ display: 'flex', gap: '2px', opacity: 0, position: 'relative' }}
            className="message-actions"
          >
            {REACTIONS.slice(0, 4).map(reaction => (
              <button
                key={reaction.name}
                onClick={() => onReaction?.(post.id, reaction.emoji)}
                aria-label={`Reagir com ${reaction.name}`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
              </button>
            ))}
            <button
              onClick={() => onReply?.(post)}
              title="Responder"
              aria-label="Responder a esta mensagem"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)'
              }}
            >
              <CornerUpLeft size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => onOpenThread?.(post)}
              title="Abrir conversa"
              aria-label="Abrir conversa em thread"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)'
              }}
            >
              <MessageSquare size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => onSaveMessage?.(post)}
              title={isMessageSaved?.(post.id) ? 'Remover dos guardados' : 'Guardar mensagem'}
              aria-label={isMessageSaved?.(post.id) ? 'Remover mensagem dos guardados' : 'Guardar mensagem'}
              aria-pressed={isMessageSaved?.(post.id)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                background: isMessageSaved?.(post.id) ? 'rgba(201, 168, 130, 0.2)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isMessageSaved?.(post.id) ? 'var(--warning)' : 'var(--brown-light)'
              }}
            >
              {isMessageSaved?.(post.id) ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMessageMenu(showMessageMenu === post.id ? null : post.id)}
                aria-label="Mais opções"
                aria-expanded={showMessageMenu === post.id}
                aria-haspopup="menu"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  background: showMessageMenu === post.id ? 'var(--stone)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </button>

              {showMessageMenu === post.id && (
                <div
                  role="menu"
                  aria-label="Opções da mensagem"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '4px',
                    background: 'var(--white)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    border: '1px solid var(--stone)',
                    minWidth: '160px',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  {[
                    { icon: CornerUpLeft, label: 'Responder', action: () => { onReply?.(post); setShowMessageMenu(null) } },
                    { icon: MessageSquare, label: 'Abrir conversa', action: () => { onOpenThread?.(post); setShowMessageMenu(null) } },
                    { icon: isMessageSaved?.(post.id) ? BookmarkCheck : Bookmark, label: isMessageSaved?.(post.id) ? 'Remover guardado' : 'Guardar', action: () => { onSaveMessage?.(post); setShowMessageMenu(null) }, color: isMessageSaved?.(post.id) ? 'var(--warning)' : undefined },
                    { icon: Pin, label: isMessagePinned?.(post.id) ? 'Desafixar' : 'Fixar no canal', action: () => { onPinMessage?.(post); setShowMessageMenu(null) }, color: isMessagePinned?.(post.id) ? 'var(--warning)' : undefined },
                    { icon: Forward, label: 'Reencaminhar', action: () => { onForward?.(post); setShowMessageMenu(null) } },
                    { icon: CheckSquare, label: 'Criar tarefa', action: () => { onCreateTask?.(post); setShowMessageMenu(null) } }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      role="menuitem"
                      onClick={item.action}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: item.color || 'var(--brown)',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <item.icon size={16} aria-hidden="true" />
                      {item.label}
                    </button>
                  ))}
                  {isOwnMessage && (
                    <>
                      <div role="separator" style={{ height: '1px', background: 'var(--stone)', margin: '4px 0' }} />
                      <button
                        role="menuitem"
                        onClick={() => { onEditMessage?.(post); setShowMessageMenu(null) }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: 'var(--brown)',
                          textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Edit size={16} aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => { onDeleteMessage?.(post.id); setShowMessageMenu(null) }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: 'var(--error)',
                          textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,53,69,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ paddingLeft: showAuthor ? '52px' : '0' }}>
        {post.replyTo && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--cream)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--accent-olive)',
            marginBottom: '8px'
          }}>
            <Quote size={14} style={{ color: 'var(--brown-light)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '2px' }}>
                {post.replyTo.autor?.nome}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brown)', opacity: 0.8 }}>
                {post.replyTo.conteudo?.substring(0, 100)}{post.replyTo.conteudo?.length > 100 ? '...' : ''}
              </div>
            </div>
          </div>
        )}

        {editingMessage?.id === post.id ? (
          <div>
            <textarea
              value={editingContent}
              onChange={e => setEditingContent?.(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid var(--accent-olive)',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '60px',
                outline: 'none'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={onSaveEdit} style={{ padding: '6px 14px', background: 'var(--accent-olive)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                Guardar
              </button>
              <button onClick={onCancelEdit} style={{ padding: '6px 14px', background: 'var(--stone)', color: 'var(--brown)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--brown)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {renderFormattedText(post.conteudo)}
              {post.editado && <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: '6px' }}>(editado)</span>}
            </p>

            {urls.slice(0, 1).map((url, idx) => (
              <LinkPreview
                key={idx}
                preview={generateFallbackPreview(url)}
              />
            ))}

            {isOwnMessage && getReadStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                {getReadStatus(post) === 'read' ? (
                  <CheckCheck size={14} style={{ color: 'var(--accent-olive)' }} title="Lido" />
                ) : getReadStatus(post) === 'delivered' ? (
                  <CheckCheck size={14} style={{ color: 'var(--brown-light)' }} title="Entregue" />
                ) : (
                  <Check size={14} style={{ color: 'var(--brown-light)' }} title="Enviado" />
                )}
              </div>
            )}
          </div>
        )}

        {post.imagem_url && (
          <div style={{ marginTop: '12px' }}>
            <img src={post.imagem_url} alt="" style={{ maxWidth: '400px', maxHeight: '300px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer' }} />
          </div>
        )}

        {allAttachments.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            {allAttachments.map((file, idx) => {
              const isImage = file.type === 'image' || file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
              const isPDF = file.name?.match(/\.pdf$/i)
              const isSpreadsheet = file.name?.match(/\.(xlsx|xls|csv)$/i)
              const FileIcon = isImage ? FileImage : isPDF ? FileText : isSpreadsheet ? FileSpreadsheet : File
              const iconColor = isPDF ? '#e74c3c' : isSpreadsheet ? '#27ae60' : 'var(--accent-olive)'

              if (isImage && file.url) {
                return (
                  <div key={idx} style={{ maxWidth: '360px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--stone)', background: 'var(--white)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <img src={file.url} alt={file.name} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }} />
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--cream)', borderTop: '1px solid var(--stone)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <FileImage size={20} style={{ color: '#9b59b6', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{typeof file.size === 'number' ? formatFileSize(file.size) : file.size || 'Imagem'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" title="Ver" style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--white)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-light)', textDecoration: 'none' }}><Eye size={16} /></a>
                        <a href={file.url} download={file.name} title="Descarregar" style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--white)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-light)', textDecoration: 'none' }}><Download size={16} /></a>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={idx} style={{ width: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--stone)', background: 'var(--white)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', background: isPDF ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : isSpreadsheet ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, var(--cream) 0%, var(--stone) 100%)', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileIcon size={28} style={{ color: iconColor }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {isPDF ? 'PDF' : isSpreadsheet ? 'Excel' : 'Documento'}
                      </span>
                    </div>
                  </a>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--cream)', borderTop: '1px solid var(--stone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <FileIcon size={20} style={{ color: iconColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{typeof file.size === 'number' ? formatFileSize(file.size) : file.size || 'Ficheiro'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" title="Ver" style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--white)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-light)', textDecoration: 'none' }}><Eye size={16} /></a>
                      <a href={file.url} download={file.name} title="Descarregar" style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--white)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-light)', textDecoration: 'none' }}><Download size={16} /></a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {post.reacoes?.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            {post.reacoes.map((reaction, idx) => (
              <button
                key={idx}
                onClick={() => onReaction?.(post.id, reaction.emoji)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: reaction.users.includes(profile?.nome || 'Eu') ? 'rgba(122, 158, 122, 0.15)' : 'var(--stone)',
                  border: reaction.users.includes(profile?.nome || 'Eu') ? '1px solid var(--success)' : '1px solid transparent',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <span>{reaction.emoji}</span>
                <span style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 500 }}>{reaction.users.length}</span>
              </button>
            ))}
          </div>
        )}

        {post.replyCount > 0 && (
          <button
            onClick={() => onOpenThread?.(post)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              marginTop: '12px',
              background: 'var(--cream)',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--accent-olive)',
              fontWeight: 500
            }}
          >
            <MessageSquare size={14} />
            {post.replyCount} {post.replyCount === 1 ? 'resposta' : 'respostas'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </article>
  )
})

// Main MessageList component with memoized rendering and infinite scroll
function MessageList({
  posts = [],
  profile,
  onlineUsers = {},
  editingMessage,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  onReaction,
  onReply,
  onOpenThread,
  onSaveMessage,
  onPinMessage,
  onForward,
  onCreateTask,
  onEditMessage,
  onDeleteMessage,
  isMessageSaved,
  isMessagePinned,
  getReadStatus,
  messagesEndRef,
  // Pagination props
  hasMoreMessages = false,
  loadingMoreMessages = false,
  onLoadMore
}) {
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const containerRef = useRef(null)
  const previousScrollHeightRef = useRef(0)
  const previousPostCountRef = useRef(0)

  // Memoize showAuthor calculation for each post
  const postsWithShowAuthor = useMemo(() => {
    return posts.map((post, index) => ({
      post,
      showAuthor: index === 0 ||
        posts[index - 1]?.autor?.id !== post.autor?.id ||
        (new Date(post.created_at) - new Date(posts[index - 1]?.created_at)) > 300000
    }))
  }, [posts])

  // Memoized callback to prevent unnecessary re-renders
  const handleSetShowMessageMenu = useCallback((value) => {
    setShowMessageMenu(value)
  }, [])

  // Maintain scroll position when older messages are prepended
  useEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container) return

    // If posts were added at the beginning (older messages loaded)
    if (posts.length > previousPostCountRef.current && previousPostCountRef.current > 0) {
      const scrollHeightDiff = container.scrollHeight - previousScrollHeightRef.current
      if (scrollHeightDiff > 0 && container.scrollTop < 100) {
        // Restore scroll position relative to where user was
        container.scrollTop = scrollHeightDiff
      }
    }

    previousScrollHeightRef.current = container.scrollHeight
    previousPostCountRef.current = posts.length
  }, [posts.length])

  // Handle scroll to load more messages
  const handleScroll = useCallback((e) => {
    const container = e.target
    // Trigger load more when scrolled near the top (100px threshold)
    if (container.scrollTop < 100 && hasMoreMessages && !loadingMoreMessages && onLoadMore) {
      previousScrollHeightRef.current = container.scrollHeight
      onLoadMore()
    }
  }, [hasMoreMessages, loadingMoreMessages, onLoadMore])

  // Attach scroll listener to parent container
  useEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container || !onLoadMore) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll, onLoadMore])

  return (
    <div
      ref={containerRef}
      role="log"
      aria-label="Lista de mensagens"
      aria-live="polite"
      aria-relevant="additions"
      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
    >
      {/* Loading indicator at top */}
      {loadingMoreMessages && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            gap: '8px',
            color: 'var(--brown-light)'
          }}
        >
          <Loader size={18} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px' }}>A carregar mensagens anteriores...</span>
        </div>
      )}

      {/* "Load more" button when there are more messages */}
      {hasMoreMessages && !loadingMoreMessages && posts.length > 0 && (
        <button
          onClick={onLoadMore}
          aria-label="Carregar mensagens mais antigas"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            gap: '8px',
            background: 'var(--cream)',
            border: '1px dashed var(--stone)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--accent-olive)',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '8px'
          }}
        >
          Carregar mensagens anteriores
        </button>
      )}

      {postsWithShowAuthor.map(({ post, showAuthor }) => (
        <MessageItem
          key={post.id}
          post={post}
          showAuthor={showAuthor}
          profile={profile}
          onlineUsers={onlineUsers}
          editingMessage={editingMessage}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onReaction={onReaction}
          onReply={onReply}
          onOpenThread={onOpenThread}
          onSaveMessage={onSaveMessage}
          onPinMessage={onPinMessage}
          onForward={onForward}
          onCreateTask={onCreateTask}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          isMessageSaved={isMessageSaved}
          isMessagePinned={isMessagePinned}
          getReadStatus={getReadStatus}
          showMessageMenu={showMessageMenu}
          setShowMessageMenu={handleSetShowMessageMenu}
        />
      ))}

      {posts.length === 0 && !loadingMoreMessages && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--brown-light)' }}>
          <MessageSquare size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>Sem mensagens</h3>
          <p style={{ margin: 0 }}>Se o primeiro a publicar neste canal!</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

export default memo(MessageList)
