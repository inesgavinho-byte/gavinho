// =====================================================
// OBRA CHAT COMPONENT
// Real-time chat for obra team with photo sharing
// Features: Typing indicator, emoji reactions, avatars
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Send, Camera, MessageSquare, Check, CheckCheck,
  Clock, Loader2, X, Image as ImageIcon, Smile
} from 'lucide-react'
import { styles } from '../styles'

// Quick emoji reactions
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '👏', '🔥', '✅']

// Avatar colors for different users
const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Get consistent color for user based on their ID
const getAvatarColor = (userId) => {
  if (!userId) return AVATAR_COLORS[0]
  // Simple hash to get consistent color
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ObraChat({ obra, user, isOnline, queueAction }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [imageModal, setImageModal] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(null) // message id or null
  const [isTyping, setIsTyping] = useState(false)

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Load messages on mount
  useEffect(() => {
    if (obra) {
      loadMessages()
      const unsubscribe = subscribeToMessages()
      return unsubscribe
    }
  }, [obra])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('obra_mensagens')
        .select('*')
        .eq('obra_id', obra.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`obra_chat_${obra.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'obra_mensagens',
        filter: `obra_id=eq.${obra.id}`
      }, (payload) => {
        // Don't add duplicates (from optimistic updates)
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.new.id)
          if (exists) return prev
          // Remove any pending version
          const filtered = prev.filter(m =>
            !(m.pending && m.autor_id === payload.new.autor_id && m.conteudo === payload.new.conteudo)
          )
          return [...filtered, payload.new]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'obra_mensagens',
        filter: `obra_id=eq.${obra.id}`
      }, (payload) => {
        // Update message (for reactions)
        setMessages(prev => prev.map(m =>
          m.id === payload.new.id ? { ...m, ...payload.new } : m
        ))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  // Typing indicator - broadcast presence
  useEffect(() => {
    if (!obra || !user) return

    const presenceChannel = supabase.channel(`typing_${obra.id}`)

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.values(state).flat()
          .filter(u => u.user_id !== user.id && u.typing)
          .map(u => u.nome)
        setTypingUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            nome: user.nome,
            typing: false
          })
        }
      })

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [obra, user])

  // Broadcast typing status
  const broadcastTyping = useCallback(async (typing) => {
    if (!obra || !user) return
    const channel = supabase.channel(`typing_${obra.id}`)
    try {
      await channel.track({
        user_id: user.id,
        nome: user.nome,
        typing
      })
    } catch (err) {
      // Ignore - channel might not be ready
    }
  }, [obra, user])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      broadcastTyping(true)
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      broadcastTyping(false)
    }, 2000)
  }, [isTyping, broadcastTyping])

  // Add reaction to message
  const addReaction = async (messageId, emoji) => {
    setShowEmojiPicker(null)

    // Find the message
    const message = messages.find(m => m.id === messageId)
    if (!message || message.pending) return

    // Get existing reactions or create new object
    const existingReactions = message.reactions || {}
    const reactionUsers = existingReactions[emoji] || []

    // Toggle reaction
    let newReactionUsers
    if (reactionUsers.includes(user.id)) {
      newReactionUsers = reactionUsers.filter(id => id !== user.id)
    } else {
      newReactionUsers = [...reactionUsers, user.id]
    }

    const newReactions = {
      ...existingReactions,
      [emoji]: newReactionUsers
    }

    // Remove empty reactions
    Object.keys(newReactions).forEach(key => {
      if (newReactions[key].length === 0) {
        delete newReactions[key]
      }
    })

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions: newReactions } : m
    ))

    // Update in database
    try {
      await supabase
        .from('obra_mensagens')
        .update({ reactions: Object.keys(newReactions).length > 0 ? newReactions : null })
        .eq('id', messageId)
    } catch (err) {
      console.error('Erro ao adicionar reação:', err)
      // Revert on error
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: existingReactions } : m
      ))
    }
  }

  // Photo handling
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleciona uma imagem')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB')
      return
    }

    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${obra.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('obra-fotos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('obra-fotos')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const cancelPhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedPhoto) || !obra || !user) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const tempId = `temp_${Date.now()}`
    const tempMessage = {
      id: tempId,
      obra_id: obra.id,
      autor_id: user.id,
      autor_nome: user.nome,
      autor_avatar: user.avatar || null,
      conteudo: messageText,
      tipo: selectedPhoto ? 'foto' : 'texto',
      anexos: photoPreview ? [{ url: photoPreview, tipo: 'image' }] : null,
      created_at: new Date().toISOString(),
      pending: true
    }
    setMessages(prev => [...prev, tempMessage])

    const photoToUpload = selectedPhoto
    cancelPhoto()

    // Offline: queue the message for later sync (no photo upload when offline)
    if (!isOnline && queueAction && !photoToUpload) {
      await queueAction('SEND_MESSAGE', {
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: messageText,
        tipo: 'texto',
        anexos: null
      })
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, pending: false, queued: true } : m
      ))
      setSending(false)
      return
    }

    try {
      let photoUrl = null
      if (photoToUpload) {
        setUploadingPhoto(true)
        photoUrl = await uploadPhoto(photoToUpload)
        setUploadingPhoto(false)
      }

      // Note: autor_avatar is NOT stored in DB, only for local display
      const { data, error } = await supabase
        .from('obra_mensagens')
        .insert({
          obra_id: obra.id,
          autor_id: user.id,
          autor_nome: user.nome,
          conteudo: messageText || (photoUrl ? '📷 Foto' : ''),
          tipo: photoUrl ? 'foto' : 'texto',
          anexos: photoUrl ? [{ url: photoUrl, tipo: 'image' }] : null
        })
        .select()
        .single()

      if (error) throw error

      // Replace temp message with real one, preserving avatar for display
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...data, autor_avatar: user.avatar || null, pending: false } : m
      ))
    } catch (err) {
      console.error('Erro ao enviar:', err)
      setUploadingPhoto(false)
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, failed: true, pending: false } : m
      ))
    } finally {
      setSending(false)
    }
  }

  const retryMessage = async (msg) => {
    // Remove failed message and retry
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setNewMessage(msg.conteudo || '')
  }

  // Format time
  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format date separator
  const formatDateSeparator = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  // Local styles for chat
  const chatStyles = {
    dateSeparator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '16px 0',
    },
    dateBadge: {
      background: 'rgba(0,0,0,0.1)',
      padding: '4px 12px',
      borderRadius: 12,
      fontSize: 12,
      color: '#666',
    },
    failedMessage: {
      border: '1px solid #ef4444',
      background: '#fef2f2',
    },
    retryButton: {
      fontSize: 11,
      color: '#ef4444',
      background: 'none',
      border: 'none',
      padding: '4px 0',
      cursor: 'pointer',
      textDecoration: 'underline',
    },
    imageModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalImage: {
      maxWidth: '90%',
      maxHeight: '90%',
      objectFit: 'contain',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '50%',
      width: 40,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'white',
    },
    skeletonMessage: {
      background: '#f3f4f6',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      animation: 'pulse 1.5s ease-in-out infinite',
    },
    skeletonLine: {
      height: 12,
      background: '#e5e7eb',
      borderRadius: 4,
      marginBottom: 4,
    },
    typingIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      fontSize: 12,
      color: '#6b7280',
      fontStyle: 'italic'
    },
    typingDots: {
      display: 'flex',
      gap: 4
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#9ca3af',
      animation: 'typingBounce 1.4s infinite ease-in-out'
    },
    emojiButton: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      opacity: 0,
      transition: 'opacity 0.2s',
      fontSize: 14
    },
    emojiPicker: {
      position: 'absolute',
      bottom: '100%',
      right: 0,
      background: 'white',
      borderRadius: 12,
      padding: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      gap: 4,
      zIndex: 10
    },
    emojiOption: {
      background: 'none',
      border: 'none',
      fontSize: 20,
      padding: 6,
      cursor: 'pointer',
      borderRadius: 8,
      transition: 'background 0.2s'
    },
    reactionsContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 6
    },
    reactionBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: '#f3f4f6',
      borderRadius: 12,
      fontSize: 12,
      cursor: 'pointer',
      border: '1px solid transparent',
      transition: 'all 0.2s'
    },
    reactionBadgeActive: {
      background: '#dbeafe',
      borderColor: '#3b82f6'
    },
    // Avatar styles
    messageRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 4
    },
    messageRowOwn: {
      flexDirection: 'row-reverse'
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 600,
      color: 'white',
      flexShrink: 0
    },
    avatarPlaceholder: {
      width: 32,
      flexShrink: 0
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div style={styles.chatContainer}>
        <div style={styles.messagesContainer}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                ...chatStyles.skeletonMessage,
                width: i % 2 === 0 ? '70%' : '60%',
                marginLeft: i % 2 === 0 ? 'auto' : 0,
              }}
            >
              <div style={{ ...chatStyles.skeletonLine, width: '30%' }} />
              <div style={{ ...chatStyles.skeletonLine, width: '100%' }} />
              <div style={{ ...chatStyles.skeletonLine, width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.chatContainer}>
      {/* Messages */}
      <div style={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div style={styles.emptyChat}>
            <MessageSquare size={48} style={{ opacity: 0.3 }} />
            <p>Ainda não há mensagens</p>
            <p style={{ fontSize: 12 }}>Começa a conversa!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div style={chatStyles.dateSeparator}>
                <span style={chatStyles.dateBadge}>
                  {formatDateSeparator(dateMessages[0].created_at)}
                </span>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((msg, msgIndex) => {
                const isOwn = msg.autor_id === user.id
                const prevMsg = dateMessages[msgIndex - 1]
                const showAvatar = msgIndex === 0 || prevMsg?.autor_id !== msg.autor_id

                return (
                <div
                  key={msg.id}
                  style={{
                    ...chatStyles.messageRow,
                    ...(isOwn ? chatStyles.messageRowOwn : {})
                  }}
                >
                  {/* Avatar - show for all users */}
                  {showAvatar ? (
                    <div
                      style={{
                        ...chatStyles.avatar,
                        background: msg.autor_avatar ? 'transparent' : getAvatarColor(msg.autor_id),
                        overflow: 'hidden'
                      }}
                      title={msg.autor_nome}
                    >
                      {msg.autor_avatar ? (
                        <img
                          src={msg.autor_avatar}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(msg.autor_nome)
                      )}
                    </div>
                  ) : (
                    <div style={chatStyles.avatarPlaceholder} />
                  )}

                  {/* Message bubble */}
                  <div
                    style={{
                      ...styles.message,
                      ...(isOwn ? styles.messageOwn : styles.messageOther),
                      ...(msg.failed ? chatStyles.failedMessage : {}),
                      opacity: msg.pending ? 0.6 : 1,
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('.emoji-btn')
                      if (btn) btn.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('.emoji-btn')
                      if (btn) btn.style.opacity = '0'
                    }}
                  >
                    {!isOwn && showAvatar && (
                      <span style={styles.messageAuthor}>{msg.autor_nome}</span>
                    )}
                  {msg.anexos && msg.anexos.length > 0 && msg.anexos[0]?.url && (
                    <img
                      src={msg.anexos[0].url}
                      alt="Foto"
                      style={styles.messagePhoto}
                      onClick={() => setImageModal(msg.anexos[0].url)}
                    />
                  )}
                  {msg.conteudo && msg.conteudo !== '📷 Foto' && (
                    <p style={styles.messageText}>{msg.conteudo}</p>
                  )}

                  {/* Reactions display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div style={chatStyles.reactionsContainer}>
                      {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          style={{
                            ...chatStyles.reactionBadge,
                            ...(userIds.includes(user.id) ? chatStyles.reactionBadgeActive : {})
                          }}
                          onClick={() => addReaction(msg.id, emoji)}
                        >
                          {emoji} {userIds.length}
                        </button>
                      ))}
                    </div>
                  )}

                  <span style={styles.messageTime}>
                    {formatTime(msg.created_at)}
                    {msg.autor_id === user.id && (
                      msg.queued ? (
                        <Clock size={12} style={{ color: '#f59e0b' }} title="Guardado offline" />
                      ) : msg.pending ? (
                        <Clock size={12} />
                      ) : msg.failed ? (
                        <X size={12} style={{ color: '#ef4444' }} />
                      ) : (
                        <CheckCheck size={12} style={{ color: '#6b7280' }} />
                      )
                    )}
                  </span>

                  {/* Emoji reaction button */}
                  {!msg.pending && !msg.failed && (
                    <button
                      className="emoji-btn"
                      style={{
                        ...chatStyles.emojiButton,
                        position: 'absolute',
                        top: 4,
                        right: msg.autor_id === user.id ? 'auto' : 4,
                        left: msg.autor_id === user.id ? 4 : 'auto'
                      }}
                      onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                    >
                      <Smile size={14} />
                    </button>
                  )}

                  {/* Emoji picker popup */}
                  {showEmojiPicker === msg.id && (
                    <div style={chatStyles.emojiPicker}>
                      {EMOJI_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          style={chatStyles.emojiOption}
                          onClick={() => addReaction(msg.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.failed && (
                    <button onClick={() => retryMessage(msg)} style={chatStyles.retryButton}>
                      Tentar novamente
                    </button>
                  )}
                  </div>
                </div>
              )})}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div style={chatStyles.typingIndicator}>
          <div style={chatStyles.typingDots}>
            <span style={{ ...chatStyles.typingDot, animationDelay: '0s' }} />
            <span style={{ ...chatStyles.typingDot, animationDelay: '0.2s' }} />
            <span style={{ ...chatStyles.typingDot, animationDelay: '0.4s' }} />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} está a escrever...`
              : `${typingUsers.slice(0, -1).join(', ')} e ${typingUsers[typingUsers.length - 1]} estão a escrever...`
            }
          </span>
        </div>
      )}

      {/* Photo Preview */}
      {photoPreview && (
        <div style={styles.photoPreviewContainer}>
          <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
          <button onClick={cancelPhoto} style={styles.cancelPhotoButton}>
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div style={styles.inputContainer}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.attachButton}
          disabled={uploadingPhoto}
        >
          <Camera size={24} />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value)
            handleTyping()
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={photoPreview ? "Adiciona uma legenda..." : "Escreve uma mensagem..."}
          style={styles.input}
        />
        <button
          onClick={handleSendMessage}
          disabled={(!newMessage.trim() && !selectedPhoto) || sending || uploadingPhoto}
          style={{
            ...styles.sendButton,
            opacity: (newMessage.trim() || selectedPhoto) ? 1 : 0.5
          }}
        >
          {uploadingPhoto ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Image Modal */}
      {imageModal && (
        <div style={chatStyles.imageModal} onClick={() => setImageModal(null)}>
          <button style={chatStyles.closeButton} onClick={() => setImageModal(null)}>
            <X size={24} />
          </button>
          <img src={imageModal} alt="Foto" style={chatStyles.modalImage} />
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
