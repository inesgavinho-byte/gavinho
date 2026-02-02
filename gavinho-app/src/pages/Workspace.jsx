import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Hash, Plus, Send, Paperclip, Image as ImageIcon, Search,
  MoreHorizontal, Reply, X, ChevronDown, ChevronRight,
  MessageSquare, Users, FileText, StickyNote, Heart,
  CheckSquare, FolderOpen, Building2, Palette, AtSign,
  Smile, Pin, Bookmark, Bell, BellOff, Settings,
  Video, Phone, ScreenShare, Calendar, Star, Filter,
  ArrowUp, ArrowDown, Clock, CheckCircle2, AlertCircle,
  Link2, Copy, Check, Edit, Trash2, CornerUpLeft, Quote,
  BookmarkCheck, Volume2, VolumeX, User, CalendarDays,
  FileImage, SlidersHorizontal,
  Bold, Italic, Code, List, ListOrdered,
  Forward, CheckCheck, Keyboard, Upload, ExternalLink,
  Grip, FileCode,
  // New icons for additional features
  MessageCircle, UserPlus, PhoneCall, VideoIcon, BellRing,
  Moon, Coffee, Plane, Home, Lock, Archive, BarChart3,
  Tag, Download, Mail, Webhook, Bot, Sparkles, AlarmClock,
  CalendarPlus, XCircle, Eye, EyeOff, Mic, MicOff,
  Monitor, Globe, FileDown, Zap,
  // Teams import icons
  CloudDownload, RefreshCw, CheckCircle, AlertTriangle,
  Loader2, FolderDown, MessageSquarePlus, UsersRound
} from 'lucide-react'

// Microsoft Graph API Configuration
const MS_GRAPH_CONFIG = {
  clientId: import.meta.env.VITE_MS_CLIENT_ID || 'YOUR_CLIENT_ID',
  authority: 'https://login.microsoftonline.com/common',
  redirectUri: typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '',
  scopes: ['User.Read', 'Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Read.All', 'Files.Read.All']
}

// Status options for users
const USER_STATUS_OPTIONS = [
  { id: 'available', label: 'Disponível', icon: 'CheckCircle2', color: '#22c55e' },
  { id: 'busy', label: 'Ocupado', icon: 'XCircle', color: '#ef4444' },
  { id: 'away', label: 'Ausente', icon: 'Clock', color: '#f59e0b' },
  { id: 'dnd', label: 'Não incomodar', icon: 'BellOff', color: '#ef4444' },
  { id: 'meeting', label: 'Em reunião', icon: 'Video', color: '#8b5cf6' },
  { id: 'lunch', label: 'Almoço', icon: 'Coffee', color: '#f97316' },
  { id: 'vacation', label: 'Férias', icon: 'Plane', color: '#06b6d4' },
  { id: 'wfh', label: 'A trabalhar de casa', icon: 'Home', color: '#10b981' }
]

// Message tags/labels
const MESSAGE_TAGS = [
  { id: 'urgent', label: 'Urgente', color: '#ef4444' },
  { id: 'important', label: 'Importante', color: '#f59e0b' },
  { id: 'followup', label: 'Follow-up', color: '#8b5cf6' },
  { id: 'decision', label: 'Decisão', color: '#3b82f6' },
  { id: 'info', label: 'Informação', color: '#06b6d4' },
  { id: 'action', label: 'Ação necessária', color: '#ec4899' }
]

// Reminder options
const REMINDER_OPTIONS = [
  { id: '30min', label: 'Em 30 minutos', minutes: 30 },
  { id: '1h', label: 'Em 1 hora', minutes: 60 },
  { id: '2h', label: 'Em 2 horas', minutes: 120 },
  { id: '4h', label: 'Em 4 horas', minutes: 240 },
  { id: 'tomorrow', label: 'Amanhã de manhã', minutes: 'tomorrow' },
  { id: 'nextweek', label: 'Próxima semana', minutes: 'nextweek' },
  { id: 'custom', label: 'Personalizado...', minutes: 'custom' }
]

// Estrutura de equipas GAVINHO (baseado no Teams)
const EQUIPAS_GAVINHO = [
  { id: 'arch', nome: 'GAVINHO ARCH', cor: '#6366f1', inicial: 'A', descricao: 'Projetos de Arquitetura' },
  { id: 'hosp', nome: 'GAVINHO HOSP.', cor: '#f59e0b', inicial: 'H', descricao: 'Projetos de Hospitalidade' },
  { id: 'signature', nome: 'GAVINHO Signature', cor: '#10b981', inicial: 'GS', descricao: 'Projetos Premium' }
]

// Tópicos padrão para cada canal/projeto
const DEFAULT_TOPICS = [
  { id: 'geral', nome: 'Geral', icon: 'MessageSquare', cor: '#6b7280' },
  { id: 'estudo-previo', nome: 'Estudo Prévio', icon: 'FileText', cor: '#8b5cf6' },
  { id: 'projeto-execucao', nome: 'Projeto de Execução', icon: 'Building2', cor: '#3b82f6' },
  { id: 'central-entregas', nome: 'Central de Entregas', icon: 'FolderOpen', cor: '#10b981' },
  { id: 'obra', nome: 'Acompanhamento Obra', icon: 'Grip', cor: '#f59e0b' },
  { id: 'cliente', nome: 'Cliente', icon: 'Users', cor: '#ec4899' }
]

