// =====================================================
// PROFILE PAGE - Personal settings and Admin tools
// =====================================================

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Camera, User, Mail, Phone, Briefcase, Shield,
  HardHat, Users, Settings, ChevronRight, Loader2, X,
  Plus, Pencil, Trash2, Check, Search, ToggleLeft, ToggleRight,
  Building2, UserCog, Bell, Palette, Database, Lock,
  Sun, Moon, Smartphone, Trash, RefreshCw, Eye, EyeOff,
  AlertTriangle, CheckCircle, MessageSquare, Package, Image
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { colors } from '../styles'

export default function ProfilePage({ user, onBack, onUpdateUser }) {
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(false)

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    nome: user.nome || '',
    email: user.email || '',
    telefone: user.telefone || '',
    cargo: user.cargo || ''
  })

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  // Admin data
  const [obras, setObras] = useState([])
  const [trabalhadores, setTrabalhadores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(null) // 'obra' | 'trabalhador'
  const [editingItem, setEditingItem] = useState(null)

  // Settings sub-section
  const [settingsSection, setSettingsSection] = useState(null) // 'notificacoes' | 'database' | 'aparencia' | 'seguranca'

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    pushEnabled: 'Notification' in window && Notification.permission === 'granted',
    novasMensagens: true,
    novasTarefas: true,
    pedidosMateriais: true,
    alertasUrgentes: true
  })

  // Appearance settings
  const [theme, setTheme] = useState(localStorage.getItem('gavinho_theme') || 'light')

  // Database stats
  const [dbStats, setDbStats] = useState(null)
  const [clearingCache, setClearingCache] = useState(false)

  // Security
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // Is admin/manager
  const isAdmin = user.tipo === 'gestao'

  // Load admin data when needed
  useEffect(() => {
    if (isAdmin && activeSection === 'obras') {
      loadObras()
    } else if (isAdmin && activeSection === 'trabalhadores') {
      loadTrabalhadores()
    }
  }, [activeSection, isAdmin])

  // ========== DATA LOADING ==========
  const loadObras = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setObras(data || [])
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTrabalhadores = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trabalhadores')
        .select(`
          *,
          trabalhador_obras (
            obra_id,
            obras (codigo, nome)
          )
        `)
        .order('nome')

      if (error) throw error
      setTrabalhadores(data || [])
    } catch (err) {
      console.error('Erro ao carregar trabalhadores:', err)
    } finally {
      setLoading(false)
    }
  }

  // ========== PROFILE FUNCTIONS ==========
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
      const fileExt = file.name.split('.').pop()
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('obra-fotos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(fileName)

      // Update in database
      if (user.tipo === 'trabalhador') {
        await supabase.from('trabalhadores').update({ avatar: publicUrl }).eq('id', user.id)
      } else {
        await supabase.from('profiles').update({ avatar: publicUrl }).eq('id', user.id)
      }

      onUpdateUser({ ...user, avatar: publicUrl })
      alert('Foto atualizada!')
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da foto')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const updateData = {
        nome: profileData.nome,
        cargo: profileData.cargo
      }

      if (user.tipo === 'trabalhador') {
        // Para trabalhadores, atualizar tabela trabalhadores
        updateData.telefone = profileData.telefone

        const { error } = await supabase
          .from('trabalhadores')
          .update(updateData)
          .eq('id', user.id)

        if (error) throw error
      } else {
        // Para gestão, tentar primeiro utilizadores, depois profiles
        let success = false

        // Tentar tabela utilizadores
        const { error: utilizadoresError } = await supabase
          .from('utilizadores')
          .update(updateData)
          .eq('id', user.id)

        if (!utilizadoresError) {
          success = true
        } else {
          // Tentar tabela profiles (sem email - não pode ser alterado)
          const { error: profilesError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)

          if (!profilesError) {
            success = true
          }
        }

        // Se nenhuma tabela funcionou, guardar apenas localmente
        if (!success) {
        }
      }

      // Atualizar estado local e localStorage
      const updatedUser = { ...user, nome: profileData.nome, cargo: profileData.cargo }
      if (user.tipo === 'trabalhador') {
        updatedUser.telefone = profileData.telefone
      }

      onUpdateUser(updatedUser)
      setEditingProfile(false)
      alert('Perfil atualizado!')
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar alterações: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  // ========== ADMIN FUNCTIONS ==========
  const handleToggleTrabalhadorAtivo = async (trabalhador) => {
    try {
      const { error } = await supabase
        .from('trabalhadores')
        .update({ ativo: !trabalhador.ativo })
        .eq('id', trabalhador.id)

      if (error) throw error
      loadTrabalhadores()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao atualizar estado')
    }
  }

  const handleDeleteTrabalhador = async (id) => {
    if (!confirm('Tens a certeza que queres remover este trabalhador?')) return

    try {
      // Remove assignments first
      await supabase.from('trabalhador_obras').delete().eq('trabalhador_id', id)

      const { error } = await supabase
        .from('trabalhadores')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadTrabalhadores()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao remover trabalhador')
    }
  }

  const handleSaveTrabalhador = async (data) => {
    setLoading(true)
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('trabalhadores')
          .update(data)
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('trabalhadores')
          .insert([{ ...data, ativo: true }])

        if (error) throw error
      }

      setShowAddModal(null)
      setEditingItem(null)
      loadTrabalhadores()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar trabalhador')
    } finally {
      setLoading(false)
    }
  }

  // ========== SETTINGS FUNCTIONS ==========

  // Request push notifications permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('O teu browser não suporta notificações')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifSettings(prev => ({ ...prev, pushEnabled: true }))
        // Show test notification
        new Notification('Gavinho Obras', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/icons/icon.svg'
        })
      } else {
        alert('Permissão para notificações negada')
      }
    } catch (err) {
      console.error('Erro ao pedir permissão:', err)
      alert('Erro ao ativar notificações')
    }
  }

  // Save notification settings to localStorage
  const saveNotifSettings = (key, value) => {
    const newSettings = { ...notifSettings, [key]: value }
    setNotifSettings(newSettings)
    localStorage.setItem('gavinho_notif_settings', JSON.stringify(newSettings))
  }

  // Load notification settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gavinho_notif_settings')
    if (saved) {
      try {
        setNotifSettings(prev => ({ ...prev, ...JSON.parse(saved) }))
      } catch (e) {
        console.error('Erro ao carregar definições:', e)
      }
    }
  }, [])

  // Load database stats
  const loadDbStats = async () => {
    setLoading(true)
    try {
      // Calculate localStorage usage
      let localStorageSize = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length * 2 // UTF-16 = 2 bytes per char
        }
      }

      // Count cached items
      const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('gavinho_'))

      // Get counts from database (if accessible)
      let mensagensCount = 0
      let fotografiasCount = 0
      let tarefasCount = 0

      try {
        const [msgRes, fotoRes, tarefaRes] = await Promise.all([
          supabase.from('obra_mensagens').select('id', { count: 'exact', head: true }),
          supabase.from('obra_fotografias').select('id', { count: 'exact', head: true }),
          supabase.from('obra_tarefas').select('id', { count: 'exact', head: true })
        ])
        mensagensCount = msgRes.count || 0
        fotografiasCount = fotoRes.count || 0
        tarefasCount = tarefaRes.count || 0
      } catch (e) {
        console.log('Não foi possível obter contagens da BD')
      }

      setDbStats({
        localStorageSize: (localStorageSize / 1024).toFixed(2),
        cacheItems: cacheKeys.length,
        mensagens: mensagensCount,
        fotografias: fotografiasCount,
        tarefas: tarefasCount
      })
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clear app cache
  const clearCache = async () => {
    if (!confirm('Limpar cache? Os teus dados de sessão serão mantidos.')) return

    setClearingCache(true)
    try {
      // Keep essential keys
      const essentialKeys = ['obra_app_user', 'obra_app_obras', 'obra_app_obra', 'gavinho_theme', 'gavinho_notif_settings']
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.startsWith('gavinho_') && !essentialKeys.includes(k)
      )

      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Clear service worker caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      alert('Cache limpo com sucesso!')
      loadDbStats()
    } catch (err) {
      console.error('Erro ao limpar cache:', err)
      alert('Erro ao limpar cache')
    } finally {
      setClearingCache(false)
    }
  }

  // Change theme
  const changeTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('gavinho_theme', newTheme)
    // Apply theme to document (if supported)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Change password
  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      alert('Preenche todos os campos')
      return
    }

    if (passwordData.new !== passwordData.confirm) {
      alert('As palavras-passe não coincidem')
      return
    }

    if (passwordData.new.length < 6) {
      alert('A palavra-passe deve ter pelo menos 6 caracteres')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      })

      if (error) throw error

      alert('Palavra-passe alterada com sucesso!')
      setPasswordData({ current: '', new: '', confirm: '' })
      setSettingsSection(null)
    } catch (err) {
      console.error('Erro ao alterar palavra-passe:', err)
      alert('Erro ao alterar palavra-passe: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setChangingPassword(false)
    }
  }

  // Load db stats when entering database section
  useEffect(() => {
    if (settingsSection === 'database') {
      loadDbStats()
    }
  }, [settingsSection])

  // ========== STYLES ==========
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f5f5f5'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      background: colors.primary,
      color: 'white'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      padding: 4
    },
    title: {
      fontSize: 18,
      fontWeight: 600,
      margin: 0
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: 16
    },
    // Profile Card
    profileCard: {
      background: 'white',
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      textAlign: 'center'
    },
    avatarContainer: {
      position: 'relative',
      width: 100,
      height: 100,
      margin: '0 auto 16px',
      cursor: 'pointer'
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      background: colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      border: `3px solid ${colors.primary}`
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    avatarInitials: {
      color: 'white',
      fontWeight: 600,
      fontSize: 32
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '0 0 50px 50px',
      padding: '6px 0',
      display: 'flex',
      justifyContent: 'center'
    },
    profileName: {
      fontSize: 20,
      fontWeight: 600,
      margin: '0 0 4px',
      color: '#1f2937'
    },
    profileRole: {
      fontSize: 14,
      color: '#6b7280',
      margin: '0 0 4px'
    },
    profileBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 12px',
      background: `${colors.primary}15`,
      color: colors.primary,
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      marginTop: 8
    },
    // Info rows
    infoSection: {
      background: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: '#9ca3af',
      textTransform: 'uppercase',
      padding: '16px 16px 8px',
      margin: 0
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6'
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6b7280'
    },
    infoContent: {
      flex: 1
    },
    infoLabel: {
      fontSize: 12,
      color: '#9ca3af',
      margin: 0
    },
    infoValue: {
      fontSize: 15,
      color: '#1f2937',
      margin: '2px 0 0',
      fontWeight: 500
    },
    // Menu items
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid #f3f4f6',
      background: 'none',
      border: 'none',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer'
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    menuItemContent: {
      flex: 1
    },
    menuItemTitle: {
      fontSize: 15,
      fontWeight: 500,
      color: '#1f2937',
      margin: 0
    },
    menuItemDesc: {
      fontSize: 12,
      color: '#6b7280',
      margin: '2px 0 0'
    },
    // Admin list
    listHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    searchInput: {
      flex: 1,
      padding: '10px 12px 10px 40px',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      fontSize: 14,
      background: 'white'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 16px',
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      marginLeft: 12
    },
    listItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      background: 'white',
      borderRadius: 12,
      marginBottom: 8
    },
    listItemAvatar: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 600,
      fontSize: 14,
      overflow: 'hidden'
    },
    listItemContent: {
      flex: 1
    },
    listItemName: {
      fontSize: 15,
      fontWeight: 600,
      color: '#1f2937',
      margin: 0
    },
    listItemMeta: {
      fontSize: 12,
      color: '#6b7280',
      margin: '2px 0 0'
    },
    listItemActions: {
      display: 'flex',
      gap: 8
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    },
    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    modal: {
      background: 'white',
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottom: '1px solid #e5e7eb'
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 600,
      margin: 0
    },
    modalBody: {
      padding: 16
    },
    formGroup: {
      marginBottom: 16
    },
    formLabel: {
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      color: '#374151',
      marginBottom: 6
    },
    formInput: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      boxSizing: 'border-box'
    },
    formSelect: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      fontSize: 14,
      background: 'white'
    },
    modalFooter: {
      display: 'flex',
      gap: 12,
      padding: 16,
      borderTop: '1px solid #e5e7eb'
    },
    buttonSecondary: {
      flex: 1,
      padding: 12,
      background: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer'
    },
    buttonPrimary: {
      flex: 1,
      padding: 12,
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer'
    },
    // Status badges
    statusActive: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: '#dcfce7',
      color: '#16a34a',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 500
    },
    statusInactive: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: '#fee2e2',
      color: '#dc2626',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 500
    }
  }

  // ========== RENDER SECTIONS ==========

  // Render Profile Edit Form
  const renderProfileEdit = () => (
    <div style={styles.modalOverlay} onClick={() => setEditingProfile(false)}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Editar Perfil</h3>
          <button onClick={() => setEditingProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Nome</label>
            <input
              type="text"
              value={profileData.nome}
              onChange={e => setProfileData(p => ({ ...p, nome: e.target.value }))}
              style={styles.formInput}
            />
          </div>
          {user.tipo === 'gestao' ? (
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Email</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                style={{ ...styles.formInput, background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                O email não pode ser alterado
              </p>
            </div>
          ) : (
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Telefone</label>
              <input
                type="tel"
                value={profileData.telefone}
                onChange={e => setProfileData(p => ({ ...p, telefone: e.target.value }))}
                style={styles.formInput}
              />
            </div>
          )}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Cargo</label>
            <input
              type="text"
              value={profileData.cargo}
              onChange={e => setProfileData(p => ({ ...p, cargo: e.target.value }))}
              style={styles.formInput}
            />
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button onClick={() => setEditingProfile(false)} style={styles.buttonSecondary}>
            Cancelar
          </button>
          <button onClick={handleSaveProfile} disabled={loading} style={styles.buttonPrimary}>
            {loading ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )

  // Render Obras List (Admin)
  const renderObras = () => {
    const filteredObras = obras.filter(o =>
      o.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        <div style={styles.listHeader}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Procurar obras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredObras.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <HardHat size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Nenhuma obra encontrada</p>
          </div>
        ) : (
          filteredObras.map(obra => (
            <div key={obra.id} style={styles.listItem}>
              <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: `${colors.primary}15`, color: colors.primary }}>
                <HardHat size={20} />
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>{obra.codigo}</p>
                <p style={styles.listItemMeta}>{obra.nome}</p>
                <span style={obra.status === 'ativo' ? styles.statusActive : styles.statusInactive}>
                  {obra.status || 'Ativo'}
                </span>
              </div>
              <ChevronRight size={20} color="#9ca3af" />
            </div>
          ))
        )}
      </div>
    )
  }

  // Render Trabalhadores List (Admin)
  const renderTrabalhadores = () => {
    const filteredTrabalhadores = trabalhadores.filter(t =>
      t.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.telefone?.includes(searchTerm)
    )

    return (
      <div>
        <div style={styles.listHeader}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Procurar trabalhadores..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button onClick={() => { setEditingItem(null); setShowAddModal('trabalhador') }} style={styles.addButton}>
            <Plus size={18} />
            Adicionar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredTrabalhadores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <Users size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Nenhum trabalhador encontrado</p>
          </div>
        ) : (
          filteredTrabalhadores.map(trab => (
            <div key={trab.id} style={styles.listItem}>
              <div style={styles.listItemAvatar}>
                {trab.avatar ? (
                  <img src={trab.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  trab.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                )}
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>{trab.nome}</p>
                <p style={styles.listItemMeta}>
                  {trab.cargo || 'Trabalhador'} {trab.telefone && `• ${trab.telefone}`}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={trab.ativo ? styles.statusActive : styles.statusInactive}>
                    {trab.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  {trab.trabalhador_obras?.length > 0 && (
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {trab.trabalhador_obras.length} obra(s)
                    </span>
                  )}
                </div>
              </div>
              <div style={styles.listItemActions}>
                <button
                  onClick={() => handleToggleTrabalhadorAtivo(trab)}
                  style={{ ...styles.iconButton, background: '#f3f4f6' }}
                  title={trab.ativo ? 'Desativar' : 'Ativar'}
                >
                  {trab.ativo ? (
                    <ToggleRight size={18} color="#16a34a" />
                  ) : (
                    <ToggleLeft size={18} color="#9ca3af" />
                  )}
                </button>
                <button
                  onClick={() => { setEditingItem(trab); setShowAddModal('trabalhador') }}
                  style={{ ...styles.iconButton, background: '#f3f4f6' }}
                >
                  <Pencil size={16} color="#6b7280" />
                </button>
                <button
                  onClick={() => handleDeleteTrabalhador(trab.id)}
                  style={{ ...styles.iconButton, background: '#fee2e2' }}
                >
                  <Trash2 size={16} color="#dc2626" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Render Add/Edit Trabalhador Modal
  const renderTrabalhadorModal = () => {
    const [formData, setFormData] = useState({
      nome: editingItem?.nome || '',
      telefone: editingItem?.telefone || '',
      pin: editingItem?.pin || '',
      cargo: editingItem?.cargo || '',
      especialidade: editingItem?.especialidade || '',
      empresa: editingItem?.empresa || ''
    })

    return (
      <div style={styles.modalOverlay} onClick={() => setShowAddModal(null)}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              {editingItem ? 'Editar Trabalhador' : 'Novo Trabalhador'}
            </h3>
            <button onClick={() => setShowAddModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="#6b7280" />
            </button>
          </div>
          <div style={styles.modalBody}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => setFormData(f => ({ ...f, nome: e.target.value }))}
                style={styles.formInput}
                placeholder="Nome completo"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Telefone *</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={e => setFormData(f => ({ ...f, telefone: e.target.value }))}
                style={styles.formInput}
                placeholder="912345678"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>PIN (4 dígitos) *</label>
              <input
                type="text"
                value={formData.pin}
                onChange={e => setFormData(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                style={styles.formInput}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Cargo</label>
              <select
                value={formData.cargo}
                onChange={e => setFormData(f => ({ ...f, cargo: e.target.value }))}
                style={styles.formSelect}
              >
                <option value="">Selecionar...</option>
                <option value="Encarregado">Encarregado</option>
                <option value="Chefe de Equipa">Chefe de Equipa</option>
                <option value="Pedreiro">Pedreiro</option>
                <option value="Servente">Servente</option>
                <option value="Carpinteiro">Carpinteiro</option>
                <option value="Eletricista">Eletricista</option>
                <option value="Canalizador">Canalizador</option>
                <option value="Pintor">Pintor</option>
                <option value="Serralheiro">Serralheiro</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Especialidade</label>
              <input
                type="text"
                value={formData.especialidade}
                onChange={e => setFormData(f => ({ ...f, especialidade: e.target.value }))}
                style={styles.formInput}
                placeholder="Ex: Alvenaria, Acabamentos..."
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Empresa/Subempreiteiro</label>
              <input
                type="text"
                value={formData.empresa}
                onChange={e => setFormData(f => ({ ...f, empresa: e.target.value }))}
                style={styles.formInput}
                placeholder="Nome da empresa (se aplicável)"
              />
            </div>
          </div>
          <div style={styles.modalFooter}>
            <button onClick={() => setShowAddModal(null)} style={styles.buttonSecondary}>
              Cancelar
            </button>
            <button
              onClick={() => handleSaveTrabalhador(formData)}
              disabled={loading || !formData.nome || !formData.telefone || !formData.pin}
              style={{ ...styles.buttonPrimary, opacity: (!formData.nome || !formData.telefone || !formData.pin) ? 0.5 : 1 }}
            >
              {loading ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render Settings Sub-sections
  const renderNotificacoesSettings = () => (
    <div>
      <div style={styles.infoSection}>
        <h4 style={styles.sectionTitle}>Permissões</h4>
        <div style={styles.listItem}>
          <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: notifSettings.pushEnabled ? '#dcfce7' : '#fee2e2' }}>
            {notifSettings.pushEnabled ? <CheckCircle size={20} color="#16a34a" /> : <AlertTriangle size={20} color="#dc2626" />}
          </div>
          <div style={styles.listItemContent}>
            <p style={styles.listItemName}>Notificações Push</p>
            <p style={styles.listItemMeta}>
              {notifSettings.pushEnabled ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
          {!notifSettings.pushEnabled && (
            <button
              onClick={requestPushPermission}
              style={{ ...styles.addButton, padding: '8px 12px', fontSize: 12 }}
            >
              Ativar
            </button>
          )}
        </div>
      </div>

      <div style={styles.infoSection}>
        <h4 style={styles.sectionTitle}>Tipos de Notificação</h4>

        {[
          { key: 'novasMensagens', icon: MessageSquare, label: 'Novas Mensagens', desc: 'Chat da obra' },
          { key: 'novasTarefas', icon: CheckCircle, label: 'Novas Tarefas', desc: 'Tarefas atribuídas' },
          { key: 'pedidosMateriais', icon: Package, label: 'Pedidos de Materiais', desc: 'Novos pedidos e atualizações' },
          { key: 'alertasUrgentes', icon: AlertTriangle, label: 'Alertas Urgentes', desc: 'Avisos importantes' }
        ].map(item => (
          <div key={item.key} style={styles.listItem}>
            <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: '#f3f4f6' }}>
              <item.icon size={18} color="#6b7280" />
            </div>
            <div style={styles.listItemContent}>
              <p style={styles.listItemName}>{item.label}</p>
              <p style={styles.listItemMeta}>{item.desc}</p>
            </div>
            <button
              onClick={() => saveNotifSettings(item.key, !notifSettings[item.key])}
              style={{ ...styles.iconButton, background: 'transparent' }}
            >
              {notifSettings[item.key] ? (
                <ToggleRight size={28} color="#16a34a" />
              ) : (
                <ToggleLeft size={28} color="#9ca3af" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderDatabaseSettings = () => (
    <div>
      <div style={styles.infoSection}>
        <h4 style={styles.sectionTitle}>Estatísticas</h4>

        {loading && !dbStats ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#6b7280', marginTop: 8 }}>A carregar...</p>
          </div>
        ) : dbStats ? (
          <>
            <div style={styles.listItem}>
              <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: '#e0e7ff' }}>
                <Smartphone size={18} color="#4f46e5" />
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>Armazenamento Local</p>
                <p style={styles.listItemMeta}>{dbStats.localStorageSize} KB utilizados</p>
              </div>
            </div>
            <div style={styles.listItem}>
              <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: '#fef3c7' }}>
                <Database size={18} color="#d97706" />
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>Itens em Cache</p>
                <p style={styles.listItemMeta}>{dbStats.cacheItems} itens</p>
              </div>
            </div>
            <div style={styles.listItem}>
              <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: '#dcfce7' }}>
                <MessageSquare size={18} color="#16a34a" />
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>Mensagens</p>
                <p style={styles.listItemMeta}>{dbStats.mensagens} no total</p>
              </div>
            </div>
            <div style={styles.listItem}>
              <div style={{ ...styles.listItemAvatar, borderRadius: 10, background: '#fce7f3' }}>
                <Image size={18} color="#db2777" />
              </div>
              <div style={styles.listItemContent}>
                <p style={styles.listItemName}>Fotografias</p>
                <p style={styles.listItemMeta}>{dbStats.fotografias} no total</p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div style={styles.infoSection}>
        <h4 style={styles.sectionTitle}>Ações</h4>
        <button
          onClick={loadDbStats}
          disabled={loading}
          style={{ ...styles.menuItem, opacity: loading ? 0.5 : 1 }}
        >
          <div style={{ ...styles.menuItemIcon, background: '#e0e7ff', color: '#4f46e5' }}>
            <RefreshCw size={20} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </div>
          <div style={styles.menuItemContent}>
            <p style={styles.menuItemTitle}>Atualizar Estatísticas</p>
            <p style={styles.menuItemDesc}>Recarregar dados</p>
          </div>
        </button>
        <button
          onClick={clearCache}
          disabled={clearingCache}
          style={{ ...styles.menuItem, opacity: clearingCache ? 0.5 : 1 }}
        >
          <div style={{ ...styles.menuItemIcon, background: '#fee2e2', color: '#dc2626' }}>
            <Trash size={20} />
          </div>
          <div style={styles.menuItemContent}>
            <p style={styles.menuItemTitle}>Limpar Cache</p>
            <p style={styles.menuItemDesc}>Libertar espaço de armazenamento</p>
          </div>
        </button>
      </div>
    </div>
  )

  const renderAparenciaSettings = () => (
    <div>
      <div style={styles.infoSection}>
        <h4 style={styles.sectionTitle}>Tema</h4>

        {[
          { key: 'light', icon: Sun, label: 'Claro', desc: 'Fundo branco' },
          { key: 'dark', icon: Moon, label: 'Escuro', desc: 'Fundo escuro' },
          { key: 'auto', icon: Smartphone, label: 'Automático', desc: 'Seguir sistema' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => changeTheme(item.key)}
            style={{
              ...styles.listItem,
              border: theme === item.key ? `2px solid ${colors.primary}` : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            <div style={{
              ...styles.listItemAvatar,
              borderRadius: 10,
              background: theme === item.key ? `${colors.primary}15` : '#f3f4f6'
            }}>
              <item.icon size={18} color={theme === item.key ? colors.primary : '#6b7280'} />
            </div>
            <div style={styles.listItemContent}>
              <p style={{
                ...styles.listItemName,
                color: theme === item.key ? colors.primary : '#1f2937'
              }}>{item.label}</p>
              <p style={styles.listItemMeta}>{item.desc}</p>
            </div>
            {theme === item.key && <Check size={20} color={colors.primary} />}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, margin: 16 }}>
        <p style={{ fontSize: 13, color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} />
          O tema escuro estará disponível em breve
        </p>
      </div>
    </div>
  )

  const renderSegurancaSettings = () => (
    <div>
      {user.tipo === 'gestao' ? (
        <div style={styles.infoSection}>
          <h4 style={styles.sectionTitle}>Alterar Palavra-passe</h4>

          <div style={{ padding: 16 }}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Palavra-passe Atual</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))}
                  style={{ ...styles.formInput, paddingRight: 40 }}
                  placeholder="Introduz a palavra-passe atual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPasswords.current ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Nova Palavra-passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.new}
                  onChange={e => setPasswordData(p => ({ ...p, new: e.target.value }))}
                  style={{ ...styles.formInput, paddingRight: 40 }}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPasswords.new ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Confirmar Nova Palavra-passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirm}
                  onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                  style={{ ...styles.formInput, paddingRight: 40 }}
                  placeholder="Repete a nova palavra-passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPasswords.confirm ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
            </div>

            {passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 16px' }}>
                As palavras-passe não coincidem
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.current || !passwordData.new || !passwordData.confirm || passwordData.new !== passwordData.confirm}
              style={{
                ...styles.buttonPrimary,
                width: '100%',
                opacity: (!passwordData.current || !passwordData.new || !passwordData.confirm || passwordData.new !== passwordData.confirm) ? 0.5 : 1
              }}
            >
              {changingPassword ? 'A alterar...' : 'Alterar Palavra-passe'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 12, margin: 16, textAlign: 'center' }}>
          <Lock size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Para alterar o PIN, contacta o teu encarregado
          </p>
        </div>
      )}
    </div>
  )

  // Render Settings (Admin)
  const renderSettings = () => {
    // If a sub-section is active, render it
    if (settingsSection === 'notificacoes') return renderNotificacoesSettings()
    if (settingsSection === 'database') return renderDatabaseSettings()
    if (settingsSection === 'aparencia') return renderAparenciaSettings()
    if (settingsSection === 'seguranca') return renderSegurancaSettings()

    // Otherwise render main settings menu
    return (
      <div>
        <div style={styles.infoSection}>
          <h4 style={styles.sectionTitle}>Notificações</h4>
          <button style={styles.menuItem} onClick={() => setSettingsSection('notificacoes')}>
            <div style={{ ...styles.menuItemIcon, background: '#fef3c7', color: '#d97706' }}>
              <Bell size={20} />
            </div>
            <div style={styles.menuItemContent}>
              <p style={styles.menuItemTitle}>Notificações Push</p>
              <p style={styles.menuItemDesc}>Configurar alertas e avisos</p>
            </div>
            <ChevronRight size={20} color="#9ca3af" />
          </button>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.sectionTitle}>Sistema</h4>
          <button style={styles.menuItem} onClick={() => setSettingsSection('database')}>
            <div style={{ ...styles.menuItemIcon, background: '#e0e7ff', color: '#4f46e5' }}>
              <Database size={20} />
            </div>
            <div style={styles.menuItemContent}>
              <p style={styles.menuItemTitle}>Base de Dados</p>
              <p style={styles.menuItemDesc}>Ver estatísticas e limpar cache</p>
            </div>
            <ChevronRight size={20} color="#9ca3af" />
          </button>
          <button style={styles.menuItem} onClick={() => setSettingsSection('aparencia')}>
            <div style={{ ...styles.menuItemIcon, background: '#fce7f3', color: '#db2777' }}>
              <Palette size={20} />
            </div>
            <div style={styles.menuItemContent}>
              <p style={styles.menuItemTitle}>Aparência</p>
              <p style={styles.menuItemDesc}>Tema e personalização</p>
            </div>
            <ChevronRight size={20} color="#9ca3af" />
          </button>
          <button style={styles.menuItem} onClick={() => setSettingsSection('seguranca')}>
            <div style={{ ...styles.menuItemIcon, background: '#fee2e2', color: '#dc2626' }}>
              <Lock size={20} />
            </div>
            <div style={styles.menuItemContent}>
              <p style={styles.menuItemTitle}>Segurança</p>
              <p style={styles.menuItemDesc}>Alterar palavra-passe</p>
            </div>
            <ChevronRight size={20} color="#9ca3af" />
          </button>
        </div>
      </div>
    )
  }

  // Main content based on active section
  const renderContent = () => {
    if (activeSection === 'obras') {
      return renderObras()
    }
    if (activeSection === 'trabalhadores') {
      return renderTrabalhadores()
    }
    if (activeSection === 'definicoes') {
      return renderSettings()
    }

    // Default: Profile view
    return (
      <>
        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.avatarContainer} onClick={() => avatarInputRef.current?.click()}>
            <div style={styles.avatar}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={styles.avatarImage} />
              ) : (
                <span style={styles.avatarInitials}>
                  {user.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
            </div>
            <div style={styles.avatarOverlay}>
              {uploadingAvatar ? (
                <Loader2 size={14} color="white" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Camera size={14} color="white" />
              )}
            </div>
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            onChange={handleAvatarSelect}
            style={{ display: 'none' }}
          />
          <h2 style={styles.profileName}>{user.nome}</h2>
          <p style={styles.profileRole}>{user.cargo || 'Equipa'}</p>
          {isAdmin && (
            <span style={styles.profileBadge}>
              <Shield size={14} />
              Administrador
            </span>
          )}
        </div>

        {/* Personal Info */}
        <div style={styles.infoSection}>
          <h4 style={styles.sectionTitle}>Informação Pessoal</h4>
          <div style={styles.infoRow}>
            <div style={styles.infoIcon}><User size={18} /></div>
            <div style={styles.infoContent}>
              <p style={styles.infoLabel}>Nome</p>
              <p style={styles.infoValue}>{user.nome}</p>
            </div>
          </div>
          {user.email && (
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}><Mail size={18} /></div>
              <div style={styles.infoContent}>
                <p style={styles.infoLabel}>Email</p>
                <p style={styles.infoValue}>{user.email}</p>
              </div>
            </div>
          )}
          {user.telefone && (
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}><Phone size={18} /></div>
              <div style={styles.infoContent}>
                <p style={styles.infoLabel}>Telefone</p>
                <p style={styles.infoValue}>{user.telefone}</p>
              </div>
            </div>
          )}
          <div style={styles.infoRow}>
            <div style={styles.infoIcon}><Briefcase size={18} /></div>
            <div style={styles.infoContent}>
              <p style={styles.infoLabel}>Cargo</p>
              <p style={styles.infoValue}>{user.cargo || 'Não definido'}</p>
            </div>
          </div>
          <button
            onClick={() => setEditingProfile(true)}
            style={{ ...styles.menuItem, borderBottom: 'none', justifyContent: 'center', color: colors.primary }}
          >
            <Pencil size={16} />
            <span style={{ marginLeft: 8, fontWeight: 500 }}>Editar Perfil</span>
          </button>
        </div>

        {/* Admin Tools */}
        {isAdmin && (
          <div style={styles.infoSection}>
            <h4 style={styles.sectionTitle}>Ferramentas de Administração</h4>
            <button style={styles.menuItem} onClick={() => setActiveSection('obras')}>
              <div style={{ ...styles.menuItemIcon, background: `${colors.primary}15`, color: colors.primary }}>
                <HardHat size={20} />
              </div>
              <div style={styles.menuItemContent}>
                <p style={styles.menuItemTitle}>Gerir Obras</p>
                <p style={styles.menuItemDesc}>Ver e gerir todas as obras</p>
              </div>
              <ChevronRight size={20} color="#9ca3af" />
            </button>
            <button style={styles.menuItem} onClick={() => setActiveSection('trabalhadores')}>
              <div style={{ ...styles.menuItemIcon, background: '#dcfce7', color: '#16a34a' }}>
                <Users size={20} />
              </div>
              <div style={styles.menuItemContent}>
                <p style={styles.menuItemTitle}>Gerir Trabalhadores</p>
                <p style={styles.menuItemDesc}>Adicionar, editar e atribuir trabalhadores</p>
              </div>
              <ChevronRight size={20} color="#9ca3af" />
            </button>
            <button style={styles.menuItem} onClick={() => setActiveSection('definicoes')}>
              <div style={{ ...styles.menuItemIcon, background: '#fef3c7', color: '#d97706' }}>
                <Settings size={20} />
              </div>
              <div style={styles.menuItemContent}>
                <p style={styles.menuItemTitle}>Definições</p>
                <p style={styles.menuItemDesc}>Configurações da aplicação</p>
              </div>
              <ChevronRight size={20} color="#9ca3af" />
            </button>
          </div>
        )}
      </>
    )
  }

  // Get header title based on section
  const getHeaderTitle = () => {
    // Check settings sub-sections first
    if (activeSection === 'definicoes' && settingsSection) {
      switch (settingsSection) {
        case 'notificacoes': return 'Notificações'
        case 'database': return 'Base de Dados'
        case 'aparencia': return 'Aparência'
        case 'seguranca': return 'Segurança'
      }
    }

    switch (activeSection) {
      case 'obras': return 'Gerir Obras'
      case 'trabalhadores': return 'Gerir Trabalhadores'
      case 'definicoes': return 'Definições'
      default: return 'O Meu Perfil'
    }
  }

  // Handle back navigation
  const handleBack = () => {
    // If in a settings sub-section, go back to settings menu
    if (activeSection === 'definicoes' && settingsSection) {
      setSettingsSection(null)
      return
    }
    // If in a main section, go back to profile
    if (activeSection) {
      setActiveSection(null)
      return
    }
    // Otherwise, exit profile page
    onBack()
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>{getHeaderTitle()}</h1>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {renderContent()}
      </div>

      {/* Modals */}
      {editingProfile && renderProfileEdit()}
      {showAddModal === 'trabalhador' && renderTrabalhadorModal()}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
