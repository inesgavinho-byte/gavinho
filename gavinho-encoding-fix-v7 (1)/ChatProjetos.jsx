import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Hash, Lock, Plus, Send, Paperclip, Smile, AtSign, Search,
  MoreVertical, Edit, Trash2, Reply, Pin, X, ChevronDown, ChevronRight,
  MessageSquare, Users, Settings, Bell, BellOff, Image,
  File, Download, Check, CheckCheck, Megaphone, FolderOpen, UserPlus, UserMinus
} from 'lucide-react'

const REACTION_EMOJIS = ['ðŸ‘', 'â¤ï¸', 'ðŸ˜„', 'ðŸŽ‰', 'ðŸ˜®', 'ðŸ˜¢', 'ðŸ”¥', 'ðŸ‘€']

const CANAL_ICONS = [
  { id: 'hash', icon: Hash, label: 'Geral' },
  { id: 'megaphone', icon: Megaphone, label: 'Anúncios' },
  { id: 'lock', icon: Lock, label: 'Privado' },
  { id: 'users', icon: Users, label: 'Equipa' }
]

// Funções disponíveis para atribuir
const FUNCOES_DISPONIVEIS = [
  'Project Manager',
  'Arquiteto',
  'Designer de Interiores',
  'Engenheiro',
  'Diretor de Obra',
  'Procurement',
  'Administração',
  'Consultor'
]

