import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import {
  Hash, Lock, Plus, Send, Paperclip, Smile, AtSign, Search,
  MoreVertical, Edit, Trash2, Reply, Pin, X, ChevronDown, ChevronRight,
  MessageSquare, Users,
  File, Download, Check, Megaphone, FolderOpen,
  Bold, Italic, Code, List
} from 'lucide-react'

// Função para renderizar texto com formatação markdown simples
const renderFormattedText = (text) => {
  if (!text) return null

  // Escapar HTML para segurança
  const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  let html = escapeHtml(text)

  // Código em bloco ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#f3f4f6;padding:8px 12px;border-radius:6px;overflow-x:auto;font-family:monospace;font-size:13px;margin:4px 0">$1</pre>')

  // Código inline `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px">$1</code>')

  // Negrito **text** ou __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')

  // Itálico *text* ou _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

  // Riscado ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#C9A882;text-decoration:underline">$1</a>')

  // Menções @[nome](id) - destacar
  html = html.replace(/@\[([^\]]+)\]\([^)]+\)/g, '<span style="background:rgba(201,168,130,0.2);color:#8B7355;padding:0 4px;border-radius:4px;font-weight:500">@$1</span>')

  // Listas - linhas que começam com - ou *
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li style="margin-left:16px;list-style-type:disc">$1</li>')

  // Listas numeradas - linhas que começam com número.
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:16px;list-style-type:decimal">$1</li>')

  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

const REACTION_EMOJIS = ['👍', '❤️', '😄', '🎉', '😮', '😢', '🔥', '👀']

const EMOJI_CATEGORIES = {
  'Frequentes': ['👍', '❤️', '😄', '🎉', '😮', '😢', '🔥', '👀', '✅', '👏'],
  'Caras': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  'Gestos': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🖤'],
  'Objetos': ['💼', '📁', '📂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔑', '🔒', '🔓', '💡', '📧', '📨', '📩', '📪', '📫', '📬', '📭', '📮', '🗳️'],
  'Símbolos': ['✅', '❌', '❓', '❔', '❕', '❗', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '🔀', '🔁', '🔂', '🔃', '🔄', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱']
}

const CANAL_ICONS = [
  { id: 'hash', icon: Hash, label: 'Geral' },
  { id: 'megaphone', icon: Megaphone, label: 'Anúncios' },
  { id: 'lock', icon: Lock, label: 'Privado' },
  { id: 'users', icon: Users, label: 'Equipa' }
]

// G.A.R.V.I.S. - Virtual AI Assistant
const GARVIS_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'G.A.R.V.I.S.',
  avatar_url: '/avatars/garvis.png',
  is_bot: true,
  cargo: 'Assistente IA'
}

