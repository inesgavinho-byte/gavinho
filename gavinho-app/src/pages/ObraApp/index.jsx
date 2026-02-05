// =====================================================
// OBRA APP - MAIN COMPONENT
// PWA for construction workers - refactored version
// =====================================================

import { useState, useEffect } from 'react'
import {
  Menu, Clock, Package, LogOut, Bell, BellOff, HardHat,
  MessageSquare, Users, Loader2, CheckSquare, Image,
  WifiOff, Wifi
} from 'lucide-react'

// Import extracted components
import {
  WorkerLogin,
  ObraSelector,
  PedirMateriais,
  RegistoPresenca,
  Equipa,
  ObraChat,
  Tarefas,
  Galeria
} from './components'

// Import hooks
import { usePushNotifications } from './hooks'

// Import styles and utilities
import { styles, colors } from './styles'
import { STORAGE_KEYS } from './utils'

export default function ObraApp() {
  // Core state
  const [user, setUser] = useState(null)
  const [obras, setObras] = useState([])
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Push notifications
  const { permission, requestPermission, subscribe } = usePushNotifications()

  // Initialize on mount
  useEffect(() => {
    checkSession()
    registerServiceWorker()

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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

  // ========== NOTIFICATIONS ==========
  const enableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      await subscribe()
      alert('Notificações ativadas!')
    }
  }

  // ========== RENDER ==========

  // Local styles for offline banner
  const localStyles = {
    offlineBanner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '8px 16px',
      background: '#fef3c7',
      color: '#92400e',
      fontSize: 13,
      fontWeight: 500
    },
    onlineBanner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '8px 16px',
      background: '#d1fae5',
      color: '#065f46',
      fontSize: 13,
      fontWeight: 500,
      animation: 'fadeOut 3s forwards'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 style={{ ...styles.spinner, animation: 'spin 1s linear infinite' }} />
        <p>A carregar...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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

  // Navigation tabs configuration
  const tabs = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { key: 'materiais', label: 'Materiais', icon: Package },
    { key: 'galeria', label: 'Galeria', icon: Image }
  ]

  const menuItems = [
    { key: 'chat', label: 'Chat da Obra', icon: MessageSquare },
    { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { key: 'materiais', label: 'Pedir Materiais', icon: Package },
    { key: 'galeria', label: 'Galeria', icon: Image },
    { key: 'presencas', label: 'Presenças', icon: Clock },
    { key: 'equipa', label: 'Equipa', icon: Users }
  ]

  return (
    <div style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={localStyles.offlineBanner}>
          <WifiOff size={16} />
          Sem ligação à internet
        </div>
      )}

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
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setMenuOpen(false) }}
                  style={{
                    ...styles.menuItem,
                    ...(activeTab === item.key ? { background: `${colors.primary}10`, color: colors.primary } : {})
                  }}
                >
                  <item.icon size={20} /> {item.label}
                </button>
              ))}
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
        {activeTab === 'chat' && <ObraChat obra={obra} user={user} />}
        {activeTab === 'tarefas' && <Tarefas obra={obra} user={user} />}
        {activeTab === 'materiais' && <PedirMateriais obra={obra} user={user} />}
        {activeTab === 'galeria' && <Galeria obra={obra} user={user} />}
        {activeTab === 'presencas' && <RegistoPresenca obra={obra} user={user} />}
        {activeTab === 'equipa' && <Equipa obra={obra} />}
      </main>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab.key ? styles.navButtonActive : {})
            }}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeOut {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; display: none; }
        }
      `}</style>
    </div>
  )
}
