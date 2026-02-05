// =====================================================
// OBRA APP - MAIN COMPONENT
// PWA for construction workers - refactored version
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Send, Camera, Menu, Check, CheckCheck, Clock,
  Package, LogOut, Bell, BellOff, HardHat,
  MessageSquare, Users, Loader2
} from 'lucide-react'

// Import extracted components
import {
  WorkerLogin,
  ObraSelector,
  PedirMateriais,
  RegistoPresenca,
  Equipa
} from './components'

// Import hooks
import { usePushNotifications } from './hooks'

// Import styles and utilities
import { styles } from './styles'
import { STORAGE_KEYS } from './utils'

export default function ObraApp() {
  // Core state
  const [user, setUser] = useState(null)
  const [obras, setObras] = useState([])
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [menuOpen, setMenuOpen] = useState(false)

  // Chat state
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Refs
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Push notifications
  const { permission, requestPermission, subscribe } = usePushNotifications()

  // Initialize on mount
  useEffect(() => {
    checkSession()
    registerServiceWorker()
  }, [])

  // Load messages when obra changes
  useEffect(() => {
    if (obra) {
      loadMessages()
      const unsubscribe = subscribeToMessages()
      return unsubscribe
    }
  }, [obra])

  // Scroll to last message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ========== SERVICE WORKER ==========
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registado:', registration)
      } catch (err) {
        console.error('Erro ao registar SW:', err)
      }
    }
  }

  // ========== SESSION MANAGEMENT ==========
  const checkSession = async () => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
      const savedObras = localStorage.getItem(STORAGE_KEYS.OBRAS)
      const savedObra = localStorage.getItem(STORAGE_KEYS.OBRA)

      if (savedUser) {
        const userData = JSON.parse(savedUser)
        setUser(userData)

        if (savedObras) {
          const obrasData = JSON.parse(savedObras)
          setObras(obrasData)

          if (obrasData.length === 1) {
            setObra(obrasData[0])
          } else if (savedObra) {
            setObra(JSON.parse(savedObra))
          }
        }
      }
    } catch (err) {
      console.error('Erro ao verificar sessão:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData, obrasData) => {
    setUser(userData)
    setObras(obrasData)
    if (obrasData.length === 1) {
      setObra(obrasData[0])
      localStorage.setItem(STORAGE_KEYS.OBRA, JSON.stringify(obrasData[0]))
    }
  }

  const handleSelectObra = (selectedObra) => {
    setObra(selectedObra)
    localStorage.setItem(STORAGE_KEYS.OBRA, JSON.stringify(selectedObra))
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.OBRAS)
    localStorage.removeItem(STORAGE_KEYS.OBRA)
    setUser(null)
    setObras([])
    setObra(null)
  }

  const handleSwitchObra = () => {
    localStorage.removeItem(STORAGE_KEYS.OBRA)
    setObra(null)
  }

  // ========== CHAT FUNCTIONALITY ==========
  const loadMessages = async () => {
    if (!obra) return

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
        setMessages(prev => [...prev, payload.new])
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
    const tempMessage = {
      id: Date.now(),
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

      const { error } = await supabase
        .from('obra_mensagens')
        .insert({
          obra_id: obra.id,
          autor_id: user.id,
          autor_nome: user.nome,
          conteudo: messageText || (photoUrl ? '📷 Foto' : ''),
          tipo: photoUrl ? 'foto' : 'texto',
          anexos: photoUrl ? [{ url: photoUrl, tipo: 'image' }] : null
        })

      if (error) throw error

      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id
          ? { ...m, pending: false, anexos: photoUrl ? [{ url: photoUrl, tipo: 'image' }] : null }
          : m
      ))
    } catch (err) {
      console.error('Erro ao enviar:', err)
      setUploadingPhoto(false)
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? { ...m, failed: true, pending: false } : m
      ))
    } finally {
      setSending(false)
    }
  }

  // ========== NOTIFICATIONS ==========
  const enableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      await subscribe()
      alert('Notificações ativadas!')
    }
  }

  // ========== RENDER ==========

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 style={{ ...styles.spinner, animation: 'spin 1s linear infinite' }} />
        <p>A carregar...</p>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return <WorkerLogin onLogin={handleLogin} />
  }

  // Obra selector
  if (!obra && obras.length > 1) {
    return <ObraSelector obras={obras} onSelect={handleSelectObra} />
  }

  // No obras assigned
  if (!obra && obras.length === 0) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <HardHat size={48} style={{ color: '#6b7280' }} />
            <h1 style={{ margin: '12px 0 4px' }}>Olá, {user.nome}</h1>
            <p style={{ margin: 0, opacity: 0.7 }}>Não tens obras atribuídas</p>
          </div>
          <p style={{ textAlign: 'center', color: '#666' }}>
            Fala com o teu encarregado para seres adicionado a uma obra.
          </p>
          <button onClick={handleLogout} style={styles.loginButton}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
          <Menu size={24} />
        </button>
        <div style={styles.headerTitle}>
          <h1 style={styles.obraCode}>{obra.codigo}</h1>
          <p style={styles.obraNome}>{obra.nome}</p>
        </div>
        <div style={styles.headerActions}>
          {permission !== 'granted' ? (
            <button onClick={enableNotifications} style={styles.iconButton}>
              <BellOff size={20} />
            </button>
          ) : (
            <Bell size={20} style={{ color: '#4CAF50' }} />
          )}
        </div>
      </header>

      {/* Side Menu */}
      {menuOpen && (
        <div style={styles.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div style={styles.menu} onClick={e => e.stopPropagation()}>
            <div style={styles.menuHeader}>
              <HardHat size={32} />
              <div>
                <strong>{user.nome}</strong>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{user.cargo || 'Equipa'}</p>
              </div>
            </div>
            <nav style={styles.menuNav}>
              <button onClick={() => { setActiveTab('chat'); setMenuOpen(false) }} style={styles.menuItem}>
                <MessageSquare size={20} /> Chat da Obra
              </button>
              <button onClick={() => { setActiveTab('materiais'); setMenuOpen(false) }} style={styles.menuItem}>
                <Package size={20} /> Pedir Materiais
              </button>
              <button onClick={() => { setActiveTab('presencas'); setMenuOpen(false) }} style={styles.menuItem}>
                <Clock size={20} /> Presenças
              </button>
              <button onClick={() => { setActiveTab('equipa'); setMenuOpen(false) }} style={styles.menuItem}>
                <Users size={20} /> Equipa
              </button>
            </nav>
            {obras.length > 1 && (
              <button onClick={() => { handleSwitchObra(); setMenuOpen(false) }} style={styles.menuItem}>
                <HardHat size={20} /> Mudar de Obra
              </button>
            )}
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'chat' && (
          <div style={styles.chatContainer}>
            {/* Messages */}
            <div style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div style={styles.emptyChat}>
                  <MessageSquare size={48} style={{ opacity: 0.3 }} />
                  <p>Ainda não há mensagens</p>
                  <p style={{ fontSize: 12 }}>Começa a conversa!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.message,
                      ...(msg.autor_id === user.id ? styles.messageOwn : styles.messageOther),
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
                        onClick={() => window.open(msg.anexos[0].url, '_blank')}
                      />
                    )}
                    {msg.conteudo && msg.conteudo !== '📷 Foto' && (
                      <p style={styles.messageText}>{msg.conteudo}</p>
                    )}
                    <span style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      {msg.autor_id === user.id && (
                        msg.pending ? <Clock size={12} /> : <CheckCheck size={12} style={{ color: '#6b7280' }} />
                      )}
                    </span>
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
                {uploadingPhoto ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'materiais' && <PedirMateriais obra={obra} user={user} />}
        {activeTab === 'presencas' && <RegistoPresenca obra={obra} user={user} />}
        {activeTab === 'equipa' && <Equipa obra={obra} />}
      </main>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'chat' ? styles.navButtonActive : {})
          }}
        >
          <MessageSquare size={20} />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('materiais')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'materiais' ? styles.navButtonActive : {})
          }}
        >
          <Package size={20} />
          Materiais
        </button>
        <button
          onClick={() => setActiveTab('presencas')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'presencas' ? styles.navButtonActive : {})
          }}
        >
          <Clock size={20} />
          Presenças
        </button>
        <button
          onClick={() => setActiveTab('equipa')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'equipa' ? styles.navButtonActive : {})
          }}
        >
          <Users size={20} />
          Equipa
        </button>
      </nav>
    </div>
  )
}