export default function ChatProjetos() {
  const { profile } = useAuth()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [projetos, setProjetos] = useState([])
  const [projetoAtivo, setProjetoAtivo] = useState(null)
  const [projetosExpanded, setProjetosExpanded] = useState({})
  const [canais, setCanais] = useState([])
  const [canalAtivo, setCanalAtivo] = useState(null)
  const [topicos, setTopicos] = useState([])
  const [topicoAtivo, setTopicoAtivo] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [membrosEquipa, setMembrosEquipa] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({}) // {topicoId: count}
  const [topicoLeituras, setTopicoLeituras] = useState([]) // [{utilizador_id, ultima_leitura_at}]
  const [typingUsers, setTypingUsers] = useState([]) // Quem está a escrever
  const [presencaMap, setPresencaMap] = useState({}) // {utilizadorId: 'online'|'away'|'offline'}
  const typingTimeoutRef = useRef(null)
  const presenceIntervalRef = useRef(null)

  const [novaMensagem, setNovaMensagem] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null) // Mensagem a editar
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Frequentes')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  
  const [showNovoCanal, setShowNovoCanal] = useState(false)
  const [showNovoTopico, setShowNovoTopico] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [editingCanal, setEditingCanal] = useState(null) // Canal a editar
  const [showDeleteCanalConfirm, setShowDeleteCanalConfirm] = useState(null) // Canal a eliminar

  const [messageFilter, setMessageFilter] = useState('todas') // todas, anexos, imagens, mencoes, guardadas
  const [sidebarSearch, setSidebarSearch] = useState('')

  const [editingProjectName, setEditingProjectName] = useState(false)
  const [editProjectNameValue, setEditProjectNameValue] = useState('')
  const [novoCanal, setNovoCanal] = useState({ nome: '', descricao: '', tipo: 'publico', icone: 'hash' })
  const [novoTopico, setNovoTopico] = useState({ titulo: '', descricao: '' })
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadProjetos()

    // Iniciar presença
    updateMyPresence()
    presenceIntervalRef.current = setInterval(updateMyPresence, 60000) // A cada minuto

    return () => {
      clearInterval(presenceIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (projetoAtivo) {
      loadCanais(projetoAtivo.id)
      loadMembrosEquipa(projetoAtivo.id)
    }
  }, [projetoAtivo])

  // Carregar presença quando membros mudam
  useEffect(() => {
    if (membrosEquipa.length > 0) {
      loadPresencaEquipa()
      const interval = setInterval(loadPresencaEquipa, 30000) // A cada 30s
      return () => clearInterval(interval)
    }
  }, [membrosEquipa])

  useEffect(() => {
    if (canalAtivo) {
      loadTopicos(canalAtivo.id)
    }
  }, [canalAtivo])

  useEffect(() => {
    if (topicoAtivo) {
      loadMensagens(topicoAtivo.id)
      loadTopicoLeituras(topicoAtivo.id)
      markAsRead(topicoAtivo.id)
      loadTypingUsers(topicoAtivo.id)
      const unsubMessages = subscribeToMessages(topicoAtivo.id)
      const unsubTyping = subscribeToTyping(topicoAtivo.id)
      const unsubLeituras = subscribeToLeituras(topicoAtivo.id)
      return () => {
        unsubMessages?.()
        unsubTyping?.()
        unsubLeituras?.()
        stopTyping()
      }
    }
  }, [topicoAtivo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const subscribeToMessages = (topicoId) => {
    const channel = supabase
      .channel(`chat_${topicoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `topico_id=eq.${topicoId}`
      }, (payload) => {
        loadMensagens(topicoId)
        if (payload.eventType === 'INSERT' && payload.new.autor_id !== profile?.id) {
          playNotificationSound()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const subscribeToLeituras = (topicoId) => {
    const channel = supabase
      .channel(`chat_leituras_${topicoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_leituras',
        filter: `topico_id=eq.${topicoId}`
      }, () => {
        loadTopicoLeituras(topicoId)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch (e) {}
  }

  const loadProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, codigo, nome, status, fase, cliente_nome')
        .eq('arquivado', false)
        .order('codigo', { ascending: true })
      
      if (error) throw error
      setProjetos(data || [])
      
      // Expandir primeiro projeto e selecionar
      if (data && data.length > 0) {
        setProjetoAtivo(data[0])
        setProjetosExpanded({ [data[0].id]: true })
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCanais = async (projetoId) => {
    try {
      const { data, error } = await supabase
        .from('chat_canais')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('arquivado', false)
        .order('ordem')
      
      if (error) throw error
      setCanais(data || [])
      
      if (data && data.length > 0) {
        setCanalAtivo(data[0])
      } else {
        setCanalAtivo(null)
        setTopicos([])
        setTopicoAtivo(null)
        setMensagens([])
      }
    } catch (err) {
      console.error('Erro ao carregar canais:', err)
    }
  }

  const loadTopicos = async (canalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_topicos')
        .select('*, autor:criado_por(nome, avatar_url)')
        .eq('canal_id', canalId)
        .eq('fechado', false)
        .order('fixado', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) throw error
      setTopicos(data || [])

      // Carregar contagem de não lidas
      if (data?.length > 0) {
        loadUnreadCounts(data.map(t => t.id))
        setTopicoAtivo(data[0])
      } else {
        setTopicoAtivo(null)
        setMensagens([])
      }
    } catch (err) {
      console.error('Erro ao carregar tópicos:', err)
    }
  }

  const loadMensagens = async (topicoId) => {
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url),
          reacoes:chat_reacoes(emoji, utilizador_id),
          parent:parent_id(id, conteudo, autor_id)
        `)
        .eq('topico_id', topicoId)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMensagens(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    }
  }

  const loadMembrosEquipa = async (projetoId) => {
    try {
      const { data: equipaData } = await supabase
        .from('projeto_equipa')
        .select('utilizador:utilizador_id(id, nome, avatar_url)')
        .eq('projeto_id', projetoId)

      if (equipaData) {
        // Include GARVIS as first option in mentions
        const membros = equipaData.map(e => e.utilizador).filter(Boolean)
        setMembrosEquipa([GARVIS_USER, ...membros])
      } else {
        setMembrosEquipa([GARVIS_USER])
      }
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
      setMembrosEquipa([GARVIS_USER])
    }
  }

  // Carregar contagem de mensagens não lidas por tópico
  const loadUnreadCounts = async (topicosIds) => {
    if (!profile?.id || !topicosIds.length) return

    try {
      const { data: leituras } = await supabase
        .from('chat_leituras')
        .select('topico_id, ultima_leitura_at')
        .eq('utilizador_id', profile.id)
        .in('topico_id', topicosIds)

      const leiturasMap = {}
      leituras?.forEach(l => { leiturasMap[l.topico_id] = l.ultima_leitura_at })

      const counts = {}
      for (const topicoId of topicosIds) {
        const ultimaLeitura = leiturasMap[topicoId]
        let query = supabase
          .from('chat_mensagens')
          .select('id', { count: 'exact', head: true })
          .eq('topico_id', topicoId)
          .eq('eliminado', false)
          .neq('autor_id', profile.id)

        if (ultimaLeitura) {
          query = query.gt('created_at', ultimaLeitura)
        }

        const { count } = await query
        if (count > 0) counts[topicoId] = count
      }

      setUnreadCounts(counts)
    } catch (err) {
      console.error('Erro ao carregar não lidas:', err)
    }
  }

  // Marcar tópico como lido
  const markAsRead = async (topicoId) => {
    if (!profile?.id || !topicoId) return

    try {
      await supabase
        .from('chat_leituras')
        .upsert({
          topico_id: topicoId,
          utilizador_id: profile.id,
          ultima_leitura_at: new Date().toISOString()
        }, { onConflict: 'topico_id,utilizador_id' })

      setUnreadCounts(prev => {
        const updated = { ...prev }
        delete updated[topicoId]
        return updated
      })
    } catch (err) {
      console.error('Erro ao marcar como lido:', err)
    }
  }

  // Carregar leituras do tópico (quem leu e quando)
  const loadTopicoLeituras = async (topicoId) => {
    if (!topicoId) return
    try {
      const { data } = await supabase
        .from('chat_leituras')
        .select('utilizador_id, ultima_leitura_at')
        .eq('topico_id', topicoId)
      setTopicoLeituras(data || [])
    } catch (err) {
      // Silenciar erros de leituras
    }
  }

  // Verificar se mensagem foi lida por todos os membros
  const isReadByAll = (msg) => {
    if (!msg || !profile?.id) return false
    if (msg.autor_id !== profile.id) return false
    const otherMembers = membrosEquipa.filter(m => m.id !== profile.id && !m.is_bot)
    if (otherMembers.length === 0) return false
    return otherMembers.every(member => {
      const leitura = topicoLeituras.find(l => l.utilizador_id === member.id)
      return leitura && new Date(leitura.ultima_leitura_at) >= new Date(msg.created_at)
    })
  }

  // Enviar typing indicator
  const sendTyping = async () => {
    if (!profile?.id || !topicoAtivo) return

    try {
      await supabase.from('chat_typing').upsert({
        topico_id: topicoAtivo.id,
        utilizador_id: profile.id,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5000).toISOString()
      }, { onConflict: 'topico_id,utilizador_id' })
    } catch (err) {
      // Silenciar erros de typing
    }
  }

  // Parar typing indicator
  const stopTyping = async () => {
    if (!profile?.id || !topicoAtivo) return

    try {
      await supabase
        .from('chat_typing')
        .delete()
        .eq('topico_id', topicoAtivo.id)
        .eq('utilizador_id', profile.id)
    } catch (err) {
      // Silenciar erros
    }
  }

  // Carregar quem está a escrever
  const loadTypingUsers = async (topicoId) => {
    if (!topicoId) return

    try {
      const { data } = await supabase
        .from('chat_typing')
        .select('utilizador:utilizador_id(id, nome)')
        .eq('topico_id', topicoId)
        .gt('expires_at', new Date().toISOString())
        .neq('utilizador_id', profile?.id)

      setTypingUsers(data?.map(t => t.utilizador).filter(Boolean) || [])
    } catch (err) {
      setTypingUsers([])
    }
  }

  // Subscrever a typing updates
  const subscribeToTyping = (topicoId) => {
    const channel = supabase
      .channel(`typing_${topicoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_typing',
        filter: `topico_id=eq.${topicoId}`
      }, () => {
        loadTypingUsers(topicoId)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  // Atualizar própria presença
  const updateMyPresence = async () => {
    if (!profile?.id) return

    try {
      await supabase.from('chat_presenca').upsert({
        utilizador_id: profile.id,
        estado: 'online',
        ultima_actividade: new Date().toISOString(),
        dispositivo: 'web'
      }, { onConflict: 'utilizador_id' })
    } catch (err) {
      // Silenciar erros
    }
  }

  // Carregar presença dos membros da equipa
  const loadPresencaEquipa = async () => {
    if (!membrosEquipa.length) return

    try {
      const { data } = await supabase
        .from('chat_presenca')
        .select('utilizador_id, estado, ultima_actividade')
        .in('utilizador_id', membrosEquipa.map(m => m.id))

      const map = {}
      data?.forEach(p => {
        // Considerar offline se última atividade > 15min
        const lastActive = new Date(p.ultima_actividade)
        const diffMinutes = (Date.now() - lastActive.getTime()) / 60000

        if (diffMinutes > 15) {
          map[p.utilizador_id] = 'offline'
        } else if (diffMinutes > 5) {
          map[p.utilizador_id] = 'away'
        } else {
          map[p.utilizador_id] = p.estado
        }
      })

      setPresencaMap(map)
    } catch (err) {
      // Silenciar erros
    }
  }

  // Cor do indicador de presença
  const getPresenceColor = (userId) => {
    const estado = presencaMap[userId]
    if (estado === 'online') return '#22c55e' // Verde
    if (estado === 'away') return '#eab308' // Amarelo
    return '#9ca3af' // Cinza
  }

  // Pesquisar mensagens
  const handleSearch = async (query) => {
    if (!query.trim() || !projetoAtivo) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          id, conteudo, created_at,
          autor:autor_id(nome, avatar_url),
          topico:topico_id(id, titulo, canal:canal_id(id, nome, projeto_id))
        `)
        .ilike('conteudo', `%${query}%`)
        .eq('eliminado', false)
        .order('created_at', { ascending: false })
        .limit(50)

      // Filtrar pelo projeto atual
      const filtered = data?.filter(m => m.topico?.canal?.projeto_id === projetoAtivo.id) || []
      setSearchResults(filtered)
    } catch (err) {
      console.error('Erro na pesquisa:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Navegar para mensagem do resultado
  const goToSearchResult = async (result) => {
    // Encontrar o canal e tópico
    const canal = canais.find(c => c.id === result.topico?.canal?.id)
    if (canal && canal.id !== canalAtivo?.id) {
      setCanalAtivo(canal)
    }

    // Esperar um pouco para o tópico carregar
    setTimeout(() => {
      const topico = topicos.find(t => t.id === result.topico?.id)
      if (topico) {
        setTopicoAtivo(topico)
      }
    }, 100)

    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleCriarCanal = async () => {
    if (!novoCanal.nome.trim() || !projetoAtivo) return

    try {
      const { data, error } = await supabase
        .from('chat_canais')
        .insert({
          projeto_id: projetoAtivo.id,
          nome: novoCanal.nome,
          descricao: novoCanal.descricao || null,
          tipo: novoCanal.tipo,
          icone: novoCanal.icone,
          criado_por: profile?.id,
          ordem: canais.length
        })
        .select()
        .single()

      if (error) throw error

      // Criar tópico "Geral" automaticamente para o novo canal
      const { data: topicoGeral, error: topicoError } = await supabase
        .from('chat_topicos')
        .insert({
          canal_id: data.id,
          titulo: 'Geral',
          descricao: 'Tópico geral do canal',
          criado_por: profile?.id
        })
        .select()
        .single()

      if (topicoError) {
        console.error('Erro ao criar tópico Geral:', topicoError)
      }

      setCanais([...canais, data])
      setCanalAtivo(data)

      // Selecionar o tópico Geral automaticamente
      if (topicoGeral) {
        setTopicos([topicoGeral])
        setTopicoAtivo(topicoGeral)
      }

      setShowNovoCanal(false)
      setNovoCanal({ nome: '', descricao: '', tipo: 'publico', icone: 'hash' })
    } catch (err) {
      toast.error('Erro', 'Erro ao criar canal: ' + err.message)
    }
  }

  const handleEditarCanal = async () => {
    if (!editingCanal?.nome?.trim()) return

    try {
      const { error } = await supabase
        .from('chat_canais')
        .update({
          nome: editingCanal.nome,
          descricao: editingCanal.descricao || null,
          tipo: editingCanal.tipo,
          icone: editingCanal.icone
        })
        .eq('id', editingCanal.id)

      if (error) throw error

      // Atualizar lista de canais
      setCanais(canais.map(c => c.id === editingCanal.id ? { ...c, ...editingCanal } : c))

      // Se for o canal ativo, atualizar também
      if (canalAtivo?.id === editingCanal.id) {
        setCanalAtivo({ ...canalAtivo, ...editingCanal })
      }

      setEditingCanal(null)
    } catch (err) {
      toast.error('Erro', 'Erro ao editar canal: ' + err.message)
    }
  }

  const handleArquivarCanal = async (canal) => {
    try {
      const { error } = await supabase
        .from('chat_canais')
        .update({ arquivado: true })
        .eq('id', canal.id)

      if (error) throw error

      // Remover da lista de canais
      const novosCanais = canais.filter(c => c.id !== canal.id)
      setCanais(novosCanais)

      // Se for o canal ativo, selecionar outro
      if (canalAtivo?.id === canal.id) {
        setCanalAtivo(novosCanais.length > 0 ? novosCanais[0] : null)
        setTopicoAtivo(null)
      }

      setShowDeleteCanalConfirm(null)
    } catch (err) {
      toast.error('Erro', 'Erro ao eliminar canal: ' + err.message)
    }
  }

  const handleCriarTopico = async () => {
    if (!novoTopico.titulo.trim() || !canalAtivo) return
    
    try {
      const { data, error } = await supabase
        .from('chat_topicos')
        .insert({
          canal_id: canalAtivo.id,
          titulo: novoTopico.titulo,
          descricao: novoTopico.descricao || null,
          criado_por: profile?.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      setTopicos([data, ...topicos])
      setTopicoAtivo(data)
      setShowNovoTopico(false)
      setNovoTopico({ titulo: '', descricao: '' })
    } catch (err) {
      toast.error('Erro', 'Erro ao criar tópico: ' + err.message)
    }
  }

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim()) return

    if (!topicoAtivo) {
      toast.warning('Aviso', 'Por favor, seleciona ou cria um tópico antes de enviar mensagens.')
      return
    }

    try {
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
      const mencoes = []
      let match
      while ((match = mentionRegex.exec(novaMensagem)) !== null) {
        mencoes.push(match[2])
      }

      // Check if GARVIS is mentioned
      const garvisMentioned = mencoes.includes(GARVIS_USER.id)

      const conteudoLimpo = novaMensagem.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1')

      const { data, error } = await supabase
        .from('chat_mensagens')
        .insert({
          topico_id: topicoAtivo.id,
          parent_id: replyTo?.id || null,
          conteudo: conteudoLimpo,
          tipo: 'texto',
          autor_id: profile?.id
        })
        .select()
        .single()

      if (error) throw error

      // Insert mentions for non-bot users
      const humanMencoes = mencoes.filter(id => id !== GARVIS_USER.id)
      if (humanMencoes.length > 0) {
        await supabase.from('chat_mencoes').insert(
          humanMencoes.map(userId => ({
            mensagem_id: data.id,
            utilizador_id: userId
          }))
        )
      }

      await supabase
        .from('chat_topicos')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', topicoAtivo.id)

      setNovaMensagem('')
      setReplyTo(null)

      // Recarregar mensagens após envio
      loadMensagens(topicoAtivo.id)

      // If GARVIS was mentioned, call the edge function
      if (garvisMentioned && projetoAtivo) {
        try {
          const response = await supabase.functions.invoke('garvis-chat', {
            body: {
              projetoId: projetoAtivo.id,
              topicoId: topicoAtivo.id,
              mensagem: conteudoLimpo,
              mensagemId: data.id,
              autorNome: profile?.nome || 'Utilizador'
            }
          })

          if (response.error) {
            console.error('GARVIS error:', response.error)
          } else {
            // Reload messages to show GARVIS response
            setTimeout(() => loadMensagens(topicoAtivo.id), 500)
          }
        } catch (garvisErr) {
          console.error('Erro ao chamar GARVIS:', garvisErr)
        }
      }
    } catch (err) {
      toast.error('Erro', 'Erro ao enviar mensagem: ' + err.message)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !topicoAtivo || !projetoAtivo) return
    
    setUploading(true)
    try {
      const fileName = `${projetoAtivo.id}/${Date.now()}_${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName)
      
      const tipo = file.type.startsWith('image/') ? 'imagem' : 'ficheiro'
      
      await supabase.from('chat_mensagens').insert({
        topico_id: topicoAtivo.id,
        conteudo: file.name,
        tipo,
        autor_id: profile?.id,
        ficheiro_url: publicUrl,
        ficheiro_nome: file.name,
        ficheiro_tamanho: file.size,
        ficheiro_tipo: file.type
      })
      
      // Recarregar mensagens após upload
      loadMensagens(topicoAtivo.id)
    } catch (err) {
      toast.error('Erro', 'Erro ao enviar ficheiro: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReacao = async (mensagemId, emoji) => {
    try {
      const existingReacao = mensagens
        .find(m => m.id === mensagemId)?.reacoes
        ?.find(r => r.emoji === emoji && r.utilizador_id === profile?.id)
      
      if (existingReacao) {
        await supabase
          .from('chat_reacoes')
          .delete()
          .eq('mensagem_id', mensagemId)
          .eq('utilizador_id', profile?.id)
          .eq('emoji', emoji)
      } else {
        await supabase.from('chat_reacoes').insert({
          mensagem_id: mensagemId,
          utilizador_id: profile?.id,
          emoji
        })
      }
      
      loadMensagens(topicoAtivo.id)
    } catch (err) {
      console.error('Erro ao reagir:', err)
    }
  }

  const handleEliminarMensagem = async (mensagem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Mensagem',
      message: 'Eliminar esta mensagem?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase
            .from('chat_mensagens')
            .update({
              eliminado: true,
              eliminado_at: new Date().toISOString(),
              eliminado_por: profile?.id
            })
            .eq('id', mensagem.id)

          loadMensagens(topicoAtivo.id)
        } catch (err) {
          toast.error('Erro', 'Erro ao eliminar: ' + err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  // Iniciar edição de mensagem
  const startEditMessage = (mensagem) => {
    setEditingMessage(mensagem)
    setNovaMensagem(mensagem.conteudo)
    setReplyTo(null)
    inputRef.current?.focus()
  }

  // Guardar edição de mensagem
  const handleEditMessage = async () => {
    if (!novaMensagem.trim() || !editingMessage) return

    try {
      await supabase
        .from('chat_mensagens')
        .update({ conteudo: novaMensagem.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingMessage.id)

      setEditingMessage(null)
      setNovaMensagem('')
      loadMensagens(topicoAtivo.id)
    } catch (err) {
      toast.error('Erro', 'Erro ao editar: ' + err.message)
    }
  }

  // Cancelar edição
  const cancelEdit = () => {
    setEditingMessage(null)
    setNovaMensagem('')
  }

  const handleRenameProject = async () => {
    if (!editProjectNameValue.trim() || !projetoAtivo) return
    try {
      const { error } = await supabase
        .from('projetos')
        .update({ nome: editProjectNameValue.trim() })
        .eq('id', projetoAtivo.id)
      if (error) throw error
      setProjetos(prev => prev.map(p => p.id === projetoAtivo.id ? { ...p, nome: editProjectNameValue.trim() } : p))
      setProjetoAtivo(prev => ({ ...prev, nome: editProjectNameValue.trim() }))
      setEditingProjectName(false)
      toast.success('Nome do canal atualizado')
    } catch (err) {
      toast.error('Erro', 'Não foi possível renomear')
    }
  }

  const insertMention = (user) => {
    const mentionText = `@[${user.nome}](${user.id}) `
    setNovaMensagem(prev => {
      const lastAt = prev.lastIndexOf('@')
      if (lastAt >= 0) {
        return prev.substring(0, lastAt) + mentionText
      }
      return prev + mentionText
    })
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setNovaMensagem(value)

    // Typing indicator - enviar quando escreve
    if (value.trim()) {
      sendTyping()
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(stopTyping, 3000)
    }

    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0 && lastAt === value.length - 1) {
      setShowMentions(true)
      setMentionFilter('')
    } else if (lastAt >= 0) {
      const filterText = value.substring(lastAt + 1)
      if (!filterText.includes(' ')) {
        setShowMentions(true)
        setMentionFilter(filterText.toLowerCase())
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const groupReactions = (reacoes) => {
    const grouped = {}
    reacoes?.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = []
      grouped[r.emoji].push(r.utilizador_id)
    })
    return grouped
  }

  const filteredMembros = membrosEquipa.filter(m => 
    m.nome?.toLowerCase().includes(mentionFilter)
  )

  const toggleProjetoExpanded = (projetoId) => {
    setProjetosExpanded(prev => ({
      ...prev,
      [projetoId]: !prev[projetoId]
    }))
  }

  const selectProjeto = (projeto) => {
    setProjetoAtivo(projeto)
    // Fechar todos e expandir só o selecionado
    setProjetosExpanded({ [projeto.id]: true })
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: 0,
        background: 'var(--white)',
        overflow: 'hidden'
      }}>
        {/* Sidebar - Projetos */}
        <div style={{
          background: '#eae5de',
          borderRight: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'var(--brown)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700
            }}>GA</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brown)' }}>GAVINHO ARCH</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{projetos.length} projetos</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px 8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
              <input
                type="text"
                placeholder="Pesquisar projetos..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  background: 'white',
                  color: 'var(--brown)'
                }}
              />
            </div>
          </div>

          {/* Projects grouped by status */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {(() => {
              const filtered = projetos.filter(p =>
                !sidebarSearch || p.codigo?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                p.nome?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                p.cliente_nome?.toLowerCase().includes(sidebarSearch.toLowerCase())
              )
              const groups = {
                'NO PRAZO': filtered.filter(p => p.status === 'on_track' || !p.status),
                'EM RISCO': filtered.filter(p => p.status === 'at_risk'),
                'BLOQUEADO': filtered.filter(p => p.status === 'blocked'),
                'CONCLUÍDO': filtered.filter(p => p.status === 'concluido' || p.status === 'arquivo')
              }
              return Object.entries(groups).map(([label, groupProjects]) => {
                if (groupProjects.length === 0) return null
                return (
                  <div key={label}>
                    <div style={{
                      padding: '12px 16px 6px',
                      fontSize: '10px', fontWeight: 700,
                      color: 'var(--brown-light)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {label}
                    </div>
                    {groupProjects.map(projeto => {
                      const isActive = projetoAtivo?.id === projeto.id
                      return (
                        <button
                          key={projeto.id}
                          onClick={() => selectProjeto(projeto)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            background: isActive ? 'var(--brown)' : 'transparent',
                            border: 'none',
                            color: isActive ? 'white' : 'var(--brown)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: 0
                          }}
                        >
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                            background: (label === 'NO PRAZO') ? '#22c55e' : (label === 'EM RISCO') ? '#f59e0b' : (label === 'BLOQUEADO') ? '#ef4444' : '#9ca3af'
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{projeto.codigo}</div>
                            <div style={{ fontSize: '11px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {projeto.nome} · {projeto.cliente_nome || ''}
                            </div>
                          </div>
                          {unreadCounts[projeto.id] > 0 && (
                            <span style={{
                              background: '#ef4444',
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '10px',
                              minWidth: '20px',
                              textAlign: 'center'
                            }}>
                              {unreadCounts[projeto.id]}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            })()}

            {projetos.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>
                Sem projetos
              </div>
            )}
          </div>
        </div>

        {/* Área de mensagens */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
          {/* Header do chat */}
          {projetoAtivo && (
            <div style={{ borderBottom: '1px solid var(--stone)', background: 'var(--cream)' }}>
              {/* Project info */}
              <div style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 400, fontSize: '14px', color: 'var(--brown-light)', fontVariant: 'small-caps' }}>{projetoAtivo.codigo}</span>
                    {editingProjectName ? (
                      <input
                        autoFocus
                        value={editProjectNameValue}
                        onChange={e => setEditProjectNameValue(e.target.value)}
                        onBlur={handleRenameProject}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameProject()
                          if (e.key === 'Escape') setEditingProjectName(false)
                        }}
                        style={{
                          fontWeight: 600, fontSize: '16px', color: 'var(--brown)',
                          border: '1px solid var(--gold)', borderRadius: '6px',
                          padding: '2px 8px', background: 'white', outline: 'none',
                          minWidth: '200px'
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingProjectName(true); setEditProjectNameValue(projetoAtivo.nome) }}
                        style={{ fontWeight: 600, fontSize: '16px', color: 'var(--brown)', cursor: 'pointer', borderBottom: '1px dashed transparent' }}
                        onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--brown-light)'}
                        onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                        title="Clique para editar o nome do canal"
                      >
                        {projetoAtivo.nome}
                      </span>
                    )}
                    <span style={{ color: 'var(--brown-light)', fontSize: '14px' }}>·</span>
                    <span style={{ fontSize: '14px', color: 'var(--brown-light)' }}>
                      {projetoAtivo.fase || 'Projeto'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '3px' }}>
                    {membrosEquipa.length} membros · {mensagens.length} mensagens · Última atividade há {(() => {
                      if (mensagens.length === 0) return '--'
                      const last = new Date(mensagens[mensagens.length - 1]?.created_at)
                      const mins = Math.floor((Date.now() - last) / 60000)
                      if (mins < 1) return 'agora'
                      if (mins < 60) return `${mins} min`
                      if (mins < 1440) return `${Math.floor(mins/60)}h`
                      return `${Math.floor(mins/1440)}d`
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px', borderRadius: '6px' }} className="hover-bg">
                    <Search size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px', borderRadius: '6px' }} className="hover-bg">
                    <Paperclip size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px', borderRadius: '6px' }} className="hover-bg">
                    <Users size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px', borderRadius: '6px' }} className="hover-bg">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Topic tabs */}
              <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--brown-light)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginRight: '4px' }}>TÓPICOS:</span>
                {topicos.map(topico => (
                  <button
                    key={topico.id}
                    onClick={() => setTopicoAtivo(topico)}
                    style={{
                      padding: '6px 14px',
                      background: topicoAtivo?.id === topico.id ? 'var(--brown)' : 'transparent',
                      color: topicoAtivo?.id === topico.id ? 'white' : 'var(--brown)',
                      border: topicoAtivo?.id === topico.id ? 'none' : '1px solid var(--stone)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: topicoAtivo?.id === topico.id ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {topico.icone && (() => { const I = CANAL_ICONS.find(i => i.id === topico.icone)?.icon; return I ? <I size={12} /> : null })()}
                    {topico.titulo}
                  </button>
                ))}
                <button
                  onClick={() => setShowNovoTopico(true)}
                  style={{ padding: '6px 10px', background: 'transparent', border: '1px dashed var(--stone)', borderRadius: '16px', fontSize: '12px', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} /> Novo
                </button>
              </div>

              {/* Filter buttons */}
              <div style={{ padding: '10px 24px 12px', display: 'flex', gap: '6px' }}>
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'anexos', label: 'Com anexos' },
                  { id: 'imagens', label: 'Com imagens' },
                  { id: 'mencoes', label: 'Menções' },
                  { id: 'guardadas', label: 'Guardadas' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setMessageFilter(f.id)}
                    style={{
                      padding: '5px 14px',
                      background: messageFilter === f.id ? 'var(--brown)' : 'white',
                      color: messageFilter === f.id ? 'white' : 'var(--brown)',
                      border: messageFilter === f.id ? 'none' : '1px solid var(--stone)',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: messageFilter === f.id ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minHeight: 0
          }}>
            {!topicoAtivo ? (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--brown-light)'
              }}>
                <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <div style={{ fontSize: '14px' }}>Seleciona um tópico para ver as mensagens</div>
              </div>
            ) : mensagens.length === 0 ? (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--brown-light)'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>Sem mensagens neste tópico</div>
                <div style={{ fontSize: '12px' }}>Sê o primeiro a escrever!</div>
              </div>
            ) : (
              mensagens.filter(msg => {
                if (messageFilter === 'todas') return true
                if (messageFilter === 'anexos') return msg.tipo === 'ficheiro'
                if (messageFilter === 'imagens') return msg.tipo === 'imagem'
                if (messageFilter === 'mencoes') return msg.conteudo?.includes(`@${profile?.nome || profile?.email}`)
                if (messageFilter === 'guardadas') return msg.guardada
                return true
              }).map((msg, idx, arr) => {
                const isOwn = msg.autor_id === profile?.id
                const isGarvis = msg.autor_id === GARVIS_USER.id
                const showAuthor = idx === 0 || arr[idx - 1]?.autor_id !== msg.autor_id
                const reactions = groupReactions(msg.reacoes)

                // Date separator
                const msgDate = new Date(msg.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
                const prevDate = idx > 0 ? new Date(arr[idx-1].created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : null
                const showDateSeparator = idx === 0 || msgDate !== prevDate

                return (
                  <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0 8px', color: 'var(--brown-light)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--stone)' }} />
                      <span>{msgDate}</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--stone)' }} />
                    </div>
                  )}
                  <div style={{ marginTop: showAuthor ? '12px' : '2px' }}>
                    {msg.parent && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: 'var(--brown-light)',
                        marginBottom: '4px',
                        marginLeft: '44px',
                        padding: '4px 8px',
                        background: 'var(--cream)',
                        borderRadius: '4px',
                        borderLeft: '2px solid var(--gold)'
                      }}>
                        <Reply size={12} />
                        <strong>{msg.parent.autor?.nome}</strong>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.parent.conteudo?.substring(0, 50)}...
                        </span>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      padding: isGarvis ? '12px' : '4px 8px',
                      borderRadius: isGarvis ? '12px' : '6px',
                      transition: 'background 0.15s',
                      background: isGarvis ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)' : 'transparent',
                      border: isGarvis ? '1px solid rgba(99, 102, 241, 0.2)' : 'none',
                      marginLeft: isGarvis ? '0' : undefined,
                      marginRight: isGarvis ? '0' : undefined,
                      position: 'relative'
                    }}
                    className={isGarvis ? 'garvis-message' : 'chat-message'}
                    >
                      {showAuthor ? (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isGarvis
                              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                              : (msg.autor?.avatar_url ? `url(${msg.autor.avatar_url})` : 'var(--gold)'),
                            backgroundSize: 'cover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: isGarvis ? '11px' : '14px',
                            boxShadow: isGarvis ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
                          }}>
                            {isGarvis ? 'AI' : (!msg.autor?.avatar_url && msg.autor?.nome?.charAt(0))}
                          </div>
                          {/* Indicador de presença - always online for GARVIS */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: isGarvis ? '#22c55e' : getPresenceColor(msg.autor_id),
                            border: '2px solid white'
                          }} />
                        </div>
                      ) : (
                        <div style={{ width: '36px' }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {showAuthor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: isGarvis ? '#6366f1' : 'var(--brown)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {msg.autor?.nome || 'Utilizador'}
                              {isGarvis && (
                                <span style={{
                                  fontSize: '9px',
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                  letterSpacing: '0.5px'
                                }}>
                                  BOT
                                </span>
                              )}
                            </span>
                            {msg.autor?.cargo && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--brown-light)',
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase'
                              }}>
                                {msg.autor.cargo}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                              {formatDate(msg.created_at)}
                            </span>
                            {msg.updated_at && msg.updated_at !== msg.created_at && !msg.eliminado && (
                              <span style={{ fontSize: '10px', color: 'var(--brown-light)', fontStyle: 'italic' }}>(editado)</span>
                            )}
                          </div>
                        )}
                        
                        {msg.eliminado ? (
                          <div style={{ fontSize: '13px', color: 'var(--brown-light)', fontStyle: 'italic', opacity: 0.6 }}>
                            Esta mensagem foi eliminada
                          </div>
                        ) : msg.tipo === 'imagem' ? (
                          <a href={msg.ficheiro_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.ficheiro_url} 
                              alt={msg.ficheiro_nome}
                              style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', marginTop: '4px' }}
                            />
                          </a>
                        ) : msg.tipo === 'ficheiro' ? (
                          <a href={msg.imagem_url || msg.file_url || msg.ficheiro_url} target="_blank" rel="noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '14px',
                              padding: '14px 18px',
                              background: 'var(--cream)', border: '1px solid var(--stone)',
                              borderRadius: '10px', textDecoration: 'none',
                              maxWidth: '400px', marginTop: '8px'
                            }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <File size={20} style={{ color: '#ef4444' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {msg.file_name || msg.ficheiro_nome || 'Ficheiro'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
                                PDF · {msg.file_size || msg.ficheiro_tamanho ? `${((msg.file_size || msg.ficheiro_tamanho) / 1024).toFixed(1)} KB` : '--'}
                              </div>
                            </div>
                            <Download size={18} style={{ color: 'var(--brown-light)', flexShrink: 0 }} />
                          </a>
                        ) : (
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--brown)',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {renderFormattedText(msg.conteudo)}
                          </div>
                        )}
                        
                        {Object.keys(reactions).length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {Object.entries(reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReacao(msg.id, emoji)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  background: users.includes(profile?.id) ? 'rgba(201, 168, 130, 0.2)' : 'var(--cream)',
                                  border: users.includes(profile?.id) ? '1px solid var(--gold)' : '1px solid transparent',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                <span>{emoji}</span>
                                <span style={{ color: 'var(--brown-light)' }}>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {isOwn && !arr.slice(idx + 1).some(m => m.autor_id === profile?.id) && isReadByAll(msg) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Check size={12} style={{ color: '#22c55e' }} />
                            <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>Lido por todos</span>
                          </div>
                        )}
                      </div>

                      <div className="chat-message-actions" style={{
                        display: 'flex',
                        gap: '2px',
                        padding: '4px 6px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid var(--stone)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}>
                        {REACTION_EMOJIS.slice(0, 4).map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReacao(msg.id, emoji)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              fontSize: '14px',
                              borderRadius: '4px'
                            }}
                            className="hover-bg"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div style={{ width: '1px', background: 'var(--stone)', margin: '2px 2px' }} />
                        <button
                          onClick={() => setReplyTo(msg)}
                          title="Responder"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)', borderRadius: '4px' }}
                          className="hover-bg"
                        >
                          <Reply size={14} />
                        </button>
                        {isOwn && (
                          <>
                            <button
                              onClick={() => startEditMessage(msg)}
                              title="Editar"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)', borderRadius: '4px' }}
                              className="hover-bg"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleEliminarMensagem(msg)}
                              title="Eliminar"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444', borderRadius: '4px' }}
                              className="hover-bg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  </React.Fragment>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {topicoAtivo && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--stone)', position: 'relative' }}>
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: 'var(--brown-light)',
                  marginBottom: '8px'
                }}>
                  <span style={{ display: 'flex', gap: '2px' }}>
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'typingBounce 1s infinite' }} />
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'typingBounce 1s infinite 0.2s' }} />
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'typingBounce 1s infinite 0.4s' }} />
                  </span>
                  <span>
                    {typingUsers.length === 1
                      ? `${typingUsers[0].nome} está a escrever...`
                      : typingUsers.length === 2
                        ? `${typingUsers[0].nome} e ${typingUsers[1].nome} estão a escrever...`
                        : `${typingUsers[0].nome} e mais ${typingUsers.length - 1} estão a escrever...`
                    }
                  </span>
                </div>
              )}

              {/* Indicador de edição */}
              {editingMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#fef3c7',
                  borderRadius: '8px 8px 0 0',
                  borderLeft: '3px solid #f59e0b',
                  marginBottom: '-1px'
                }}>
                  <div style={{ fontSize: '12px', color: '#92400e' }}>
                    <Edit size={12} style={{ marginRight: '6px' }} />
                    A editar mensagem
                  </div>
                  <button
                    onClick={cancelEdit}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {replyTo && !editingMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--cream)',
                  borderRadius: '8px 8px 0 0',
                  borderLeft: '3px solid var(--gold)',
                  marginBottom: '-1px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    <Reply size={12} style={{ marginRight: '6px' }} />
                    Respondendo a <strong>{replyTo.autor?.nome}</strong>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              {showMentions && filteredMembros.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '20px',
                  right: '20px',
                  background: 'white',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '8px',
                  zIndex: 10
                }}>
                  {filteredMembros.map(user => {
                    const isGarvisUser = user.id === GARVIS_USER.id
                    return (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          background: isGarvisUser ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)' : 'none',
                          border: 'none',
                          borderBottom: isGarvisUser ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        className="hover-bg"
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isGarvisUser
                            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                            : (user.avatar_url ? `url(${user.avatar_url})` : 'var(--gold)'),
                          backgroundSize: 'cover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: isGarvisUser ? '10px' : '12px',
                          fontWeight: 600,
                          boxShadow: isGarvisUser ? '0 2px 6px rgba(99, 102, 241, 0.3)' : 'none'
                        }}>
                          {isGarvisUser ? 'AI' : (!user.avatar_url && user.nome?.charAt(0))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontSize: '13px',
                            color: isGarvisUser ? '#6366f1' : 'var(--brown)',
                            fontWeight: isGarvisUser ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {user.nome}
                            {isGarvisUser && (
                              <span style={{
                                fontSize: '8px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                padding: '1px 4px',
                                borderRadius: '3px'
                              }}>
                                BOT
                              </span>
                            )}
                          </span>
                          {isGarvisUser && (
                            <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                              Assistente IA do projeto
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '8px',
                background: 'var(--cream)',
                borderRadius: replyTo ? '0 0 8px 8px' : '8px',
                padding: '8px 12px'
              }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    padding: '4px'
                  }}
                >
                  <Paperclip size={18} />
                </button>

                {/* Toolbar de formatação */}
                <div style={{ display: 'flex', gap: '2px', borderRight: '1px solid var(--stone)', paddingRight: '8px', marginRight: '4px' }}>
                  <button
                    onClick={() => {
                      const textarea = inputRef.current
                      if (!textarea) return
                      const start = textarea.selectionStart
                      const end = textarea.selectionEnd
                      const text = novaMensagem
                      const selectedText = text.substring(start, end)
                      const newText = text.substring(0, start) + '**' + (selectedText || 'texto') + '**' + text.substring(end)
                      setNovaMensagem(newText)
                      setTimeout(() => {
                        textarea.focus()
                        textarea.setSelectionRange(start + 2, end + 2 + (selectedText ? 0 : 5))
                      }, 0)
                    }}
                    title="Negrito (Ctrl+B)"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '4px', borderRadius: '4px' }}
                    className="hover-bg"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const textarea = inputRef.current
                      if (!textarea) return
                      const start = textarea.selectionStart
                      const end = textarea.selectionEnd
                      const text = novaMensagem
                      const selectedText = text.substring(start, end)
                      const newText = text.substring(0, start) + '*' + (selectedText || 'texto') + '*' + text.substring(end)
                      setNovaMensagem(newText)
                      setTimeout(() => {
                        textarea.focus()
                        textarea.setSelectionRange(start + 1, end + 1 + (selectedText ? 0 : 5))
                      }, 0)
                    }}
                    title="Itálico (Ctrl+I)"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '4px', borderRadius: '4px' }}
                    className="hover-bg"
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const textarea = inputRef.current
                      if (!textarea) return
                      const start = textarea.selectionStart
                      const end = textarea.selectionEnd
                      const text = novaMensagem
                      const selectedText = text.substring(start, end)
                      const newText = text.substring(0, start) + '`' + (selectedText || 'código') + '`' + text.substring(end)
                      setNovaMensagem(newText)
                      setTimeout(() => {
                        textarea.focus()
                        textarea.setSelectionRange(start + 1, end + 1 + (selectedText ? 0 : 6))
                      }, 0)
                    }}
                    title="Código"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '4px', borderRadius: '4px' }}
                    className="hover-bg"
                  >
                    <Code size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const textarea = inputRef.current
                      if (!textarea) return
                      const start = textarea.selectionStart
                      const text = novaMensagem
                      const beforeCursor = text.substring(0, start)
                      const afterCursor = text.substring(start)
                      const lineStart = beforeCursor.lastIndexOf('\n') + 1
                      const prefix = beforeCursor.substring(lineStart).match(/^[\-\*]\s/) ? '' : '- '
                      const newText = beforeCursor + prefix + afterCursor
                      setNovaMensagem(newText)
                      setTimeout(() => {
                        textarea.focus()
                        textarea.setSelectionRange(start + prefix.length, start + prefix.length)
                      }, 0)
                    }}
                    title="Lista"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '4px', borderRadius: '4px' }}
                    className="hover-bg"
                  >
                    <List size={16} />
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={novaMensagem}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      editingMessage ? handleEditMessage() : handleEnviarMensagem()
                    }
                    if (e.key === 'Escape' && editingMessage) {
                      cancelEdit()
                    }
                  }}
                  placeholder={editingMessage ? 'Editar mensagem...' : `Mensagem em #${topicoAtivo.titulo}...`}
                  className="chat-input-textarea"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    resize: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    color: 'var(--brown)',
                    minHeight: '24px',
                    maxHeight: '120px',
                    lineHeight: 1.5
                  }}
                  rows={1}
                />
                
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      color: 'var(--brown-light)',
                      padding: '4px'
                    }}
                  >
                    <Smile size={18} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 0,
                      background: 'white',
                      border: '1px solid var(--stone)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-lg)',
                      marginBottom: '8px',
                      zIndex: 10,
                      width: '320px'
                    }}>
                      {/* Categorias */}
                      <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--stone)',
                        padding: '4px'
                      }}>
                        {Object.keys(EMOJI_CATEGORIES).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setEmojiCategory(cat)}
                            style={{
                              flex: 1,
                              padding: '6px 4px',
                              background: emojiCategory === cat ? 'var(--cream)' : 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              color: emojiCategory === cat ? 'var(--brown)' : 'var(--brown-light)',
                              fontWeight: emojiCategory === cat ? 600 : 400
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {/* Emojis */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: '2px',
                        padding: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {EMOJI_CATEGORIES[emojiCategory].map((emoji, idx) => (
                          <button
                            key={`${emoji}-${idx}`}
                            onClick={() => {
                              setNovaMensagem(prev => prev + emoji)
                              setShowEmojiPicker(false)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              fontSize: '20px',
                              borderRadius: '4px',
                              transition: 'background 0.15s'
                            }}
                            className="hover-bg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setNovaMensagem(prev => prev + '@')
                    setShowMentions(true)
                    inputRef.current?.focus()
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    padding: '4px'
                  }}
                >
                  <AtSign size={18} />
                </button>
                
                <button
                  onClick={editingMessage ? handleEditMessage : handleEnviarMensagem}
                  disabled={!novaMensagem.trim()}
                  style={{
                    background: novaMensagem.trim() ? (editingMessage ? '#f59e0b' : 'var(--brown)') : 'var(--stone)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: novaMensagem.trim() ? 'pointer' : 'not-allowed',
                    color: 'white'
                  }}
                >
                  {editingMessage ? <Check size={16} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Novo Canal */}
        {showNovoCanal && (
          <div className="modal-overlay" onClick={() => setShowNovoCanal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px' }}>
              <div style={{ padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2d3d 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Hash size={20} style={{ color: '#C9A882' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>Novo Canal</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--brown-light)' }}>{projetoAtivo?.codigo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNovoCanal(false)} 
                  style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                    Nome do Canal
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                    <input
                      type="text"
                      value={novoCanal.nome}
                      onChange={e => setNovoCanal({ ...novoCanal, nome: e.target.value })}
                      placeholder="arquitectura"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        border: '2px solid var(--stone)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--stone)'}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '10px', color: 'var(--brown)' }}>
                    Visibilidade
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setNovoCanal({ ...novoCanal, tipo: 'publico' })}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        border: `2px solid ${novoCanal.tipo === 'publico' ? 'var(--gold)' : 'var(--stone)'}`,
                        borderRadius: '10px',
                        background: novoCanal.tipo === 'publico' ? 'rgba(201, 168, 130, 0.08)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Hash size={22} style={{ margin: '0 auto 6px', display: 'block', color: novoCanal.tipo === 'publico' ? 'var(--gold)' : 'var(--brown-light)' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Público</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>Toda a equipa</div>
                    </button>
                    <button
                      onClick={() => setNovoCanal({ ...novoCanal, tipo: 'privado' })}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        border: `2px solid ${novoCanal.tipo === 'privado' ? 'var(--gold)' : 'var(--stone)'}`,
                        borderRadius: '10px',
                        background: novoCanal.tipo === 'privado' ? 'rgba(201, 168, 130, 0.08)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Lock size={22} style={{ margin: '0 auto 6px', display: 'block', color: novoCanal.tipo === 'privado' ? 'var(--gold)' : 'var(--brown-light)' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Privado</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>Só convidados</div>
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowNovoCanal(false)} 
                  style={{
                    padding: '10px 20px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--brown)'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCriarCanal} 
                  disabled={!novoCanal.nome.trim()}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: novoCanal.nome.trim() ? 'var(--brown)' : 'var(--stone)',
                    cursor: novoCanal.nome.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'white'
                  }}
                >
                  Criar Canal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Tópico */}
        {showNovoTopico && (
          <div className="modal-overlay" onClick={() => setShowNovoTopico(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px' }}>
              <div style={{ padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(135deg, var(--gold) 0%, #d4b896 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MessageSquare size={20} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>Novo Tópico</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--brown-light)' }}>#{canalAtivo?.nome}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNovoTopico(false)} 
                  style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={novoTopico.titulo}
                    onChange={e => setNovoTopico({ ...novoTopico, titulo: e.target.value })}
                    placeholder="Ex: Revisão planta piso 1"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid var(--stone)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s',
                      outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone)'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                    Descrição <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span>
                  </label>
                  <textarea
                    value={novoTopico.descricao}
                    onChange={e => setNovoTopico({ ...novoTopico, descricao: e.target.value })}
                    placeholder="Adiciona contexto para a equipa..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid var(--stone)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      resize: 'none',
                      transition: 'border-color 0.2s',
                      outline: 'none',
                      minHeight: '80px'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone)'}
                    rows={3}
                  />
                </div>
              </div>
              
              <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowNovoTopico(false)} 
                  style={{
                    padding: '10px 20px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--brown)'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCriarTopico} 
                  disabled={!novoTopico.titulo.trim()}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: novoTopico.titulo.trim() ? 'var(--brown)' : 'var(--stone)',
                    cursor: novoTopico.titulo.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'white'
                  }}
                >
                  Criar Tópico
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Canal */}
        {editingCanal && (
          <div className="modal-overlay" onClick={() => setEditingCanal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px' }}>
              <div style={{ padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1e1e2d 0%, #2d2d3d 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Edit size={20} style={{ color: '#C9A882' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>Editar Canal</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--brown-light)' }}>{projetoAtivo?.codigo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCanal(null)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--brown-light)',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                    Nome do Canal
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                    <input
                      type="text"
                      value={editingCanal.nome}
                      onChange={e => setEditingCanal({ ...editingCanal, nome: e.target.value })}
                      placeholder="nome-do-canal"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        border: '2px solid var(--stone)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--stone)'}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                    Ícone
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {CANAL_ICONS.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setEditingCanal({ ...editingCanal, icone: id })}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: `2px solid ${editingCanal.icone === id ? 'var(--gold)' : 'var(--stone)'}`,
                          borderRadius: '8px',
                          background: editingCanal.icone === id ? 'rgba(201, 168, 130, 0.08)' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Icon size={18} style={{ color: editingCanal.icone === id ? 'var(--gold)' : 'var(--brown-light)' }} />
                        <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '10px', color: 'var(--brown)' }}>
                    Visibilidade
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setEditingCanal({ ...editingCanal, tipo: 'publico' })}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        border: `2px solid ${editingCanal.tipo === 'publico' ? 'var(--gold)' : 'var(--stone)'}`,
                        borderRadius: '10px',
                        background: editingCanal.tipo === 'publico' ? 'rgba(201, 168, 130, 0.08)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Hash size={22} style={{ margin: '0 auto 6px', display: 'block', color: editingCanal.tipo === 'publico' ? 'var(--gold)' : 'var(--brown-light)' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Público</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>Toda a equipa</div>
                    </button>
                    <button
                      onClick={() => setEditingCanal({ ...editingCanal, tipo: 'privado' })}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        border: `2px solid ${editingCanal.tipo === 'privado' ? 'var(--gold)' : 'var(--stone)'}`,
                        borderRadius: '10px',
                        background: editingCanal.tipo === 'privado' ? 'rgba(201, 168, 130, 0.08)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Lock size={22} style={{ margin: '0 auto 6px', display: 'block', color: editingCanal.tipo === 'privado' ? 'var(--gold)' : 'var(--brown-light)' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Privado</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>Só convidados</div>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingCanal(null)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--brown)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditarCanal}
                  disabled={!editingCanal.nome?.trim()}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: editingCanal.nome?.trim() ? 'var(--brown)' : 'var(--stone)',
                    cursor: editingCanal.nome?.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'white'
                  }}
                >
                  Guardar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Eliminar Canal */}
        {showDeleteCanalConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteCanalConfirm(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', borderRadius: '16px' }}>
              <div style={{ padding: '24px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Trash2 size={24} style={{ color: '#ef4444' }} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--brown)', textAlign: 'center' }}>
                  Eliminar Canal?
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--brown-light)', textAlign: 'center' }}>
                  Tens a certeza que queres eliminar o canal <strong>#{showDeleteCanalConfirm.nome}</strong>?
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: 'var(--brown-light)', textAlign: 'center', opacity: 0.7 }}>
                  Esta ação irá arquivar o canal e todas as mensagens. O canal pode ser recuperado mais tarde.
                </p>
              </div>

              <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowDeleteCanalConfirm(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--brown)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleArquivarCanal(showDeleteCanalConfirm)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'white'
                  }}
                >
                  Eliminar Canal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pesquisa */}
        {showSearch && (
          <div className="modal-overlay" onClick={() => setShowSearch(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', borderRadius: '16px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Search size={20} style={{ color: 'var(--brown-light)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    placeholder="Pesquisar mensagens..."
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '16px',
                      background: 'transparent'
                    }}
                  />
                  <button
                    onClick={() => setShowSearch(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '12px 0', maxHeight: '60vh', overflowY: 'auto' }}>
                {searching ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                    A pesquisar...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                    {searchQuery ? 'Sem resultados' : 'Escreve para pesquisar'}
                  </div>
                ) : (
                  searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => goToSearchResult(result)}
                      style={{
                        width: '100%',
                        display: 'block',
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      className="hover-bg"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                          {result.autor?.nome}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                          em #{result.topico?.canal?.nome} › {result.topico?.titulo}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--brown)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {result.conteudo}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>
                        {formatDate(result.created_at)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          .message-hover:hover {
            background: var(--cream);
          }
          .message-hover:hover .message-actions {
            display: flex !important;
            opacity: 1 !important;
          }
          .hover-bg:hover {
            background: var(--cream);
          }
          .canal-item:hover {
            background: rgba(255,255,255,0.05);
          }
          .canal-item:hover .canal-actions {
            opacity: 1 !important;
          }
          @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
          }
        `}</style>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
