import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Send, Camera, Image, Mic, Menu, ArrowLeft, Plus, Check, CheckCheck,
  Clock, Package, AlertTriangle, LogOut, Settings, Bell, BellOff,
  HardHat, MessageSquare, Users, FileText, Loader2, LogIn, LogOut as LogOutIcon,
  CalendarDays, MapPin, ClipboardList
} from 'lucide-react'

// Hook para push notifications
function usePushNotifications() {
  const [permission, setPermission] = useState('default')
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este browser não suporta notificações')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  const subscribe = async () => {
    if (!('serviceWorker' in navigator)) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // VAPID public key - substituir pela chave real
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        )
      })
      setSubscription(sub)
      return sub
    } catch (err) {
      console.error('Erro ao subscrever push:', err)
      return null
    }
  }

  return { permission, subscription, requestPermission, subscribe }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function ObraApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [obras, setObras] = useState([])
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [menuOpen, setMenuOpen] = useState(false)

  // Chat states
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Push notifications
  const { permission, requestPermission, subscribe } = usePushNotifications()

  // Verificar sessão ao carregar
  useEffect(() => {
    checkSession()
    registerServiceWorker()
  }, [])

  // Carregar mensagens quando obra muda
  useEffect(() => {
    if (obra) {
      loadMessages()
      subscribeToMessages()
    }
  }, [obra])

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const checkSession = async () => {
    try {
      const savedUser = localStorage.getItem('obra_app_user')
      const savedObras = localStorage.getItem('obra_app_obras')
      const savedObra = localStorage.getItem('obra_app_obra')

      if (savedUser) {
        const userData = JSON.parse(savedUser)
        setUser(userData)

        if (savedObras) {
          const obrasData = JSON.parse(savedObras)
          setObras(obrasData)

          // If only one obra or has saved obra, select it
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

  // Handle photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleciona uma imagem')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB')
      return
    }

    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  // Upload photo to Supabase Storage
  const uploadPhoto = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${obra.id}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('obra-fotos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('obra-fotos')
      .getPublicUrl(fileName)

    return publicUrl
  }

  // Cancel photo selection
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

    let photoUrl = null

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

    // Clear photo state
    const photoToUpload = selectedPhoto
    cancelPhoto()

    try {
      // Upload photo if selected
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

      // Update message with real photo URL
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id
          ? { ...m, pending: false, anexos: photoUrl ? [{ url: photoUrl, tipo: 'image' }] : null }
          : m
      ))
    } catch (err) {
      console.error('Erro ao enviar:', err)
      setUploadingPhoto(false)
      // Mark as failed
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? { ...m, failed: true, pending: false } : m
      ))
    } finally {
      setSending(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('obra_app_user')
    localStorage.removeItem('obra_app_obras')
    localStorage.removeItem('obra_app_obra')
    setUser(null)
    setObras([])
    setObra(null)
  }

  const handleSwitchObra = () => {
    localStorage.removeItem('obra_app_obra')
    setObra(null)
  }

  const enableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      await subscribe()
      alert('Notificações ativadas!')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 style={{ ...styles.spinner, animation: 'spin 1s linear infinite' }} />
        <p>A carregar...</p>
      </div>
    )
  }

  // Login screen (not logged in)
  if (!user) {
    return <WorkerLogin onLogin={(u, obrasData) => {
      setUser(u)
      setObras(obrasData)
      if (obrasData.length === 1) {
        setObra(obrasData[0])
        localStorage.setItem('obra_app_obra', JSON.stringify(obrasData[0]))
      }
    }} />
  }

  // Obra selector (logged in but no obra selected)
  if (!obra && obras.length > 1) {
    return <ObraSelector obras={obras} onSelect={(o) => {
      setObra(o)
      localStorage.setItem('obra_app_obra', JSON.stringify(o))
    }} />
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
                    {/* Show photo if exists */}
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
          style={{ ...styles.navButton, ...(activeTab === 'chat' ? styles.navButtonActive : {}) }}
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('materiais')}
          style={{ ...styles.navButton, ...(activeTab === 'materiais' ? styles.navButtonActive : {}) }}
        >
          <Package size={20} />
          <span>Materiais</span>
        </button>
        <button
          onClick={() => setActiveTab('presencas')}
          style={{ ...styles.navButton, ...(activeTab === 'presencas' ? styles.navButtonActive : {}) }}
        >
          <Clock size={20} />
          <span>Presenças</span>
        </button>
        <button
          onClick={() => setActiveTab('equipa')}
          style={{ ...styles.navButton, ...(activeTab === 'equipa' ? styles.navButtonActive : {}) }}
        >
          <Users size={20} />
          <span>Equipa</span>
        </button>
      </nav>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Worker Login Component
