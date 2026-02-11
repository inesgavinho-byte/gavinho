import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, Send, MessageSquare, Loader2, X, HardHat,
  Camera, Check, CheckCheck, Clock, Smile, ArrowLeft, Users
} from 'lucide-react'

// Quick emoji reactions
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '👏', '🔥', '✅']

// Avatar colors for different users
const AVATAR_COLORS = [
  '#4a5d4a', '#8B7355', '#5B8BA0', '#D4A84B', '#6B8E8E',
  '#A67C52', '#7A7A7A', '#9B8B7A'
]

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const getAvatarColor = (userId) => {
  if (!userId) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateSeparator = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ChatObras() {
  const navigate = useNavigate()
  const { user, profile, getUserName, getUserAvatar } = useAuth()

  // Obras sidebar
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [loadingObras, setLoadingObras] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [obraUnreadCounts, setObraUnreadCounts] = useState({})

  // Chat
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [imageModal, setImageModal] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const currentUser = {
    id: profile?.id || user?.id,
    nome: getUserName(),
    avatar: getUserAvatar()
  }

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load obras
  useEffect(() => {
    loadObras()
  }, [])

  const loadObras = async () => {
    try {
      setLoadingObras(true)
      const { data, error } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })
      if (error) throw error
      setObras(data || [])

      // Load last message per obra for preview
      if (data?.length) {
        const counts = {}
        for (const obra of data) {
          const { count } = await supabase
            .from('obra_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('obra_id', obra.id)
          counts[obra.id] = count || 0
        }
        setObraUnreadCounts(counts)
      }
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
    } finally {
      setLoadingObras(false)
    }
  }

  // Load messages when obra selected
  useEffect(() => {
    if (!selectedObra) return
    loadMessages()
    const unsub = subscribeToMessages()
    return unsub
  }, [selectedObra])

  // Typing indicator presence channel
  useEffect(() => {
    if (!selectedObra || !currentUser.id) return
    const presenceChannel = supabase.channel(`typing_${selectedObra.id}`)
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.values(state).flat()
          .filter(u => u.user_id !== currentUser.id && u.typing)
          .map(u => u.nome)
        setTypingUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUser.id,
            nome: currentUser.nome,
            typing: false
          })
        }
      })
    return () => supabase.removeChannel(presenceChannel)
  }, [selectedObra, currentUser.id])

  const loadMessages = async () => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('obra_mensagens')
        .select('*')
        .eq('obra_id', selectedObra.id)
        .order('created_at', { ascending: true })
        .limit(200)
      if (error) throw error
      setMessages(data || [])
      // Scroll to bottom on load
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`obra_chat_${selectedObra.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'obra_mensagens',
        filter: `obra_id=eq.${selectedObra.id}`
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.new.id)
          if (exists) return prev
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
        filter: `obra_id=eq.${selectedObra.id}`
      }, (payload) => {
        setMessages(prev => prev.map(m =>
          m.id === payload.new.id ? { ...m, ...payload.new } : m
        ))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      const container = messagesContainerRef.current
      if (!container) return
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  const broadcastTyping = useCallback(async (typing) => {
    if (!selectedObra || !currentUser.id) return
    try {
      const channel = supabase.channel(`typing_${selectedObra.id}`)
      await channel.track({ user_id: currentUser.id, nome: currentUser.nome, typing })
    } catch (err) { /* ignore */ }
  }, [selectedObra, currentUser.id])

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      broadcastTyping(true)
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      broadcastTyping(false)
    }, 2000)
  }, [isTyping, broadcastTyping])

  // Reactions
  const addReaction = async (messageId, emoji) => {
    setShowEmojiPicker(null)
    const message = messages.find(m => m.id === messageId)
    if (!message || message.pending) return
    const existingReactions = message.reactions || {}
    const reactionUsers = existingReactions[emoji] || []
    let newReactionUsers
    if (reactionUsers.includes(currentUser.id)) {
      newReactionUsers = reactionUsers.filter(id => id !== currentUser.id)
    } else {
      newReactionUsers = [...reactionUsers, currentUser.id]
    }
    const newReactions = { ...existingReactions, [emoji]: newReactionUsers }
    Object.keys(newReactions).forEach(key => {
      if (newReactions[key].length === 0) delete newReactions[key]
    })
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: newReactions } : m))
    try {
      await supabase
        .from('obra_mensagens')
        .update({ reactions: Object.keys(newReactions).length > 0 ? newReactions : null })
        .eq('id', messageId)
    } catch (err) {
      console.error('Erro ao adicionar reação:', err)
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: existingReactions } : m))
    }
  }

  // Photo handling
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10MB'); return }
    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${selectedObra.id}/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('obra-fotos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('obra-fotos')
      .getPublicUrl(fileName)
    return publicUrl
  }

  const cancelPhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedPhoto) || !selectedObra || !currentUser.id) return
    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    const tempId = `temp_${Date.now()}`
    const tempMessage = {
      id: tempId,
      obra_id: selectedObra.id,
      autor_id: currentUser.id,
      autor_nome: currentUser.nome,
      conteudo: messageText,
      tipo: selectedPhoto ? 'foto' : 'texto',
      anexos: photoPreview ? [{ url: photoPreview, tipo: 'image' }] : null,
      created_at: new Date().toISOString(),
      pending: true
    }
    setMessages(prev => [...prev, tempMessage])

    const photoToUpload = selectedPhoto
    const photoFileName = selectedPhoto?.name || null
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
          obra_id: selectedObra.id,
          autor_id: currentUser.id,
          autor_nome: currentUser.nome,
          conteudo: messageText || (photoUrl ? '📷 Foto' : ''),
          tipo: photoUrl ? 'foto' : 'texto',
          anexos: photoUrl ? [{ url: photoUrl, tipo: 'image' }] : null
        })
        .select()
        .single()
      if (error) throw error

      // Auto-register photo in obra_fotografias (Acompanhamento de Obra)
      if (photoUrl) {
        const now = new Date()
        const fotoRecord = {
          obra_id: selectedObra.id,
          url: photoUrl,
          filename: photoFileName || `chat_${now.getTime()}.jpg`,
          titulo: `Chat - ${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
          descricao: `Enviada via Chat por ${currentUser.nome}`,
          data_fotografia: now.toISOString(),
          autor_nome: currentUser.nome,
          tags: ['chat']
        }
        // Try with autor_id FK first, fallback without it
        const { error: fotoErr } = await supabase
          .from('obra_fotografias')
          .insert({ ...fotoRecord, autor_id: currentUser.id })
        if (fotoErr) {
          console.warn('Retry sem autor_id FK:', fotoErr.message)
          await supabase
            .from('obra_fotografias')
            .insert(fotoRecord)
            .then(({ error: retryErr }) => {
              if (retryErr) console.warn('Aviso: foto não registada no acompanhamento:', retryErr.message)
            })
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...data, pending: false } : m
      ))
      // Scroll to bottom after sending
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
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

  const retryMessage = (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setNewMessage(msg.conteudo || '')
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  // Filter obras by search
  const filteredObras = obras.filter(o =>
    o.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--cream)' }}>
      {/* Sidebar - Obras list */}
      {(!isMobile || !selectedObra) && (
        <div style={{
          width: isMobile ? '100%' : '320px',
          minWidth: isMobile ? 'auto' : '320px',
          borderRight: '1px solid var(--stone)',
          background: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--stone)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', margin: '0 0 12px' }}>
              Chat Obras
            </h2>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar obra..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'var(--cream)',
                  color: 'var(--brown)'
                }}
              />
            </div>
          </div>

          {/* Obras list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingObras ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
              </div>
            ) : filteredObras.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                Nenhuma obra encontrada
              </div>
            ) : (
              filteredObras.map(obra => (
                <div
                  key={obra.id}
                  onClick={() => setSelectedObra(obra)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--stone)',
                    background: selectedObra?.id === obra.id ? 'var(--cream)' : 'white',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: selectedObra?.id === obra.id ? 'var(--verde)' : 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <HardHat size={18} style={{ color: selectedObra?.id === obra.id ? 'white' : 'var(--brown)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--brown)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {obra.nome}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: obra.status === 'em_curso' ? '#E8F5E9' : '#FFF3E0',
                        color: obra.status === 'em_curso' ? '#2E7D32' : '#E65100',
                        flexShrink: 0
                      }}>
                        {obra.status === 'em_curso' ? 'Em Curso' : 'Projeto'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{obra.codigo}</span>
                      {obraUnreadCounts[obra.id] > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                          {obraUnreadCounts[obra.id]} msg
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat area */}
      {(!isMobile || selectedObra) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
          {!selectedObra ? (
            // No obra selected
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brown-light)',
              gap: '12px'
            }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '16px', fontWeight: 500 }}>Seleciona uma obra</p>
              <p style={{ fontSize: '13px' }}>Escolhe uma obra no painel esquerdo para iniciar o chat</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--stone)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'white'
              }}>
                {isMobile && (
                  <button
                    onClick={() => setSelectedObra(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown)' }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--verde)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HardHat size={18} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
                    {selectedObra.nome}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: 0 }}>
                    {selectedObra.codigo} • Chat da equipa
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/obras/${selectedObra.id}`)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--cream)',
                    border: '1px solid var(--stone)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--brown)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Users size={14} />
                  Ver Obra
                </button>
              </div>

              {/* Messages area */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  background: 'var(--cream)'
                }}
              >
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--brown-light)',
                    gap: '8px'
                  }}>
                    <MessageSquare size={48} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '14px' }}>Ainda não há mensagens</p>
                    <p style={{ fontSize: '12px' }}>Começa a conversa da equipa!</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                        <span style={{
                          background: 'rgba(74, 93, 74, 0.1)',
                          padding: '4px 14px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: 'var(--brown-light)',
                          fontWeight: 500
                        }}>
                          {formatDateSeparator(dateMessages[0].created_at)}
                        </span>
                      </div>

                      {dateMessages.map((msg, idx) => {
                        const isOwn = msg.autor_id === currentUser.id
                        const prevMsg = dateMessages[idx - 1]
                        const showAvatar = idx === 0 || prevMsg?.autor_id !== msg.autor_id

                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '8px',
                              marginBottom: showAvatar ? '8px' : '2px',
                              flexDirection: isOwn ? 'row-reverse' : 'row'
                            }}
                          >
                            {/* Avatar */}
                            {showAvatar ? (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'white',
                                  flexShrink: 0,
                                  background: getAvatarColor(msg.autor_id),
                                  overflow: 'hidden'
                                }}
                                title={msg.autor_nome}
                              >
                                {getInitials(msg.autor_nome)}
                              </div>
                            ) : (
                              <div style={{ width: '32px', flexShrink: 0 }} />
                            )}

                            {/* Message bubble */}
                            <div
                              style={{
                                maxWidth: '65%',
                                padding: '10px 14px',
                                borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                background: isOwn ? 'var(--verde)' : 'white',
                                color: isOwn ? 'white' : 'var(--brown)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                position: 'relative',
                                opacity: msg.pending ? 0.6 : 1,
                                border: msg.failed ? '1px solid #ef4444' : 'none'
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
                              {/* Author name */}
                              {!isOwn && showAvatar && (
                                <p style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: getAvatarColor(msg.autor_id),
                                  margin: '0 0 4px'
                                }}>
                                  {msg.autor_nome}
                                </p>
                              )}

                              {/* Photo */}
                              {msg.anexos && msg.anexos.length > 0 && msg.anexos[0]?.url && (
                                <img
                                  src={msg.anexos[0].url}
                                  alt="Foto"
                                  style={{
                                    maxWidth: '280px',
                                    maxHeight: '220px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginBottom: msg.conteudo && msg.conteudo !== '📷 Foto' ? '6px' : 0
                                  }}
                                  onClick={() => setImageModal(msg.anexos[0].url)}
                                />
                              )}

                              {/* Text */}
                              {msg.conteudo && msg.conteudo !== '📷 Foto' && (
                                <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
                                  {msg.conteudo}
                                </p>
                              )}

                              {/* Reactions */}
                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                  {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                    <button
                                      key={emoji}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        background: userIds.includes(currentUser.id) ? (isOwn ? 'rgba(255,255,255,0.3)' : '#E8F5E9') : (isOwn ? 'rgba(255,255,255,0.15)' : '#f3f4f6'),
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        border: userIds.includes(currentUser.id) ? '1px solid rgba(74,93,74,0.3)' : '1px solid transparent'
                                      }}
                                      onClick={() => addReaction(msg.id, emoji)}
                                    >
                                      {emoji} {userIds.length}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Time */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                justifyContent: 'flex-end',
                                marginTop: '4px',
                                fontSize: '10px',
                                color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--brown-light)'
                              }}>
                                {formatTime(msg.created_at)}
                                {isOwn && (
                                  msg.pending ? <Clock size={10} /> :
                                  msg.failed ? <X size={10} style={{ color: '#ef4444' }} /> :
                                  <CheckCheck size={10} />
                                )}
                              </div>

                              {/* Emoji reaction button */}
                              {!msg.pending && !msg.failed && (
                                <button
                                  className="emoji-btn"
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: isOwn ? 'auto' : '4px',
                                    left: isOwn ? '4px' : 'auto',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    fontSize: '14px',
                                    color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--brown-light)'
                                  }}
                                  onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                >
                                  <Smile size={14} />
                                </button>
                              )}

                              {/* Emoji picker */}
                              {showEmojiPicker === msg.id && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  right: 0,
                                  background: 'white',
                                  borderRadius: '12px',
                                  padding: '8px',
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                  display: 'flex',
                                  gap: '4px',
                                  zIndex: 10
                                }}>
                                  {EMOJI_REACTIONS.map(emoji => (
                                    <button
                                      key={emoji}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '20px',
                                        padding: '6px',
                                        cursor: 'pointer',
                                        borderRadius: '8px'
                                      }}
                                      onClick={() => addReaction(msg.id, emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Retry button */}
                              {msg.failed && (
                                <button
                                  onClick={() => retryMessage(msg)}
                                  style={{
                                    fontSize: '11px',
                                    color: '#ef4444',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px 0',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  Tentar novamente
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div style={{
                  padding: '6px 20px',
                  fontSize: '12px',
                  color: 'var(--brown-light)',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--cream)',
                  borderTop: '1px solid var(--stone)'
                }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out' }} />
                    <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out 0.2s' }} />
                    <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out 0.4s' }} />
                  </div>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} está a escrever...`
                    : `${typingUsers.slice(0, -1).join(', ')} e ${typingUsers[typingUsers.length - 1]} estão a escrever...`
                  }
                </div>
              )}

              {/* Photo preview */}
              {photoPreview && (
                <div style={{
                  padding: '8px 20px',
                  background: 'var(--cream)',
                  borderTop: '1px solid var(--stone)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                  <button onClick={cancelPhoto} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input area */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--stone)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'white'
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    color: 'var(--brown-light)',
                    borderRadius: '8px'
                  }}
                >
                  <Camera size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={photoPreview ? 'Adiciona uma legenda...' : 'Escreve uma mensagem...'}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid var(--stone)',
                    borderRadius: '24px',
                    fontSize: '14px',
                    background: 'var(--cream)',
                    color: 'var(--brown)',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && !selectedPhoto) || sending || uploadingPhoto}
                  style={{
                    background: 'var(--verde)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    opacity: (newMessage.trim() || selectedPhoto) ? 1 : 0.4
                  }}
                >
                  {uploadingPhoto ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setImageModal(null)}
        >
          <button
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
            onClick={() => setImageModal(null)}
          >
            <X size={24} />
          </button>
          <img src={imageModal} alt="Foto" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
