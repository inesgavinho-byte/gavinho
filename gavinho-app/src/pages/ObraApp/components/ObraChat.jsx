// =====================================================
// OBRA CHAT COMPONENT
// Real-time chat for obra team with photo sharing
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Send, Camera, MessageSquare, Check, CheckCheck,
  Clock, Loader2, X, Image as ImageIcon
} from 'lucide-react'
import { styles } from '../styles'

export default function ObraChat({ obra, user }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [imageModal, setImageModal] = useState(null)

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

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
      .subscribe()

    return () => supabase.removeChannel(channel)
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
      conteudo: messageText,
      tipo: selectedPhoto ? 'foto' : 'texto',
      anexos: photoPreview ? [{ url: photoPreview, tipo: 'image' }] : null,
      created_at: new Date().toISOString(),
      pending: true
    }
    setMessages(prev => [...prev, tempMessage])

    const photoToUpload = selectedPhoto
    cancelPhoto()

    try {
      let photoUrl = null
      if (photoToUpload) {
        setUploadingPhoto(true)
        photoUrl = await uploadPhoto(photoToUpload)
        setUploadingPhoto(false)
      }

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

      // Replace temp message with real one
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...data, pending: false } : m
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
              {dateMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    ...(msg.autor_id === user.id ? styles.messageOwn : styles.messageOther),
                    ...(msg.failed ? chatStyles.failedMessage : {}),
                    opacity: msg.pending ? 0.6 : 1
                  }}
                >
                  {msg.autor_id !== user.id && (
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
                  <span style={styles.messageTime}>
                    {formatTime(msg.created_at)}
                    {msg.autor_id === user.id && (
                      msg.pending ? (
                        <Clock size={12} />
                      ) : msg.failed ? (
                        <X size={12} style={{ color: '#ef4444' }} />
                      ) : (
                        <CheckCheck size={12} style={{ color: '#6b7280' }} />
                      )
                    )}
                  </span>
                  {msg.failed && (
                    <button onClick={() => retryMessage(msg)} style={chatStyles.retryButton}>
                      Tentar novamente
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

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
          onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  )
}
