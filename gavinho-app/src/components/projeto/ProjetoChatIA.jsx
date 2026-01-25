// src/components/projeto/ProjetoChatIA.jsx

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Plus, Settings, Sparkles, Loader2, Archive, Pin, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import SkillsManager from './SkillsManager'

export default function ProjetoChatIA({ projetoId, projeto }) {
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(null)

  const messagesEndRef = useRef(null)

  // Carregar chats do projecto
  useEffect(() => {
    fetchChats()
  }, [projetoId])

  // Carregar mensagens quando chat muda
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id)
    }
  }, [activeChat?.id])

  // Scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchChats = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projeto_chats')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('fixado', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar chats:', error)
    }

    if (!error && data) {
      setChats(data)
      if (data.length > 0 && !activeChat) {
        setActiveChat(data[0])
      }
    }
    setLoading(false)
  }

  const fetchMessages = async (chatId) => {
    const { data, error } = await supabase
      .from('projeto_chat_mensagens')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (!error) {
      setMessages(data || [])
    }
  }

  const createChat = async () => {
    const titulo = prompt('Nome do novo chat:')
    if (!titulo) return

    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('projeto_chats')
      .insert({
        projeto_id: projetoId,
        titulo,
        categoria: 'geral',
        created_by: userData.user?.id
      })
      .select()
      .single()

    if (!error && data) {
      setChats(prev => [data, ...prev])
      setActiveChat(data)
      setMessages([])
    }
  }

  const deleteChat = async (chatId) => {
    if (!confirm('Tens a certeza que queres apagar este chat? Esta accao nao pode ser desfeita.')) {
      return
    }

    const { error } = await supabase
      .from('projeto_chats')
      .delete()
      .eq('id', chatId)

    if (!error) {
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (activeChat?.id === chatId) {
        setActiveChat(chats.find(c => c.id !== chatId) || null)
      }
    }
    setShowChatMenu(null)
  }

  const togglePinChat = async (chat) => {
    const { error } = await supabase
      .from('projeto_chats')
      .update({ fixado: !chat.fixado })
      .eq('id', chat.id)

    if (!error) {
      fetchChats()
    }
    setShowChatMenu(null)
  }

  const archiveChat = async (chat) => {
    const newEstado = chat.estado === 'arquivado' ? 'activo' : 'arquivado'
    const { error } = await supabase
      .from('projeto_chats')
      .update({ estado: newEstado })
      .eq('id', chat.id)

    if (!error) {
      fetchChats()
    }
    setShowChatMenu(null)
  }

  const sendMessage = async (conteudo) => {
    if (!activeChat || !conteudo.trim() || sending) return

    setSending(true)

    // Adicionar mensagem do utilizador optimisticamente
    const tempUserMsg = {
      id: 'temp-user',
      role: 'user',
      conteudo,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    // Adicionar placeholder da resposta
    const tempAssistantMsg = {
      id: 'temp-assistant',
      role: 'assistant',
      conteudo: 'A pensar...',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempAssistantMsg])

    try {
      const { data: userData } = await supabase.auth.getUser()

      const response = await supabase.functions.invoke('projeto-chat', {
        body: {
          chatId: activeChat.id,
          mensagem: conteudo,
          userId: userData.user?.id
        }
      })

      if (response.error) throw response.error

      // Recarregar mensagens para ter os dados correctos
      await fetchMessages(activeChat.id)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // Remover mensagens temporarias em caso de erro
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
      alert('Erro ao enviar mensagem. Tenta novamente.')
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>A carregar...</span>
      </div>
    )
  }

  const activeChats = chats.filter(c => c.estado !== 'arquivado')
  const archivedChats = chats.filter(c => c.estado === 'arquivado')

  return (
    <div style={styles.container}>
      {/* Sidebar com lista de chats */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>
            <MessageSquare size={18} />
            Chats IA
          </h3>
          <button onClick={createChat} style={styles.newChatButton} title="Novo chat">
            <Plus size={16} />
          </button>
        </div>

        <div style={styles.chatList}>
          {activeChats.map(chat => (
            <div key={chat.id} style={styles.chatItemWrapper}>
              <button
                onClick={() => setActiveChat(chat)}
                style={{
                  ...styles.chatItem,
                  ...(activeChat?.id === chat.id ? styles.chatItemActive : {})
                }}
              >
                <div style={styles.chatItemContent}>
                  {chat.fixado && <Pin size={12} style={{ color: '#8B8670' }} />}
                  <span style={styles.chatTitle}>{chat.titulo}</span>
                </div>
                {chat.total_mensagens > 0 && (
                  <span style={styles.chatCount}>{chat.total_mensagens}</span>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                }}
                style={styles.chatMenuButton}
              >
                <MoreVertical size={14} />
              </button>
              {showChatMenu === chat.id && (
                <div style={styles.chatMenu}>
                  <button onClick={() => togglePinChat(chat)} style={styles.chatMenuItem}>
                    <Pin size={14} />
                    {chat.fixado ? 'Desafixar' : 'Fixar'}
                  </button>
                  <button onClick={() => archiveChat(chat)} style={styles.chatMenuItem}>
                    <Archive size={14} />
                    Arquivar
                  </button>
                  <button onClick={() => deleteChat(chat.id)} style={{ ...styles.chatMenuItem, color: '#EF4444' }}>
                    <Trash2 size={14} />
                    Apagar
                  </button>
                </div>
              )}
            </div>
          ))}

          {activeChats.length === 0 && (
            <p style={styles.emptyState}>
              Nenhum chat ainda. Cria o primeiro!
            </p>
          )}

          {archivedChats.length > 0 && (
            <>
              <div style={styles.archivedDivider}>
                <Archive size={12} />
                Arquivados ({archivedChats.length})
              </div>
              {archivedChats.map(chat => (
                <div key={chat.id} style={styles.chatItemWrapper}>
                  <button
                    onClick={() => setActiveChat(chat)}
                    style={{
                      ...styles.chatItem,
                      ...styles.chatItemArchived,
                      ...(activeChat?.id === chat.id ? styles.chatItemActive : {})
                    }}
                  >
                    <span style={styles.chatTitle}>{chat.titulo}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                    }}
                    style={styles.chatMenuButton}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showChatMenu === chat.id && (
                    <div style={styles.chatMenu}>
                      <button onClick={() => archiveChat(chat)} style={styles.chatMenuItem}>
                        <Archive size={14} />
                        Desarquivar
                      </button>
                      <button onClick={() => deleteChat(chat.id)} style={{ ...styles.chatMenuItem, color: '#EF4444' }}>
                        <Trash2 size={14} />
                        Apagar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div style={styles.sidebarFooter}>
          <button
            onClick={() => setShowSkills(true)}
            style={styles.skillsButton}
          >
            <Sparkles size={16} />
            Gerir Skills
          </button>
        </div>
      </div>

      {/* Area principal do chat */}
      <div style={styles.main}>
        {activeChat ? (
          <>
            {/* Header do chat */}
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.chatHeaderTitle}>{activeChat.titulo}</h2>
                <span style={styles.chatHeaderMeta}>
                  {activeChat.categoria} • {activeChat.total_mensagens} mensagens
                  {activeChat.estado === 'arquivado' && ' • Arquivado'}
                </span>
              </div>
              <button style={styles.settingsButton} title="Definicoes do chat">
                <Settings size={18} />
              </button>
            </div>

            {/* Mensagens */}
            <div style={styles.messagesArea}>
              <ChatMessages messages={messages} />
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
              <ChatInput
                onSend={sendMessage}
                disabled={sending || activeChat.estado === 'arquivado'}
                placeholder={activeChat.estado === 'arquivado' ? 'Chat arquivado' : 'Escreve uma mensagem...'}
              />
              {sending && (
                <div style={styles.sendingIndicator}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  A processar...
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={styles.noChat}>
            <MessageSquare size={48} strokeWidth={1} />
            <p>Seleciona um chat ou cria um novo</p>
          </div>
        )}
      </div>

      {/* Modal de Skills */}
      {showSkills && (
        <SkillsManager
          projetoId={projetoId}
          onClose={() => setShowSkills(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 200px)',
    minHeight: '500px',
    backgroundColor: '#FAF9F7',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #E5E5E5',
  },

  // Sidebar
  sidebar: {
    width: '280px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E5E5E5',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid #E5E5E5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#1C1917',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  newChatButton: {
    padding: '6px',
    backgroundColor: '#8B8670',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  chatList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  chatItemWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  chatItem: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.15s ease',
  },
  chatItemActive: {
    backgroundColor: '#F2F0E7',
  },
  chatItemArchived: {
    opacity: 0.6,
  },
  chatItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  chatTitle: {
    fontSize: '13px',
    color: '#1C1917',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chatCount: {
    fontSize: '11px',
    color: '#78716C',
    backgroundColor: '#F5F3EF',
    padding: '2px 6px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  chatMenuButton: {
    padding: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9CA3AF',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  chatMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '4px',
    zIndex: 10,
    minWidth: '140px',
  },
  chatMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#1C1917',
    textAlign: 'left',
  },
  archivedDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#9CA3AF',
    padding: '12px 12px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sidebarFooter: {
    padding: '12px',
    borderTop: '1px solid #E5E5E5',
  },
  skillsButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#F5F3EF',
    color: '#5F5C59',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
  },

  // Main area
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FAF9F7',
  },
  chatHeader: {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E5E5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1C1917',
  },
  chatHeaderMeta: {
    fontSize: '12px',
    color: '#78716C',
  },
  settingsButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#78716C',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  inputArea: {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E5E5',
  },
  sendingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#78716C',
    marginTop: '8px',
  },

  // Empty states
  emptyState: {
    textAlign: 'center',
    color: '#78716C',
    fontSize: '13px',
    padding: '20px',
  },
  noChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#78716C',
    gap: '12px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '40px',
    color: '#78716C',
  },
}
