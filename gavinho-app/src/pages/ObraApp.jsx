import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Send, Camera, Image, Mic, Menu, ArrowLeft, Plus, Check, CheckCheck,
  Clock, Package, AlertTriangle, LogOut, Settings, Bell, BellOff,
  HardHat, MessageSquare, Users, FileText, Loader2
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
  const [user, setUser] = useState(null)
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [menuOpen, setMenuOpen] = useState(false)

  // Chat states
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
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
      const savedObra = localStorage.getItem('obra_app_obra')

      if (savedUser && savedObra) {
        setUser(JSON.parse(savedUser))
        setObra(JSON.parse(savedObra))
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !obra || !user) return

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
      tipo: 'texto',
      created_at: new Date().toISOString(),
      pending: true
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const { error } = await supabase
        .from('obra_mensagens')
        .insert({
          obra_id: obra.id,
          autor_id: user.id,
          autor_nome: user.nome,
          conteudo: messageText,
          tipo: 'texto'
        })

      if (error) throw error

      // Remove pending flag
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? { ...m, pending: false } : m
      ))
    } catch (err) {
      console.error('Erro ao enviar:', err)
      // Mark as failed
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? { ...m, failed: true } : m
      ))
    } finally {
      setSending(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('obra_app_user')
    localStorage.removeItem('obra_app_obra')
    setUser(null)
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

  // Login screen
  if (!user || !obra) {
    return <ObraLogin onLogin={(u, o) => { setUser(u); setObra(o) }} />
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
              <button onClick={() => { setActiveTab('horas'); setMenuOpen(false) }} style={styles.menuItem}>
                <Clock size={20} /> Registar Horas
              </button>
              <button onClick={() => { setActiveTab('equipa'); setMenuOpen(false) }} style={styles.menuItem}>
                <Users size={20} /> Equipa
              </button>
            </nav>
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
                    <p style={styles.messageText}>{msg.conteudo}</p>
                    <span style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      {msg.autor_id === user.id && (
                        msg.pending ? <Clock size={12} /> : <CheckCheck size={12} style={{ color: '#4FC3F7' }} />
                      )}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputContainer}>
              <button style={styles.attachButton}>
                <Camera size={24} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escreve uma mensagem..."
                style={styles.input}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                style={{
                  ...styles.sendButton,
                  opacity: newMessage.trim() ? 1 : 0.5
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'materiais' && <PedirMateriais obra={obra} user={user} />}
        {activeTab === 'horas' && <RegistarHoras obra={obra} user={user} />}
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
          onClick={() => setActiveTab('horas')}
          style={{ ...styles.navButton, ...(activeTab === 'horas' ? styles.navButtonActive : {}) }}
        >
          <Clock size={20} />
          <span>Horas</span>
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

// Login Component
function ObraLogin({ onLogin }) {
  const [step, setStep] = useState(1)
  const [codigoObra, setCodigoObra] = useState('')
  const [nome, setNome] = useState('')
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchObras = async () => {
    if (!codigoObra.trim()) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('obras')
        .select('id, codigo, nome')
        .or(`codigo.ilike.%${codigoObra}%,nome.ilike.%${codigoObra}%`)
        .limit(5)

      if (error) throw error

      if (data.length === 0) {
        setError('Obra não encontrada')
      } else {
        setObras(data)
      }
    } catch (err) {
      setError('Erro ao procurar obra')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectObra = (obra) => {
    setSelectedObra(obra)
    setStep(2)
  }

  const handleLogin = () => {
    if (!nome.trim() || !selectedObra) return

    const user = {
      id: `user_${Date.now()}`,
      nome: nome.trim(),
      cargo: 'Equipa'
    }

    localStorage.setItem('obra_app_user', JSON.stringify(user))
    localStorage.setItem('obra_app_obra', JSON.stringify(selectedObra))

    onLogin(user, selectedObra)
  }

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <HardHat size={48} style={{ color: '#f4a261' }} />
          <h1 style={{ margin: '12px 0 4px' }}>Gavinho Obras</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>App de comunicação da equipa</p>
        </div>

        {step === 1 ? (
          <>
            <div style={styles.loginField}>
              <label>Código ou nome da obra</label>
              <input
                type="text"
                value={codigoObra}
                onChange={(e) => setCodigoObra(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchObras()}
                placeholder="Ex: GB00466"
                style={styles.loginInput}
                autoFocus
              />
              <button
                onClick={searchObras}
                disabled={loading || !codigoObra.trim()}
                style={styles.loginButton}
              >
                {loading ? 'A procurar...' : 'Procurar Obra'}
              </button>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {obras.length > 0 && (
              <div style={styles.obrasList}>
                {obras.map(obra => (
                  <button
                    key={obra.id}
                    onClick={() => handleSelectObra(obra)}
                    style={styles.obraItem}
                  >
                    <HardHat size={20} />
                    <div>
                      <strong>{obra.codigo}</strong>
                      <p style={{ margin: 0, fontSize: 12 }}>{obra.nome}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={styles.selectedObraCard}>
              <HardHat size={24} />
              <div>
                <strong>{selectedObra.codigo}</strong>
                <p style={{ margin: 0, fontSize: 12 }}>{selectedObra.nome}</p>
              </div>
              <button onClick={() => setStep(1)} style={styles.changeButton}>
                Mudar
              </button>
            </div>

            <div style={styles.loginField}>
              <label>O teu nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Ex: Manuel Silva"
                style={styles.loginInput}
                autoFocus
              />
              <button
                onClick={handleLogin}
                disabled={!nome.trim()}
                style={styles.loginButton}
              >
                Entrar na Obra
              </button>
            </div>
          </>
        )}
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

  const handleSubmit = async () => {
    if (!material.trim() || !quantidade) return

    setSending(true)
    try {
      // Enviar como mensagem no chat
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `📦 PEDIDO DE MATERIAL${urgente ? ' (URGENTE)' : ''}\n${quantidade} ${unidade} de ${material}${notas ? `\nNotas: ${notas}` : ''}`,
        tipo: 'pedido_material',
        dados: { material, quantidade, unidade, urgente, notas }
      })

      setSuccess(true)
      setMaterial('')
      setQuantidade('')
      setNotas('')
      setUrgente(false)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert('Erro ao enviar pedido')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Package size={24} /> Pedir Material
      </h2>

      {success && (
        <div style={styles.successMessage}>
          <Check size={20} /> Pedido enviado com sucesso!
        </div>
      )}

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
          style={{ ...styles.formInput, minHeight: 80 }}
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
        {sending ? 'A enviar...' : 'Enviar Pedido'}
      </button>
    </div>
  )
}

// Componente Registar Horas
function RegistarHoras({ obra, user }) {
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [trabalhadores, setTrabalhadores] = useState('1')
  const [descricao, setDescricao] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!horaEntrada || !horaSaida) return

    setSending(true)
    try {
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `⏱️ REGISTO DE HORAS\n${trabalhadores} pessoa(s): ${horaEntrada} - ${horaSaida}${descricao ? `\nTrabalho: ${descricao}` : ''}`,
        tipo: 'registo_horas',
        dados: { horaEntrada, horaSaida, trabalhadores: parseInt(trabalhadores), descricao }
      })

      setSuccess(true)
      setHoraEntrada('')
      setHoraSaida('')
      setDescricao('')

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert('Erro ao registar horas')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Clock size={24} /> Registar Horas
      </h2>

      {success && (
        <div style={styles.successMessage}>
          <Check size={20} /> Horas registadas!
        </div>
      )}

      <div style={styles.formRow}>
        <div style={{ ...styles.formField, flex: 1 }}>
          <label>Entrada *</label>
          <input
            type="time"
            value={horaEntrada}
            onChange={(e) => setHoraEntrada(e.target.value)}
            style={styles.formInput}
          />
        </div>
        <div style={{ ...styles.formField, flex: 1 }}>
          <label>Saída *</label>
          <input
            type="time"
            value={horaSaida}
            onChange={(e) => setHoraSaida(e.target.value)}
            style={styles.formInput}
          />
        </div>
      </div>

      <div style={styles.formField}>
        <label>Número de pessoas</label>
        <input
          type="number"
          value={trabalhadores}
          onChange={(e) => setTrabalhadores(e.target.value)}
          min="1"
          style={styles.formInput}
        />
      </div>

      <div style={styles.formField}>
        <label>Trabalho executado</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="O que foi feito hoje..."
          style={{ ...styles.formInput, minHeight: 80 }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={sending || !horaEntrada || !horaSaida}
        style={styles.submitButton}
      >
        {sending ? 'A registar...' : 'Registar Horas'}
      </button>
    </div>
  )
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
    color: '#f4a261'
  },
  header: {
    background: '#1a1a2e',
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
    background: '#1a1a2e',
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
    background: '#ECE5DD'
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
    background: '#DCF8C6',
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
    color: '#075E54',
    display: 'block',
    marginBottom: 2
  },
  messageText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap'
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
    background: '#075E54',
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
    color: '#f4a261'
  },
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
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
    background: '#f4a261',
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
    background: '#f4a261',
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
    background: '#f4a261',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600
  }
}
