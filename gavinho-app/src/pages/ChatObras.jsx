import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Search, Send, Image, X, HardHat, MessageSquare, Loader2, AlertCircle,
  Pin, MoreVertical, CheckSquare, ExternalLink, Reply, ThumbsUp,
  ChevronDown, ChevronRight, MessageCircle
} from 'lucide-react'

// Emojis para reações
const REACTION_EMOJIS = ['ðŸ‘', 'â¤ï¸', 'ðŸ˜„', 'ðŸŽ‰', 'ðŸ‘€', 'âœ…']

export default function ChatObras() {
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFotos, setSelectedFotos] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  
  // Estados para threads e reações
  const [expandedThreads, setExpandedThreads] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  
  // Estados para menu de mensagem
  const [showMsgMenu, setShowMsgMenu] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  // Carregar obras
  useEffect(() => {
    loadObras()
  }, [])

  // Carregar mensagens quando seleciona obra
  useEffect(() => {
    if (selectedObra) {
      loadMensagens()
      const unsubscribe = subscribeToMessages()
      return unsubscribe
    }
  }, [selectedObra])

  const loadObras = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .in('status', ['em_curso', 'em_projeto'])
        .order('codigo', { ascending: false })
      
      if (error) throw error
      setObras(data || [])
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
      setError('Erro ao carregar obras')
    } finally {
      setLoading(false)
    }
  }

  const loadMensagens = async () => {
    if (!selectedObra) return
    
    try {
      setLoadingMensagens(true)
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*, respostas:chat_mensagens!parent_id(id, conteudo, autor_nome, created_at)')
        .eq('obra_id', selectedObra.id)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMensagens(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoadingMensagens(false)
    }
  }

  const subscribeToMessages = () => {
    if (!selectedObra) return () => {}
    
    const channel = supabase
      .channel(`obra_chat_${selectedObra.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `obra_id=eq.${selectedObra.id}`
      }, () => {
        loadMensagens()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFotos.length === 0) return
    if (!selectedObra) return
    
    setSending(true)
    try {
      // Upload fotos se existirem
      let anexos = []
      if (selectedFotos.length > 0) {
        for (const foto of selectedFotos) {
          const timestamp = Date.now()
          const random = Math.random().toString(36).substring(7)
          const ext = foto.name.split('.').pop()
          const filePath = `chat/obras/${selectedObra.id}/${timestamp}_${random}.${ext}`
          
          const { error: uploadError } = await supabase.storage
            .from('obra-fotos')
            .upload(filePath, foto)
          
          if (uploadError) {
            console.error('Erro upload foto:', uploadError)
            continue
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('obra-fotos')
            .getPublicUrl(filePath)
          
          anexos.push({
            url: publicUrl,
            nome: foto.name,
            tipo: foto.type,
            tamanho: foto.size
          })
        }
      }
      
      const { error } = await supabase
        .from('chat_mensagens')
        .insert({
          obra_id: selectedObra.id,
          conteudo: newMessage.trim(),
          autor_nome: 'Inês Gavinho',
          tipo: anexos.length > 0 ? 'imagem' : 'texto',
          anexos: anexos.length > 0 ? anexos : null
        })
      
      if (error) throw error
      
      setNewMessage('')
      setSelectedFotos([])
    } catch (err) {
      console.error('Erro ao enviar:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
    if (selectedObra) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (!selectedObra) {
      alert('Seleciona uma obra primeiro')
      return
    }
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    
    // Adicionar ficheiros ao estado para preview e envio
    setSelectedFotos(prev => [...prev, ...files])
  }

  // Adicionar reação
  const handleAddReaction = async (msgId, emoji) => {
    try {
      const msg = mensagens.find(m => m.id === msgId)
      if (!msg) return
      
      const reacoes = { ...(msg.reacoes || {}) }
      const userReacted = reacoes[emoji]?.includes('Inês Gavinho')
      
      if (userReacted) {
        reacoes[emoji] = reacoes[emoji].filter(u => u !== 'Inês Gavinho')
        if (reacoes[emoji].length === 0) delete reacoes[emoji]
      } else {
        if (!reacoes[emoji]) reacoes[emoji] = []
        reacoes[emoji].push('Inês Gavinho')
      }
      
      await supabase
        .from('chat_mensagens')
        .update({ reacoes })
        .eq('id', msgId)
      
      setMensagens(prev => prev.map(m => 
        m.id === msgId ? { ...m, reacoes } : m
      ))
    } catch (err) {
      console.error('Erro ao adicionar reação:', err)
    }
  }

  // Toggle thread
  const toggleThread = (msgId) => {
    setExpandedThreads(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }))
  }

  // Enviar resposta em thread
  const handleSendReply = async (parentMsgId) => {
    if (!replyText.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .insert({
          obra_id: selectedObra.id,
          parent_id: parentMsgId,
          conteudo: replyText.trim(),
          autor_nome: 'Inês Gavinho',
          tipo: 'texto'
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Atualizar lista
      loadMensagens()
      
      setReplyText('')
      setReplyingTo(null)
    } catch (err) {
      console.error('Erro ao enviar resposta:', err)
    }
  }

  // Fixar mensagem
  const handlePinMessage = async (msg) => {
    try {
      await supabase
        .from('chat_mensagens')
        .update({ fixada: !msg.fixada })
        .eq('id', msg.id)
      
      setMensagens(prev => prev.map(m => 
        m.id === msg.id ? { ...m, fixada: !m.fixada } : m
      ))
    } catch (err) {
      console.error('Erro ao fixar:', err)
    }
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return 'Agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  // Render message
  const renderMessage = (msg, index, showAvatar, isReply = false) => {
    const hasReplies = (msg.respostas?.length || 0) > 0
    const isExpanded = expandedThreads[msg.id]
    
    return (
      <div key={msg.id} className={`chat-message ${showAvatar ? '' : 'grouped'} ${isReply ? 'chat-message-reply' : ''}`}>
        {showAvatar && (
          <div className="chat-message-avatar">
            {msg.autor_nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div className="chat-message-content">
          {showAvatar && (
            <div className="chat-message-header">
              <span className="chat-message-author">{msg.autor_nome}</span>
              <span className="chat-message-time">{formatDate(msg.created_at)}</span>
              {msg.fixada && <Pin style={{ width: 12, height: 12, color: 'var(--warning)' }} />}
            </div>
          )}
          <p className="chat-message-text">{msg.conteudo}</p>
          
          {/* Fotos/Anexos */}
          {msg.anexos && msg.anexos.length > 0 && (
            <div className="chat-message-fotos">
              {msg.anexos.map((anexo, i) => (
                <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer" className="chat-message-foto">
                  <img src={anexo.url} alt={anexo.nome || 'Foto'} />
                </a>
              ))}
            </div>
          )}
          
          {/* Reações existentes */}
          {msg.reacoes && Object.keys(msg.reacoes).length > 0 && (
            <div className="chat-reactions">
              {Object.entries(msg.reacoes).map(([emoji, users]) => (
                <button 
                  key={emoji}
                  className={`chat-reaction-btn ${users.includes('Inês Gavinho') ? 'active' : ''}`}
                  onClick={() => handleAddReaction(msg.id, emoji)}
                  title={users.join(', ')}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Barra de ações */}
          {!isReply && (
            <div className="chat-message-toolbar">
              <div className="chat-reaction-picker">
                {REACTION_EMOJIS.slice(0, 4).map(emoji => (
                  <button 
                    key={emoji}
                    className="chat-reaction-quick"
                    onClick={() => handleAddReaction(msg.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button 
                className="chat-reply-btn"
                onClick={() => {
                  setReplyingTo(msg.id)
                  if (!isExpanded && hasReplies) {
                    toggleThread(msg.id)
                  }
                }}
              >
                <Reply style={{ width: 14, height: 14 }} />
                Responder
              </button>
            </div>
          )}
          
          {/* Thread de respostas */}
          {!isReply && hasReplies && (
            <div className="chat-thread">
              <button 
                className="chat-thread-toggle"
                onClick={() => toggleThread(msg.id)}
              >
                <MessageCircle style={{ width: 14, height: 14 }} />
                <span>{msg.respostas.length} {msg.respostas.length === 1 ? 'resposta' : 'respostas'}</span>
                {isExpanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
              </button>
              
              {isExpanded && (
                <div className="chat-thread-replies">
                  {msg.respostas.map((reply, i) => renderMessage(reply, i, true, true))}
                </div>
              )}
            </div>
          )}
          
          {/* Input de resposta inline */}
          {replyingTo === msg.id && (
            <div className="chat-reply-input">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply(msg.id)
                  }
                }}
                placeholder="Escreve uma resposta..."
                autoFocus
              />
              <button onClick={() => handleSendReply(msg.id)} disabled={!replyText.trim()}>
                <Send style={{ width: 16, height: 16 }} />
              </button>
              <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="chat-reply-cancel">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
          
          {/* Menu de ações */}
          <div className="chat-message-actions">
            <button 
              className="chat-msg-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowMsgMenu(showMsgMenu === msg.id ? null : msg.id)
              }}
            >
              <MoreVertical style={{ width: 16, height: 16 }} />
            </button>
            
            {showMsgMenu === msg.id && (
              <div className="chat-msg-menu">
                <button onClick={() => { handlePinMessage(msg); setShowMsgMenu(null) }}>
                  <Pin style={{ width: 14, height: 14 }} />
                  {msg.fixada ? 'Desafixar' : 'Fixar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <Loader2 className="chat-spinner" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: 'var(--error)' }} />
        <p>{error}</p>
      </div>
    )
  }

  const filteredObras = obras.filter(obra => 
    !searchTerm || 
    obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="chat-fullwidth" style={{ 
      display: 'grid', 
      gridTemplateColumns: '280px 1fr', 
      height: '100vh',
      background: 'var(--white)',
      overflow: 'hidden'
    }}>
      {/* Sidebar - Lista de Obras */}
      <div style={{ 
        background: '#1e1e2d', 
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        <div style={{ 
          padding: '14px 16px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Search style={{ width: 14, height: 14, opacity: 0.5 }} />
          <input
            type="text"
            placeholder="Pesquisar obras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {filteredObras.map(obra => (
            <button
              key={obra.id}
              onClick={() => setSelectedObra(obra)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: selectedObra?.id === obra.id ? 'rgba(201, 168, 130, 0.15)' : 'transparent',
                border: 'none',
                color: selectedObra?.id === obra.id ? '#C9A882' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: selectedObra?.id === obra.id ? 'rgba(201, 168, 130, 0.2)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <HardHat style={{ width: 16, height: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obra.codigo}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obra.nome}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Centro - Mensagens */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--white)',
          position: 'relative'
        }}
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
        
        {selectedObra ? (
          <>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #d4a84b, #c4962c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HardHat style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--brown)' }}>{selectedObra.nome}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--brown-light)' }}>{selectedObra.codigo}</p>
              </div>
            </div>
            
            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {loadingMensagens ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Loader2 className="chat-spinner" />
                </div>
              ) : mensagens.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--brown-light)' }}>
                  <MessageSquare style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>Sem mensagens</p>
                  <span style={{ fontSize: 12, marginTop: 4 }}>Sê o primeiro a escrever nesta obra</span>
                </div>
              ) : (
                <div className="chat-messages-list">
                  {mensagens.map((msg, index) => {
                    const showAvatar = index === 0 || mensagens[index - 1]?.autor_nome !== msg.autor_nome ||
                      new Date(msg.created_at) - new Date(mensagens[index - 1]?.created_at) > 300000
                    return renderMessage(msg, index, showAvatar)
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
                
                <div className="chat-input-area">
                  {/* Preview de fotos */}
                  {selectedFotos.length > 0 && (
                    <div className="chat-fotos-preview">
                      {selectedFotos.map((foto, i) => (
                        <div key={i} className="chat-foto-preview-item">
                          <img src={URL.createObjectURL(foto)} alt={foto.name} />
                          <button 
                            className="chat-foto-remove"
                            onClick={() => setSelectedFotos(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="chat-input-wrapper">
                    <button className="chat-input-btn" onClick={() => fileInputRef.current?.click()}>
                      <Image style={{ width: 20, height: 20 }} />
                    </button>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      hidden 
                      onChange={(e) => setSelectedFotos(prev => [...prev, ...Array.from(e.target.files)])} 
                    />
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escreve uma mensagem..."
                      rows={1}
                      className="chat-input"
                    />
                    <button
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      disabled={sending || (!newMessage.trim() && selectedFotos.length === 0)}
                    >
                      {sending ? <Loader2 className="chat-spinner-sm" /> : <Send style={{ width: 18, height: 18 }} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: 'var(--brown-light)'
              }}>
                <HardHat style={{ width: 64, height: 64, opacity: 0.2, marginBottom: 16 }} />
                <p style={{ margin: 0 }}>Seleciona uma obra para ver o chat</p>
              </div>
            )}
          </div>
    </div>
  )
}