function WorkerLogin({ onLogin }) {
  const [loginType, setLoginType] = useState('phone') // 'phone' or 'email'
  const [telefone, setTelefone] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handlePhoneLogin = async () => {
    if (!telefone.trim() || !pin.trim()) return

    setLoading(true)
    setError('')

    try {
      // Format phone number
      let phone = telefone.replace(/\s/g, '')
      if (!phone.startsWith('+')) {
        phone = '+351' + phone.replace(/^0/, '')
      }

      // Check credentials
      const { data: trabalhador, error: authError } = await supabase
        .from('trabalhadores')
        .select('id, nome, telefone, cargo')
        .eq('telefone', phone)
        .eq('pin', pin)
        .eq('ativo', true)
        .single()

      if (authError || !trabalhador) {
        throw new Error('Telefone ou PIN incorreto')
      }

      // Get assigned obras
      const { data: obrasData, error: obrasError } = await supabase
        .from('trabalhador_obras')
        .select('obra_id, obras(id, codigo, nome)')
        .eq('trabalhador_id', trabalhador.id)

      if (obrasError) throw obrasError

      const obras = obrasData?.map(o => o.obras).filter(Boolean) || []

      if (obras.length === 0) {
        throw new Error('Não tens obras atribuídas')
      }

      // Save to localStorage
      const user = {
        id: trabalhador.id,
        nome: trabalhador.nome,
        telefone: trabalhador.telefone,
        cargo: trabalhador.cargo || 'Equipa',
        tipo: 'trabalhador'
      }

      localStorage.setItem('obra_app_user', JSON.stringify(user))
      localStorage.setItem('obra_app_obras', JSON.stringify(obras))

      onLogin(user, obras)
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError('')

    try {
      // Use Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (authError) {
        throw new Error(authError.message === 'Invalid login credentials'
          ? 'Email ou password incorretos'
          : authError.message)
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, email, cargo')
        .eq('id', authData.user.id)
        .single()

      // Get all obras (managers can access all)
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })

      if (obrasError) throw obrasError

      const user = {
        id: authData.user.id,
        nome: profile?.nome || authData.user.email.split('@')[0],
        email: authData.user.email,
        cargo: profile?.cargo || 'Gestão',
        tipo: 'gestao'
      }

      localStorage.setItem('obra_app_user', JSON.stringify(user))
      localStorage.setItem('obra_app_obras', JSON.stringify(obrasData || []))

      onLogin(user, obrasData || [])
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    if (loginType === 'phone') {
      handlePhoneLogin()
    } else {
      handleEmailLogin()
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Introduz o teu email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password'
      })

      if (resetError) throw resetError

      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  // Reset password mode
  if (resetMode) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <HardHat size={48} style={{ color: '#6b7280' }} />
            <h1 style={{ margin: '12px 0 4px' }}>Recuperar Password</h1>
            <p style={{ margin: 0, opacity: 0.7 }}>Vamos enviar um email de recuperação</p>
          </div>

          {resetSent ? (
            <>
              <div style={styles.successMessage}>
                <Check size={20} /> Email enviado! Verifica a tua caixa de entrada.
              </div>
              <button
                onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                style={styles.loginButton}
              >
                Voltar ao Login
              </button>
            </>
          ) : (
            <>
              <div style={styles.loginField}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                  placeholder="email@gavinho.pt"
                  style={styles.loginInput}
                  autoFocus
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button
                onClick={handleResetPassword}
                disabled={loading || !email.trim()}
                style={styles.loginButton}
              >
                {loading ? 'A enviar...' : 'Enviar Email'}
              </button>

              <button
                onClick={() => { setResetMode(false); setError('') }}
                style={{ ...styles.loginButton, background: 'transparent', color: '#666', marginTop: 8 }}
              >
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <HardHat size={48} style={{ color: '#6b7280' }} />
          <h1 style={{ margin: '12px 0 4px' }}>Gavinho Obras</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>App de comunicação da equipa</p>
        </div>

        {/* Login type toggle */}
        <div style={styles.loginToggle}>
          <button
            onClick={() => { setLoginType('phone'); setError('') }}
            style={{
              ...styles.toggleButton,
              ...(loginType === 'phone' ? styles.toggleButtonActive : {})
            }}
          >
            Trabalhador
          </button>
          <button
            onClick={() => { setLoginType('email'); setError('') }}
            style={{
              ...styles.toggleButton,
              ...(loginType === 'email' ? styles.toggleButtonActive : {})
            }}
          >
            Gestão
          </button>
        </div>

        {loginType === 'phone' ? (
          <>
            <div style={styles.loginField}>
              <label>Telemóvel</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="912 345 678"
                style={styles.loginInput}
                autoFocus
              />
            </div>

            <div style={styles.loginField}>
              <label>PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••"
                maxLength={6}
                style={{ ...styles.loginInput, letterSpacing: 8, textAlign: 'center' }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={styles.loginField}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gavinho.pt"
                style={styles.loginInput}
                autoFocus
              />
            </div>

            <div style={styles.loginField}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={styles.loginInput}
              />
            </div>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || (loginType === 'phone' ? (!telefone.trim() || !pin.trim()) : (!email.trim() || !password.trim()))}
          style={styles.loginButton}
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 16 }}>
          {loginType === 'phone'
            ? 'Não tens conta? Fala com o teu encarregado.'
            : (
              <>
                <span>Usa as mesmas credenciais da plataforma web.</span>
                <br />
                <button
                  onClick={() => { setResetMode(true); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#3d4349', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, marginTop: 8 }}
                >
                  Esqueci a password
                </button>
              </>
            )
          }
        </p>
      </div>
    </div>
  )
}

// Obra Selector (when user has multiple obras)
function ObraSelector({ obras, onSelect }) {
  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <HardHat size={48} style={{ color: '#6b7280' }} />
          <h1 style={{ margin: '12px 0 4px' }}>As tuas obras</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Seleciona uma obra</p>
        </div>

        <div style={styles.obrasList}>
          {obras.map(obra => (
            <button
              key={obra.id}
              onClick={() => onSelect(obra)}
              style={styles.obraItem}
            >
              <HardHat size={24} style={{ color: '#6b7280' }} />
              <div>
                <strong>{obra.codigo}</strong>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{obra.nome}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Componente Pedir Materiais
function PedirMateriais({ obra, user }) {
  const [material, setMaterial] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [urgente, setUrgente] = useState(false)
  const [notas, setNotas] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [requisicoes, setRequisicoes] = useState([])
  const [loadingReqs, setLoadingReqs] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadRequisicoes()
  }, [obra, user])

  const loadRequisicoes = async () => {
    setLoadingReqs(true)
    try {
      const { data } = await supabase
        .from('requisicoes_materiais')
        .select('*')
        .eq('obra_id', obra.id)
        .order('data_pedido', { ascending: false })
        .limit(20)

      setRequisicoes(data || [])
    } catch (err) {
      console.error('Erro ao carregar requisições:', err)
    } finally {
      setLoadingReqs(false)
    }
  }

  const handleSubmit = async () => {
    if (!material.trim() || !quantidade) return

    setSending(true)
    try {
      // Guardar na tabela de requisições
      const { error } = await supabase.from('requisicoes_materiais').insert({
        obra_id: obra.id,
        pedido_por_id: user.id,
        pedido_por_nome: user.nome,
        pedido_por_tipo: user.tipo || 'trabalhador',
        material: material.trim(),
        quantidade: parseFloat(quantidade),
        unidade,
        notas: notas || null,
        urgente,
        status: 'pendente'
      })

      if (error) throw error

      // Enviar notificação no chat
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `📦 REQUISIÇÃO DE MATERIAL${urgente ? ' (URGENTE)' : ''}\n${quantidade} ${unidade} de ${material}${notas ? `\nNotas: ${notas}` : ''}\n\n⏳ Aguarda aprovação do Encarregado`,
        tipo: 'requisicao_material'
      })

      setSuccess(true)
      setMaterial('')
      setQuantidade('')
      setNotas('')
      setUrgente(false)
      setShowForm(false)
      loadRequisicoes()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao enviar requisição:', err)
      alert('Erro ao enviar requisição: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSending(false)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pendente':
        return { text: 'Aguarda Encarregado', color: '#FF9800', bg: '#FFF3E0', icon: '⏳' }
      case 'aprovado':
        return { text: 'Aguarda Direção', color: '#2196F3', bg: '#E3F2FD', icon: '✓' }
      case 'validado':
        return { text: 'Validado', color: '#4CAF50', bg: '#E8F5E9', icon: '✓✓' }
      case 'rejeitado':
        return { text: 'Rejeitado', color: '#F44336', bg: '#FFEBEE', icon: '✕' }
      case 'entregue':
        return { text: 'Entregue', color: '#9C27B0', bg: '#F3E5F5', icon: '📦' }
      default:
        return { text: status, color: '#666', bg: '#f5f5f5', icon: '?' }
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={styles.formContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...styles.formTitle, marginBottom: 0 }}>
          <Package size={24} /> Materiais
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={requisicaoStyles.novaReqButton}
          >
            <Plus size={18} />
            Nova Requisição
          </button>
        )}
      </div>

      {success && (
        <div style={styles.successMessage}>
          <Check size={20} /> Requisição enviada! Aguarda aprovação.
        </div>
      )}

      {/* Formulário de nova requisição */}
      {showForm && (
        <div style={requisicaoStyles.formCard}>
          <div style={requisicaoStyles.formHeader}>
            <span>Nova Requisição de Material</span>
            <button onClick={() => setShowForm(false)} style={requisicaoStyles.closeFormButton}>✕</button>
          </div>

          <div style={styles.formField}>
            <label>Material *</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Ex: Cimento Portland"
              style={styles.formInput}
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formField, flex: 1 }}>
              <label>Quantidade *</label>
              <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                style={styles.formInput}
              />
            </div>
            <div style={{ ...styles.formField, width: 100 }}>
              <label>Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                style={styles.formInput}
              >
                <option value="un">un</option>
                <option value="kg">kg</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="m³">m³</option>
                <option value="sacos">sacos</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>

          <div style={styles.formField}>
            <label>Notas adicionais</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Especificações, marca preferida..."
              style={{ ...styles.formInput, minHeight: 60 }}
            />
          </div>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={urgente}
              onChange={(e) => setUrgente(e.target.checked)}
            />
            <AlertTriangle size={16} style={{ color: urgente ? '#F44336' : '#999' }} />
            <span>Urgente</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={sending || !material.trim() || !quantidade}
            style={styles.submitButton}
          >
            {sending ? 'A enviar...' : 'Enviar Requisição'}
          </button>
        </div>
      )}

      {/* Lista de Requisições */}
      <div style={requisicaoStyles.listSection}>
        <h3 style={requisicaoStyles.listTitle}>Requisições da Obra</h3>

        {loadingReqs ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : requisicoes.length === 0 ? (
          <div style={requisicaoStyles.emptyList}>
            <Package size={40} style={{ opacity: 0.3 }} />
            <p>Ainda não há requisições</p>
          </div>
        ) : (
          <div style={requisicaoStyles.list}>
            {requisicoes.map(req => {
              const statusInfo = getStatusInfo(req.status)
              return (
                <div key={req.id} style={requisicaoStyles.reqCard}>
                  <div style={requisicaoStyles.reqHeader}>
                    <span style={requisicaoStyles.reqMaterial}>
                      {req.urgente && <AlertTriangle size={14} style={{ color: '#F44336' }} />}
                      {req.quantidade} {req.unidade} - {req.material}
                    </span>
                    <span style={{
                      ...requisicaoStyles.statusBadge,
                      color: statusInfo.color,
                      background: statusInfo.bg
                    }}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                  </div>

                  <div style={requisicaoStyles.reqMeta}>
                    <span>Pedido por: <strong>{req.pedido_por_nome}</strong></span>
                    <span>{formatDate(req.data_pedido)}</span>
                  </div>

                  {req.notas && (
                    <p style={requisicaoStyles.reqNotas}>{req.notas}</p>
                  )}

                  {/* Aprovações */}
                  {req.aprovado_por_nome && (
                    <div style={requisicaoStyles.aprovacao}>
                      <Check size={14} style={{ color: '#4CAF50' }} />
                      Aprovado por: <strong>{req.aprovado_por_nome}</strong> - Encarregado
                    </div>
                  )}

                  {req.validado_por_nome && (
                    <div style={requisicaoStyles.aprovacao}>
                      <CheckCheck size={14} style={{ color: '#2196F3' }} />
                      Validado por: <strong>{req.validado_por_nome}</strong> - Direção Operação
                    </div>
                  )}

                  {req.status === 'rejeitado' && req.motivo_rejeicao && (
                    <div style={{ ...requisicaoStyles.aprovacao, color: '#F44336' }}>
                      Motivo: {req.motivo_rejeicao}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Styles for Requisições
const requisicaoStyles = {
  novaReqButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: '#3d4349',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  formCard: {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    fontWeight: 600,
    color: '#3d4349'
  },
  closeFormButton: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#999'
  },
  listSection: {
    marginTop: 8
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12
  },
  emptyList: {
    textAlign: 'center',
    padding: 32,
    color: '#888'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  reqCard: {
    background: 'white',
    borderRadius: 10,
    padding: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
  },
  reqHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8
  },
  reqMaterial: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    color: '#333',
    fontSize: 14,
    flex: 1
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 12,
    whiteSpace: 'nowrap'
  },
  reqMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#888',
    marginBottom: 6
  },
  reqNotas: {
    fontSize: 13,
    color: '#666',
    background: '#f8f8f8',
    padding: '8px 10px',
    borderRadius: 6,
    margin: '8px 0 0 0'
  },
  aprovacao: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    padding: '6px 0',
    borderTop: '1px solid #f0f0f0'
  }
}

// Componente Registo de Presença (Check-in/Check-out)
function RegistoPresenca({ obra, user }) {
  const [presencaHoje, setPresencaHoje] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notas, setNotas] = useState('')

  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadPresencas()
  }, [obra, user])

  const loadPresencas = async () => {
    setLoading(true)
    try {
      // Carregar presença de hoje
      const { data: hojeData } = await supabase
        .from('presencas')
        .select('*')
        .eq('trabalhador_id', user.id)
        .eq('obra_id', obra.id)
        .eq('data', hoje)
        .single()

      setPresencaHoje(hojeData || null)

      // Carregar histórico da última semana
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)

      const { data: historicoData } = await supabase
        .from('presencas')
        .select('*')
        .eq('trabalhador_id', user.id)
        .eq('obra_id', obra.id)
        .gte('data', semanaAtras.toISOString().split('T')[0])
        .order('data', { ascending: false })
        .limit(7)

      setHistorico(historicoData || [])
    } catch (err) {
      console.error('Erro ao carregar presenças:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const { data, error } = await supabase
        .from('presencas')
        .insert({
          trabalhador_id: user.id,
          obra_id: obra.id,
          data: hoje,
          hora_entrada: agora,
          notas: notas || null
        })
        .select()
        .single()

      if (error) throw error

      setPresencaHoje(data)
      setNotas('')

      // Enviar mensagem no chat
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `✅ ${user.nome} fez check-in às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
        tipo: 'presenca'
      })

      loadPresencas()
    } catch (err) {
      console.error('Erro ao fazer check-in:', err)
      alert('Erro ao fazer check-in: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!presencaHoje) return

    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const { error } = await supabase
        .from('presencas')
        .update({
          hora_saida: agora,
          notas: notas || presencaHoje.notas
        })
        .eq('id', presencaHoje.id)

      if (error) throw error

      // Calcular horas trabalhadas
      const entrada = new Date(presencaHoje.hora_entrada)
      const saida = new Date()
      const horasTrabalhadas = ((saida - entrada) / (1000 * 60 * 60)).toFixed(1)

      // Enviar mensagem no chat
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `🏁 ${user.nome} fez check-out às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} (${horasTrabalhadas}h trabalhadas)`,
        tipo: 'presenca'
      })

      setNotas('')
      loadPresencas()
    } catch (err) {
      console.error('Erro ao fazer check-out:', err)
      alert('Erro ao fazer check-out')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    return new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return null
    const diff = new Date(saida) - new Date(entrada)
    return (diff / (1000 * 60 * 60)).toFixed(1)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return `${diasSemana[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const jaFezCheckIn = presencaHoje && presencaHoje.hora_entrada
  const jaFezCheckOut = presencaHoje && presencaHoje.hora_saida

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Clock size={24} /> Registo de Presença
      </h2>

      {/* Status Card */}
      <div style={presencaStyles.statusCard}>
        <div style={presencaStyles.statusHeader}>
          <CalendarDays size={20} />
          <span>Hoje, {new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</span>
        </div>

        <div style={presencaStyles.statusBody}>
          {!jaFezCheckIn ? (
            <>
              <div style={presencaStyles.statusIcon}>
                <LogIn size={48} style={{ color: '#3d4349' }} />
              </div>
              <p style={presencaStyles.statusText}>Ainda não fizeste check-in hoje</p>

              <div style={{ width: '100%', marginBottom: 12 }}>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas (opcional)"
                  style={styles.formInput}
                />
              </div>

              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                style={presencaStyles.checkInButton}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <LogIn size={20} />
                    Fazer Check-in
                  </>
                )}
              </button>
            </>
          ) : !jaFezCheckOut ? (
            <>
              <div style={presencaStyles.statusIconActive}>
                <Check size={32} style={{ color: 'white' }} />
              </div>
              <p style={presencaStyles.statusTextActive}>Em trabalho desde as {formatTime(presencaHoje.hora_entrada)}</p>

              <div style={presencaStyles.timeDisplay}>
                <div style={presencaStyles.timeItem}>
                  <span style={presencaStyles.timeLabel}>Entrada</span>
                  <span style={presencaStyles.timeValue}>{formatTime(presencaHoje.hora_entrada)}</span>
                </div>
                <div style={presencaStyles.timeSeparator}>→</div>
                <div style={presencaStyles.timeItem}>
                  <span style={presencaStyles.timeLabel}>Saída</span>
                  <span style={{ ...presencaStyles.timeValue, color: '#999' }}>--:--</span>
                </div>
              </div>

              <div style={{ width: '100%', marginBottom: 12 }}>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas do dia (opcional)"
                  style={styles.formInput}
                />
              </div>

              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                style={presencaStyles.checkOutButton}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <LogOutIcon size={20} />
                    Fazer Check-out
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div style={presencaStyles.statusIconDone}>
                <CheckCheck size={32} style={{ color: 'white' }} />
              </div>
              <p style={presencaStyles.statusTextDone}>Dia completo!</p>

              <div style={presencaStyles.timeDisplay}>
                <div style={presencaStyles.timeItem}>
                  <span style={presencaStyles.timeLabel}>Entrada</span>
                  <span style={presencaStyles.timeValue}>{formatTime(presencaHoje.hora_entrada)}</span>
                </div>
                <div style={presencaStyles.timeSeparator}>→</div>
                <div style={presencaStyles.timeItem}>
                  <span style={presencaStyles.timeLabel}>Saída</span>
                  <span style={presencaStyles.timeValue}>{formatTime(presencaHoje.hora_saida)}</span>
                </div>
              </div>

              <div style={presencaStyles.horasTrabalhadas}>
                <Clock size={16} />
                <strong>{calcularHoras(presencaHoje.hora_entrada, presencaHoje.hora_saida)}h</strong> trabalhadas
              </div>

              {presencaHoje.notas && (
                <p style={presencaStyles.notasText}>📝 {presencaHoje.notas}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div style={presencaStyles.historicoSection}>
        <h3 style={presencaStyles.historicoTitle}>Últimos 7 dias</h3>

        {historico.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Sem registos anteriores</p>
        ) : (
          <div style={presencaStyles.historicoList}>
            {historico.filter(h => h.data !== hoje).map(h => (
              <div key={h.id} style={presencaStyles.historicoItem}>
                <div style={presencaStyles.historicoDate}>
                  {formatDate(h.data)}
                </div>
                <div style={presencaStyles.historicoTimes}>
                  <span>{formatTime(h.hora_entrada)}</span>
                  <span style={{ color: '#999' }}>→</span>
                  <span>{formatTime(h.hora_saida)}</span>
                </div>
                <div style={presencaStyles.historicoHoras}>
                  {h.hora_saida ? `${calcularHoras(h.hora_entrada, h.hora_saida)}h` : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Styles for RegistoPresenca
const presencaStyles = {
  statusCard: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: 24
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: '#3d4349',
    color: 'white',
    fontSize: 14
  },
  statusBody: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  statusIconActive: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#4CAF50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
  },
  statusIconDone: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#2196F3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  statusText: {
    color: '#666',
    marginBottom: 16,
    fontSize: 15
  },
  statusTextActive: {
    color: '#4CAF50',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: 500
  },
  statusTextDone: {
    color: '#2196F3',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: 500
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    padding: '12px 20px',
    background: '#f8f8f8',
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center'
  },
  timeItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  timeLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase'
  },
  timeValue: {
    fontSize: 20,
    fontWeight: 600,
    color: '#3d4349'
  },
  timeSeparator: {
    color: '#999',
    fontSize: 18
  },
  horasTrabalhadas: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#E3F2FD',
    borderRadius: 20,
    color: '#1976D2',
    fontSize: 14
  },
  notasText: {
    marginTop: 12,
    padding: '8px 12px',
    background: '#FFF9C4',
    borderRadius: 8,
    fontSize: 13,
    color: '#666',
    width: '100%',
    textAlign: 'center'
  },
  checkInButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px',
    background: '#4CAF50',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  checkOutButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px',
    background: '#F44336',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  historicoSection: {
    marginTop: 8
  },
  historicoTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12
  },
  historicoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  historicoItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'white',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  historicoDate: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: '#333'
  },
  historicoTimes: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#666'
  },
  historicoHoras: {
    marginLeft: 16,
    padding: '4px 10px',
    background: '#f0f0f0',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: '#3d4349'
  }
}

// Componente Equipa
function Equipa({ obra }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembros()
  }, [obra])

  const loadMembros = async () => {
    try {
      const { data } = await supabase
        .from('obra_membros')
        .select('*')
        .eq('obra_id', obra.id)
        .eq('ativo', true)

      setMembros(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={styles.loading}><Loader2 style={{ animation: 'spin 1s linear infinite' }} /></div>
  }

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Users size={24} /> Equipa da Obra
      </h2>

      {membros.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} style={{ opacity: 0.3 }} />
          <p>Sem membros registados</p>
        </div>
      ) : (
        <div style={styles.membrosList}>
          {membros.map(m => (
            <div key={m.id} style={styles.membroItem}>
              <div style={styles.membroAvatar}>
                {m.nome?.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{m.nome}</strong>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{m.cargo || 'Equipa'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16
  },
  spinner: {
    width: 40,
    height: 40,
    color: '#3d4349'
  },
  header: {
    background: '#3d4349',
    color: 'white',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  menuButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 4
  },
  headerTitle: {
    flex: 1
  },
  obraCode: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600
  },
  obraNome: {
    margin: 0,
    fontSize: 12,
    opacity: 0.7
  },
  headerActions: {
    display: 'flex',
    gap: 8
  },
  iconButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 4
  },
  menuOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    background: '#3d4349',
    color: 'white',
    display: 'flex',
    flexDirection: 'column'
  },
  menuHeader: {
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  menuNav: {
    flex: 1,
    padding: '12px 0'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: 'rgba(244, 67, 54, 0.1)',
    border: 'none',
    color: '#F44336',
    fontSize: 14,
    cursor: 'pointer'
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#e8e9ea'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#667781'
  },
  message: {
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: 8,
    boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
  },
  messageOwn: {
    alignSelf: 'flex-end',
    background: '#d4d6d8',
    borderBottomRightRadius: 0
  },
  messageOther: {
    alignSelf: 'flex-start',
    background: 'white',
    borderBottomLeftRadius: 0
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: 600,
    color: '#3d4349',
    display: 'block',
    marginBottom: 2
  },
  messageText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap'
  },
  messagePhoto: {
    maxWidth: '100%',
    maxHeight: 300,
    borderRadius: 8,
    marginBottom: 4,
    cursor: 'pointer'
  },
  photoPreviewContainer: {
    position: 'relative',
    padding: 12,
    background: '#F0F2F5',
    borderTop: '1px solid #E5E5E5'
  },
  photoPreview: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 8
  },
  cancelPhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16
  },
  messageTime: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    fontSize: 11,
    color: '#667781',
    marginTop: 4
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: '#F0F2F5'
  },
  attachButton: {
    background: 'none',
    border: 'none',
    color: '#54656F',
    cursor: 'pointer',
    padding: 8
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: 24,
    fontSize: 14,
    outline: 'none'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#3d4349',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  bottomNav: {
    display: 'flex',
    background: 'white',
    borderTop: '1px solid #E5E5E5',
    padding: '8px 0'
  },
  navButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 11,
    cursor: 'pointer'
  },
  navButtonActive: {
    color: '#3d4349'
  },
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#3d4349',
    padding: 20
  },
  loginCard: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: 24
  },
  loginField: {
    marginBottom: 16
  },
  loginInput: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #E5E5E5',
    borderRadius: 8,
    fontSize: 16,
    marginTop: 6,
    outline: 'none',
    boxSizing: 'border-box'
  },
  loginButton: {
    width: '100%',
    padding: 14,
    background: '#3d4349',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12
  },
  error: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center'
  },
  obrasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 16
  },
  obraItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#F5F5F5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left'
  },
  selectedObraCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 20
  },
  changeButton: {
    marginLeft: 'auto',
    padding: '6px 12px',
    background: 'none',
    border: '1px solid #4CAF50',
    borderRadius: 4,
    color: '#4CAF50',
    fontSize: 12,
    cursor: 'pointer'
  },
  formContainer: {
    flex: 1,
    padding: 20,
    overflowY: 'auto'
  },
  formTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    marginBottom: 20
  },
  formField: {
    marginBottom: 16
  },
  formRow: {
    display: 'flex',
    gap: 12
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #DDD',
    borderRadius: 8,
    fontSize: 14,
    marginTop: 4,
    boxSizing: 'border-box'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    cursor: 'pointer'
  },
  submitButton: {
    width: '100%',
    padding: 14,
    background: '#3d4349',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: 8,
    marginBottom: 16
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    color: '#888'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  membrosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  membroItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  membroAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#3d4349',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600
  },
  loginToggle: {
    display: 'flex',
    background: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20
  },
  toggleButton: {
    flex: 1,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  toggleButtonActive: {
    background: 'white',
    color: '#3d4349',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }
}
