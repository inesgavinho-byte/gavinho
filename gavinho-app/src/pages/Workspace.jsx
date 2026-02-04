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

// Import extracted utilities and constants
import {
  MS_GRAPH_CONFIG,
  USER_STATUS_OPTIONS,
  MESSAGE_TAGS,
  REMINDER_OPTIONS,
  EQUIPAS_GAVINHO,
  DEFAULT_TOPICS,
  REACTIONS,
  EMOJI_CATEGORIES,
  FILTER_OPTIONS,
  KEYBOARD_SHORTCUTS
} from './Workspace/utils/constants'

import {
  formatTime,
  formatDateTime,
  formatFileSize,
  getInitials,
  extractUrls
} from './Workspace/utils/formatters'

import {
  renderFormattedText,
  applyFormatting as applyFormattingUtil,
  insertEmoji as insertEmojiUtil,
  insertMention as insertMentionUtil,
  isOwnMessage
} from './Workspace/utils/messageUtils'

import {
  getPresenceColor,
  isUserOnline as checkUserOnline,
  getTypingText
} from './Workspace/utils/presenceUtils'

// Import extracted components
import {
  KeyboardShortcutsModal,
  EmojiPicker,
  CreateTaskModal,
  ForwardMessageModal,
  CallModal,
  ReminderModal,
  StatusMenu,
  DMPanel,
  MessageList,
  MessageInput,
  WorkspaceSidebar,
  ChannelHeader,
  ThreadPanel,
  ActivityLogPanel,
  SavedMessagesPanel
} from './Workspace/components'

// Import custom hooks
import {
  useChannelData,
  useMessageActions,
  usePresence,
  useNotifications,
  useTeamsImport,
  useToast,
  useConfirm
} from './Workspace/hooks'

