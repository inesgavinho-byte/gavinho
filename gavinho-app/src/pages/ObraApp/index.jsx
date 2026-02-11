// =====================================================
// OBRA APP - MAIN COMPONENT
// PWA for construction workers - refactored version
// =====================================================

import { useState, useEffect, useRef } from 'react'
import {
  Menu, Clock, Package, LogOut, Bell, BellOff, HardHat,
  MessageSquare, Users, Loader2, CheckSquare, Image,
  WifiOff, BookOpen, X, RefreshCw, ChevronDown, ChevronUp, Check, Camera,
  User, Settings, Shield
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Import extracted components
import {
  WorkerLogin,
  PedirMateriais,
  RegistoPresenca,
  Equipa,
  ObraChat,
  Tarefas,
  Galeria,
  DiarioObra,
  ProfilePage
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
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showProfilePage, setShowProfilePage] = useState(false)
  const [obrasExpanded, setObrasExpanded] = useState(true)
  const [refreshingObras, setRefreshingObras] = useState(false)
  const avatarInputRef = useRef(null)

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

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))
  }

  // Refresh obras from database (for admin/gestor users)
  const refreshObras = async () => {
    if (!user || refreshingObras) return

    setRefreshingObras(true)
    try {
      let obrasData = []

      if (user.tipo === 'gestao') {
        // Gestão users get all obras
        const { data, error } = await supabase
          .from('obras')
          .select('id, codigo, nome, status')
          .order('codigo', { ascending: false })

        if (error) throw error
        obrasData = data || []
      } else {
        // Workers get only assigned obras
        const { data, error } = await supabase
          .from('trabalhador_obras')
          .select('obra_id, obras(id, codigo, nome, status)')
          .eq('trabalhador_id', user.id)

        if (error) throw error
        obrasData = data?.map(o => o.obras).filter(Boolean) || []
      }

      console.log(`[Refresh] Loaded ${obrasData.length} obras for user type: ${user.tipo}`)
      setObras(obrasData)
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obrasData))

      // If current obra is no longer in the list, clear selection
      if (obra && !obrasData.find(o => o.id === obra.id)) {
        setObra(null)
        localStorage.removeItem(STORAGE_KEYS.OBRA)
      }
    } catch (err) {
      console.error('Erro ao atualizar obras:', err)
    } finally {
      setRefreshingObras(false)
    }
  }

  // Auto-refresh obras for admin/gestor on mount
  useEffect(() => {
    if (user && user.tipo === 'gestao') {
      refreshObras()
    }
  }, [user?.id])

  // ========== AVATAR UPLOAD ==========
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleciona uma imagem')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('obra-fotos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(fileName)

      // Update user object with avatar
      const updatedUser = { ...user, avatar: publicUrl }
      setUser(updatedUser)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))

      // Try to update in database (trabalhadores or profiles)
      if (user.tipo === 'trabalhador') {
        await supabase
          .from('trabalhadores')
          .update({ avatar: publicUrl })
          .eq('id', user.id)
      } else {
        await supabase
          .from('profiles')
          .update({ avatar: publicUrl })
          .eq('id', user.id)
      }

      setShowAvatarModal(false)
      alert('Foto de perfil atualizada!')
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da foto')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const removeAvatar = async () => {
    try {
      const updatedUser = { ...user, avatar: null }
      setUser(updatedUser)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))

      // Update in database
      if (user.tipo === 'trabalhador') {
        await supabase.from('trabalhadores').update({ avatar: null }).eq('id', user.id)
      } else {
        await supabase.from('profiles').update({ avatar: null }).eq('id', user.id)
      }

      setShowAvatarModal(false)
    } catch (err) {
      console.error('Erro ao remover avatar:', err)
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
      top: -6,
      right: -6,
      background: '#ef4444',
      color: 'white',
      fontSize: 9,
      fontWeight: 700,
      minWidth: 18,
      height: 18,
      padding: '0 4px',
      borderRadius: 9,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${colors.primary}`,
      boxSizing: 'border-box'
    },
    // Obra dropdown
    obraSelector: {
      position: 'relative',
      cursor: 'pointer'
    },
    obraSelectorButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.15)',
      cursor: 'pointer',
      color: 'white',
      transition: 'background 0.2s'
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
      maxWidth: 340,
      background: 'white',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideLeft 0.3s ease'
    },
    notificationsPanelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
      borderBottom: '1px solid #e5e7eb',
      background: colors.primary,
      color: 'white'
    },
    notificationItem: {
      display: 'flex',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background 0.15s'
    },
    notificationItemUnread: {
      background: '#f0f9ff',
      borderLeft: `3px solid ${colors.primary}`
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

      {/* Header - hide when in profile page */}
      {!showProfilePage && (
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
            <Bell size={20} color="white" />
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
      )}

      {/* Side Menu */}
      {menuOpen && (
        <div style={styles.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div style={styles.menu} onClick={e => e.stopPropagation()}>
            <div
              style={{ ...styles.menuHeader, cursor: 'pointer' }}
              onClick={() => { setShowProfilePage(true); setMenuOpen(false) }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: user.avatar ? 'transparent' : 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.25)',
                  flexShrink: 0
                }}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>
                    {user.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nome}</strong>
                  {user.isAdmin && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      background: 'rgba(255,255,255,0.15)',
                      color: '#fbbf24',
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontWeight: 600
                    }}>
                      <Shield size={9} /> Admin
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{user.cargo || 'Equipa'}</p>
              </div>
              <Settings size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
            </div>

            {/* Obra selector in menu - collapsible */}
            {obras.length > 0 && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
                    onClick={() => setObrasExpanded(!obrasExpanded)}
                  >
                    {obrasExpanded ? <ChevronUp size={14} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.5)" />}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                      Obras ({obras.length})
                    </span>
                  </div>
                  {user?.tipo === 'gestao' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); refreshObras() }}
                      disabled={refreshingObras}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <RefreshCw
                        size={12}
                        color="rgba(255,255,255,0.4)"
                        style={refreshingObras ? { animation: 'spin 1s linear infinite' } : {}}
                      />
                    </button>
                  )}
                </div>

                {obrasExpanded && (
                  <div style={{ padding: '0 10px 10px', maxHeight: 220, overflowY: 'auto' }}>
                    {obras.map(o => (
                      <button
                        key={o.id}
                        onClick={() => { handleSelectObra(o); setMenuOpen(false) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 10px',
                          marginBottom: 2,
                          background: obra?.id === o.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                          border: 'none',
                          borderLeft: obra?.id === o.id ? '3px solid white' : '3px solid transparent',
                          borderRadius: 4,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          color: 'white'
                        }}
                      >
                        <HardHat size={15} color={obra?.id === o.id ? 'white' : 'rgba(255,255,255,0.5)'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12,
                            fontWeight: obra?.id === o.id ? 600 : 500,
                            color: obra?.id === o.id ? 'white' : 'rgba(255,255,255,0.8)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {o.codigo}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: obra?.id === o.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>{o.nome}</div>
                        </div>
                        {obra?.id === o.id && <Check size={14} color="white" />}
                      </button>
                    ))}
                  </div>
                )}
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
                    ...(activeTab === item.key ? styles.menuItemActive : {}),
                    opacity: obra ? 1 : 0.5,
                    cursor: obra ? 'pointer' : 'not-allowed'
                  }}
                >
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
            </nav>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}

      {/* Profile Page - Full Screen */}
      {showProfilePage && (
        <ProfilePage
          user={user}
          onBack={() => setShowProfilePage(false)}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {/* Main Content */}
      {!showProfilePage && (
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
      )}

      {/* Bottom Navigation - only show if obra is selected and not in profile */}
      {obra && !showProfilePage && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="white" />
                <h3 style={{ margin: 0, fontSize: 16, color: 'white' }}>Notificações</h3>
                {unreadCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                    minWidth: 18,
                    textAlign: 'center'
                  }}>{unreadCount}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: 'white',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: 4
                    }}
                  >
                    Marcar lidas
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="white" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Bell size={28} color="#d1d5db" />
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#6b7280' }}>Tudo em dia!</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Sem notificações de momento</p>
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
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: notif.color ? `${notif.color}15` : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 18
                    }}>
                      {notif.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: notif.read ? 400 : 600,
                        color: '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notif.title}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: 12,
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {notif.message}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {new Date(notif.createdAt).toLocaleString('pt-PT', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: colors.primary,
                        flexShrink: 0,
                        alignSelf: 'center'
                      }} />
                    )}
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
        @keyframes menuSlideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes menuOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
            onClick={() => setShowAvatarModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 320,
            zIndex: 301,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Foto de Perfil</h3>

            {/* Current Avatar Preview */}
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              margin: '0 auto 16px',
              background: user.avatar ? 'transparent' : colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `3px solid ${colors.primary}`
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'white', fontWeight: 600, fontSize: 32 }}>
                  {user.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarSelect}
              style={{ display: 'none' }}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  padding: 12,
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {uploadingAvatar ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Camera size={18} />
                )}
                {uploadingAvatar ? 'A enviar...' : 'Escolher Foto'}
              </button>

              {user.avatar && (
                <button
                  onClick={removeAvatar}
                  style={{
                    padding: 12,
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Remover Foto
                </button>
              )}

              <button
                onClick={() => setShowAvatarModal(false)}
                style={{
                  padding: 12,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