// Reações disponíveis (estilo Teams)
const REACTIONS = [
  { emoji: '👍', name: 'like' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😄', name: 'laugh' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '😢', name: 'sad' },
  { emoji: '🎉', name: 'celebrate' }
]

// Emojis organizados por categoria
const EMOJI_CATEGORIES = [
  {
    name: 'Frequentes',
    emojis: ['👍', '❤️', '😄', '🎉', '👏', '🙏', '💪', '✅', '🔥', '⭐']
  },
  {
    name: 'Caras',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '😲', '😳', '🥺', '😢', '😭', '😤', '😠', '🤯', '😱', '🥴', '😴']
  },
  {
    name: 'Gestos',
    emojis: ['👋', '🤚', '✋', '🖐️', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤝', '🙏', '💪']
  },
  {
    name: 'Objetos',
    emojis: ['💼', '📁', '📂', '📄', '📝', '✏️', '📌', '📎', '🔗', '📧', '📨', '💻', '🖥️', '📱', '📷', '🎨', '🏠', '🏢', '🏗️', '🔨', '🔧', '📐', '📏', '🗓️', '⏰', '💡', '🔑', '🔒']
  },
  {
    name: 'Símbolos',
    emojis: ['✅', '❌', '⭕', '❗', '❓', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫', '▶️', '⏸️', '⏹️', '🔄', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '🔔', '🔕']
  },
  {
    name: 'Celebração',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '🌟', '✨', '💫', '🔥', '💥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗']
  }
]

export default function Workspace() {
  // Handle OAuth callback in popup
  useEffect(() => {
    // Check if we're in a popup and have a token in the hash
    if (window.opener && window.location.hash) {
      const hash = window.location.hash.substring(1)
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash)
        const token = params.get('access_token')
        if (token) {
          // Send token to parent window
          window.opener.postMessage({ type: 'teams_auth_success', token }, window.location.origin)
          window.close()
          return
        }
      }
      // Check for error
      if (hash.includes('error')) {
        const params = new URLSearchParams(hash)
        const error = params.get('error_description') || params.get('error')
        window.opener.postMessage({ type: 'teams_auth_error', error }, window.location.origin)
        window.close()
        return
      }
    }
  }, [])

  const { profile, getUserInitials } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)

  // Estrutura Teams
  const [equipas, setEquipas] = useState(EQUIPAS_GAVINHO)
  const [equipaAtiva, setEquipaAtiva] = useState(null)
  const [equipasExpanded, setEquipasExpanded] = useState({})

  // Canais (projetos dentro de cada equipa)
  const [canais, setCanais] = useState([])
  const [canalAtivo, setCanalAtivo] = useState(null)

  // Tópicos dentro do canal
  const [channelTopics, setChannelTopics] = useState({})
  const [activeTopic, setActiveTopic] = useState('geral')
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  // Tabs do canal
  const [activeTab, setActiveTab] = useState('publicacoes')

  // Mensagens/Posts
  const [posts, setPosts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Threads
  const [activeThread, setActiveThread] = useState(null)
  const [threadReplies, setThreadReplies] = useState({})

  // Input
  const [messageInput, setMessageInput] = useState('')
  const [replyInput, setReplyInput] = useState('')

  // Emoji Picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Frequentes')

  // Mention Autocomplete
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Edit/Delete/Reply
  const [editingMessage, setEditingMessage] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [showMessageMenu, setShowMessageMenu] = useState(null)

  // Upload
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  // Equipa members
  const [membros, setMembros] = useState([])

  // Notifications
  const [mutedChannels, setMutedChannels] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Saved Messages (Bookmarks)
  const [savedMessages, setSavedMessages] = useState([])
  const [showSavedMessages, setShowSavedMessages] = useState(false)

  // Filters
  const [activeFilter, setActiveFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Advanced Search
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    author: '',
    dateFrom: '',
    dateTo: '',
    hasAttachments: false,
    hasMentions: false
  })

  // Rich Text Formatting
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true)

  // Typing Indicator
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)

  // Online Status
  const [onlineUsers, setOnlineUsers] = useState([]) // Populated from realtime presence

  // Read Receipts
  const [readReceipts, setReadReceipts] = useState({})

  // Favorite Channels
  const [favoriteChannels, setFavoriteChannels] = useState([])

  // Pinned Messages
  const [channelPinnedMessages, setChannelPinnedMessages] = useState({})
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)

  // Create Task Modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [taskFromMessage, setTaskFromMessage] = useState(null)

  // Forward Message Modal
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [messageToForward, setMessageToForward] = useState(null)

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false)

  // Keyboard shortcuts help
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Activity Log
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all') // all, mentions, unread
  const [activityLog, setActivityLog] = useState([])

  // ========== NEW FEATURES STATE ==========

  // Direct Messages (DM)
  const [showDMPanel, setShowDMPanel] = useState(false)
  const [directMessages, setDirectMessages] = useState([])
  const [activeDM, setActiveDM] = useState(null)
  const [dmMessages, setDmMessages] = useState({})
  const [showNewDMModal, setShowNewDMModal] = useState(false)

  // Video/Audio Calls
  const [showCallModal, setShowCallModal] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [callType, setCallType] = useState(null) // 'video' or 'audio'
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // Message Reminders
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderMessage, setReminderMessage] = useState(null)
  const [reminders, setReminders] = useState([])
  const [customReminderDate, setCustomReminderDate] = useState('')

  // Calendar Integration
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    date: '',
    time: '',
    duration: '30',
    participants: [],
    description: ''
  })

  // AI Bot/Assistant
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Private Channels
  const [privateChannels, setPrivateChannels] = useState([])
  const [showCreatePrivateChannel, setShowCreatePrivateChannel] = useState(false)
  const [newPrivateChannel, setNewPrivateChannel] = useState({ name: '', members: [] })

  // Archive Channels
  const [archivedChannels, setArchivedChannels] = useState([])
  const [showArchivedChannels, setShowArchivedChannels] = useState(false)

  // Channel Analytics
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [channelAnalytics, setChannelAnalytics] = useState({
    totalMessages: 0,
    messagesThisWeek: 0,
    activeUsers: 0,
    topContributors: [],
    activityByDay: [],
    popularTopics: []
  })

  // Tags/Labels
  const [messageTags, setMessageTags] = useState({})
  const [showTagSelector, setShowTagSelector] = useState(null)
  const [filterByTag, setFilterByTag] = useState(null)

  // User Status
  const [userStatus, setUserStatus] = useState('available')
  const [customStatusMessage, setCustomStatusMessage] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Do Not Disturb
  const [dndEnabled, setDndEnabled] = useState(false)
  const [dndSchedule, setDndSchedule] = useState({ start: '22:00', end: '08:00' })
  const [showDndSettings, setShowDndSettings] = useState(false)

  // User Profile Card
  const [showProfileCard, setShowProfileCard] = useState(null)
  const [expandedProfile, setExpandedProfile] = useState(null)

  // Desktop Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')

  // Export Conversation
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [exportDateRange, setExportDateRange] = useState({ from: '', to: '' })

  // Webhooks
  const [webhooks, setWebhooks] = useState([])
  const [showWebhookSettings, setShowWebhookSettings] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] })

  // Email Sync
  const [emailSyncEnabled, setEmailSyncEnabled] = useState(false)
  const [emailDigestFrequency, setEmailDigestFrequency] = useState('daily')
  const [showEmailSettings, setShowEmailSettings] = useState(false)

  // ========== MICROSOFT TEAMS IMPORT ==========
  const [showTeamsImport, setShowTeamsImport] = useState(false)
  const [teamsAuthState, setTeamsAuthState] = useState('idle') // idle, authenticating, authenticated, error
  const [teamsAccessToken, setTeamsAccessToken] = useState(null)
  const [teamsUser, setTeamsUser] = useState(null)
  const [availableTeams, setAvailableTeams] = useState([])
  const [selectedTeamsToImport, setSelectedTeamsToImport] = useState([])
  const [teamsChannels, setTeamsChannels] = useState({}) // { teamId: [channels] }
  const [selectedChannelsToImport, setSelectedChannelsToImport] = useState([])
  const [importProgress, setImportProgress] = useState({ status: 'idle', current: 0, total: 0, currentItem: '' })
  const [importLog, setImportLog] = useState([])
  const [importStep, setImportStep] = useState(1) // 1: Auth, 2: Select Teams, 3: Select Channels, 4: Import, 5: Complete

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (canalAtivo) {
      loadPosts(canalAtivo.id)
      subscribeToChannel(canalAtivo.id)
    }
    return () => {
      // Cleanup subscription
    }
  }, [canalAtivo])

  useEffect(() => {
    if (!activeThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [posts])

  const loadData = async () => {
    try {
      setLoading(true)
      const [projetosRes, membrosRes] = await Promise.all([
        supabase
          .from('projetos')
          .select('id, codigo, nome, tipologia, status')
          .eq('arquivado', false)
          .order('codigo', { ascending: false }),
        supabase
          .from('utilizadores')
          .select('id, nome, avatar_url, funcao')
          .eq('ativo', true)
          .order('nome')
      ])

      if (projetosRes.data) {
        const canaisComEquipa = projetosRes.data.map(p => ({
          ...p,
          equipa: p.tipologia?.toLowerCase().includes('hosp') ? 'hosp' :
                  p.tipologia?.toLowerCase().includes('signature') ? 'signature' : 'arch',
          unreadCount: 0, // Real count loaded from database
          lastActivity: new Date().toISOString()
        }))

        setCanais(canaisComEquipa)

        // Check URL for canal parameter
        const canalParam = searchParams.get('canal')
        const tabParam = searchParams.get('tab')

        if (canalParam) {
          // Find canal by codigo or id
          const canalFromUrl = canaisComEquipa.find(c =>
            c.codigo === canalParam || c.id === canalParam
          )
          if (canalFromUrl) {
            setEquipaAtiva(canalFromUrl.equipa)
            setEquipasExpanded({ [canalFromUrl.equipa]: true })
            setCanalAtivo(canalFromUrl)
            if (tabParam) setActiveTab(tabParam)
            return
          }
        }

        // Default: select first canal
        if (canaisComEquipa.length > 0) {
          const primeiraEquipa = canaisComEquipa[0].equipa
          setEquipaAtiva(primeiraEquipa)
          setEquipasExpanded({ [primeiraEquipa]: true })
          setCanalAtivo(canaisComEquipa[0])
        }
      }

      if (membrosRes.data) {
        setMembros(membrosRes.data)
      }
    } catch (err) {
      // Silent fail - will show empty state
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async (canalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url, funcao)
        `)
        .eq('canal_id', canalId)
        .is('parent_id', null)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        setPosts([])
        return
      }

      if (data && data.length > 0) {
        // Carregar contagem de replies e formatar attachments
        const postsWithReplies = await Promise.all(data.map(async (post) => {
          const { count } = await supabase
            .from('chat_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', post.id)
            .eq('eliminado', false)

          // Construir array de attachments a partir dos campos de ficheiro
          let attachments = []
          if (post.ficheiro_url) {
            const isImage = post.tipo === 'imagem' || post.ficheiro_nome?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
            attachments.push({
              name: post.ficheiro_nome || 'Ficheiro',
              url: post.ficheiro_url,
              type: isImage ? 'image' : 'file',
              size: post.ficheiro_tamanho ? `${Math.round(post.ficheiro_tamanho / 1024)} KB` : ''
            })
          }

          // Carregar anexos adicionais da tabela chat_anexos
          const { data: extraAnexos } = await supabase
            .from('chat_anexos')
            .select('*')
            .eq('mensagem_id', post.id)

          if (extraAnexos && extraAnexos.length > 0) {
            extraAnexos.forEach(anexo => {
              const isImage = anexo.nome?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
              attachments.push({
                name: anexo.nome || 'Ficheiro',
                url: anexo.url,
                type: isImage ? 'image' : 'file',
                size: anexo.tamanho ? `${Math.round(anexo.tamanho / 1024)} KB` : ''
              })
            })
          }

          return {
            ...post,
            replyCount: count || 0,
            attachments: attachments.length > 0 ? attachments : undefined
          }
        }))

        setPosts(postsWithReplies)
      } else {
        setPosts([])
      }
    } catch (err) {
      setPosts([])
    }
  }

  const subscribeToChannel = (canalId) => {
    const channel = supabase
      .channel(`chat-${canalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `canal_id=eq.${canalId}`
      }, (payload) => {
        if (!payload.new.parent_id) {
          setPosts(prev => [...prev, { ...payload.new, replyCount: 0 }])
        } else if (activeThread?.id === payload.new.parent_id) {
          setThreadReplies(prev => ({
            ...prev,
            [payload.new.parent_id]: [...(prev[payload.new.parent_id] || []), payload.new]
          }))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const getMockPosts = () => [
    {
      id: '1',
      conteudo: 'Bom dia equipa! Precisamos de rever os materiais para a Suite Principal. A cliente quer opções mais sustentáveis.',
      autor: { id: '1', nome: 'Maria Gavinho', avatar_url: null, funcao: 'Diretora Criativa' },
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      reacoes: [{ emoji: '👍', users: ['João', 'Ana'] }],
      replyCount: 3,
      pinned: true
    },
    {
      id: '2',
      conteudo: 'Já falei com o fornecedor de pedras. Têm uma nova linha de mármore reciclado que pode ser interessante. Vou partilhar o catálogo.',
      autor: { id: '2', nome: 'João Umbelino', avatar_url: null, funcao: 'Procurement' },
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      reacoes: [{ emoji: '❤️', users: ['Maria'] }, { emoji: '🎉', users: ['Ana', 'Carlos'] }],
      replyCount: 1,
      attachments: [{ name: 'Catalogo_Marmore_2025.pdf', type: 'pdf', size: '2.4 MB' }]
    },
    {
      id: '3',
      conteudo: '@Maria Gavinho o render da sala está pronto para revisão. Implementei as alterações que discutimos ontem.',
      autor: { id: '3', nome: 'Carolina Cipriano', avatar_url: null, funcao: 'Designer 3D' },
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      reacoes: [],
      replyCount: 0,
      imagem_url: '/api/placeholder/600/400'
    }
  ]

  const loadThreadReplies = async (postId) => {
    if (threadReplies[postId]) return

    try {
      const { data } = await supabase
        .from('chat_mensagens')
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url, funcao)
        `)
        .eq('parent_id', postId)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })

      if (data) {
        setThreadReplies(prev => ({ ...prev, [postId]: data }))
      } else {
        // Mock replies
        setThreadReplies(prev => ({
          ...prev,
          [postId]: [
            {
              id: `${postId}-r1`,
              conteudo: 'Concordo! Vou verificar também com o nosso contacto em Itália.',
              autor: { nome: 'Ana Santos', funcao: 'Project Manager' },
              created_at: new Date(Date.now() - 3600000 * 10).toISOString()
            },
            {
              id: `${postId}-r2`,
              conteudo: 'Excelente iniciativa. Sustentabilidade é cada vez mais importante para os nossos clientes.',
              autor: { nome: 'Carlos Mendes', funcao: 'Arquiteto' },
              created_at: new Date(Date.now() - 3600000 * 8).toISOString()
            }
          ]
        }))
      }
    } catch (err) {
      // Silent fail - replies will show empty
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return
    if (!canalAtivo) return

    try {
      setUploading(true)

      // Upload de ficheiros
      let attachments = []
      for (const file of selectedFiles) {
        const fileName = `${canalAtivo.id}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(fileName, file.file)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(fileName)
          attachments.push({
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size
          })
        }
      }

      // Inserir mensagem na base de dados
      const { data: insertedMessage, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conteudo: messageInput,
          tipo: attachments.length > 0 ? (attachments[0].type === 'image' ? 'imagem' : 'ficheiro') : 'texto',
          autor_id: profile?.id,
          canal_id: canalAtivo?.id,
          topico_id: null, // Workspace uses canal_id directly
          parent_id: replyingTo?.id || null,
          ficheiro_url: attachments.length > 0 ? attachments[0].url : null,
          ficheiro_nome: attachments.length > 0 ? attachments[0].name : null,
          ficheiro_tamanho: attachments.length > 0 ? parseInt(attachments[0].size) || null : null,
          ficheiro_tipo: attachments.length > 0 ? attachments[0].type : null
        })
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url, funcao)
        `)
        .single()

      if (insertError) {
        throw insertError
      }

      // Se houver múltiplos anexos, inserir os adicionais na tabela chat_anexos
      if (attachments.length > 1) {
        const extraAttachments = attachments.slice(1).map(att => ({
          mensagem_id: insertedMessage.id,
          url: att.url,
          nome: att.name,
          tamanho: parseInt(att.size) || null,
          tipo: att.type
        }))
        await supabase.from('chat_anexos').insert(extraAttachments)
      }

      // Adicionar attachments ao post para exibição local
      const newPost = {
        ...insertedMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
        replyCount: 0,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          autor: replyingTo.autor,
          conteudo: replyingTo.conteudo?.substring(0, 100) + (replyingTo.conteudo?.length > 100 ? '...' : '')
        } : undefined
      }

      setPosts(prev => [...prev, newPost])
      setMessageInput('')
      setSelectedFiles([])
      setReplyingTo(null)

    } catch (err) {
      alert('Erro ao enviar mensagem: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSendReply = async (postId) => {
    if (!replyInput.trim()) return

    const newReply = {
      id: `${postId}-r${Date.now()}`,
      conteudo: replyInput,
      autor: {
        nome: profile?.nome || 'Utilizador',
        avatar_url: profile?.avatar_url,
        funcao: profile?.funcao || 'Equipa'
      },
      created_at: new Date().toISOString()
    }

    setThreadReplies(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newReply]
    }))

    // Atualizar contagem
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p
    ))

    setReplyInput('')
  }

  const handleReaction = (postId, emoji, isReply = false, replyId = null) => {
    if (isReply && replyId) {
      setThreadReplies(prev => ({
        ...prev,
        [postId]: prev[postId]?.map(reply => {
          if (reply.id === replyId) {
            const existingReaction = reply.reacoes?.find(r => r.emoji === emoji)
            if (existingReaction) {
              return {
                ...reply,
                reacoes: reply.reacoes.filter(r => r.emoji !== emoji)
              }
            }
            return {
              ...reply,
              reacoes: [...(reply.reacoes || []), { emoji, users: [profile?.nome || 'Eu'] }]
            }
          }
          return reply
        })
      }))
    } else {
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const existingReaction = post.reacoes?.find(r => r.emoji === emoji)
          if (existingReaction) {
            const updatedUsers = existingReaction.users.includes(profile?.nome || 'Eu')
              ? existingReaction.users.filter(u => u !== (profile?.nome || 'Eu'))
              : [...existingReaction.users, profile?.nome || 'Eu']

            if (updatedUsers.length === 0) {
              return { ...post, reacoes: post.reacoes.filter(r => r.emoji !== emoji) }
            }
            return {
              ...post,
              reacoes: post.reacoes.map(r => r.emoji === emoji ? { ...r, users: updatedUsers } : r)
            }
          }
          return {
            ...post,
            reacoes: [...(post.reacoes || []), { emoji, users: [profile?.nome || 'Eu'] }]
          }
        }
        return post
      }))
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: formatFileSize(file.size),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEquipaCanais = (equipaId) => canais.filter(c => c.equipa === equipaId)

  const toggleEquipa = (equipaId) => {
    setEquipasExpanded(prev => ({ ...prev, [equipaId]: !prev[equipaId] }))
    setEquipaAtiva(equipaId)
  }

  // Select canal and update URL
  const selectCanal = (canal) => {
    setCanalAtivo(canal)
    setActiveThread(null)
    setSearchParams({ canal: canal.codigo })
  }

  // Copy direct link to clipboard
  const copyChannelLink = () => {
    const url = `${window.location.origin}/chat?canal=${canalAtivo.codigo}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  // Get direct link for a canal
  const getChannelLink = (canal) => {
    return `${window.location.origin}/chat?canal=${canal.codigo}`
  }

  const openThread = (post) => {
    setActiveThread(post)
    loadThreadReplies(post.id)
  }

  const getInitials = (nome) => {
    if (!nome) return 'U'
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Insert emoji at cursor position
  const insertEmoji = (emoji) => {
    const input = messageInputRef.current
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const newValue = messageInput.substring(0, start) + emoji + messageInput.substring(end)
      setMessageInput(newValue)
      // Set cursor position after emoji
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length
        input.focus()
      }, 0)
    } else {
      setMessageInput(prev => prev + emoji)
    }
    setShowEmojiPicker(false)
  }

  // Handle message input change with mention detection
  const handleMessageChange = (e) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMessageInput(value)

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1)
      // Only show mentions if @ is at start or after a space, and no space after @
      const charBeforeAt = atIndex > 0 ? value[atIndex - 1] : ' '
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0) && !textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt.toLowerCase())
        setMentionStartIndex(atIndex)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
    setMentionQuery('')
  }

  // Insert mention
  const insertMention = (membro) => {
    if (mentionStartIndex === -1) return

    const beforeMention = messageInput.substring(0, mentionStartIndex)
    const afterMention = messageInput.substring(mentionStartIndex + mentionQuery.length + 1)
    const newValue = `${beforeMention}@${membro.nome} ${afterMention}`

    setMessageInput(newValue)
    setShowMentions(false)
    setMentionQuery('')
    setMentionStartIndex(-1)

    // Focus back on input
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  // Filter members for mention autocomplete
  const filteredMembros = mentionQuery
    ? membros.filter(m => m.nome?.toLowerCase().includes(mentionQuery))
    : membros.slice(0, 8)

  // Start editing a message
  const startEditMessage = (post) => {
    setEditingMessage(post)
    setEditingContent(post.conteudo)
    setShowMessageMenu(null)
  }

  // Save edited message
  const saveEditMessage = () => {
    if (!editingMessage || !editingContent.trim()) return

    setPosts(prev => prev.map(p =>
      p.id === editingMessage.id
        ? { ...p, conteudo: editingContent, editado: true, editado_em: new Date().toISOString() }
        : p
    ))

    // Em produção, atualizar na base de dados
    // await supabase.from('chat_mensagens').update({ conteudo: editingContent, editado: true }).eq('id', editingMessage.id)

    setEditingMessage(null)
    setEditingContent('')
  }

  // Cancel editing
  const cancelEditMessage = () => {
    setEditingMessage(null)
    setEditingContent('')
  }

  // Delete message
  const deleteMessage = (postId) => {
    if (!window.confirm('Tens a certeza que queres eliminar esta mensagem?')) return

    setPosts(prev => prev.filter(p => p.id !== postId))
    setShowMessageMenu(null)

    // Em produção, marcar como eliminado na base de dados
    // await supabase.from('chat_mensagens').update({ eliminado: true }).eq('id', postId)
  }

  // Start replying to a message
  const startReplyTo = (post) => {
    setReplyingTo(post)
    setShowMessageMenu(null)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null)
  }

  // Check if current user owns the message
  const isOwnMessage = (post) => {
    return post.autor?.id === profile?.id || post.autor?.nome === profile?.nome
  }

  // Toggle saved message (bookmark)
  const toggleSaveMessage = (post) => {
    const isSaved = savedMessages.some(m => m.id === post.id)
    if (isSaved) {
      setSavedMessages(prev => prev.filter(m => m.id !== post.id))
    } else {
      setSavedMessages(prev => [...prev, { ...post, savedAt: new Date().toISOString() }])
    }
    setShowMessageMenu(null)
  }

  // Check if message is saved
  const isMessageSaved = (postId) => {
    return savedMessages.some(m => m.id === postId)
  }

  // Play notification sound
  const playNotificationSound = () => {
    if (!soundEnabled) return
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      // Audio not supported - silent fail
    }
  }

  // Get total unread count
  const getTotalUnreadCount = () => {
    return canais.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  }

  // Filter options
  const FILTER_OPTIONS = [
    { id: 'all', label: 'Todas', icon: MessageSquare },
    { id: 'attachments', label: 'Com anexos', icon: FileText },
    { id: 'images', label: 'Com imagens', icon: FileImage },
    { id: 'mentions', label: 'Menções', icon: AtSign },
    { id: 'saved', label: 'Guardadas', icon: Bookmark }
  ]

  // Apply filters to posts
  const applyFilters = (postsToFilter) => {
    let result = postsToFilter

    // Text search
    if (searchQuery) {
      result = result.filter(p =>
        p.conteudo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.autor?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    switch (activeFilter) {
      case 'attachments':
        result = result.filter(p => p.attachments?.length > 0)
        break
      case 'images':
        result = result.filter(p => p.imagem_url || p.attachments?.some(a => a.type === 'image'))
        break
      case 'mentions':
        result = result.filter(p => p.conteudo?.includes('@'))
        break
      case 'saved':
        result = result.filter(p => isMessageSaved(p.id))
        break
    }

    // Advanced search filters
    if (searchFilters.author) {
      result = result.filter(p =>
        p.autor?.nome?.toLowerCase().includes(searchFilters.author.toLowerCase())
      )
    }

    if (searchFilters.dateFrom) {
      const fromDate = new Date(searchFilters.dateFrom)
      result = result.filter(p => new Date(p.created_at) >= fromDate)
    }

    if (searchFilters.dateTo) {
      const toDate = new Date(searchFilters.dateTo)
      toDate.setHours(23, 59, 59)
      result = result.filter(p => new Date(p.created_at) <= toDate)
    }

    if (searchFilters.hasAttachments) {
      result = result.filter(p => p.attachments?.length > 0 || p.imagem_url)
    }

    if (searchFilters.hasMentions) {
      result = result.filter(p => p.conteudo?.includes('@'))
    }

    return result
  }

  // Reset all filters
  const resetFilters = () => {
    setActiveFilter('all')
    setSearchQuery('')
    setSearchFilters({
      author: '',
      dateFrom: '',
      dateTo: '',
      hasAttachments: false,
      hasMentions: false
    })
    setShowAdvancedSearch(false)
  }

  // Filter posts by topic (moved here to avoid TDZ error)
  const getPostsForTopic = (postsToFilter) => {
    if (activeTopic === 'geral') return postsToFilter
    return postsToFilter.filter(p => p.topic === activeTopic)
  }

  const filteredPosts = getPostsForTopic(applyFilters(posts))

  // ========== RICH TEXT FORMATTING ==========
  const applyFormatting = (format) => {
    const input = messageInputRef.current
    if (!input) return

    const start = input.selectionStart
    const end = input.selectionEnd
    const text = messageInput
    const selectedText = text.substring(start, end)

    let formattedText = ''
    let cursorOffset = 0

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'texto'}**`
        cursorOffset = selectedText ? formattedText.length : 2
        break
      case 'italic':
        formattedText = `_${selectedText || 'texto'}_`
        cursorOffset = selectedText ? formattedText.length : 1
        break
      case 'code':
        formattedText = `\`${selectedText || 'código'}\``
        cursorOffset = selectedText ? formattedText.length : 1
        break
      case 'codeblock':
        formattedText = `\`\`\`\n${selectedText || 'código'}\n\`\`\``
        cursorOffset = selectedText ? formattedText.length : 4
        break
      case 'list':
        formattedText = `\n- ${selectedText || 'item'}`
        cursorOffset = formattedText.length
        break
      case 'numbered':
        formattedText = `\n1. ${selectedText || 'item'}`
        cursorOffset = formattedText.length
        break
      case 'link':
        formattedText = `[${selectedText || 'texto'}](url)`
        cursorOffset = selectedText ? formattedText.length - 4 : 1
        break
      default:
        return
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end)
    setMessageInput(newText)

    setTimeout(() => {
      input.focus()
      input.setSelectionRange(start + cursorOffset, start + cursorOffset)
    }, 0)
  }

  // Render formatted text (bold, italic, code, links)
  const renderFormattedText = (text) => {
    if (!text) return null

    // Process code blocks first
    const codeBlockRegex = /```([\s\S]*?)```/g
    const inlineCodeRegex = /`([^`]+)`/g
    const boldRegex = /\*\*([^*]+)\*\*/g
    const italicRegex = /_([^_]+)_/g
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const urlRegex = /(https?:\/\/[^\s]+)/g

    let result = text

    // Code blocks
    result = result.replace(codeBlockRegex, '<pre class="code-block">$1</pre>')
    // Inline code
    result = result.replace(inlineCodeRegex, '<code class="inline-code">$1</code>')
    // Bold
    result = result.replace(boldRegex, '<strong>$1</strong>')
    // Italic
    result = result.replace(italicRegex, '<em>$1</em>')
    // Links
    result = result.replace(linkRegex, '<a href="$2" target="_blank" class="chat-link">$1</a>')
    // Auto-link URLs
    result = result.replace(urlRegex, (match) => {
      if (result.includes(`href="${match}"`)) return match
      return `<a href="${match}" target="_blank" class="chat-link">${match}</a>`
    })

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  // Extract URL previews from text
  const extractUrls = (text) => {
    if (!text) return []
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.match(urlRegex) || []
  }

  // ========== TYPING INDICATOR ==========
  const handleTyping = () => {
    // Emit typing event (in production, would broadcast via Supabase realtime)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator after 3 seconds of no input
    }, 3000)
  }

  // ========== ONLINE STATUS ==========
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId)
  }

  // ========== READ RECEIPTS ==========
  const markMessageAsRead = (messageId) => {
    setReadReceipts(prev => ({
      ...prev,
      [messageId]: {
        read: true,
        readAt: new Date().toISOString(),
        readBy: [...(prev[messageId]?.readBy || []), profile?.id]
      }
    }))
  }

  const getReadStatus = (message) => {
    const receipt = readReceipts[message.id]
    if (!receipt) return 'sent'
    if (receipt.readBy?.length > 0) return 'read'
    return 'delivered'
  }

  // ========== FAVORITE CHANNELS ==========
  const toggleFavoriteChannel = (channelId) => {
    setFavoriteChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  const isFavoriteChannel = (channelId) => {
    return favoriteChannels.includes(channelId)
  }

  // Sort channels: favorites first
  const sortedCanais = [...canais].sort((a, b) => {
    const aFav = isFavoriteChannel(a.id)
    const bFav = isFavoriteChannel(b.id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return 0
  })

  // ========== PINNED MESSAGES ==========
  const togglePinMessage = (post) => {
    if (!canalAtivo) return
    const channelId = canalAtivo.id
    const isPinned = channelPinnedMessages[channelId]?.some(m => m.id === post.id)

    setChannelPinnedMessages(prev => ({
      ...prev,
      [channelId]: isPinned
        ? (prev[channelId] || []).filter(m => m.id !== post.id)
        : [...(prev[channelId] || []), { ...post, pinnedAt: new Date().toISOString() }]
    }))
    setShowMessageMenu(null)
  }

  const isMessagePinned = (postId) => {
    if (!canalAtivo) return false
    return channelPinnedMessages[canalAtivo.id]?.some(m => m.id === postId)
  }

  const getCurrentChannelPinnedMessages = () => {
    if (!canalAtivo) return []
    return channelPinnedMessages[canalAtivo.id] || []
  }

  // ========== CREATE TASK FROM MESSAGE ==========
  const openCreateTaskModal = (post) => {
    setTaskFromMessage(post)
    setShowCreateTaskModal(true)
    setShowMessageMenu(null)
  }

  const handleCreateTask = (taskData) => {
    // TODO: In production, would insert into tasks table
    setShowCreateTaskModal(false)
    setTaskFromMessage(null)
    alert('Tarefa criada com sucesso!')
  }

  // ========== FORWARD MESSAGE ==========
  const openForwardModal = (post) => {
    setMessageToForward(post)
    setShowForwardModal(true)
    setShowMessageMenu(null)
  }

  const handleForwardMessage = (targetChannelId) => {
    if (!messageToForward) return

    const targetChannel = canais.find(c => c.id === targetChannelId)

    // TODO: In production, would insert forwarded message
    setShowForwardModal(false)
    setMessageToForward(null)
    alert(`Mensagem reencaminhada para ${targetChannel?.nome}`)
  }

  // ========== DRAG & DROP FILES ==========
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const newFiles = files.map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'file'
      }))
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
  }, [])

  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSendMessage()
        return
      }

      // Escape to close modals/menus
      if (e.key === 'Escape') {
        setShowEmojiPicker(false)
        setShowMentions(false)
        setShowMessageMenu(null)
        setShowForwardModal(false)
        setShowCreateTaskModal(false)
        setShowKeyboardShortcuts(false)
        setActiveThread(null)
        return
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        return
      }

      // Ctrl/Cmd + B for bold (when input focused)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && document.activeElement === messageInputRef.current) {
        e.preventDefault()
        applyFormatting('bold')
        return
      }

      // Ctrl/Cmd + I for italic (when input focused)
      if ((e.ctrlKey || e.metaKey) && e.key === 'i' && document.activeElement === messageInputRef.current) {
        e.preventDefault()
        applyFormatting('italic')
        return
      }

      // Ctrl/Cmd + Shift + C for code (when input focused)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && document.activeElement === messageInputRef.current) {
        e.preventDefault()
        applyFormatting('code')
        return
      }

      // ? for keyboard shortcuts help
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [messageInput])

  // KEYBOARD_SHORTCUTS constant for help modal
  const KEYBOARD_SHORTCUTS = [
    { keys: ['Ctrl', 'Enter'], description: 'Enviar mensagem' },
    { keys: ['Ctrl', 'K'], description: 'Pesquisar' },
    { keys: ['Ctrl', 'B'], description: 'Negrito' },
    { keys: ['Ctrl', 'I'], description: 'Itálico' },
    { keys: ['Ctrl', 'Shift', 'C'], description: 'Código' },
    { keys: ['Esc'], description: 'Fechar menus/modais' },
    { keys: ['?'], description: 'Atalhos de teclado' }
  ]

  // ========== ACTIVITY LOG ==========
  // Filter activity log
  const getFilteredActivity = () => {
    switch (activityFilter) {
      case 'mentions':
        return activityLog.filter(a => a.type === 'mention')
      case 'unread':
        return activityLog.filter(a => a.unread)
      default:
        return activityLog
    }
  }

  // Mark activity as read
  const markActivityAsRead = (activityId) => {
    setActivityLog(prev => prev.map(a =>
      a.id === activityId ? { ...a, unread: false } : a
    ))
  }

  // Mark all as read
  const markAllActivityAsRead = () => {
    setActivityLog(prev => prev.map(a => ({ ...a, unread: false })))
  }

  // Navigate to activity source
  const navigateToActivity = (activity) => {
    const canal = canais.find(c => c.codigo === activity.canal.codigo)
    if (canal) {
      selectCanal(canal)
    }
    markActivityAsRead(activity.id)
    setShowActivityLog(false)
  }

  // Get unread activity count
  const getUnreadActivityCount = () => {
    return activityLog.filter(a => a.unread).length
  }

  // Get mention count
  const getMentionCount = () => {
    return activityLog.filter(a => a.type === 'mention' && a.unread).length
  }

  // ========== TOPICS MANAGEMENT ==========
  // Get topics for current channel
  const getCurrentChannelTopics = () => {
    if (!canalAtivo) return DEFAULT_TOPICS
    return channelTopics[canalAtivo.id] || DEFAULT_TOPICS
  }

  // Add custom topic to channel
  const addCustomTopic = () => {
    if (!newTopicName.trim() || !canalAtivo) return

    const newTopic = {
      id: `custom-${Date.now()}`,
      nome: newTopicName.trim(),
      icon: 'Hash',
      cor: '#6b7280',
      custom: true
    }

    setChannelTopics(prev => ({
      ...prev,
      [canalAtivo.id]: [...(prev[canalAtivo.id] || DEFAULT_TOPICS), newTopic]
    }))

    setNewTopicName('')
    setShowAddTopic(false)
  }

  // Remove custom topic
  const removeCustomTopic = (topicId) => {
    if (!canalAtivo) return
    setChannelTopics(prev => ({
      ...prev,
      [canalAtivo.id]: (prev[canalAtivo.id] || DEFAULT_TOPICS).filter(t => t.id !== topicId)
    }))
    if (activeTopic === topicId) {
      setActiveTopic('geral')
    }
  }

  // Get topic icon component
  const getTopicIcon = (iconName) => {
    const icons = {
      MessageSquare, FileText, Building2, FolderOpen, Grip, Users, Hash
    }
    return icons[iconName] || Hash
  }

  // ========== DIRECT MESSAGES (DM) ==========
  const startDM = (user) => {
    const existingDM = directMessages.find(dm =>
      dm.participants.some(p => p.id === user.id)
    )
    if (existingDM) {
      setActiveDM(existingDM)
    } else {
      const newDM = {
        id: `dm-${Date.now()}`,
        participants: [user],
        lastMessage: null,
        unread: 0,
        created_at: new Date().toISOString()
      }
      setDirectMessages(prev => [...prev, newDM])
      setActiveDM(newDM)
    }
    setShowDMPanel(true)
    setShowNewDMModal(false)
  }

  const sendDMMessage = (dmId, content) => {
    if (!content.trim()) return
    const newMsg = {
      id: `msg-${Date.now()}`,
      content,
      sender: profile,
      timestamp: new Date().toISOString()
    }
    setDmMessages(prev => ({
      ...prev,
      [dmId]: [...(prev[dmId] || []), newMsg]
    }))
    setDirectMessages(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, lastMessage: newMsg } : dm
    ))
  }

  // ========== VIDEO/AUDIO CALLS ==========
  const startCall = (type, participants) => {
    setCallType(type)
    setActiveCall({
      id: `call-${Date.now()}`,
      type,
      participants,
      startTime: new Date(),
      status: 'connecting'
    })
    setShowCallModal(true)
  }

  const endCall = () => {
    setActiveCall(null)
    setShowCallModal(false)
    setIsMuted(false)
    setIsVideoOff(false)
    setIsScreenSharing(false)
  }

  const toggleMute = () => setIsMuted(!isMuted)
  const toggleVideo = () => setIsVideoOff(!isVideoOff)
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing)

  // ========== MESSAGE REMINDERS ==========
  const setMessageReminder = (message, option) => {
    let reminderTime
    const now = new Date()

    if (option.minutes === 'tomorrow') {
      reminderTime = new Date(now)
      reminderTime.setDate(reminderTime.getDate() + 1)
      reminderTime.setHours(9, 0, 0, 0)
    } else if (option.minutes === 'nextweek') {
      reminderTime = new Date(now)
      reminderTime.setDate(reminderTime.getDate() + 7)
      reminderTime.setHours(9, 0, 0, 0)
    } else if (option.minutes === 'custom') {
      setReminderMessage(message)
      setShowReminderModal(true)
      return
    } else {
      reminderTime = new Date(now.getTime() + option.minutes * 60000)
    }

    const reminder = {
      id: `reminder-${Date.now()}`,
      message,
      reminderTime: reminderTime.toISOString(),
      created: now.toISOString()
    }
    setReminders(prev => [...prev, reminder])
    setShowMessageMenu(null)
    alert(`Lembrete definido para ${reminderTime.toLocaleString('pt-PT')}`)
  }

  const deleteReminder = (reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId))
  }

  // ========== CALENDAR INTEGRATION ==========
  const scheduleMeetingFromChat = (message = null) => {
    if (message) {
      setMeetingDetails(prev => ({
        ...prev,
        description: message.conteudo?.substring(0, 200) || '',
        title: `Reunião: ${canalAtivo?.codigo || 'Chat'}`
      }))
    }
    setShowScheduleMeetingModal(true)
    setShowMessageMenu(null)
  }

  const createMeeting = () => {
    // TODO: In production, would integrate with Google Calendar/Outlook
    alert(`Reunião "${meetingDetails.title}" agendada para ${meetingDetails.date} às ${meetingDetails.time}`)
    setShowScheduleMeetingModal(false)
    setMeetingDetails({ title: '', date: '', time: '', duration: '30', participants: [], description: '' })
  }

  // ========== AI ASSISTANT ==========
  const sendAIMessage = async () => {
    if (!aiInput.trim()) return

    const userMessage = { role: 'user', content: aiInput, timestamp: new Date().toISOString() }
    setAiMessages(prev => [...prev, userMessage])
    setAiInput('')
    setAiLoading(true)

    // Simulate AI response (in production, would call AI API)
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: getAIResponse(aiInput),
        timestamp: new Date().toISOString()
      }
      setAiMessages(prev => [...prev, aiResponse])
      setAiLoading(false)
    }, 1000)
  }

  const getAIResponse = (query) => {
    const lowerQuery = query.toLowerCase()
    if (lowerQuery.includes('ajuda') || lowerQuery.includes('help')) {
      return 'Posso ajudar-te com:\n• Resumir conversas\n• Encontrar mensagens\n• Criar tarefas\n• Agendar reuniões\n• Responder a perguntas sobre projetos'
    }
    if (lowerQuery.includes('resumo') || lowerQuery.includes('resumir')) {
      return `📋 Resumo do canal ${canalAtivo?.codigo || 'atual'}:\n\n• ${posts.length} mensagens no total\n• Tópicos ativos: ${getCurrentChannelTopics().length}\n• Última atividade: ${formatTime(posts[posts.length - 1]?.created_at || new Date().toISOString())}`
    }
    if (lowerQuery.includes('tarefa') || lowerQuery.includes('task')) {
      return 'Para criar uma tarefa a partir de uma mensagem, clica nos três pontos (⋯) da mensagem e seleciona "Criar tarefa".'
    }
    return 'Entendi! Posso ajudar-te com informações sobre este projeto, resumos de conversas, ou criar tarefas. O que precisas?'
  }

  // ========== PRIVATE CHANNELS ==========
  const createPrivateChannel = () => {
    if (!newPrivateChannel.name.trim()) return

    const channel = {
      id: `private-${Date.now()}`,
      nome: newPrivateChannel.name,
      members: newPrivateChannel.members,
      isPrivate: true,
      created_at: new Date().toISOString(),
      createdBy: profile?.id
    }
    setPrivateChannels(prev => [...prev, channel])
    setShowCreatePrivateChannel(false)
    setNewPrivateChannel({ name: '', members: [] })
  }

  // ========== ARCHIVE CHANNELS ==========
  const archiveChannel = (channelId) => {
    const channel = canais.find(c => c.id === channelId)
    if (channel && window.confirm(`Arquivar canal ${channel.codigo}?`)) {
      setArchivedChannels(prev => [...prev, { ...channel, archivedAt: new Date().toISOString() }])
      setCanais(prev => prev.filter(c => c.id !== channelId))
      if (canalAtivo?.id === channelId) {
        setCanalAtivo(canais[0] || null)
      }
    }
  }

  const restoreChannel = (channelId) => {
    const channel = archivedChannels.find(c => c.id === channelId)
    if (channel) {
      setCanais(prev => [...prev, channel])
      setArchivedChannels(prev => prev.filter(c => c.id !== channelId))
    }
  }

  // ========== CHANNEL ANALYTICS ==========
  const loadChannelAnalytics = () => {
    // In production, would fetch from database
    const mockAnalytics = {
      totalMessages: posts.length + Math.floor(Math.random() * 100),
      messagesThisWeek: Math.floor(Math.random() * 30) + 10,
      activeUsers: membros.slice(0, 5).length,
      topContributors: membros.slice(0, 5).map(m => ({
        ...m,
        messageCount: Math.floor(Math.random() * 20) + 1
      })),
      activityByDay: [
        { day: 'Seg', count: Math.floor(Math.random() * 15) + 5 },
        { day: 'Ter', count: Math.floor(Math.random() * 15) + 5 },
        { day: 'Qua', count: Math.floor(Math.random() * 15) + 5 },
        { day: 'Qui', count: Math.floor(Math.random() * 15) + 5 },
        { day: 'Sex', count: Math.floor(Math.random() * 15) + 5 }
      ],
      popularTopics: getCurrentChannelTopics().slice(0, 3)
    }
    setChannelAnalytics(mockAnalytics)
    setShowAnalytics(true)
  }

  // ========== TAGS/LABELS ==========
  const addTagToMessage = (messageId, tagId) => {
    setMessageTags(prev => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), tagId]
    }))
    setShowTagSelector(null)
  }

  const removeTagFromMessage = (messageId, tagId) => {
    setMessageTags(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || []).filter(t => t !== tagId)
    }))
  }

  const getMessageTags = (messageId) => {
    return (messageTags[messageId] || []).map(tagId =>
      MESSAGE_TAGS.find(t => t.id === tagId)
    ).filter(Boolean)
  }

  // ========== USER STATUS ==========
  const updateUserStatus = (statusId, customMessage = '') => {
    setUserStatus(statusId)
    setCustomStatusMessage(customMessage)
    setShowStatusMenu(false)
    // In production, would sync to database
  }

  const getStatusInfo = (statusId) => {
    return USER_STATUS_OPTIONS.find(s => s.id === statusId) || USER_STATUS_OPTIONS[0]
  }

  // ========== DO NOT DISTURB ==========
  const toggleDND = () => {
    setDndEnabled(!dndEnabled)
    if (!dndEnabled) {
      setUserStatus('dnd')
    } else {
      setUserStatus('available')
    }
  }

  const isInDNDPeriod = () => {
    if (!dndEnabled) return false
    const now = new Date()
    const [startH, startM] = dndSchedule.start.split(':').map(Number)
    const [endH, endM] = dndSchedule.end.split(':').map(Number)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // ========== USER PROFILE CARD ==========
  const openProfileCard = (user) => {
    setExpandedProfile({
      ...user,
      status: 'available',
      email: user.email || `${user.nome?.toLowerCase().replace(/\s/g, '.')}@gavinho.pt`,
      phone: '+351 912 345 678',
      department: user.funcao || 'Equipa',
      location: 'Lisboa, Portugal',
      projects: canais.slice(0, 3).map(c => c.codigo)
    })
    setShowProfileCard(user.id)
  }

  // ========== DESKTOP NOTIFICATIONS ==========
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      setNotificationsEnabled(permission === 'granted')
    }
  }

  const sendDesktopNotification = (title, body, icon) => {
    if (notificationsEnabled && !isInDNDPeriod()) {
      new Notification(title, { body, icon: icon || '/favicon.ico' })
    }
  }

  // ========== EXPORT CONVERSATION ==========
  const exportConversation = () => {
    const content = posts.map(p =>
      `[${formatDateTime(p.created_at)}] ${p.autor?.nome}: ${p.conteudo}`
    ).join('\n\n')

    if (exportFormat === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' })
      downloadBlob(blob, `${canalAtivo?.codigo || 'chat'}_export.txt`)
    } else {
      // For PDF, create a simple HTML-based export
      const htmlContent = `
        <html><head><title>Exportação - ${canalAtivo?.codigo}</title>
        <style>body{font-family:Arial;padding:40px;}h1{color:#3D3D3D;}.msg{margin:20px 0;padding:15px;border-left:3px solid #7A8B6E;}.time{color:#888;font-size:12px;}.author{font-weight:bold;}</style></head>
        <body><h1>${canalAtivo?.codigo} - ${canalAtivo?.nome}</h1>
        ${posts.map(p => `<div class="msg"><div class="time">${formatDateTime(p.created_at)}</div><div class="author">${p.autor?.nome}</div><div>${p.conteudo}</div></div>`).join('')}
        </body></html>
      `
      const blob = new Blob([htmlContent], { type: 'text/html' })
      downloadBlob(blob, `${canalAtivo?.codigo || 'chat'}_export.html`)
    }
    setShowExportModal(false)
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ========== WEBHOOKS ==========
  const addWebhook = () => {
    if (!newWebhook.url.trim()) return
    const webhook = {
      id: `webhook-${Date.now()}`,
      ...newWebhook,
      created_at: new Date().toISOString(),
      active: true
    }
    setWebhooks(prev => [...prev, webhook])
    setNewWebhook({ url: '', events: [] })
  }

  const deleteWebhook = (webhookId) => {
    setWebhooks(prev => prev.filter(w => w.id !== webhookId))
  }

  const triggerWebhook = (event, data) => {
    webhooks.filter(w => w.active && w.events.includes(event)).forEach(webhook => {
      // TODO: In production, would POST to webhook.url
    })
  }

  // ========== EMAIL SYNC ==========
  const toggleEmailSync = () => {
    setEmailSyncEnabled(!emailSyncEnabled)
    if (!emailSyncEnabled) {
      alert('Sincronização de email ativada. Receberás resumos diários das conversas.')
    }
  }

  // ========== MICROSOFT TEAMS IMPORT ==========

  // Start Microsoft OAuth login
  const startTeamsAuth = () => {
    setTeamsAuthState('authenticating')

    // Clear any previous OAuth data from localStorage
    localStorage.removeItem('teams_oauth_token')
    localStorage.removeItem('teams_oauth_error')
    localStorage.removeItem('teams_oauth_timestamp')

    // Build OAuth URL
    const authUrl = new URL(`${MS_GRAPH_CONFIG.authority}/oauth2/v2.0/authorize`)
    authUrl.searchParams.set('client_id', MS_GRAPH_CONFIG.clientId)
    authUrl.searchParams.set('response_type', 'token')
    authUrl.searchParams.set('redirect_uri', MS_GRAPH_CONFIG.redirectUri)
    authUrl.searchParams.set('scope', MS_GRAPH_CONFIG.scopes.join(' '))
    authUrl.searchParams.set('response_mode', 'fragment')
    authUrl.searchParams.set('state', 'teams_import')

    // Open popup for auth
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    window.open(
      authUrl.toString(),
      'Microsoft Login',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    let authCompleted = false

    // Function to handle successful auth - simplified, no storage events
    const handleAuthSuccess = (token) => {
      if (authCompleted) return
      authCompleted = true

      // Process the token first
      setTeamsAccessToken(token)
      setTeamsAuthState('authenticated')
      fetchTeamsUser(token)
      fetchAvailableTeams(token)
      setImportStep(2)

      // Clean up localStorage much later to avoid any interference
      setTimeout(() => {
        try {
          localStorage.removeItem('ms_teams_oauth_token')
          localStorage.removeItem('ms_teams_oauth_error')
        } catch (e) { /* ignore */ }
      }, 10000)
    }

    // Function to handle auth error
    const handleAuthError = (error) => {
      if (authCompleted) return
      authCompleted = true

      setTeamsAuthState('error')
      addImportLog('error', error || 'Erro de autenticação')

      setTimeout(() => {
        try {
          localStorage.removeItem('ms_teams_oauth_token')
          localStorage.removeItem('ms_teams_oauth_error')
        } catch (e) { /* ignore */ }
      }, 10000)
    }

    // Only use polling - avoid storage events which can interfere with Supabase
    const checkStorage = setInterval(() => {
      if (authCompleted) {
        clearInterval(checkStorage)
        return
      }

      // Use unique prefixed keys to avoid conflicts
      const token = localStorage.getItem('ms_teams_oauth_token')
      const error = localStorage.getItem('ms_teams_oauth_error')

      if (token) {
        clearInterval(checkStorage)
        handleAuthSuccess(token)
      } else if (error) {
        clearInterval(checkStorage)
        handleAuthError(error)
      }
    }, 500)

    // Timeout after 2 minutes
    setTimeout(() => {
      if (!authCompleted) {
        clearInterval(checkStorage)
        setTeamsAuthState('error')
        addImportLog('error', 'Autenticação expirou. Tente novamente.')
      }
    }, 120000)
  }

  // Fetch authenticated user info
  const fetchTeamsUser = async (token) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const user = await response.json()
        setTeamsUser(user)
        addImportLog('success', `Autenticado como ${user.displayName}`)
      }
    } catch (error) {
      addImportLog('error', 'Erro ao obter informações do utilizador')
    }
  }

  // Fetch available Teams
  const fetchAvailableTeams = async (token) => {
    try {
      addImportLog('info', 'A carregar Teams...')
      const response = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableTeams(data.value || [])
        addImportLog('success', `Encontrados ${data.value?.length || 0} Teams`)
      } else {
        throw new Error('Failed to fetch teams')
      }
    } catch (error) {
      addImportLog('error', 'Erro ao carregar Teams. Verifique as permissões.')
      setTeamsAuthState('error')
    }
  }

  // Fetch channels for a team
  const fetchTeamChannels = async (teamId) => {
    if (!teamsAccessToken) return

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
        { headers: { Authorization: `Bearer ${teamsAccessToken}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setTeamsChannels(prev => ({ ...prev, [teamId]: data.value || [] }))
        return data.value || []
      }
    } catch (error) {
      addImportLog('error', `Erro ao carregar canais do Team ${teamId}`)
    }
    return []
  }

  // Toggle team selection
  const toggleTeamSelection = async (team) => {
    const isSelected = selectedTeamsToImport.some(t => t.id === team.id)

    if (isSelected) {
      setSelectedTeamsToImport(prev => prev.filter(t => t.id !== team.id))
      setSelectedChannelsToImport(prev => prev.filter(c => c.teamId !== team.id))
    } else {
      setSelectedTeamsToImport(prev => [...prev, team])
      // Fetch channels for this team
      if (!teamsChannels[team.id]) {
        await fetchTeamChannels(team.id)
      }
    }
  }

  // Toggle channel selection
  const toggleChannelSelection = (channel, teamId) => {
    const channelWithTeam = { ...channel, teamId }
    const isSelected = selectedChannelsToImport.some(c => c.id === channel.id)

    if (isSelected) {
      setSelectedChannelsToImport(prev => prev.filter(c => c.id !== channel.id))
    } else {
      setSelectedChannelsToImport(prev => [...prev, channelWithTeam])
    }
  }

  // Add log entry
  const addImportLog = (type, message) => {
    setImportLog(prev => [...prev, {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }])
  }

  // Start the import process
  const startTeamsImport = async () => {
    if (selectedChannelsToImport.length === 0) {
      alert('Selecione pelo menos um canal para importar')
      return
    }

    setImportStep(4)
    setImportProgress({ status: 'importing', current: 0, total: selectedChannelsToImport.length, currentItem: '' })
    addImportLog('info', `Iniciando importação de ${selectedChannelsToImport.length} canais...`)

    for (let i = 0; i < selectedChannelsToImport.length; i++) {
      const channel = selectedChannelsToImport[i]
      const team = selectedTeamsToImport.find(t => t.id === channel.teamId)

      setImportProgress(prev => ({
        ...prev,
        current: i + 1,
        currentItem: `${team?.displayName} > ${channel.displayName}`
      }))

      addImportLog('info', `Importando: ${channel.displayName}`)

      try {
        // Fetch messages from this channel
        const messages = await fetchChannelMessages(channel.teamId, channel.id)

        // Create local channel/project mapping
        const localChannel = {
          id: `imported-${channel.id}`,
          codigo: channel.displayName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
          nome: channel.displayName,
          equipa: 'arch',
          importedFrom: 'teams',
          teamsTeamId: channel.teamId,
          teamsChannelId: channel.id,
          unreadCount: 0,
          lastActivity: new Date().toISOString()
        }

        // Add to local channels
        setCanais(prev => {
          // Check if already imported
          if (prev.some(c => c.teamsChannelId === channel.id)) {
            addImportLog('warning', `Canal "${channel.displayName}" já foi importado anteriormente`)
            return prev
          }
          return [...prev, localChannel]
        })

        // Import messages
        if (messages.length > 0) {
          const importedPosts = messages.map(msg => ({
            id: `imported-${msg.id}`,
            conteudo: msg.body?.content?.replace(/<[^>]*>/g, '') || '',
            autor: {
              id: msg.from?.user?.id || 'unknown',
              nome: msg.from?.user?.displayName || 'Utilizador Teams',
              avatar_url: null,
              funcao: 'Importado do Teams'
            },
            created_at: msg.createdDateTime,
            reacoes: [],
            replyCount: msg.replies?.length || 0,
            importedFrom: 'teams',
            canal_id: localChannel.id
          }))

          // Store messages (in production, would save to database)
          addImportLog('success', `Importadas ${importedPosts.length} mensagens de "${channel.displayName}"`)
        }

        addImportLog('success', `Canal "${channel.displayName}" importado com sucesso`)

      } catch (error) {
        addImportLog('error', `Erro ao importar "${channel.displayName}": ${error.message}`)
      }

      // Small delay between channels
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setImportProgress(prev => ({ ...prev, status: 'complete' }))
    setImportStep(5)
    addImportLog('success', '✓ Importação concluída!')
  }

  // Fetch messages from a channel
  const fetchChannelMessages = async (teamId, channelId) => {
    if (!teamsAccessToken) return []

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50`,
        { headers: { Authorization: `Bearer ${teamsAccessToken}` } }
      )

      if (response.ok) {
        const data = await response.json()
        return data.value || []
      }
    } catch (error) {
      // Silent fail - will return empty array
    }
    return []
  }

  // Reset import state
  const resetTeamsImport = () => {
    setTeamsAuthState('idle')
    setTeamsAccessToken(null)
    setTeamsUser(null)
    setAvailableTeams([])
    setSelectedTeamsToImport([])
    setTeamsChannels({})
    setSelectedChannelsToImport([])
    setImportProgress({ status: 'idle', current: 0, total: 0, currentItem: '' })
    setImportLog([])
    setImportStep(1)
  }

  // Close import modal
  const closeTeamsImport = () => {
    setShowTeamsImport(false)
    if (importStep === 5) {
      resetTeamsImport()
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in workspace-container" style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      background: 'var(--white)'
    }}>

      {/* ========== SIDEBAR EQUIPAS ========== */}
      <div style={{
        width: '280px',
        background: 'var(--off-white)',
        borderRight: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
              Equipas
            </h2>
            {/* Total unread badge */}
            {getTotalUnreadCount() > 0 && (
              <span style={{
                minWidth: '22px',
                height: '22px',
                borderRadius: '11px',
                background: 'var(--error)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px'
              }}>
                {getTotalUnreadCount()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {/* Activity button */}
            <button
              onClick={() => setShowActivityLog(!showActivityLog)}
              title="Atividade"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: showActivityLog ? 'var(--accent-olive)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: showActivityLog ? 'white' : 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <Bell size={18} />
              {getUnreadActivityCount() > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  background: 'var(--error)',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px'
                }}>
                  {getUnreadActivityCount()}
                </span>
              )}
            </button>
            {/* Saved messages button */}
            <button
              onClick={() => setShowSavedMessages(!showSavedMessages)}
              title="Mensagens guardadas"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: showSavedMessages ? 'var(--accent-olive)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: showSavedMessages ? 'white' : 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <Bookmark size={18} />
              {savedMessages.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {savedMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              title="Pesquisar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: showSearch ? 'var(--stone)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Search size={18} />
            </button>
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: soundEnabled ? 'var(--accent-olive)' : 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {/* Teams Import */}
            <button
              onClick={() => setShowTeamsImport(true)}
              title="Importar do Microsoft Teams"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CloudDownload size={18} />
            </button>
          </div>
        </div>

        {/* Search box */}
        {showSearch && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--stone)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)'
              }} />
              <input
                type="text"
                placeholder="Pesquisar conversas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'var(--white)',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Equipas List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {equipas.map(equipa => {
            const equipaCanais = getEquipaCanais(equipa.id)
            const isExpanded = equipasExpanded[equipa.id]
            const totalUnread = equipaCanais.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

            return (
              <div key={equipa.id}>
                {/* Equipa header */}
                <button
                  onClick={() => toggleEquipa(equipa.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    background: equipaAtiva === equipa.id ? 'rgba(0,0,0,0.03)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                >
                  <ChevronRight
                    size={14}
                    style={{
                      color: 'var(--brown-light)',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: equipa.cor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {equipa.inicial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--brown)'
                    }}>
                      {equipa.nome}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      {equipaCanais.length} projetos
                    </div>
                  </div>
                  {totalUnread > 0 && (
                    <span style={{
                      minWidth: '20px',
                      height: '20px',
                      borderRadius: '10px',
                      background: 'var(--error)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px'
                    }}>
                      {totalUnread}
                    </span>
                  )}
                </button>

                {/* Canais */}
                {isExpanded && (
                  <div style={{ paddingLeft: '28px' }}>
                    {equipaCanais
                      .sort((a, b) => {
                        const aFav = isFavoriteChannel(a.id)
                        const bFav = isFavoriteChannel(b.id)
                        if (aFav && !bFav) return -1
                        if (!aFav && bFav) return 1
                        return 0
                      })
                      .map(canal => {
                      const isActive = canalAtivo?.id === canal.id
                      const isFav = isFavoriteChannel(canal.id)
                      return (
                        <div
                          key={canal.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginRight: '8px',
                            marginBottom: '2px'
                          }}
                          className="channel-item"
                        >
                          <button
                            onClick={() => selectCanal(canal)}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 8px 8px 12px',
                              background: isActive ? 'var(--stone)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: '6px 0 0 6px',
                              transition: 'background 0.15s'
                            }}
                          >
                            {isFav ? (
                              <Star size={16} fill="var(--warning)" style={{ color: 'var(--warning)', flexShrink: 0 }} />
                            ) : (
                              <Hash size={16} style={{ color: isActive ? 'var(--brown)' : 'var(--brown-light)', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: isActive ? 600 : canal.unreadCount > 0 ? 600 : 400,
                                color: isActive ? 'var(--brown)' : 'var(--brown-light)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {canal.codigo}
                              </div>
                            </div>
                            {canal.unreadCount > 0 && (
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent-olive)',
                                flexShrink: 0
                              }} />
                            )}
                          </button>
                          {/* Favorite star button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavoriteChannel(canal.id)
                            }}
                            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            style={{
                              width: '28px',
                              height: '32px',
                              background: isActive ? 'var(--stone)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: isFav ? 'var(--warning)' : 'var(--brown-light)',
                              opacity: isFav ? 1 : 0,
                              transition: 'opacity 0.15s',
                              borderRadius: '0 6px 6px 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            className="favorite-btn"
                          >
                            <Star size={14} fill={isFav ? 'var(--warning)' : 'none'} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ========== ACTIVITY LOG PANEL ========== */}
      {showActivityLog && (
        <div style={{
          width: '360px',
          background: 'var(--white)',
          borderRight: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          {/* Activity Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} style={{ color: 'var(--accent-olive)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
                Atividade
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getUnreadActivityCount() > 0 && (
                <button
                  onClick={markAllActivityAsRead}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'var(--cream)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--brown-light)'
                  }}
                >
                  Marcar como lido
                </button>
              )}
              <button
                onClick={() => setShowActivityLog(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Activity Filters */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--stone)'
          }}>
            {[
              { id: 'all', label: 'Não lido' },
              { id: 'mentions', label: '@Menções' },
              { id: 'unread', label: 'Menções de etiqueta' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setActivityFilter(filter.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  background: activityFilter === filter.id ? 'var(--brown)' : 'var(--cream)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activityFilter === filter.id ? 600 : 400,
                  color: activityFilter === filter.id ? 'white' : 'var(--brown)'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Activity List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {getFilteredActivity().length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--brown-light)'
              }}>
                <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Sem notificações
                </p>
              </div>
            ) : (
              getFilteredActivity().map(activity => (
                <div
                  key={activity.id}
                  onClick={() => navigateToActivity(activity)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--stone)',
                    background: activity.unread
                      ? activity.type === 'mention'
                        ? 'rgba(139, 155, 123, 0.12)'
                        : 'var(--cream)'
                      : 'transparent',
                    borderLeft: activity.type === 'mention' && activity.unread
                      ? '3px solid var(--accent-olive)'
                      : '3px solid transparent'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--brown-dark)'
                    }}>
                      {getInitials(activity.autor?.nome)}
                    </div>
                    {activity.type === 'mention' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--white)'
                      }}>
                        <AtSign size={10} style={{ color: 'white' }} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: activity.unread ? 700 : 500,
                          color: 'var(--brown)',
                          marginBottom: '2px'
                        }}>
                          {activity.autor.nome}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--brown-light)',
                          marginBottom: '4px'
                        }}>
                          {activity.preview}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--brown-light)',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDateTime(activity.created_at).split(' ')[0]}
                      </span>
                    </div>

                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '12px',
                      color: activity.unread ? 'var(--brown)' : 'var(--brown-light)',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {activity.conteudo}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--brown-light)'
                    }}>
                      <span style={{ opacity: 0.7 }}>{activity.equipa}</span>
                      <span style={{ opacity: 0.5 }}>›</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>
                        {activity.canal.codigo}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== SAVED MESSAGES PANEL ========== */}
      {showSavedMessages && (
        <div style={{
          width: '320px',
          background: 'var(--white)',
          borderRight: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookmarkCheck size={20} style={{ color: 'var(--accent-olive)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
                Mensagens Guardadas
              </h3>
            </div>
            <button
              onClick={() => setShowSavedMessages(false)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {savedMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--brown-light)'
              }}>
                <Bookmark size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Nenhuma mensagem guardada
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Clica no ícone de bookmark nas mensagens para guardar
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '12px',
                      background: 'var(--cream)',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // Navigate to the message's channel
                      const msgCanal = canais.find(c => c.id === msg.canal_id)
                      if (msgCanal) selectCanal(msgCanal)
                      setShowSavedMessages(false)
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--brown-dark)'
                      }}>
                        {getInitials(msg.autor?.nome)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                          {msg.autor?.nome}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                          {formatDateTime(msg.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaveMessage(msg)
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--warning)'
                        }}
                      >
                        <BookmarkCheck size={14} />
                      </button>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--brown)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {msg.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== ÁREA PRINCIPAL ========== */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(139, 155, 123, 0.95)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <Upload size={64} style={{ color: 'white' }} />
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'white' }}>
              Arrasta ficheiros para enviar
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
              Imagens, documentos, ou outros ficheiros
            </div>
          </div>
        )}

        {/* Header do canal */}
        {canalAtivo && (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--stone)',
            background: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: equipas.find(e => e.id === canalAtivo.equipa)?.cor || 'var(--accent-olive)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {equipas.find(e => e.id === canalAtivo.equipa)?.inicial || 'G'}
              </div>
              <div>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {canalAtivo.codigo}
                  <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>
                    {canalAtivo.nome}
                  </span>
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>
                  {membros.length} membros • {posts.length} mensagens
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* Copy Link Button */}
              <button
                onClick={copyChannelLink}
                title={linkCopied ? 'Link copiado!' : 'Copiar link do canal'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: linkCopied ? 'var(--success)' : 'var(--cream)',
                  border: linkCopied ? '1px solid var(--success)' : '1px solid var(--stone)',
                  cursor: 'pointer',
                  color: linkCopied ? 'white' : 'var(--brown)',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
                {linkCopied ? 'Copiado!' : 'Copiar Link'}
              </button>

              <div style={{ width: '1px', height: '24px', background: 'var(--stone)', margin: '0 8px' }} />

              {/* Video Call */}
              <button onClick={() => startCall('video', membros.slice(0, 3))} title="Iniciar reunião" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={18} />
              </button>
              {/* Voice Call */}
              <button onClick={() => startCall('audio', membros.slice(0, 3))} title="Chamada de voz" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} />
              </button>
              {/* DM */}
              <button onClick={() => setShowDMPanel(true)} title="Mensagens diretas" style={{ width: '36px', height: '36px', borderRadius: '6px', background: showDMPanel ? 'var(--stone)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={18} />
              </button>
              {/* AI Assistant */}
              <button onClick={() => setShowAIAssistant(true)} title="Assistente IA" style={{ width: '36px', height: '36px', borderRadius: '6px', background: showAIAssistant ? 'var(--stone)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} />
              </button>
              {/* Analytics */}
              <button onClick={loadChannelAnalytics} title="Analytics" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={18} />
              </button>
              {/* Export */}
              <button onClick={() => setShowExportModal(true)} title="Exportar conversa" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileDown size={18} />
              </button>
              {/* Schedule Meeting */}
              <button onClick={() => scheduleMeetingFromChat()} title="Agendar reunião" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarPlus size={18} />
              </button>
              {/* Settings */}
              <button title="Definições" style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {canalAtivo && (
          <div style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--stone)',
            padding: '0 24px',
            background: 'var(--white)',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex' }}>
              {[
                { id: 'publicacoes', label: 'Publicações', icon: MessageSquare },
                { id: 'ficheiros', label: 'Ficheiros', icon: FileText },
                { id: 'wiki', label: 'Wiki', icon: StickyNote },
                { id: 'tarefas', label: 'Tarefas', icon: CheckSquare }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent-olive)' : '2px solid transparent',
                    cursor: 'pointer',
                    color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    fontSize: '13px',
                    marginBottom: '-1px',
                    transition: 'color 0.15s'
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            {activeTab === 'publicacoes' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingRight: '8px' }}>
                {/* Quick filters */}
                <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                  {FILTER_OPTIONS.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      title={filter.label}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: activeFilter === filter.id ? 'var(--accent-olive)' : 'var(--cream)',
                        border: activeFilter === filter.id ? 'none' : '1px solid var(--stone)',
                        cursor: 'pointer',
                        color: activeFilter === filter.id ? 'white' : 'var(--brown-light)',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <filter.icon size={12} />
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Advanced search toggle */}
                <button
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  title="Pesquisa avançada"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: showAdvancedSearch ? 'var(--brown)' : 'transparent',
                    border: '1px solid var(--stone)',
                    cursor: 'pointer',
                    color: showAdvancedSearch ? 'white' : 'var(--brown-light)',
                    fontSize: '11px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <SlidersHorizontal size={12} />
                  Avançada
                </button>

                {/* Reset filters */}
                {(activeFilter !== 'all' || searchQuery || showAdvancedSearch) && (
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'var(--error)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <X size={12} />
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Topics Bar */}
        {canalAtivo && activeTab === 'publicacoes' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            background: 'var(--off-white)',
            borderBottom: '1px solid var(--stone)',
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginRight: '4px' }}>
              Tópicos:
            </span>
            {getCurrentChannelTopics().map(topic => {
              const IconComponent = getTopicIcon(topic.icon)
              const isActive = activeTopic === topic.id
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: isActive ? topic.cor : 'var(--white)',
                    border: isActive ? 'none' : '1px solid var(--stone)',
                    cursor: 'pointer',
                    color: isActive ? 'white' : 'var(--brown)',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  <IconComponent size={14} />
                  {topic.nome}
                  {topic.custom && isActive && (
                    <X
                      size={12}
                      style={{ marginLeft: '4px', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCustomTopic(topic.id)
                      }}
                    />
                  )}
                </button>
              )
            })}

            {/* Add Topic Button */}
            {!showAddTopic ? (
              <button
                onClick={() => setShowAddTopic(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '16px',
                  background: 'transparent',
                  border: '1px dashed var(--stone)',
                  cursor: 'pointer',
                  color: 'var(--brown-light)',
                  fontSize: '12px'
                }}
              >
                <Plus size={14} />
                Tópico
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Nome do tópico..."
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--accent-olive)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    width: '120px',
                    outline: 'none'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomTopic()
                    if (e.key === 'Escape') setShowAddTopic(false)
                  }}
                />
                <button
                  onClick={addCustomTopic}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--accent-olive)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setShowAddTopic(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--stone)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Advanced Search Panel */}
        {showAdvancedSearch && activeTab === 'publicacoes' && canalAtivo && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--cream)',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            {/* Author search */}
            <div style={{ minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                <User size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Autor
              </label>
              <input
                type="text"
                placeholder="Nome do autor..."
                value={searchFilters.author}
                onChange={e => setSearchFilters(prev => ({ ...prev, author: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: 'var(--white)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Date from */}
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                De
              </label>
              <input
                type="date"
                value={searchFilters.dateFrom}
                onChange={e => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: 'var(--white)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Date to */}
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Até
              </label>
              <input
                type="date"
                value={searchFilters.dateTo}
                onChange={e => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: 'var(--white)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={searchFilters.hasAttachments}
                  onChange={e => setSearchFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                  style={{ accentColor: 'var(--accent-olive)' }}
                />
                <Paperclip size={14} />
                Com anexos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={searchFilters.hasMentions}
                  onChange={e => setSearchFilters(prev => ({ ...prev, hasMentions: e.target.checked }))}
                  style={{ accentColor: 'var(--accent-olive)' }}
                />
                <AtSign size={14} />
                Com menções
              </label>
            </div>

            {/* Results count */}
            <div style={{
              marginLeft: 'auto',
              fontSize: '12px',
              color: 'var(--brown-light)',
              background: 'var(--white)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: 500
            }}>
              {filteredPosts.length} {filteredPosts.length === 1 ? 'resultado' : 'resultados'}
            </div>
          </div>
        )}

        {/* Pinned Messages Bar */}
        {canalAtivo && getCurrentChannelPinnedMessages().length > 0 && (
          <div style={{
            padding: '10px 24px',
            background: 'rgba(201, 168, 130, 0.1)',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Pin size={16} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
              {getCurrentChannelPinnedMessages().length} mensagem(ns) fixada(s)
            </span>
            <button
              onClick={() => setShowPinnedMessages(!showPinnedMessages)}
              style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                borderRadius: '4px',
                background: showPinnedMessages ? 'var(--accent-olive)' : 'var(--white)',
                border: '1px solid var(--stone)',
                cursor: 'pointer',
                color: showPinnedMessages ? 'white' : 'var(--brown)',
                fontSize: '12px'
              }}
            >
              {showPinnedMessages ? 'Ocultar' : 'Ver todas'}
            </button>
          </div>
        )}

        {/* Pinned Messages Panel */}
        {showPinnedMessages && canalAtivo && getCurrentChannelPinnedMessages().length > 0 && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--cream)',
            borderBottom: '1px solid var(--stone)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getCurrentChannelPinnedMessages().map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--white)',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--warning)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--brown-dark)',
                    flexShrink: 0
                  }}>
                    {getInitials(msg.autor?.nome)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                        {msg.autor?.nome}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                        {formatDateTime(msg.pinnedAt)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--brown)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {msg.conteudo}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePinMessage(msg)}
                    title="Desafixar"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--brown-light)'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          background: 'var(--off-white)'
        }}>
          {/* Main messages */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {activeTab === 'publicacoes' && (
              <>
                {/* Messages list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  {/* Pinned messages */}
                  {filteredPosts.filter(p => p.pinned).length > 0 && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(201, 168, 130, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <Pin size={16} style={{ color: 'var(--warning)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--brown)', fontWeight: 500 }}>
                        {filteredPosts.filter(p => p.pinned).length} mensagem fixada
                      </span>
                    </div>
                  )}

                  {/* Messages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredPosts.map((post, index) => {
                      const showAuthor = index === 0 ||
                        filteredPosts[index - 1]?.autor?.id !== post.autor?.id ||
                        (new Date(post.created_at) - new Date(filteredPosts[index - 1]?.created_at)) > 300000

                      return (
                        <div
                          key={post.id}
                          style={{
                            padding: showAuthor ? '16px' : '4px 16px 4px 64px',
                            borderRadius: '8px',
                            background: 'var(--white)',
                            marginTop: showAuthor ? '12px' : '0',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                          className="message-card"
                        >
                          {showAuthor && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: post.autor?.avatar_url
                                    ? `url(${post.autor.avatar_url}) center/cover`
                                    : 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--brown-dark)',
                                  fontSize: '14px',
                                  fontWeight: 600
                                }}>
                                  {!post.autor?.avatar_url && getInitials(post.autor?.nome)}
                                </div>
                                {/* Online status indicator */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: '0',
                                  right: '0',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: isUserOnline(post.autor?.id) ? '#22c55e' : '#9ca3af',
                                  border: '2px solid var(--white)'
                                }} title={isUserOnline(post.autor?.id) ? 'Online' : 'Offline'} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                                    {post.autor?.nome || 'Utilizador'}
                                  </span>
                                  {post.autor?.funcao && (
                                    <span style={{
                                      fontSize: '11px',
                                      color: 'var(--brown-light)',
                                      background: 'var(--stone)',
                                      padding: '2px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      {post.autor.funcao}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                                    {formatDateTime(post.created_at)}
                                  </span>
                                  {post.pinned && <Pin size={14} style={{ color: 'var(--warning)' }} />}
                                </div>
                              </div>

                              {/* Message actions */}
                              <div style={{ display: 'flex', gap: '2px', opacity: 0, position: 'relative' }} className="message-actions">
                                {REACTIONS.slice(0, 4).map(reaction => (
                                  <button
                                    key={reaction.name}
                                    onClick={() => handleReaction(post.id, reaction.emoji)}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '4px',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    {reaction.emoji}
                                  </button>
                                ))}
                                {/* Reply button */}
                                <button
                                  onClick={() => startReplyTo(post)}
                                  title="Responder"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--brown-light)'
                                  }}
                                >
                                  <CornerUpLeft size={16} />
                                </button>
                                {/* Thread button */}
                                <button
                                  onClick={() => openThread(post)}
                                  title="Abrir conversa"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--brown-light)'
                                  }}
                                >
                                  <MessageSquare size={16} />
                                </button>
                                {/* Bookmark button */}
                                <button
                                  onClick={() => toggleSaveMessage(post)}
                                  title={isMessageSaved(post.id) ? 'Remover dos guardados' : 'Guardar mensagem'}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    background: isMessageSaved(post.id) ? 'rgba(201, 168, 130, 0.2)' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isMessageSaved(post.id) ? 'var(--warning)' : 'var(--brown-light)'
                                  }}
                                >
                                  {isMessageSaved(post.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                </button>
                                {/* More options menu */}
                                <div style={{ position: 'relative' }}>
                                  <button
                                    onClick={() => setShowMessageMenu(showMessageMenu === post.id ? null : post.id)}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '4px',
                                      background: showMessageMenu === post.id ? 'var(--stone)' : 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--brown-light)'
                                    }}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>

                                  {/* Context menu */}
                                  {showMessageMenu === post.id && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: '0',
                                      marginTop: '4px',
                                      background: 'var(--white)',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                      border: '1px solid var(--stone)',
                                      minWidth: '160px',
                                      zIndex: 1000,
                                      overflow: 'hidden'
                                    }}>
                                      <button
                                        onClick={() => startReplyTo(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <CornerUpLeft size={16} />
                                        Responder
                                      </button>
                                      <button
                                        onClick={() => openThread(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <MessageSquare size={16} />
                                        Abrir conversa
                                      </button>
                                      <button
                                        onClick={() => toggleSaveMessage(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: isMessageSaved(post.id) ? 'var(--warning)' : 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        {isMessageSaved(post.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                        {isMessageSaved(post.id) ? 'Remover guardado' : 'Guardar'}
                                      </button>
                                      <button
                                        onClick={() => togglePinMessage(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: isMessagePinned(post.id) ? 'var(--warning)' : 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Pin size={16} />
                                        {isMessagePinned(post.id) ? 'Desafixar' : 'Fixar no canal'}
                                      </button>
                                      <button
                                        onClick={() => openForwardModal(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Forward size={16} />
                                        Reencaminhar
                                      </button>
                                      <button
                                        onClick={() => openCreateTaskModal(post)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: '10px 14px',
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          color: 'var(--brown)',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <CheckSquare size={16} />
                                        Criar tarefa
                                      </button>
                                      {isOwnMessage(post) && (
                                        <>
                                          <div style={{ height: '1px', background: 'var(--stone)', margin: '4px 0' }} />
                                          <button
                                            onClick={() => startEditMessage(post)}
                                            style={{
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '10px',
                                              padding: '10px 14px',
                                              border: 'none',
                                              background: 'transparent',
                                              cursor: 'pointer',
                                              fontSize: '13px',
                                              color: 'var(--brown)',
                                              textAlign: 'left'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Edit size={16} />
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => deleteMessage(post.id)}
                                            style={{
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '10px',
                                              padding: '10px 14px',
                                              border: 'none',
                                              background: 'transparent',
                                              cursor: 'pointer',
                                              fontSize: '13px',
                                              color: 'var(--error)',
                                              textAlign: 'left'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,53,69,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Trash2 size={16} />
                                            Eliminar
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div style={{ paddingLeft: showAuthor ? '52px' : '0' }}>
                            {/* Reply quote if this message is replying to another */}
                            {post.replyTo && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '8px 12px',
                                background: 'var(--cream)',
                                borderRadius: '8px',
                                borderLeft: '3px solid var(--accent-olive)',
                                marginBottom: '8px'
                              }}>
                                <Quote size={14} style={{ color: 'var(--brown-light)', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '2px' }}>
                                    {post.replyTo.autor?.nome}
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--brown)', opacity: 0.8 }}>
                                    {post.replyTo.conteudo?.substring(0, 100)}{post.replyTo.conteudo?.length > 100 ? '...' : ''}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Editing mode */}
                            {editingMessage?.id === post.id ? (
                              <div>
                                <textarea
                                  value={editingContent}
                                  onChange={e => setEditingContent(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '2px solid var(--accent-olive)',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    outline: 'none'
                                  }}
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <button
                                    onClick={saveEditMessage}
                                    style={{
                                      padding: '6px 14px',
                                      background: 'var(--accent-olive)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={cancelEditMessage}
                                    style={{
                                      padding: '6px 14px',
                                      background: 'var(--stone)',
                                      color: 'var(--brown)',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p style={{
                                  fontSize: '14px',
                                  color: 'var(--brown)',
                                  margin: 0,
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {renderFormattedText(post.conteudo)}
                                  {post.editado && (
                                    <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: '6px' }}>
                                      (editado)
                                    </span>
                                  )}
                                </p>

                                {/* Link Preview */}
                                {extractUrls(post.conteudo).slice(0, 1).map((url, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      marginTop: '10px',
                                      padding: '12px',
                                      background: 'var(--cream)',
                                      borderRadius: '8px',
                                      borderLeft: '3px solid var(--accent-olive)',
                                      maxWidth: '400px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <ExternalLink size={14} style={{ color: 'var(--brown-light)' }} />
                                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                        {new URL(url).hostname}
                                      </span>
                                    </div>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '13px',
                                        color: 'var(--accent-olive)',
                                        textDecoration: 'none',
                                        fontWeight: 500
                                      }}
                                    >
                                      {url.length > 60 ? url.substring(0, 60) + '...' : url}
                                    </a>
                                  </div>
                                ))}

                                {/* Read Receipt (for own messages) */}
                                {isOwnMessage(post) && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginTop: '4px',
                                    justifyContent: 'flex-end'
                                  }}>
                                    {getReadStatus(post) === 'read' ? (
                                      <CheckCheck size={14} style={{ color: 'var(--accent-olive)' }} title="Lido" />
                                    ) : getReadStatus(post) === 'delivered' ? (
                                      <CheckCheck size={14} style={{ color: 'var(--brown-light)' }} title="Entregue" />
                                    ) : (
                                      <Check size={14} style={{ color: 'var(--brown-light)' }} title="Enviado" />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Image */}
                            {post.imagem_url && (
                              <div style={{ marginTop: '12px' }}>
                                <img
                                  src={post.imagem_url}
                                  alt=""
                                  style={{
                                    maxWidth: '400px',
                                    maxHeight: '300px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                />
                              </div>
                            )}

                            {/* Attachments */}
                            {post.attachments?.length > 0 && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                {post.attachments.map((file, idx) => {
                                  const isImage = file.type === 'image' || file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)

                                  if (isImage && file.url) {
                                    return (
                                      <a
                                        key={idx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'block',
                                          maxWidth: '300px',
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          border: '1px solid var(--stone)'
                                        }}
                                      >
                                        <img
                                          src={file.url}
                                          alt={file.name}
                                          style={{
                                            width: '100%',
                                            maxHeight: '200px',
                                            objectFit: 'cover',
                                            display: 'block'
                                          }}
                                        />
                                        <div style={{
                                          padding: '6px 10px',
                                          background: 'var(--cream)',
                                          fontSize: '11px',
                                          color: 'var(--brown-light)'
                                        }}>
                                          {file.name} • {file.size}
                                        </div>
                                      </a>
                                    )
                                  }

                                  return (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        background: 'var(--cream)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        textDecoration: 'none'
                                      }}
                                    >
                                      <FileText size={18} style={{ color: 'var(--accent-olive)' }} />
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                                          {file.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                          {file.size}
                                        </div>
                                      </div>
                                    </a>
                                  )
                                })}
                              </div>
                            )}

                            {/* Reactions */}
                            {post.reacoes?.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                                {post.reacoes.map((reaction, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleReaction(post.id, reaction.emoji)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      background: reaction.users.includes(profile?.nome || 'Eu')
                                        ? 'rgba(122, 158, 122, 0.15)'
                                        : 'var(--stone)',
                                      border: reaction.users.includes(profile?.nome || 'Eu')
                                        ? '1px solid var(--success)'
                                        : '1px solid transparent',
                                      borderRadius: '16px',
                                      cursor: 'pointer',
                                      fontSize: '13px'
                                    }}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--brown)', fontWeight: 500 }}>
                                      {reaction.users.length}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Thread preview */}
                            {post.replyCount > 0 && (
                              <button
                                onClick={() => openThread(post)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  marginTop: '12px',
                                  background: 'var(--cream)',
                                  border: '1px solid var(--stone)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: 'var(--accent-olive)',
                                  fontWeight: 500
                                }}
                              >
                                <MessageSquare size={14} />
                                {post.replyCount} {post.replyCount === 1 ? 'resposta' : 'respostas'}
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {filteredPosts.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: 'var(--brown-light)'
                    }}>
                      <MessageSquare size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>
                        Sem mensagens
                      </h3>
                      <p style={{ margin: 0 }}>
                        Sê o primeiro a publicar neste canal!
                      </p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--stone)',
                  background: 'var(--white)'
                }}>
                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      fontSize: '12px',
                      color: 'var(--brown-light)'
                    }}>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--brown-light)',
                          animation: 'bounce 1.4s ease-in-out infinite'
                        }} />
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--brown-light)',
                          animation: 'bounce 1.4s ease-in-out infinite',
                          animationDelay: '0.2s'
                        }} />
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--brown-light)',
                          animation: 'bounce 1.4s ease-in-out infinite',
                          animationDelay: '0.4s'
                        }} />
                      </div>
                      <span>
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} está a escrever...`
                          : `${typingUsers.slice(0, 2).join(', ')} estão a escrever...`}
                      </span>
                    </div>
                  )}

                  {/* Formatting Toolbar */}
                  {showFormattingToolbar && (
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                      marginBottom: '10px',
                      padding: '6px 8px',
                      background: 'var(--cream)',
                      borderRadius: '8px',
                      alignItems: 'center'
                    }}>
                      <button
                        onClick={() => applyFormatting('bold')}
                        title="Negrito (Ctrl+B)"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Bold size={16} />
                      </button>
                      <button
                        onClick={() => applyFormatting('italic')}
                        title="Itálico (Ctrl+I)"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Italic size={16} />
                      </button>
                      <button
                        onClick={() => applyFormatting('code')}
                        title="Código inline (Ctrl+Shift+C)"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Code size={16} />
                      </button>
                      <button
                        onClick={() => applyFormatting('codeblock')}
                        title="Bloco de código"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FileCode size={16} />
                      </button>
                      <div style={{ width: '1px', height: '20px', background: 'var(--stone)', margin: '0 6px' }} />
                      <button
                        onClick={() => applyFormatting('list')}
                        title="Lista"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <List size={16} />
                      </button>
                      <button
                        onClick={() => applyFormatting('numbered')}
                        title="Lista numerada"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ListOrdered size={16} />
                      </button>
                      <button
                        onClick={() => applyFormatting('link')}
                        title="Inserir link"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Link2 size={16} />
                      </button>
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => setShowKeyboardShortcuts(true)}
                        title="Atalhos de teclado (?)"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'transparent',
                          border: '1px solid var(--stone)',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Keyboard size={12} />
                        Atalhos
                      </button>
                    </div>
                  )}

                  {/* Reply-to quote */}
                  {replyingTo && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      background: 'var(--cream)',
                      borderRadius: '10px',
                      borderLeft: '4px solid var(--accent-olive)',
                      marginBottom: '12px'
                    }}>
                      <CornerUpLeft size={18} style={{ color: 'var(--accent-olive)', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-olive)', marginBottom: '4px' }}>
                          A responder a {replyingTo.autor?.nome}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--brown)',
                          opacity: 0.8,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {replyingTo.conteudo?.substring(0, 150)}{replyingTo.conteudo?.length > 150 ? '...' : ''}
                        </div>
                      </div>
                      <button
                        onClick={cancelReply}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'var(--stone)',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Selected files preview */}
                  {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '8px'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '8px',
                              background: 'var(--cream)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <FileText size={24} style={{ color: 'var(--brown-light)' }} />
                              <span style={{ fontSize: '9px', color: 'var(--brown-light)', maxWidth: '70px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {file.name}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'var(--error)',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    background: 'var(--cream)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid var(--stone)'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Paperclip size={20} />
                      </button>
                      {/* Emoji Picker Button */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: showEmojiPicker ? 'var(--stone)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: showEmojiPicker ? 'var(--brown)' : 'var(--brown-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Smile size={20} />
                        </button>

                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                          <div style={{
                            position: 'absolute',
                            bottom: '48px',
                            left: '0',
                            width: '320px',
                            maxHeight: '350px',
                            background: 'var(--white)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            border: '1px solid var(--stone)',
                            zIndex: 1000,
                            overflow: 'hidden'
                          }}>
                            {/* Category tabs */}
                            <div style={{
                              display: 'flex',
                              gap: '2px',
                              padding: '8px',
                              borderBottom: '1px solid var(--stone)',
                              overflowX: 'auto',
                              background: 'var(--off-white)'
                            }}>
                              {EMOJI_CATEGORIES.map(cat => (
                                <button
                                  key={cat.name}
                                  onClick={() => setEmojiCategory(cat.name)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: emojiCategory === cat.name ? 'var(--white)' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: emojiCategory === cat.name ? 600 : 400,
                                    color: emojiCategory === cat.name ? 'var(--brown)' : 'var(--brown-light)',
                                    whiteSpace: 'nowrap',
                                    boxShadow: emojiCategory === cat.name ? 'var(--shadow-sm)' : 'none'
                                  }}
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </div>

                            {/* Emoji grid */}
                            <div style={{
                              padding: '8px',
                              maxHeight: '280px',
                              overflowY: 'auto'
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(8, 1fr)',
                                gap: '4px'
                              }}>
                                {EMOJI_CATEGORIES.find(c => c.name === emojiCategory)?.emojis.map((emoji, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => insertEmoji(emoji)}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      border: 'none',
                                      background: 'transparent',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '20px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mention Button */}
                      <button
                        onClick={() => {
                          const input = messageInputRef.current
                          if (input) {
                            const pos = input.selectionStart
                            const newValue = messageInput.substring(0, pos) + '@' + messageInput.substring(pos)
                            setMessageInput(newValue)
                            setMentionStartIndex(pos)
                            setMentionQuery('')
                            setShowMentions(true)
                            setTimeout(() => {
                              input.selectionStart = input.selectionEnd = pos + 1
                              input.focus()
                            }, 0)
                          }
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: showMentions ? 'var(--stone)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: showMentions ? 'var(--brown)' : 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <AtSign size={20} />
                      </button>
                    </div>

                    {/* Input area with mention autocomplete */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      {/* Mention Autocomplete Dropdown */}
                      {showMentions && filteredMembros.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '0',
                          right: '0',
                          marginBottom: '8px',
                          background: 'var(--white)',
                          borderRadius: '10px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          border: '1px solid var(--stone)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 1000
                        }}>
                          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', borderBottom: '1px solid var(--stone)' }}>
                            Mencionar alguém
                          </div>
                          {filteredMembros.map(membro => (
                            <button
                              key={membro.id}
                              onClick={() => insertMention(membro)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: membro.avatar_url
                                  ? `url(${membro.avatar_url}) center/cover`
                                  : 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--brown-dark)'
                              }}>
                                {!membro.avatar_url && getInitials(membro.nome)}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                                  {membro.nome}
                                </div>
                                {membro.funcao && (
                                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                    {membro.funcao}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={handleMessageChange}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                          if (e.key === 'Escape') {
                            setShowEmojiPicker(false)
                            setShowMentions(false)
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on mention item
                          setTimeout(() => setShowMentions(false), 150)
                        }}
                        placeholder="Escreve uma mensagem... Use @ para mencionar"
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          resize: 'none',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          outline: 'none',
                          minHeight: '24px',
                          maxHeight: '120px'
                        }}
                        rows={1}
                      />
                    </div>

                    <button
                      onClick={handleSendMessage}
                      disabled={uploading || (!messageInput.trim() && selectedFiles.length === 0)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: messageInput.trim() || selectedFiles.length > 0 ? 'var(--accent-olive)' : 'var(--stone)',
                        border: 'none',
                        cursor: messageInput.trim() || selectedFiles.length > 0 ? 'pointer' : 'default',
                        color: messageInput.trim() || selectedFiles.length > 0 ? 'white' : 'var(--brown-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--brown-light)' }}>
                    Prima <strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para nova linha
                  </div>
                </div>
              </>
            )}

            {activeTab === 'ficheiros' && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <FileText size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>Ficheiros do Canal</h3>
                <p>Todos os ficheiros partilhados neste canal aparecerão aqui</p>
              </div>
            )}

            {activeTab === 'wiki' && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <StickyNote size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>Wiki do Projeto</h3>
                <p>Documentação e notas importantes do projeto</p>
              </div>
            )}

            {activeTab === 'tarefas' && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <CheckSquare size={56} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>Tarefas do Canal</h3>
                <p>Tarefas criadas a partir de conversas deste canal</p>
              </div>
            )}
          </div>

          {/* Thread panel */}
          {activeThread && (
            <div style={{
              width: '400px',
              borderLeft: '1px solid var(--stone)',
              background: 'var(--white)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0
            }}>
              {/* Thread header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--stone)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--brown)' }}>
                    Conversa
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {(threadReplies[activeThread.id]?.length || 0) + 1} mensagens
                  </span>
                </div>
                <button
                  onClick={() => setActiveThread(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Thread messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {/* Original message */}
                <div style={{
                  padding: '16px',
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--brown-dark)'
                    }}>
                      {getInitials(activeThread.autor?.nome)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                        {activeThread.autor?.nome}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {formatDateTime(activeThread.created_at)}
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--brown)', lineHeight: 1.6 }}>
                    {activeThread.conteudo}
                  </p>
                </div>

                {/* Replies */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {threadReplies[activeThread.id]?.map(reply => (
                    <div key={reply.id} style={{
                      display: 'flex',
                      gap: '10px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--brown-dark)',
                        flexShrink: 0
                      }}>
                        {getInitials(reply.autor?.nome)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                            {reply.autor?.nome}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                            {formatTime(reply.created_at)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)', lineHeight: 1.5 }}>
                          {reply.conteudo}
                        </p>

                        {/* Reply reactions */}
                        {reply.reacoes?.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                            {reply.reacoes.map((reaction, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleReaction(activeThread.id, reaction.emoji, true, reply.id)}
                                style={{
                                  padding: '2px 8px',
                                  background: 'var(--stone)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                {reaction.emoji} {reaction.users?.length || 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply input */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid var(--stone)'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  background: 'var(--cream)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid var(--stone)'
                }}>
                  <textarea
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendReply(activeThread.id)
                      }
                    }}
                    placeholder="Responder..."
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      resize: 'none',
                      fontSize: '13px',
                      outline: 'none',
                      minHeight: '20px',
                      maxHeight: '80px'
                    }}
                    rows={1}
                  />
                  <button
                    onClick={() => handleSendReply(activeThread.id)}
                    disabled={!replyInput.trim()}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: replyInput.trim() ? 'var(--accent-olive)' : 'var(--stone)',
                      border: 'none',
                      cursor: replyInput.trim() ? 'pointer' : 'default',
                      color: replyInput.trim() ? 'white' : 'var(--brown-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for hover effects */}
      <style>{`
        .message-card:hover .message-actions {
          opacity: 1 !important;
        }
        .message-card:hover {
          background: var(--off-white) !important;
        }
        .channel-item:hover .favorite-btn {
          opacity: 1 !important;
        }
        .code-block {
          display: block;
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 12px 16px;
          border-radius: 6px;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 12px;
          overflow-x: auto;
          margin: 8px 0;
          white-space: pre;
        }
        .inline-code {
          background: var(--cream);
          color: var(--brown);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 12px;
        }
        .chat-link {
          color: var(--accent-olive);
          text-decoration: none;
        }
        .chat-link:hover {
          text-decoration: underline;
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* ========== MODALS ========== */}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowKeyboardShortcuts(false)}>
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
                <Keyboard size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Atalhos de Teclado
              </h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--brown)' }}>{shortcut.description}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {shortcut.keys.map((key, kidx) => (
                      <span key={kidx} style={{
                        padding: '4px 8px',
                        background: 'var(--cream)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--brown)',
                        border: '1px solid var(--stone)'
                      }}>
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && taskFromMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowCreateTaskModal(false)}>
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '24px',
              width: '480px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
                <CheckSquare size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Criar Tarefa
              </h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--cream)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--accent-olive)',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                Mensagem de {taskFromMessage.autor?.nome}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)' }}>
                {taskFromMessage.conteudo?.substring(0, 150)}{taskFromMessage.conteudo?.length > 150 ? '...' : ''}
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              handleCreateTask({
                titulo: formData.get('titulo'),
                descricao: formData.get('descricao'),
                prioridade: formData.get('prioridade'),
                prazo: formData.get('prazo'),
                mensagem_origem: taskFromMessage.id
              })
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                  Título da tarefa
                </label>
                <input
                  name="titulo"
                  type="text"
                  defaultValue={taskFromMessage.conteudo?.substring(0, 50)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                    Prioridade
                  </label>
                  <select
                    name="prioridade"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                    Prazo
                  </label>
                  <input
                    name="prazo"
                    type="date"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--stone)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown)',
                    fontWeight: 500
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--accent-olive)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 500
                  }}
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {showForwardModal && messageToForward && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowForwardModal(false)}>
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
                <Forward size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Reencaminhar Mensagem
              </h3>
              <button
                onClick={() => setShowForwardModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--cream)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                De: {messageToForward.autor?.nome}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)' }}>
                {messageToForward.conteudo?.substring(0, 100)}{messageToForward.conteudo?.length > 100 ? '...' : ''}
              </p>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '12px' }}>
              Selecionar canal de destino
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {canais.filter(c => c.id !== canalAtivo?.id).map(canal => (
                <button
                  key={canal.id}
                  onClick={() => handleForwardMessage(canal.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    background: 'var(--off-white)',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--cream)'
                    e.currentTarget.style.borderColor = 'var(--accent-olive)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--off-white)'
                    e.currentTarget.style.borderColor = 'var(--stone)'
                  }}
                >
                  <Hash size={16} style={{ color: 'var(--brown-light)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                      {canal.codigo}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      {canal.nome}
                    </div>
                  </div>
                  <Forward size={14} style={{ color: 'var(--brown-light)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== DM PANEL ========== */}
      {showDMPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          background: 'var(--white)',
          borderLeft: '1px solid var(--stone)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--brown)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} style={{ color: 'var(--accent-olive)' }} />
              Mensagens Diretas
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowNewDMModal(true)} style={{ padding: '6px', borderRadius: '6px', background: 'var(--accent-olive)', border: 'none', cursor: 'pointer', color: 'white' }}>
                <UserPlus size={16} />
              </button>
              <button onClick={() => setShowDMPanel(false)} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {directMessages.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Sem mensagens diretas</p>
                <button onClick={() => setShowNewDMModal(true)} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-olive)', border: 'none', cursor: 'pointer', color: 'white', fontSize: '13px' }}>
                  Iniciar Conversa
                </button>
              </div>
            ) : (
              directMessages.map(dm => (
                <div key={dm.id} onClick={() => setActiveDM(dm)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--stone)', cursor: 'pointer', background: activeDM?.id === dm.id ? 'var(--cream)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                      {getInitials(dm.participants[0]?.nome)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>{dm.participants[0]?.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{dm.lastMessage?.content?.substring(0, 30) || 'Nova conversa'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== NEW DM MODAL ========== */}
      {showNewDMModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowNewDMModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', width: '400px', maxHeight: '500px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700 }}>Nova Mensagem</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {membros.map(m => (
                <button key={m.id} onClick={() => startDM(m)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>{getInitials(m.nome)}</div>
                  <div><div style={{ fontWeight: 500 }}>{m.nome}</div><div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{m.funcao}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== CALL MODAL ========== */}
      {showCallModal && activeCall && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px', color: 'white' }}>
              {callType === 'video' ? <Video size={48} /> : <Phone size={48} />}
            </div>
            <h2 style={{ color: 'white', marginBottom: '8px' }}>{activeCall.participants?.[0]?.nome || canalAtivo?.codigo}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>{activeCall.status === 'connecting' ? 'A ligar...' : 'Em chamada'}</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', background: isMuted ? 'var(--error)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white' }}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            {callType === 'video' && (
              <button onClick={toggleVideo} style={{ width: '56px', height: '56px', borderRadius: '50%', background: isVideoOff ? 'var(--error)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white' }}>
                {isVideoOff ? <EyeOff size={24} /> : <Video size={24} />}
              </button>
            )}
            <button onClick={toggleScreenShare} style={{ width: '56px', height: '56px', borderRadius: '50%', background: isScreenSharing ? 'var(--accent-olive)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <Monitor size={24} />
            </button>
            <button onClick={endCall} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ========== AI ASSISTANT PANEL ========== */}
      {showAIAssistant && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', background: 'var(--white)', borderLeft: '1px solid var(--stone)', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 1500, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} /> Assistente IA
            </h3>
            <button onClick={() => setShowAIAssistant(false)} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--brown-light)' }}>
                <Bot size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ fontSize: '14px' }}>Olá! Sou o assistente IA do Workspace.</p>
                <p style={{ fontSize: '12px' }}>Posso ajudar-te a resumir conversas, encontrar informação ou responder a questões.</p>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'var(--accent-olive)' : 'var(--cream)', color: msg.role === 'user' ? 'white' : 'var(--brown)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            ))}
            {aiLoading && <div style={{ alignSelf: 'flex-start', padding: '12px', color: 'var(--brown-light)' }}>A pensar...</div>}
          </div>
          <div style={{ padding: '16px', borderTop: '1px solid var(--stone)', display: 'flex', gap: '8px' }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAIMessage()} placeholder="Pergunta algo..." style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--stone)', borderRadius: '24px', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendAIMessage} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========== SCHEDULE MEETING MODAL ========== */}
      {showScheduleMeetingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowScheduleMeetingModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarPlus size={20} style={{ color: 'var(--accent-olive)' }} /> Agendar Reunião
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input value={meetingDetails.title} onChange={e => setMeetingDetails(p => ({ ...p, title: e.target.value }))} placeholder="Título da reunião" style={{ padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="date" value={meetingDetails.date} onChange={e => setMeetingDetails(p => ({ ...p, date: e.target.value }))} style={{ flex: 1, padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px' }} />
                <input type="time" value={meetingDetails.time} onChange={e => setMeetingDetails(p => ({ ...p, time: e.target.value }))} style={{ width: '120px', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px' }} />
              </div>
              <select value={meetingDetails.duration} onChange={e => setMeetingDetails(p => ({ ...p, duration: e.target.value }))} style={{ padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1h 30min</option>
                <option value="120">2 horas</option>
              </select>
              <textarea value={meetingDetails.description} onChange={e => setMeetingDetails(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" rows={3} style={{ padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', resize: 'none' }} />
              <button onClick={createMeeting} style={{ padding: '12px', background: 'var(--accent-olive)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Agendar Reunião
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ANALYTICS MODAL ========== */}
      {showAnalytics && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowAnalytics(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', width: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} style={{ color: 'var(--accent-olive)' }} /> Analytics: {canalAtivo?.codigo}
              </h3>
              <button onClick={() => setShowAnalytics(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-olive)' }}>{channelAnalytics.totalMessages}</div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total mensagens</div>
              </div>
              <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)' }}>{channelAnalytics.messagesThisWeek}</div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Esta semana</div>
              </div>
              <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--info)' }}>{channelAnalytics.activeUsers}</div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Utilizadores ativos</div>
              </div>
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Top Contribuidores</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {channelAnalytics.topContributors.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--off-white)', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-olive)' }}>#{i + 1}</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>{getInitials(c.nome)}</div>
                  <span style={{ flex: 1 }}>{c.nome}</span>
                  <span style={{ fontWeight: 600, color: 'var(--brown-light)' }}>{c.messageCount} msgs</span>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Atividade por Dia</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', marginBottom: '20px' }}>
              {channelAnalytics.activityByDay.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', height: `${d.count * 5}px`, background: 'var(--accent-olive)', borderRadius: '4px 4px 0 0', minHeight: '10px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== EXPORT MODAL ========== */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowExportModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', width: '400px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileDown size={20} style={{ color: 'var(--accent-olive)' }} /> Exportar Conversa
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', display: 'block', marginBottom: '8px' }}>Formato</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['txt', 'html'].map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid', borderColor: exportFormat === fmt ? 'var(--accent-olive)' : 'var(--stone)', background: exportFormat === fmt ? 'var(--success-bg)' : 'transparent', cursor: 'pointer', fontWeight: exportFormat === fmt ? 600 : 400 }}>
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={exportConversation} style={{ padding: '14px', background: 'var(--accent-olive)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Download size={18} /> Exportar {posts.length} mensagens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== STATUS MENU ========== */}
      {showStatusMenu && (
        <div style={{ position: 'fixed', top: 60, left: 280, background: 'var(--white)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', padding: '8px', width: '220px', zIndex: 2000 }}>
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Estado</div>
          {USER_STATUS_OPTIONS.map(status => (
            <button key={status.id} onClick={() => updateUserStatus(status.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: userStatus === status.id ? 'var(--cream)' : 'transparent', cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: status.color }} />
              <span style={{ fontSize: '13px', color: 'var(--brown)' }}>{status.label}</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--stone)', margin: '8px 0' }} />
          <button onClick={() => { setShowDndSettings(true); setShowStatusMenu(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px' }}>
            <Moon size={16} style={{ color: 'var(--brown-light)' }} />
            <span style={{ fontSize: '13px' }}>Não incomodar</span>
          </button>
        </div>
      )}

      {/* ========== PROFILE CARD MODAL ========== */}
      {showProfileCard && expandedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowProfileCard(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '16px', width: '380px', overflow: 'hidden' }}>
            <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--accent-olive) 0%, var(--accent-olive-dark) 100%)' }} />
            <div style={{ padding: '0 24px 24px', marginTop: '-50px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--blush)', border: '4px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '16px' }}>
                {getInitials(expandedProfile.nome)}
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>{expandedProfile.nome}</h3>
              <p style={{ margin: '0 0 16px 0', color: 'var(--brown-light)' }}>{expandedProfile.department}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={16} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontSize: '14px' }}>{expandedProfile.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={16} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontSize: '14px' }}>{expandedProfile.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Globe size={16} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontSize: '14px' }}>{expandedProfile.location}</span>
                </div>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--stone)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '8px' }}>Projetos</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {expandedProfile.projects.map((p, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'var(--cream)', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>{p}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => { startDM(expandedProfile); setShowProfileCard(null) }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent-olive)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <MessageCircle size={16} /> Mensagem
                </button>
                <button onClick={() => startCall('video', [expandedProfile])} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--stone)', background: 'transparent', cursor: 'pointer' }}>
                  <Video size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MICROSOFT TEAMS IMPORT MODAL ========== */}
      {showTeamsImport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={closeTeamsImport}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '20px', width: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #5558AF 0%, #6B5B95 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>Importar do Microsoft Teams</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                    {importStep === 1 && 'Autentique com a sua conta Microsoft'}
                    {importStep === 2 && 'Selecione os Teams a importar'}
                    {importStep === 3 && 'Selecione os canais'}
                    {importStep === 4 && 'Importação em progresso...'}
                    {importStep === 5 && 'Importação concluída!'}
                  </p>
                </div>
              </div>
              <button onClick={closeTeamsImport} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            {/* Progress Steps */}
            <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid var(--stone)', gap: '8px' }}>
              {[
                { num: 1, label: 'Autenticar' },
                { num: 2, label: 'Teams' },
                { num: 3, label: 'Canais' },
                { num: 4, label: 'Importar' },
                { num: 5, label: 'Concluído' }
              ].map((step, i) => (
                <div key={step.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: importStep >= step.num ? (importStep > step.num ? 'var(--success)' : '#5558AF') : 'var(--stone)',
                    color: importStep >= step.num ? 'white' : 'var(--brown-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 600
                  }}>
                    {importStep > step.num ? <Check size={14} /> : step.num}
                  </div>
                  <span style={{ fontSize: '12px', color: importStep >= step.num ? 'var(--brown)' : 'var(--brown-light)', fontWeight: importStep === step.num ? 600 : 400 }}>{step.label}</span>
                  {i < 4 && <div style={{ flex: 1, height: '2px', background: importStep > step.num ? 'var(--success)' : 'var(--stone)' }} />}
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Step 1: Authentication */}
              {importStep === 1 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #5558AF 0%, #6B5B95 100%)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700 }}>Conectar ao Microsoft Teams</h3>
                  <p style={{ margin: '0 0 32px', color: 'var(--brown-light)', fontSize: '14px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Para importar as suas conversas, precisa de autorizar o acesso à sua conta Microsoft Teams.
                  </p>
                  <button
                    onClick={startTeamsAuth}
                    disabled={teamsAuthState === 'authenticating'}
                    style={{
                      padding: '14px 32px', borderRadius: '12px',
                      background: teamsAuthState === 'authenticating' ? 'var(--stone)' : 'linear-gradient(135deg, #5558AF 0%, #6B5B95 100%)',
                      border: 'none', color: 'white', fontSize: '15px', fontWeight: 600,
                      cursor: teamsAuthState === 'authenticating' ? 'wait' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    {teamsAuthState === 'authenticating' ? (
                      <><Loader2 size={18} className="animate-spin" /> A autenticar...</>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 23 23" fill="white"><path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/></svg>
                        Entrar com Microsoft
                      </>
                    )}
                  </button>
                  {teamsAuthState === 'error' && (
                    <p style={{ marginTop: '16px', color: 'var(--error)', fontSize: '13px' }}>
                      Erro na autenticação. Tente novamente.
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Select Teams */}
              {importStep === 2 && (
                <div>
                  {teamsUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--success-bg)', borderRadius: '10px', marginBottom: '20px' }}>
                      <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '14px' }}>Autenticado como <strong>{teamsUser.displayName}</strong></span>
                    </div>
                  )}
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Selecione os Teams para importar:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {availableTeams.map(team => {
                      const isSelected = selectedTeamsToImport.some(t => t.id === team.id)
                      return (
                        <div
                          key={team.id}
                          onClick={() => toggleTeamSelection(team)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '14px 16px', borderRadius: '10px',
                            border: `2px solid ${isSelected ? '#5558AF' : 'var(--stone)'}`,
                            background: isSelected ? 'rgba(85, 88, 175, 0.08)' : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#5558AF' : 'var(--stone)'}`,
                            background: isSelected ? '#5558AF' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <Check size={14} style={{ color: 'white' }} />}
                          </div>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#5558AF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                            {team.displayName?.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{team.displayName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{team.description || 'Team do Microsoft Teams'}</div>
                          </div>
                          {teamsChannels[team.id] && (
                            <span style={{ padding: '4px 10px', background: 'var(--cream)', borderRadius: '12px', fontSize: '11px' }}>
                              {teamsChannels[team.id].length} canais
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button onClick={resetTeamsImport} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--stone)', background: 'transparent', cursor: 'pointer' }}>
                      Voltar
                    </button>
                    <button
                      onClick={() => setImportStep(3)}
                      disabled={selectedTeamsToImport.length === 0}
                      style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none',
                        background: selectedTeamsToImport.length > 0 ? '#5558AF' : 'var(--stone)',
                        color: 'white', fontWeight: 600, cursor: selectedTeamsToImport.length > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Continuar ({selectedTeamsToImport.length} selecionados)
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Select Channels */}
              {importStep === 3 && (
                <div>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Selecione os canais a importar:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto' }}>
                    {selectedTeamsToImport.map(team => (
                      <div key={team.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#5558AF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 600 }}>
                            {team.displayName?.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{team.displayName}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '38px' }}>
                          {(teamsChannels[team.id] || []).map(channel => {
                            const isSelected = selectedChannelsToImport.some(c => c.id === channel.id)
                            return (
                              <div
                                key={channel.id}
                                onClick={() => toggleChannelSelection(channel, team.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '10px 14px', borderRadius: '8px',
                                  border: `1px solid ${isSelected ? '#5558AF' : 'var(--stone)'}`,
                                  background: isSelected ? 'rgba(85, 88, 175, 0.08)' : 'transparent',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{
                                  width: '18px', height: '18px', borderRadius: '4px',
                                  border: `2px solid ${isSelected ? '#5558AF' : 'var(--stone)'}`,
                                  background: isSelected ? '#5558AF' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {isSelected && <Check size={12} style={{ color: 'white' }} />}
                                </div>
                                <Hash size={16} style={{ color: 'var(--brown-light)' }} />
                                <span style={{ fontSize: '14px' }}>{channel.displayName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button onClick={() => setImportStep(2)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--stone)', background: 'transparent', cursor: 'pointer' }}>
                      Voltar
                    </button>
                    <button
                      onClick={startTeamsImport}
                      disabled={selectedChannelsToImport.length === 0}
                      style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none',
                        background: selectedChannelsToImport.length > 0 ? '#5558AF' : 'var(--stone)',
                        color: 'white', fontWeight: 600, cursor: selectedChannelsToImport.length > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Importar ({selectedChannelsToImport.length} canais)
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Importing */}
              {importStep === 4 && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--cream)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} style={{ color: '#5558AF', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <h3 style={{ margin: '0 0 8px' }}>A importar...</h3>
                  <p style={{ color: 'var(--brown-light)', marginBottom: '24px' }}>{importProgress.currentItem}</p>

                  {/* Progress bar */}
                  <div style={{ background: 'var(--stone)', borderRadius: '8px', height: '8px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(importProgress.current / importProgress.total) * 100}%`,
                      height: '100%', background: '#5558AF', borderRadius: '8px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                    {importProgress.current} de {importProgress.total} canais
                  </p>

                  {/* Log */}
                  <div style={{ marginTop: '24px', background: 'var(--off-white)', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', textAlign: 'left' }}>
                    {importLog.slice(-10).map(log => (
                      <div key={log.id} style={{ fontSize: '12px', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {log.type === 'success' && <CheckCircle size={12} style={{ color: 'var(--success)' }} />}
                        {log.type === 'error' && <AlertTriangle size={12} style={{ color: 'var(--error)' }} />}
                        {log.type === 'info' && <RefreshCw size={12} style={{ color: 'var(--info)' }} />}
                        {log.type === 'warning' && <AlertTriangle size={12} style={{ color: 'var(--warning)' }} />}
                        <span style={{ color: log.type === 'error' ? 'var(--error)' : 'var(--brown)' }}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Complete */}
              {importStep === 5 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-bg)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={40} style={{ color: 'var(--success)' }} />
                  </div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>Importação Concluída!</h3>
                  <p style={{ margin: '0 0 32px', color: 'var(--brown-light)', fontSize: '14px' }}>
                    {selectedChannelsToImport.length} canais foram importados com sucesso.
                  </p>

                  {/* Summary */}
                  <div style={{ background: 'var(--off-white)', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Resumo da importação:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {importLog.filter(l => l.type === 'success' && l.message.includes('importado')).map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                          {log.message}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={closeTeamsImport}
                    style={{ padding: '14px 32px', borderRadius: '12px', background: 'var(--accent-olive)', border: 'none', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