export default function ChatProjetos() {
  const { profile } = useAuth()
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
  
  // Estados para gestão de membros
  const [todosUtilizadores, setTodosUtilizadores] = useState([])
  const [showAddMembro, setShowAddMembro] = useState(false)
  const [selectedFuncao, setSelectedFuncao] = useState('Membro')
  const [searchUtilizador, setSearchUtilizador] = useState('')
  
  const [novaMensagem, setNovaMensagem] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const [showNovoCanal, setShowNovoCanal] = useState(false)
  const [showNovoTopico, setShowNovoTopico] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMembros, setShowMembros] = useState(false)
  const [searchMensagens, setSearchMensagens] = useState('')
  const [showSearchMensagens, setShowSearchMensagens] = useState(false)
  
  const [novoCanal, setNovoCanal] = useState({ nome: '', descricao: '', tipo: 'publico', icone: 'hash' })
  const [novoTopico, setNovoTopico] = useState({ titulo: '', descricao: '' })
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadProjetos()
    loadTodosUtilizadores()
  }, [])

  useEffect(() => {
    if (projetoAtivo) {
      loadCanais(projetoAtivo.id)
      loadMembrosEquipa(projetoAtivo.id)
    }
  }, [projetoAtivo])

  useEffect(() => {
    if (canalAtivo) {
      loadTopicos(canalAtivo.id)
    }
  }, [canalAtivo])

  useEffect(() => {
    if (topicoAtivo) {
      loadMensagens(topicoAtivo.id)
      const unsubscribe = subscribeToMessages(topicoAtivo.id)
      return unsubscribe
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
        .select('id, codigo, nome')
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
      
      if (data && data.length > 0) {
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
          parent:parent_id(id, conteudo, autor:autor_id(nome))
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
        .select('id, funcao, utilizador:utilizador_id(id, nome, avatar_url, cargo)')
        .eq('projeto_id', projetoId)
      
      if (equipaData) {
        setMembrosEquipa(equipaData.map(e => ({
          ...e.utilizador,
          equipaId: e.id,
          funcao: e.funcao
        })).filter(Boolean))
      }
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    }
  }

  // Carregar todos os utilizadores disponíveis
  const loadTodosUtilizadores = async () => {
    try {
      const { data } = await supabase
        .from('utilizadores')
        .select('id, nome, avatar_url, cargo, departamento')
        .eq('ativo', true)
        .order('nome')
      
      setTodosUtilizadores(data || [])
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err)
    }
  }

  // Adicionar membro ao projeto
  const handleAddMembro = async (utilizadorId) => {
    if (!projetoAtivo?.id || !utilizadorId) return
    
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .insert({
          projeto_id: projetoAtivo.id,
          utilizador_id: utilizadorId,
          funcao: selectedFuncao
        })
      
      if (error) throw error
      
      // Recarregar equipa
      await loadMembrosEquipa(projetoAtivo.id)
      setShowAddMembro(false)
      setSearchUtilizador('')
      setSelectedFuncao('Membro')
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      alert('Erro ao adicionar membro: ' + err.message)
    }
  }

  // Remover membro do projeto
  const handleRemoveMembro = async (equipaId) => {
    if (!confirm('Remover este membro da equipa do projeto?')) return
    
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .delete()
        .eq('id', equipaId)
      
      if (error) throw error
      
      // Recarregar equipa
      await loadMembrosEquipa(projetoAtivo.id)
    } catch (err) {
      console.error('Erro ao remover membro:', err)
    }
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
      
      setCanais([...canais, data])
      setCanalAtivo(data)
      setShowNovoCanal(false)
      setNovoCanal({ nome: '', descricao: '', tipo: 'publico', icone: 'hash' })
    } catch (err) {
      alert('Erro ao criar canal: ' + err.message)
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
      alert('Erro ao criar tópico: ' + err.message)
    }
  }

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() || !topicoAtivo) return
    
    try {
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
      const mencoes = []
      let match
      while ((match = mentionRegex.exec(novaMensagem)) !== null) {
        mencoes.push(match[2])
      }
      
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
      
      if (mencoes.length > 0) {
        await supabase.from('chat_mencoes').insert(
          mencoes.map(userId => ({
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
    } catch (err) {
      alert('Erro ao enviar mensagem: ' + err.message)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !topicoAtivo || !projetoAtivo) return
    await uploadFile(file)
  }

  // Upload de ficheiro (usado por input e drag&drop)
  const uploadFile = async (file) => {
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
      alert('Erro ao enviar ficheiro: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (topicoAtivo) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Só desativa se sair completamente da área
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (!topicoAtivo || !projetoAtivo) {
      alert('Seleciona um tópico primeiro')
      return
    }
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    
    // Upload de cada ficheiro
    for (const file of files) {
      await uploadFile(file)
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
    if (!confirm('Eliminar esta mensagem?')) return
    
    try {
      await supabase
        .from('chat_mensagens')
        .update({ eliminado: true, eliminado_at: new Date().toISOString() })
        .eq('id', mensagem.id)
      
      loadMensagens(topicoAtivo.id)
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message)
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
      return `Hoje À s ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem À s ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="chat-fullwidth" style={{ 
      display: 'grid', 
      gridTemplateColumns: (showMembros || showSearchMensagens) ? '280px 1fr 300px' : '280px 1fr', 
      height: '100vh',
      background: 'var(--white)',
      overflow: 'hidden'
    }}>
        {/* Sidebar - Projetos, Canais e Tópicos */}
        <div style={{ 
          background: '#1e1e2d', 
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Search bar */}
          <div style={{ 
            padding: '12px 14px', 
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <Search size={14} style={{ opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Pesquisar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {projetos
              .filter(p => !searchQuery || 
                p.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.nome?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(projeto => {
              const isExpanded = projetosExpanded[projeto.id]
              const isActive = projetoAtivo?.id === projeto.id
              const projetoCanais = isActive ? canais : []
              
              return (
                <div key={projeto.id}>
                  {/* Projeto header */}
                  <button
                    onClick={() => {
                      if (isActive) {
                        // Se já é o projeto ativo, apenas alternar expansão
                        toggleProjetoExpanded(projeto.id)
                      } else {
                        // Se é outro projeto, selecionar (já expande automaticamente)
                        selectProjeto(projeto)
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: isActive ? 'rgba(201, 168, 130, 0.15)' : 'transparent',
                      border: 'none',
                      color: isActive ? '#C9A882' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      fontWeight: isActive ? 600 : 400
                    }}
                  >
                    <span style={{ 
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      opacity: 0.5
                    }}>
                      <ChevronRight size={12} />
                    </span>
                    <FolderOpen size={14} style={{ opacity: 0.7 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {projeto.codigo}
                    </span>
                  </button>
                  
                  {/* Canais e Tópicos do projeto */}
                  {isExpanded && isActive && (
                    <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                      {projetoCanais.map(canal => {
                        const IconComponent = CANAL_ICONS.find(i => i.id === canal.icone)?.icon || Hash
                        const isCanalAtivo = canalAtivo?.id === canal.id
                        const canalTopicos = isCanalAtivo ? topicos : []
                        
                        return (
                          <div key={canal.id}>
                            {/* Canal */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCanalAtivo(canal)
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px 6px 32px',
                                background: 'transparent',
                                border: 'none',
                                color: isCanalAtivo ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                textAlign: 'left',
                                fontWeight: isCanalAtivo ? 500 : 400
                              }}
                            >
                              <IconComponent size={12} />
                              <span>{canal.nome}</span>
                              {canal.tipo === 'privado' && <Lock size={10} style={{ opacity: 0.4 }} />}
                            </button>
                            
                            {/* Tópicos do canal */}
                            {isCanalAtivo && canalTopicos.length > 0 && (
                              <div>
                                {canalTopicos.map(topico => (
                                  <button
                                    key={topico.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setTopicoAtivo(topico)
                                    }}
                                    style={{
                                      width: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '5px 14px 5px 48px',
                                      background: topicoAtivo?.id === topico.id ? 'rgba(201, 168, 130, 0.2)' : 'transparent',
                                      border: 'none',
                                      borderLeft: topicoAtivo?.id === topico.id ? '2px solid #C9A882' : '2px solid transparent',
                                      color: topicoAtivo?.id === topico.id ? 'white' : 'rgba(255,255,255,0.4)',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      textAlign: 'left',
                                      position: 'relative',
                                      zIndex: 1
                                    }}
                                  >
                                    {topico.fixado && <Pin size={9} style={{ color: '#C9A882' }} />}
                                    <span style={{ 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis', 
                                      whiteSpace: 'nowrap',
                                      flex: 1
                                    }}>
                                      {topico.titulo}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Novo Tópico */}
                            {isCanalAtivo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowNovoTopico(true)
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 14px 4px 48px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'rgba(255,255,255,0.25)',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  textAlign: 'left'
                                }}
                              >
                                <Plus size={10} />
                                <span>Novo tópico</span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Novo Canal */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowNovoCanal(true)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px 6px 32px',
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255,255,255,0.25)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          textAlign: 'left'
                        }}
                      >
                        <Plus size={11} />
                        <span>Novo canal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            
            {projetos.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                Sem projetos
              </div>
            )}
          </div>
        </div>

        {/* Àrea de mensagens */}
        <div 
          style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden', position: 'relative' }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Overlay de drag and drop */}
          {isDragging && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(201, 168, 130, 0.15)',
              border: '3px dashed var(--blush)',
              borderRadius: '12px',
              margin: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--blush)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Image size={32} style={{ color: 'white' }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Larga aqui para enviar
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>
                Imagens e ficheiros
              </div>
            </div>
          )}
          
          {/* Header do chat */}
          {topicoAtivo && (
            <div style={{ 
              padding: '14px 24px', 
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--cream)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Hash size={16} style={{ color: 'var(--brown-light)' }} />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--brown)' }}>
                    {canalAtivo?.nome}
                  </span>
                  <span style={{ color: 'var(--brown-light)', fontSize: '14px' }}>"º</span>
                  <span style={{ fontSize: '14px', color: 'var(--brown)' }}>
                    {topicoAtivo.titulo}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
                  {projetoAtivo?.codigo}  –  {projetoAtivo?.nome}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowMembros(!showMembros)}
                  style={{ 
                    background: showMembros ? 'var(--blush-light)' : 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: showMembros ? 'var(--brown)' : 'var(--brown-light)',
                    padding: '6px',
                    borderRadius: '6px'
                  }}
                  className="hover-bg"
                  title="Ver membros da equipa"
                >
                  <Users size={18} />
                </button>
                <button 
                  onClick={() => setShowSearchMensagens(!showSearchMensagens)}
                  style={{ 
                    background: showSearchMensagens ? 'var(--blush-light)' : 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: showSearchMensagens ? 'var(--brown)' : 'var(--brown-light)',
                    padding: '6px',
                    borderRadius: '6px'
                  }}
                  className="hover-bg"
                  title="Pesquisar mensagens"
                >
                  <Search size={18} />
                </button>
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
              mensagens.map((msg, idx) => {
                const isOwn = msg.autor_id === profile?.id
                const showAuthor = idx === 0 || mensagens[idx - 1]?.autor_id !== msg.autor_id
                const reactions = groupReactions(msg.reacoes)
                
                return (
                  <div key={msg.id} style={{ marginTop: showAuthor ? '12px' : '2px' }}>
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
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background 0.15s'
                    }}
                    className="message-hover"
                    >
                      {showAuthor ? (
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: msg.autor?.avatar_url ? `url(${msg.autor.avatar_url})` : 'var(--gold)',
                          backgroundSize: 'cover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {!msg.autor?.avatar_url && msg.autor?.nome?.charAt(0)}
                        </div>
                      ) : (
                        <div style={{ width: '36px' }} />
                      )}
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {showAuthor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                              {msg.autor?.nome || 'Utilizador'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        
                        {msg.tipo === 'imagem' ? (
                          <a href={msg.ficheiro_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.ficheiro_url} 
                              alt={msg.ficheiro_nome}
                              style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', marginTop: '4px' }}
                            />
                          </a>
                        ) : msg.tipo === 'ficheiro' ? (
                          <a 
                            href={msg.ficheiro_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 14px',
                              background: 'var(--cream)',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: 'var(--brown)',
                              marginTop: '4px'
                            }}
                          >
                            <File size={20} />
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '13px' }}>{msg.ficheiro_nome}</div>
                              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                {(msg.ficheiro_tamanho / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <Download size={16} style={{ marginLeft: '8px' }} />
                          </a>
                        ) : (
                          <div style={{ 
                            fontSize: '14px', 
                            color: 'var(--brown)',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {msg.conteudo}
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
                      </div>
                      
                      <div className="message-actions" style={{ 
                        display: 'none',
                        gap: '2px',
                        opacity: 0,
                        transition: 'opacity 0.15s'
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
                              fontSize: '14px'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyTo(msg)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}
                        >
                          <Reply size={14} />
                        </button>
                        {isOwn && (
                          <button
                            onClick={() => handleEliminarMensagem(msg)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {topicoAtivo && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--stone)', position: 'relative' }}>
              {replyTo && (
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
                  {filteredMembros.map(user => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      className="hover-bg"
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: user.avatar_url ? `url(${user.avatar_url})` : 'var(--gold)',
                        backgroundSize: 'cover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {!user.avatar_url && user.nome?.charAt(0)}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--brown)' }}>{user.nome}</span>
                    </button>
                  ))}
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
                
                <textarea
                  ref={inputRef}
                  value={novaMensagem}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleEnviarMensagem()
                    }
                  }}
                  placeholder={`Mensagem em #${topicoAtivo.titulo}...`}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    resize: 'none',
                    outline: 'none',
                    fontSize: '14px',
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
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: 'var(--shadow-lg)',
                      display: 'flex',
                      gap: '4px',
                      marginBottom: '8px',
                      zIndex: 10
                    }}>
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNovaMensagem(prev => prev + emoji)
                            setShowEmojiPicker(false)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            fontSize: '18px'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
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
                  onClick={handleEnviarMensagem}
                  disabled={!novaMensagem.trim()}
                  style={{
                    background: novaMensagem.trim() ? 'var(--brown)' : 'var(--stone)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: novaMensagem.trim() ? 'pointer' : 'not-allowed',
                    color: 'white'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral - Membros */}
        {showMembros && (
          <div style={{
            background: 'var(--cream)',
            borderLeft: '1px solid var(--stone)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                Equipa do Projeto
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowAddMembro(!showAddMembro)}
                  style={{ 
                    background: showAddMembro ? 'var(--brown)' : 'var(--white)', 
                    border: '1px solid var(--stone)', 
                    cursor: 'pointer', 
                    color: showAddMembro ? 'white' : 'var(--brown)', 
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                  title="Adicionar membro"
                >
                  <UserPlus size={14} />
                </button>
                <button
                  onClick={() => setShowMembros(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Formulário Adicionar Membro */}
            {showAddMembro && projetoAtivo && (
              <div style={{ 
                padding: '16px', 
                background: 'var(--white)', 
                borderBottom: '1px solid var(--stone)'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--brown-light)', display: 'block', marginBottom: '6px' }}>
                    PESQUISAR UTILIZADOR
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--cream)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    border: '1px solid var(--stone)'
                  }}>
                    <Search size={14} style={{ color: 'var(--brown-light)' }} />
                    <input
                      type="text"
                      placeholder="Nome do utilizador..."
                      value={searchUtilizador}
                      onChange={(e) => setSearchUtilizador(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        color: 'var(--brown)'
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--brown-light)', display: 'block', marginBottom: '6px' }}>
                    FUNÀ‡ÀƒO
                  </label>
                  <select
                    value={selectedFuncao}
                    onChange={(e) => setSelectedFuncao(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--stone)',
                      background: 'var(--cream)',
                      fontSize: '13px',
                      color: 'var(--brown)'
                    }}
                  >
                    <option value="Membro">Membro</option>
                    {FUNCOES_DISPONIVEIS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                
                {/* Lista de utilizadores disponíveis */}
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {todosUtilizadores
                    .filter(u => !membrosEquipa.some(m => m.id === u.id))
                    .filter(u => !searchUtilizador || u.nome?.toLowerCase().includes(searchUtilizador.toLowerCase()))
                    .map(u => (
                      <div 
                        key={u.id}
                        onClick={() => handleAddMembro(u.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          transition: 'background 0.15s'
                        }}
                        className="hover-bg"
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--blush), var(--brown-light))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {!u.avatar_url && u.nome?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>{u.nome}</div>
                          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{u.cargo || u.departamento || ''}</div>
                        </div>
                        <Plus size={16} style={{ color: 'var(--success)' }} />
                      </div>
                    ))
                  }
                  {todosUtilizadores
                    .filter(u => !membrosEquipa.some(m => m.id === u.id))
                    .filter(u => !searchUtilizador || u.nome?.toLowerCase().includes(searchUtilizador.toLowerCase()))
                    .length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--brown-light)', fontSize: '12px' }}>
                        {searchUtilizador ? 'Nenhum utilizador encontrado' : 'Todos os utilizadores já estão na equipa'}
                      </div>
                    )
                  }
                </div>
              </div>
            )}
            
            {/* Lista de membros atuais */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {!projetoAtivo ? (
                <div style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '20px', fontSize: '13px' }}>
                  Seleciona um projeto
                </div>
              ) : membrosEquipa.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '20px', fontSize: '13px' }}>
                  Sem membros atribuídos
                  <br />
                  <span style={{ fontSize: '12px' }}>Clica em + para adicionar</span>
                </div>
              ) : (
                membrosEquipa.map(membro => (
                  <div key={membro.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: 'var(--white)',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: membro.avatar_url ? `url(${membro.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--blush), var(--brown-light))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      {!membro.avatar_url && membro.nome?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--brown)' }}>{membro.nome}</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{membro.funcao || 'Equipa'}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveMembro(membro.equipaId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--brown-light)',
                        padding: '4px',
                        borderRadius: '4px',
                        opacity: 0.6,
                        transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                      title="Remover da equipa"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Painel Lateral - Pesquisa de Mensagens */}
        {showSearchMensagens && (
          <div style={{
            background: 'var(--cream)',
            borderLeft: '1px solid var(--stone)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                Pesquisar Mensagens
              </span>
              <button
                onClick={() => setShowSearchMensagens(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--white)',
                borderRadius: '8px',
                padding: '10px 12px',
                border: '1px solid var(--stone)'
              }}>
                <Search size={16} style={{ color: 'var(--brown-light)' }} />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchMensagens}
                  onChange={(e) => setSearchMensagens(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--brown)'
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {searchMensagens ? (
                mensagens
                  .filter(m => m.conteudo?.toLowerCase().includes(searchMensagens.toLowerCase()))
                  .map(msg => (
                    <div key={msg.id} style={{
                      padding: '12px',
                      background: 'var(--white)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                        {msg.autor_nome}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--brown)' }}>
                        {msg.conteudo?.length > 80 ? msg.conteudo.substring(0, 80) + '...' : msg.conteudo}
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '20px', fontSize: '13px' }}>
                  Escreve para pesquisar
                </div>
              )}
            </div>
          </div>
        )}

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
        `}</style>
      </div>
  )
}
