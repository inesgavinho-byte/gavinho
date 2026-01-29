import { useState, useEffect, useRef } from 'react'
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
  ThumbsUp, Laugh, Frown, PartyPopper, Fire, Eye
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

export default function ChatColaborativo() {
  const { profile, getUserInitials } = useAuth()
  const [loading, setLoading] = useState(true)

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)
  const [mentioning, setMentioning] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  // Upload
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  // Equipa members
  const [membros, setMembros] = useState([])

  // Notifications
  const [mutedChannels, setMutedChannels] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])

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
        attachments: attachments.length > 0 ? attachments : undefined
      }

      setPosts(prev => [...prev, newPost])
      setMessageInput('')
      setSelectedFiles([])

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

  const openThread = (post) => {
    setActiveThread(post)
    loadThreadReplies(post.id)
  }

  const getInitials = (nome) => {
    if (!nome) return 'U'
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const filteredPosts = searchQuery
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
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
            Equipas
          </h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setShowSearch(!showSearch)}
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
            <button style={{
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
            }}>
              <Filter size={18} />
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
                          onClick={() => {
                            setCanalAtivo(canal)
                            setActiveThread(null)
                          }}
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
            <div style={{ display: 'flex', gap: '4px' }}>
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
            background: 'var(--white)'
          }}>
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
                              <div style={{ display: 'flex', gap: '2px', opacity: 0 }} className="message-actions">
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
                                <button
                                  onClick={() => openThread(post)}
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
                                  <Reply size={16} />
                                </button>
                                <button style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--brown-light)'
                                }}>
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div style={{ paddingLeft: showAuthor ? '52px' : '0' }}>
                            <p style={{
                              fontSize: '14px',
                              color: 'var(--brown)',
                              margin: 0,
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {post.conteudo}
                            </p>

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
                      <button style={{
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
                      }}>
                        <Smile size={20} />
                      </button>
                      <button style={{
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
                      }}>
                        <AtSign size={20} />
                      </button>
                    </div>

                    <textarea
                      ref={messageInputRef}
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Escreve uma mensagem..."
                      style={{
                        flex: 1,
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