import { ConfirmModal, ToastContainer } from './Workspace/components/Modals'
import CentralEntregasChat from './Workspace/components/CentralEntregasChat'

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
  const [linkCopied, setLinkCopied] = useState(false)

  // ========== CUSTOM HOOKS ==========

  // Channel Data Hook
  const {
    loading, equipas, equipaAtiva, equipasExpanded, canais, canalAtivo,
    channelTopics, activeTopic, showAddTopic, newTopicName, activeTab, membros, favoriteChannels,
    setEquipaAtiva, setEquipasExpanded, setCanalAtivo, setActiveTopic, setShowAddTopic,
    setNewTopicName, setActiveTab, setMembros, loadData, loadTopics, addTopic,
    getEquipaCanais, toggleEquipa, selectCanal, toggleFavorite, isFavorite, getChannelLink
  } = useChannelData()

  // Message Actions Hook
  const {
    posts, messageInput, replyInput, messageInputRef, editingMessage, editingContent,
    replyingTo, showMessageMenu, activeThread, threadReplies, selectedFiles, uploading,
    showEmojiPicker, emojiCategory, showMentions, mentionQuery, mentionStartIndex,
    showFormattingToolbar, savedMessages, messageTags, showTagSelector,
    setPosts, setMessageInput, setReplyInput, setEditingMessage, setEditingContent,
    setReplyingTo, setShowMessageMenu, setActiveThread, setSelectedFiles, setUploading,
    setShowEmojiPicker, setEmojiCategory, setShowMentions, setMentionQuery, setMentionStartIndex,
    setShowFormattingToolbar, setShowTagSelector, loadPosts, loadThreadReplies,
    sendMessage, sendReply, editMessage, deleteMessage, addReaction,
    toggleSaveMessage, isMessageSaved, forwardMessage, tagMessage, removeTag,
    openThread, closeThread, handleFileSelect, removeFile, insertEmoji
  } = useMessageActions(profile)

  // Presence Hook
  const {
    typingUsers, onlineUsers, readReceipts, userStatus, customStatusMessage, showStatusMenu,
    setTypingUsers, setUserStatus, setCustomStatusMessage, setShowStatusMenu,
    updateMyPresence, loadOnlineUsers, handleTyping, setUserTyping,
    isUserOnline, getUserStatus, getPresenceColor: getPresenceColorHook, getPresenceLabel,
    markMessageAsRead, getReadStatus, isMessageRead, updateUserStatus
  } = usePresence(profile, membros)

  // Notifications Hook
  const {
    mutedChannels, soundEnabled, channelPinnedMessages, showPinnedMessages,
    dndEnabled, dndSchedule, showDndSettings, reminders, showReminderModal,
    reminderMessage, customReminderDate, setMutedChannels, setSoundEnabled,
    setShowPinnedMessages, setDndEnabled, setDndSchedule, setShowDndSettings,
    setReminders, setShowReminderModal, setReminderMessage, setCustomReminderDate,
    toggleMuteChannel, isChannelMuted, toggleSound, playNotificationSound,
    togglePinMessage, isMessagePinned, getChannelPinnedMessages, toggleDnd,
    updateDndSchedule, isDndActive, addReminder, removeReminder,
    markReminderComplete, getActiveReminders, openReminderModal
  } = useNotifications()

  // Toast & Confirm Hooks (replacing alert/confirm)
  const { toasts, success: toastSuccess, error: toastError, info: toastInfo, dismissToast } = useToast()
  const { confirmState, confirm, closeConfirm, confirmArchive } = useConfirm()

  // ========== REMAINING LOCAL STATE ==========

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSavedMessages, setShowSavedMessages] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    author: '', dateFrom: '', dateTo: '', hasAttachments: false, hasMentions: false
  })

  // Legacy
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [filterByTag, setFilterByTag] = useState(null)
  const typingTimeoutRef = useRef(null)

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [taskFromMessage, setTaskFromMessage] = useState(null)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [messageToForward, setMessageToForward] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [activityLog, setActivityLog] = useState([])

  // DM
  const [showDMPanel, setShowDMPanel] = useState(false)
  const [directMessages, setDirectMessages] = useState([])
  const [activeDM, setActiveDM] = useState(null)
  const [dmMessages, setDmMessages] = useState({})
  const [showNewDMModal, setShowNewDMModal] = useState(false)

  // Calls
  const [showCallModal, setShowCallModal] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [callType, setCallType] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // Calendar
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [meetingDetails, setMeetingDetails] = useState({
    title: '', date: '', time: '', duration: '30', participants: [], description: ''
  })

  // AI
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Channels
  const [privateChannels, setPrivateChannels] = useState([])
  const [showCreatePrivateChannel, setShowCreatePrivateChannel] = useState(false)
  const [newPrivateChannel, setNewPrivateChannel] = useState({ name: '', members: [] })
  const [archivedChannels, setArchivedChannels] = useState([])
  const [showArchivedChannels, setShowArchivedChannels] = useState(false)

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [channelAnalytics, setChannelAnalytics] = useState({
    totalMessages: 0, messagesThisWeek: 0, activeUsers: 0,
    topContributors: [], activityByDay: [], popularTopics: []
  })

  // Profile
  const [showProfileCard, setShowProfileCard] = useState(null)
  const [expandedProfile, setExpandedProfile] = useState(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')

  // Export
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [exportDateRange, setExportDateRange] = useState({ from: '', to: '' })

  // Webhooks & Email
  const [webhooks, setWebhooks] = useState([])
  const [showWebhookSettings, setShowWebhookSettings] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] })
  const [emailSyncEnabled, setEmailSyncEnabled] = useState(false)
  const [emailDigestFrequency, setEmailDigestFrequency] = useState('daily')
  const [showEmailSettings, setShowEmailSettings] = useState(false)

  // Teams Import Hook
  const {
    showTeamsImport, setShowTeamsImport, openTeamsImport, closeTeamsImport,
    teamsAuthState, teamsAccessToken, teamsUser,
    availableTeams, selectedTeamsToImport, teamsChannels, selectedChannelsToImport,
    importProgress, importLog, importStep,
    startTeamsAuth, fetchTeamsUser, fetchAvailableTeams, fetchTeamChannels,
    toggleTeamSelection, toggleChannelSelection, startTeamsImport, resetTeamsImport, goToStep
  } = useTeamsImport()

  // Refs
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const presenceIntervalRef = useRef(null)

  useEffect(() => {
    loadData()

    // Iniciar presença
    updateMyPresence()
    presenceIntervalRef.current = setInterval(updateMyPresence, 60000) // A cada minuto

    return () => {
      clearInterval(presenceIntervalRef.current)
    }
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

  // Carregar presença quando membros mudam
  useEffect(() => {
    if (membros.length > 0) {
      loadOnlineUsers()
      const interval = setInterval(loadOnlineUsers, 30000) // A cada 30s
      return () => clearInterval(interval)
    }
  }, [membros])

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
          topico_id: activeTopic || 'geral',
          parent_id: replyingTo?.id || null,
          ficheiro_url: attachments.length > 0 ? attachments[0].url : null,
          ficheiro_nome: attachments.length > 0 ? attachments[0].name : null,
          ficheiro_tamanho: attachments.length > 0 ? attachments[0].size || null : null,
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
          tamanho: att.size || null,
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
      toastError(err.message, 'Erro ao enviar mensagem')
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

  // Copy direct link to clipboard
  const copyChannelLink = () => {
    const url = `${window.location.origin}/chat?canal=${canalAtivo.codigo}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
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

  // Get total unread count
  const getTotalUnreadCount = () => {
    return canais.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  }

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

  // Sort channels: favorites first
  const sortedCanais = [...canais].sort((a, b) => {
    const aFav = isFavorite(a.id)
    const bFav = isFavorite(b.id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return 0
  })

  // Get current channel pinned messages
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
    toastSuccess('Tarefa criada com sucesso!')
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
    toastSuccess(`Mensagem reencaminhada para ${targetChannel?.nome}`)
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
    toastSuccess(`Lembrete definido para ${reminderTime.toLocaleString('pt-PT')}`, 'Lembrete criado')
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
    toastSuccess(`Reunião "${meetingDetails.title}" agendada para ${meetingDetails.date} às ${meetingDetails.time}`, 'Reunião agendada')
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
  const archiveChannel = async (channelId) => {
    const channel = canais.find(c => c.id === channelId)
    if (!channel) return

    const confirmed = await confirmArchive(`canal "${channel.codigo}"`)
    if (confirmed) {
      setArchivedChannels(prev => [...prev, { ...channel, archivedAt: new Date().toISOString() }])
      setCanais(prev => prev.filter(c => c.id !== channelId))
      if (canalAtivo?.id === channelId) {
        setCanalAtivo(canais[0] || null)
      }
      toastSuccess(`Canal "${channel.codigo}" arquivado`)
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
  const loadChannelAnalytics = async () => {
    if (!canalAtivo?.id) return

    try {
      // Buscar todas as mensagens do canal
      const { data: mensagens } = await supabase
        .from('chat_mensagens')
        .select('id, autor_id, created_at, autor:autor_id(id, nome, avatar_url, funcao)')
        .eq('canal_id', canalAtivo.id)

      if (!mensagens) {
        setShowAnalytics(true)
        return
      }

      const totalMessages = mensagens.length

      // Mensagens desta semana
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const messagesThisWeek = mensagens.filter(m => new Date(m.created_at) >= oneWeekAgo).length

      // Utilizadores ativos únicos
      const uniqueAuthors = new Set(mensagens.map(m => m.autor_id))
      const activeUsers = uniqueAuthors.size

      // Top contributors - contar mensagens por autor
      const authorCounts = {}
      mensagens.forEach(m => {
        if (m.autor_id) {
          authorCounts[m.autor_id] = (authorCounts[m.autor_id] || 0) + 1
        }
      })

      const topContributors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([autorId, count]) => {
          const msg = mensagens.find(m => m.autor_id === autorId)
          return {
            id: autorId,
            nome: msg?.autor?.nome || 'Utilizador',
            avatar_url: msg?.autor?.avatar_url,
            funcao: msg?.autor?.funcao,
            messageCount: count
          }
        })

      // Atividade por dia da semana (últimos 30 dias)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentMessages = mensagens.filter(m => new Date(m.created_at) >= thirtyDaysAgo)

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

      recentMessages.forEach(m => {
        const dayOfWeek = new Date(m.created_at).getDay()
        dayCounts[dayOfWeek]++
      })

      const activityByDay = [1, 2, 3, 4, 5].map(dayIndex => ({
        day: dayNames[dayIndex],
        count: dayCounts[dayIndex]
      }))

      setChannelAnalytics({
        totalMessages,
        messagesThisWeek,
        activeUsers,
        topContributors,
        activityByDay,
        popularTopics: getCurrentChannelTopics().slice(0, 3)
      })
      setShowAnalytics(true)
    } catch (err) {
      toastError('Não foi possível carregar as estatísticas')
      setShowAnalytics(true)
    }
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
      toastSuccess('Receberás resumos diários das conversas.', 'Sincronização de email ativada')
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
      <WorkspaceSidebar
        equipas={EQUIPAS_GAVINHO}
        equipasExpanded={equipasExpanded}
        toggleEquipa={toggleEquipa}
        getEquipaCanais={getEquipaCanais}
        canalAtivo={canalAtivo}
        selectCanal={selectCanal}
        isFavoriteChannel={isFavorite}
        toggleFavoriteChannel={toggleFavorite}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showActivityLog={showActivityLog}
        setShowActivityLog={setShowActivityLog}
        showSavedMessages={showSavedMessages}
        setShowSavedMessages={setShowSavedMessages}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        setShowTeamsImport={setShowTeamsImport}
        getTotalUnreadCount={getTotalUnreadCount}
        getUnreadActivityCount={getUnreadActivityCount}
        savedMessages={savedMessages}
        equipaAtiva={equipaAtiva}
      />

      {/* ========== ACTIVITY LOG PANEL ========== */}
      <ActivityLogPanel
        isOpen={showActivityLog}
        activityLog={activityLog}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        onClose={() => setShowActivityLog(false)}
        onMarkAllAsRead={markAllActivityAsRead}
      />

      {/* ========== SAVED MESSAGES PANEL ========== */}
      <SavedMessagesPanel
        isOpen={showSavedMessages}
        savedMessages={savedMessages}
        onClose={() => setShowSavedMessages(false)}
        onUnsaveMessage={toggleSaveMessage}
        onNavigateToMessage={(msg) => {
          const msgCanal = canais.find(c => c.id === msg.canal_id)
          if (msgCanal) selectCanal(msgCanal)
          setShowSavedMessages(false)
        }}
      />

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
        <ChannelHeader
          canalAtivo={canalAtivo}
          equipas={EQUIPAS_GAVINHO}
          membros={membros}
          posts={posts}
          filteredPosts={filteredPosts}
          linkCopied={linkCopied}
          onCopyLink={copyChannelLink}
          showDMPanel={showDMPanel}
          onToggleDMPanel={() => setShowDMPanel(!showDMPanel)}
          showAIAssistant={showAIAssistant}
          onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
          onLoadAnalytics={loadChannelAnalytics}
          onShowExportModal={() => setShowExportModal(true)}
          onScheduleMeeting={() => setShowScheduleMeetingModal(true)}
          onStartCall={() => startCall('audio')}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          showAdvancedSearch={showAdvancedSearch}
          setShowAdvancedSearch={setShowAdvancedSearch}
          onResetFilters={resetFilters}
          searchQuery={searchQuery}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
          activeTopic={activeTopic}
          setActiveTopic={setActiveTopic}
          getCurrentChannelTopics={getCurrentChannelTopics}
          getTopicIcon={getTopicIcon}
          showAddTopic={showAddTopic}
          setShowAddTopic={setShowAddTopic}
          newTopicName={newTopicName}
          setNewTopicName={setNewTopicName}
          onAddCustomTopic={addCustomTopic}
          onRemoveCustomTopic={removeCustomTopic}
          showPinnedMessages={showPinnedMessages}
          setShowPinnedMessages={setShowPinnedMessages}
          getCurrentChannelPinnedMessages={getCurrentChannelPinnedMessages}
        />
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
                  <MessageList
                    posts={filteredPosts}
                    profile={profile}
                    onlineUsers={onlineUsers}
                    editingMessage={editingMessage}
                    editingContent={editingContent}
                    setEditingContent={setEditingContent}
                    onSaveEdit={saveEditMessage}
                    onCancelEdit={cancelEditMessage}
                    onReaction={handleReaction}
                    onReply={startReplyTo}
                    onOpenThread={openThread}
                    onSaveMessage={toggleSaveMessage}
                    onPinMessage={togglePinMessage}
                    onForward={openForwardModal}
                    onCreateTask={openCreateTaskModal}
                    onEditMessage={startEditMessage}
                    onDeleteMessage={deleteMessage}
                    isMessageSaved={isMessageSaved}
                    isMessagePinned={isMessagePinned}
                    getReadStatus={getReadStatus}
                    messagesEndRef={messagesEndRef}
                  />
                </div>

                {/* Input area */}
                <MessageInput
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  onSend={handleSendMessage}
                  selectedFiles={selectedFiles}
                  onFileSelect={(e) => handleFileSelect(e.target.files)}
                  onRemoveFile={(index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                  emojiCategory={emojiCategory}
                  setEmojiCategory={setEmojiCategory}
                  onInsertEmoji={insertEmoji}
                  showMentions={showMentions}
                  setShowMentions={setShowMentions}
                  filteredMembros={filteredMembros}
                  onInsertMention={insertMention}
                  replyingTo={replyingTo}
                  onCancelReply={cancelReply}
                  showFormattingToolbar={showFormattingToolbar}
                  onApplyFormatting={applyFormatting}
                  onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
                  uploading={uploading}
                  messageInputRef={messageInputRef}
                  typingUsers={typingUsers}
                  handleMessageChange={handleMessageChange}
                />
              </>
            )}

            {activeTab === 'ficheiros' && (
              <CentralEntregasChat
                canalAtivo={canalAtivo}
                onNavigateToEntregaveis={(canal) => {
                  // Navigate to project page with entregaveis tab
                  window.open(`/projetos/${canal.id}?tab=entregaveis`, '_blank')
                }}
              />
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
          <ThreadPanel
            activeThread={activeThread}
            threadReplies={threadReplies}
            onClose={closeThread}
            onSendReply={handleSendReply}
            replyInput={replyInput}
            setReplyInput={setReplyInput}
            onReaction={handleReaction}
          />
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
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        message={taskFromMessage}
        onCreateTask={handleCreateTask}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        message={messageToForward}
        canais={canais}
        currentCanalId={canalAtivo?.id}
        onForward={handleForwardMessage}
      />

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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isLoading={confirmState.isLoading}
      />

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
