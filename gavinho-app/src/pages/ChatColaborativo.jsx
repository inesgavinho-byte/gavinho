import { useState, useEffect, useRef } from 'react'
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
  ThumbsUp, Laugh, Frown, PartyPopper, Fire, Eye,
  Link2, Copy, Check, Edit, Trash2, CornerUpLeft, Quote,
  BookmarkCheck, Volume2, VolumeX, User, CalendarDays,
  FileImage, AtSignIcon, LinkIcon, SlidersHorizontal
} from 'lucide-react'

// Estrutura de equipas GAVINHO (baseado no Teams)
const EQUIPAS_GAVINHO = [
  { id: 'arch', nome: 'GAVINHO ARCH', cor: '#6366f1', inicial: 'A', descricao: 'Projetos de Arquitetura' },
  { id: 'hosp', nome: 'GAVINHO HOSP.', cor: '#f59e0b', inicial: 'H', descricao: 'Projetos de Hospitalidade' },
  { id: 'signature', nome: 'GAVINHO Signature', cor: '#10b981', inicial: 'GS', descricao: 'Projetos Premium' }
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

export default function ChatColaborativo() {
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
          unreadCount: Math.floor(Math.random() * 5), // Mock - em produção vem da DB
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
      console.error('Erro ao carregar dados:', err)
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
        console.error('Tabela chat_mensagens não existe, usando mock:', error)
        setPosts(getMockPosts())
        return
      }

      if (data && data.length > 0) {
        // Carregar contagem de replies para cada post
        const postsWithReplies = await Promise.all(data.map(async (post) => {
          const { count } = await supabase
            .from('chat_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', post.id)
            .eq('eliminado', false)

          return { ...post, replyCount: count || 0 }
        }))

        setPosts(postsWithReplies)
      } else {
        setPosts(getMockPosts())
      }
    } catch (err) {
      console.error('Erro:', err)
      setPosts(getMockPosts())
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
      console.error('Erro ao carregar replies:', err)
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

      // Criar mensagem
      const newPost = {
        id: Date.now().toString(),
        conteudo: messageInput,
        autor: {
          id: profile?.id,
          nome: profile?.nome || 'Utilizador',
          avatar_url: profile?.avatar_url,
          funcao: profile?.funcao || 'Equipa'
        },
        created_at: new Date().toISOString(),
        reacoes: [],
        replyCount: 0,
        attachments: attachments.length > 0 ? attachments : undefined,
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

      // Em produção, inserir na base de dados
      // await supabase.from('chat_mensagens').insert({...})

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
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
      console.log('Audio not supported')
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

  const filteredPosts = applyFilters(posts)
    ? posts.filter(p =>
        p.conteudo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.autor?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{
      height: 'calc(100vh - 64px)',
      margin: '-24px',
      marginTop: '-16px',
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
                    {equipaCanais.map(canal => {
                      const isActive = canalAtivo?.id === canal.id
                      return (
                        <button
                          key={canal.id}
                          onClick={() => selectCanal(canal)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 16px 8px 12px',
                            background: isActive ? 'var(--stone)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '6px',
                            marginRight: '8px',
                            marginBottom: '2px',
                            transition: 'background 0.15s'
                          }}
                        >
                          <Hash size={16} style={{ color: isActive ? 'var(--brown)' : 'var(--brown-light)', flexShrink: 0 }} />
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
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

              {[
                { icon: Video, title: 'Iniciar reunião' },
                { icon: Phone, title: 'Chamada de voz' },
                { icon: Users, title: 'Ver membros' },
                { icon: Pin, title: 'Mensagens fixadas' },
                { icon: Settings, title: 'Definições' }
              ].map((action, idx) => (
                <button
                  key={idx}
                  title={action.title}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--stone)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <action.icon size={18} />
                </button>
              ))}
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
                                fontWeight: 600,
                                flexShrink: 0
                              }}>
                                {!post.autor?.avatar_url && getInitials(post.autor?.nome)}
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
                              <p style={{
                                fontSize: '14px',
                                color: 'var(--brown)',
                                margin: 0,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap'
                              }}>
                                {post.conteudo}
                                {post.editado && (
                                  <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginLeft: '6px' }}>
                                    (editado)
                                  </span>
                                )}
                              </p>
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
                                {post.attachments.map((file, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '10px 14px',
                                      background: 'var(--cream)',
                                      borderRadius: '8px',
                                      cursor: 'pointer'
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
                                  </div>
                                ))}
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
      `}</style>
    </div>
  )
}
