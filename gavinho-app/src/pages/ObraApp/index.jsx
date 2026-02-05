// =====================================================
// OBRA APP - MAIN COMPONENT
// PWA for construction workers - refactored version
// =====================================================

import { useState, useEffect } from 'react'
import {
  Menu, Clock, Package, LogOut, Bell, BellOff, HardHat,
  MessageSquare, Users, Loader2, CheckSquare, Image,
  WifiOff, BookOpen, X, RefreshCw, ChevronDown, Check
} from 'lucide-react'

// Import extracted components
import {
  WorkerLogin,
  PedirMateriais,
  RegistoPresenca,
  Equipa,
  ObraChat,
  Tarefas,
  Galeria,
  DiarioObra
} from './components'

// Import hooks
import { usePushNotifications, useOfflineSync, useNotifications } from './hooks'

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
  const [showNotifications, setShowNotifications] = useState(false)
  const [showObraDropdown, setShowObraDropdown] = useState(false)

  // Push notifications
  const { permission, requestPermission, subscribe } = usePushNotifications()

  // Offline sync
  const { isOnline, pendingCount, syncing, processQueue } = useOfflineSync()

  // In-app notifications
  const {
    notifications,
    unreadCount,
    showToast,
    markAsRead,
    markAllAsRead,
    dismissToast
  } = useNotifications(obra, user)

  // Initialize on mount
  useEffect(() => {
    checkSession()
    registerServiceWorker()
  }, [])

  // Auto-select if only one obra
  useEffect(() => {
    if (obras.length === 1 && !obra) {
      handleSelectObra(obras[0])
    }
  }, [obras])

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

          if (savedObra) {
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
  }

  const handleSelectObra = (selectedObra) => {
    setObra(selectedObra)
    setShowObraDropdown(false)
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

  // ========== NOTIFICATIONS ==========
  const enableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      await subscribe()
      alert('Notificações ativadas!')
    }
  }

  // ========== RENDER ==========

  // Local styles
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
    syncBanner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '6px 16px',
      background: '#dbeafe',
      color: '#1e40af',
      fontSize: 12,
      cursor: 'pointer'
    },
    notificationBell: {
      position: 'relative'
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      background: '#ef4444',
      color: 'white',
      fontSize: 10,
      fontWeight: 600,
      width: 16,
      height: 16,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    // Obra dropdown
    obraSelector: {
      position: 'relative',
      cursor: 'pointer'
    },
    obraSelectorButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer'
    },
    obraDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 8,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 100,
      overflow: 'hidden',
      minWidth: 200
    },
    obraDropdownItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      border: 'none',
      background: 'none',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      borderBottom: '1px solid #f3f4f6',
      transition: 'background 0.2s'
    },
    obraDropdownItemActive: {
      background: '#f0f9ff'
    },
    // Welcome/select obra screen
    welcomeContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center'
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: 600,
      margin: '16px 0 8px',
      color: '#374151'
    },
    welcomeSubtitle: {
      fontSize: 14,
      color: '#6b7280',
      marginBottom: 24
    },
    obraCards: {
      width: '100%',
      maxWidth: 400,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    },
    obraCard: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      background: 'white',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'left'
    },
    obraCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: `${colors.primary}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colors.primary
    },
    obraCardInfo: {
      flex: 1
    },
    obraCardCode: {
      fontSize: 14,
      fontWeight: 600,
      color: '#374151',
      margin: 0
    },
    obraCardName: {
      fontSize: 13,
      color: '#6b7280',
      margin: '4px 0 0'
    },
    // Toast
    toast: {
      position: 'fixed',
      top: 70,
      left: 16,
      right: 16,
      background: 'white',
      borderRadius: 12,
      padding: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      zIndex: 1000,
      animation: 'slideDown 0.3s ease'
    },
    toastIcon: {
      fontSize: 24
    },
    toastContent: {
      flex: 1
    },
    toastTitle: {
      fontSize: 13,
      fontWeight: 600,
      margin: 0
    },
    toastMessage: {
      fontSize: 12,
      color: '#6b7280',
      margin: 0
    },
    toastClose: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 4
    },
    notificationsPanel: {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 320,
      background: 'white',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideLeft 0.3s ease'
    },
    notificationsPanelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottom: '1px solid #e5e7eb'
    },
    notificationItem: {
      display: 'flex',
      gap: 12,
      padding: 12,
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer'
    },
    notificationItemUnread: {
      background: '#f0f9ff'
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

  // Navigation tabs configuration
  const tabs = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { key: 'diario', label: 'Diário', icon: BookOpen },
    { key: 'galeria', label: 'Galeria', icon: Image }
  ]

  const menuItems = [
    { key: 'chat', label: 'Chat da Obra', icon: MessageSquare },
    { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { key: 'diario', label: 'Diário de Obra', icon: BookOpen },
    { key: 'materiais', label: 'Pedir Materiais', icon: Package },
    { key: 'galeria', label: 'Galeria', icon: Image },
    { key: 'presencas', label: 'Presenças', icon: Clock },
    { key: 'equipa', label: 'Equipa', icon: Users }
  ]

  // Render obra selector in welcome screen
  const renderWelcomeScreen = () => (
    <div style={localStyles.welcomeContainer}>
      <HardHat size={56} color={colors.primary} />
      <h1 style={localStyles.welcomeTitle}>Olá, {user.nome}!</h1>
      {obras.length === 0 ? (
        <>
          <p style={localStyles.welcomeSubtitle}>
            Não tens obras atribuídas de momento.
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            Fala com o teu encarregado para seres adicionado a uma obra.
          </p>
        </>
      ) : (
        <>
          <p style={localStyles.welcomeSubtitle}>
            Seleciona a obra onde vais trabalhar
          </p>
          <div style={localStyles.obraCards}>
            {obras.map(o => (
              <div
                key={o.id}
                style={localStyles.obraCard}
                onClick={() => handleSelectObra(o)}
              >
                <div style={localStyles.obraCardIcon}>
                  <HardHat size={24} />
                </div>
                <div style={localStyles.obraCardInfo}>
                  <p style={localStyles.obraCardCode}>{o.codigo}</p>
                  <p style={localStyles.obraCardName}>{o.nome}</p>
                </div>
                <ChevronDown size={20} color="#9ca3af" style={{ transform: 'rotate(-90deg)' }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={localStyles.offlineBanner}>
          <WifiOff size={16} />
          Sem ligação à internet
        </div>
      )}

      {/* Pending Sync Banner */}
      {isOnline && pendingCount > 0 && (
        <div style={localStyles.syncBanner} onClick={processQueue}>
          <RefreshCw size={14} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
          {syncing ? 'A sincronizar...' : `${pendingCount} ações pendentes - toca para sincronizar`}
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
          <Menu size={24} />
        </button>

        {/* Obra Selector in Header */}
        <div style={localStyles.obraSelector}>
          <button
            onClick={() => obras.length > 1 && setShowObraDropdown(!showObraDropdown)}
            style={localStyles.obraSelectorButton}
          >
            <div style={styles.headerTitle}>
              {obra ? (
                <>
                  <h1 style={styles.obraCode}>{obra.codigo}</h1>
                  <p style={styles.obraNome}>{obra.nome}</p>
                </>
              ) : (
                <>
                  <h1 style={styles.obraCode}>Gavinho</h1>
                  <p style={styles.obraNome}>Seleciona uma obra</p>
                </>
              )}
            </div>
            {obras.length > 1 && (
              <ChevronDown
                size={16}
                color="white"
                style={{
                  transition: 'transform 0.2s',
                  transform: showObraDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            )}
          </button>

          {/* Dropdown */}
          {showObraDropdown && (
            <>
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setShowObraDropdown(false)}
              />
              <div style={localStyles.obraDropdown}>
                {obras.map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleSelectObra(o)}
                    style={{
                      ...localStyles.obraDropdownItem,
                      ...(obra?.id === o.id ? localStyles.obraDropdownItemActive : {})
                    }}
                  >
                    <HardHat size={20} color={colors.primary} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>{o.codigo}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{o.nome}</div>
                    </div>
                    {obra?.id === o.id && <Check size={18} color={colors.primary} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={styles.headerActions}>
          {/* Notifications bell */}
          <button
            onClick={() => setShowNotifications(true)}
            style={{ ...styles.iconButton, ...localStyles.notificationBell }}
          >
            <Bell size={20} color={unreadCount > 0 ? colors.primary : '#6b7280'} />
            {unreadCount > 0 && (
              <span style={localStyles.badge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Push notifications toggle */}
          {permission !== 'granted' && (
            <button onClick={enableNotifications} style={styles.iconButton}>
              <BellOff size={20} />
            </button>
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

            {/* Obra selector in menu */}
            {obras.length > 0 && (
              <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>
                  Obra Ativa
                </p>
                {obras.map(o => (
                  <button
                    key={o.id}
                    onClick={() => { handleSelectObra(o); setMenuOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: 4,
                      background: obra?.id === o.id ? `${colors.primary}15` : '#f9fafb',
                      border: obra?.id === o.id ? `1px solid ${colors.primary}` : '1px solid transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <HardHat size={18} color={obra?.id === o.id ? colors.primary : '#6b7280'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: obra?.id === o.id ? colors.primary : '#374151' }}>
                        {o.codigo}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{o.nome}</div>
                    </div>
                    {obra?.id === o.id && <Check size={16} color={colors.primary} />}
                  </button>
                ))}
              </div>
            )}

            <nav style={styles.menuNav}>
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setMenuOpen(false) }}
                  disabled={!obra}
                  style={{
                    ...styles.menuItem,
                    ...(activeTab === item.key ? { background: `${colors.primary}10`, color: colors.primary } : {}),
                    opacity: obra ? 1 : 0.5,
                    cursor: obra ? 'pointer' : 'not-allowed'
                  }}
                >
                  <item.icon size={20} /> {item.label}
                </button>
              ))}
            </nav>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {!obra ? (
          renderWelcomeScreen()
        ) : (
          <>
            {activeTab === 'chat' && <ObraChat obra={obra} user={user} />}
            {activeTab === 'tarefas' && <Tarefas obra={obra} user={user} />}
            {activeTab === 'diario' && <DiarioObra obra={obra} user={user} />}
            {activeTab === 'materiais' && <PedirMateriais obra={obra} user={user} />}
            {activeTab === 'galeria' && <Galeria obra={obra} user={user} />}
            {activeTab === 'presencas' && <RegistoPresenca obra={obra} user={user} />}
            {activeTab === 'equipa' && <Equipa obra={obra} />}
          </>
        )}
      </main>

      {/* Bottom Navigation - only show if obra is selected */}
      {obra && (
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
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{ ...localStyles.toast, borderLeft: `4px solid ${showToast.color}` }}>
          <span style={localStyles.toastIcon}>{showToast.icon}</span>
          <div style={localStyles.toastContent}>
            <p style={localStyles.toastTitle}>{showToast.title}</p>
            <p style={localStyles.toastMessage}>{showToast.message}</p>
          </div>
          <button style={localStyles.toastClose} onClick={dismissToast}>
            <X size={16} color="#6b7280" />
          </button>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 199 }}
            onClick={() => setShowNotifications(false)}
          />
          <div style={localStyles.notificationsPanel}>
            <div style={localStyles.notificationsPanelHeader}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Notificações</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ background: 'none', border: 'none', color: colors.primary, fontSize: 12, cursor: 'pointer' }}
                  >
                    Marcar todas lidas
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <Bell size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>Sem notificações</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      ...localStyles.notificationItem,
                      ...(notif.read ? {} : localStyles.notificationItemUnread)
                    }}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <span style={{ fontSize: 20 }}>{notif.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: notif.read ? 400 : 600 }}>
                        {notif.title}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                        {notif.message}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {new Date(notif.createdAt).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
