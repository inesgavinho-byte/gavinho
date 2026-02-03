import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Hash, Send, Search, X, ChevronDown, Video, Phone, Pin,
  MessageSquare, Users, FileText, FolderOpen, Settings,
  Bot, Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Context & Hooks
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'
import { useFileUpload, useMessageInput, useKeyboardShortcuts } from './hooks'

// Components
import { WorkspaceSidebar } from './components/Sidebar'
import { MessageItem, MessageInput } from './components/Chat'

// Constants & Utils
import { DEFAULT_TOPICS, FILTER_OPTIONS } from './constants'
import { applyFilters, getPostsForTopic, formatTime, getInitials } from './utils/helpers'

// Inner component that uses the context
function WorkspaceContent() {
  const { state, actions, utils, profile } = useWorkspace()
  const {
    loading, canalAtivo, posts, activeThread, threadReplies,
    activeTab, activeTopic, membros, channelTopics,
    searchQuery, activeFilter, searchFilters
  } = state

  // UI States
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showTeamsImport, setShowTeamsImport] = useState(false)
  const [showArchivedChannels, setShowArchivedChannels] = useState(false)
  const [showDMPanel, setShowDMPanel] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [taskFromMessage, setTaskFromMessage] = useState(null)
  const [messageToForward, setMessageToForward] = useState(null)

  // Refs
  const messagesEndRef = useRef(null)

  // Hooks
  const fileUpload = useFileUpload()
  const messageInputHook = useMessageInput({ membros })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSendMessage: handleSendMessage,
    onSearch: () => setShowSearch(true),
    onBold: () => messageInputHook.applyFormatting('bold'),
    onItalic: () => messageInputHook.applyFormatting('italic'),
    onCode: () => messageInputHook.applyFormatting('code'),
    onEscape: () => {
      messageInputHook.setShowEmojiPicker(false)
      messageInputHook.setShowMentions(false)
      setShowKeyboardShortcuts(false)
      actions.setActiveThread(null)
    },
    messageInputRef: messageInputHook.messageInputRef
  })

  // Auto scroll to bottom when posts change
  useEffect(() => {
    if (!activeThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [posts, activeThread])

  // Send message handler
  async function handleSendMessage() {
    if (!messageInputHook.messageInput.trim() && fileUpload.selectedFiles.length === 0) return
    if (!canalAtivo) return

    try {
      fileUpload.setUploading(true)

      // Upload files
      const attachments = await fileUpload.uploadFiles(canalAtivo.id)

      // Insert message
      const { data: insertedMessage, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conteudo: messageInputHook.messageInput,
          tipo: attachments.length > 0 ? (attachments[0].type === 'image' ? 'imagem' : 'ficheiro') : 'texto',
          autor_id: profile?.id,
          canal_id: canalAtivo?.id,
          topico_id: null,
          parent_id: messageInputHook.replyingTo?.id || null,
          ficheiro_url: attachments.length > 0 ? attachments[0].url : null,
          ficheiro_nome: attachments.length > 0 ? attachments[0].name : null,
          ficheiro_tamanho: attachments.length > 0 ? attachments[0].size || null : null,
          ficheiro_tipo: attachments.length > 0 ? attachments[0].type : null
        })
        .select(`*, autor:autor_id(id, nome, avatar_url, funcao)`)
        .single()

      if (insertError) throw insertError

      // Insert extra attachments
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

      // Add to local state
      const newPost = {
        ...insertedMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
        replyCount: 0,
        replyTo: messageInputHook.replyingTo ? {
          id: messageInputHook.replyingTo.id,
          autor: messageInputHook.replyingTo.autor,
          conteudo: messageInputHook.replyingTo.conteudo?.substring(0, 100)
        } : undefined
      }

      actions.addPost(newPost)
      messageInputHook.clearInput()
      fileUpload.clearFiles()

    } catch (err) {
      alert('Erro ao enviar mensagem: ' + err.message)
    } finally {
      fileUpload.setUploading(false)
    }
  }

  // Delete message handler
  const handleDeleteMessage = useCallback((postId) => {
    if (!window.confirm('Tens a certeza que queres eliminar esta mensagem?')) return
    actions.deletePost(postId)
  }, [actions])

  // Open thread
  const handleOpenThread = useCallback((post) => {
    actions.setActiveThread(post)
    utils.loadThreadReplies(post.id)
  }, [actions, utils])

  // Get filtered posts
  const getCurrentChannelTopics = () => canalAtivo ? (channelTopics[canalAtivo.id] || DEFAULT_TOPICS) : DEFAULT_TOPICS

  const filteredPosts = getPostsForTopic(
    applyFilters(posts, {
      searchQuery,
      activeFilter,
      searchFilters,
      isMessageSaved: utils.isMessageSaved
    }),
    activeTopic
  )

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
      {/* Sidebar */}
      <WorkspaceSidebar
        onShowSearch={() => setShowSearch(true)}
        onShowSettings={() => setShowSettings(true)}
        onShowAnalytics={() => setShowAnalytics(true)}
        onShowTeamsImport={() => setShowTeamsImport(true)}
        onShowArchivedChannels={() => setShowArchivedChannels(true)}
        onShowDMPanel={() => setShowDMPanel(true)}
        onShowActivityLog={() => setShowActivityLog(true)}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Channel Header */}
        {canalAtivo && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Hash size={20} style={{ color: 'var(--olive)' }} />
              <div>
                <div style={{ fontWeight: '600', color: 'var(--charcoal)', fontSize: '15px' }}>
                  {canalAtivo.codigo}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {canalAtivo.nome}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)'
                }}
                title="Mensagens fixadas"
              >
                <Pin size={18} />
              </button>
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                style={{
                  background: showAIAssistant ? 'var(--olive-light)' : 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  color: showAIAssistant ? 'var(--olive)' : 'var(--text-secondary)'
                }}
                title="Assistente IA"
              >
                <Bot size={18} />
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)'
                }}
                title="Chamada de voz"
              >
                <Phone size={18} />
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)'
                }}
                title="Videochamada"
              >
                <Video size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {canalAtivo && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 20px',
            borderBottom: '1px solid var(--stone)',
            background: 'var(--off-white)'
          }}>
            {[
              { id: 'publicacoes', label: 'Publicações', icon: MessageSquare },
              { id: 'imagens-finais', label: 'Imagens Finais', icon: FolderOpen },
              { id: 'ficheiros', label: 'Ficheiros', icon: FileText },
              { id: 'info', label: 'Informações', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => actions.setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  border: activeTab === tab.id ? '1px solid var(--stone)' : '1px solid transparent',
                  borderBottom: activeTab === tab.id ? '1px solid white' : '1px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: activeTab === tab.id ? 'var(--olive)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? '500' : '400',
                  marginBottom: '-1px'
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Topics */}
        {canalAtivo && activeTab === 'publicacoes' && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 20px',
            borderBottom: '1px solid var(--stone)',
            overflowX: 'auto',
            background: 'white'
          }}>
            {getCurrentChannelTopics().map(topic => (
              <button
                key={topic.id}
                onClick={() => actions.setActiveTopic(topic.id)}
                style={{
                  padding: '6px 12px',
                  background: activeTopic === topic.id ? topic.cor + '20' : 'var(--off-white)',
                  border: '1px solid',
                  borderColor: activeTopic === topic.id ? topic.cor : 'var(--stone)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: activeTopic === topic.id ? topic.cor : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  fontWeight: activeTopic === topic.id ? '500' : '400'
                }}
              >
                {topic.nome}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        {canalAtivo && activeTab === 'publicacoes' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderBottom: '1px solid var(--stone)',
            background: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
              padding: '6px 12px',
              background: 'var(--off-white)',
              borderRadius: '8px',
              border: '1px solid var(--stone)'
            }}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => actions.setSearchQuery(e.target.value)}
                placeholder="Pesquisar mensagens..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => actions.setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FILTER_OPTIONS.slice(0, 4).map(filter => (
                <button
                  key={filter.id}
                  onClick={() => actions.setActiveFilter(filter.id)}
                  style={{
                    padding: '6px 10px',
                    background: activeFilter === filter.id ? 'var(--olive-light)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeFilter === filter.id ? 'var(--olive)' : 'var(--stone)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: activeFilter === filter.id ? 'var(--olive)' : 'var(--text-secondary)'
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'white'
          }}
          onDragOver={fileUpload.handleDragOver}
          onDragLeave={fileUpload.handleDragLeave}
          onDrop={fileUpload.handleDrop}
        >
          {filteredPosts.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)'
            }}>
              <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                Sem mensagens
              </div>
              <div style={{ fontSize: '14px' }}>
                Sê o primeiro a enviar uma mensagem neste canal
              </div>
            </div>
          ) : (
            <>
              {filteredPosts.map(post => (
                <MessageItem
                  key={post.id}
                  post={post}
                  onOpenThread={handleOpenThread}
                  onStartReply={messageInputHook.startReplyTo}
                  onStartEdit={messageInputHook.startEditMessage}
                  onDelete={handleDeleteMessage}
                  onOpenCreateTask={(post) => {
                    setTaskFromMessage(post)
                    setShowCreateTaskModal(true)
                  }}
                  onOpenForward={(post) => {
                    setMessageToForward(post)
                    setShowForwardModal(true)
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        {canalAtivo && activeTab === 'publicacoes' && (
          <MessageInput
            messageInput={messageInputHook.messageInput}
            onMessageChange={messageInputHook.handleMessageChange}
            onSend={handleSendMessage}
            replyingTo={messageInputHook.replyingTo}
            onCancelReply={messageInputHook.cancelReply}
            showEmojiPicker={messageInputHook.showEmojiPicker}
            onToggleEmojiPicker={() => messageInputHook.setShowEmojiPicker(!messageInputHook.showEmojiPicker)}
            emojiCategory={messageInputHook.emojiCategory}
            onSetEmojiCategory={messageInputHook.setEmojiCategory}
            onInsertEmoji={messageInputHook.insertEmoji}
            showMentions={messageInputHook.showMentions}
            filteredMembros={messageInputHook.filteredMembros}
            onInsertMention={messageInputHook.insertMention}
            showFormattingToolbar={messageInputHook.showFormattingToolbar}
            onApplyFormatting={messageInputHook.applyFormatting}
            selectedFiles={fileUpload.selectedFiles}
            onRemoveFile={fileUpload.removeFile}
            onOpenFileDialog={fileUpload.openFileDialog}
            uploading={fileUpload.uploading}
            isDragging={fileUpload.isDragging}
            messageInputRef={messageInputHook.messageInputRef}
            fileInputRef={fileUpload.fileInputRef}
            onFileSelect={fileUpload.handleFileSelect}
          />
        )}
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <div style={{
          width: '400px',
          borderLeft: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column',
          background: 'white'
        }}>
          {/* Thread Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontWeight: '600', color: 'var(--charcoal)' }}>
              Thread
            </div>
            <button
              onClick={() => actions.setActiveThread(null)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Original Message */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--stone)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--olive)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {getInitials(activeThread.autor?.nome)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--charcoal)', fontSize: '14px' }}>
                    {activeThread.autor?.nome}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatTime(activeThread.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--charcoal)' }}>
                  {activeThread.conteudo}
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {(threadReplies[activeThread.id] || []).map(reply => (
              <div key={reply.id} style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getInitials(reply.autor?.nome)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--charcoal)', fontSize: '13px' }}>
                        {reply.autor?.nome}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatTime(reply.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--charcoal)' }}>
                      {reply.conteudo}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Input */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--stone)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={messageInputHook.replyInput}
                onChange={(e) => messageInputHook.setReplyInput(e.target.value)}
                placeholder="Responder..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (messageInputHook.replyInput.trim()) {
                      actions.addThreadReply(activeThread.id, {
                        id: `reply-${Date.now()}`,
                        conteudo: messageInputHook.replyInput,
                        autor: {
                          nome: profile?.nome || 'Utilizador',
                          avatar_url: profile?.avatar_url,
                          funcao: profile?.funcao
                        },
                        created_at: new Date().toISOString()
                      })
                      messageInputHook.setReplyInput('')
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (messageInputHook.replyInput.trim()) {
                    actions.addThreadReply(activeThread.id, {
                      id: `reply-${Date.now()}`,
                      conteudo: messageInputHook.replyInput,
                      autor: {
                        nome: profile?.nome || 'Utilizador',
                        avatar_url: profile?.avatar_url,
                        funcao: profile?.funcao
                      },
                      created_at: new Date().toISOString()
                    })
                    messageInputHook.setReplyInput('')
                  }
                }}
                style={{
                  background: messageInputHook.replyInput.trim() ? 'var(--olive)' : 'var(--stone)',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: messageInputHook.replyInput.trim() ? 'pointer' : 'not-allowed',
                  color: 'white'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Panel */}
      {showAIAssistant && (
        <div style={{
          width: '350px',
          borderLeft: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column',
          background: 'white'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--olive)' }} />
              <span style={{ fontWeight: '600', color: 'var(--charcoal)' }}>
                G.A.R.V.I.S.
              </span>
            </div>
            <button
              onClick={() => setShowAIAssistant(false)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{
              padding: '16px',
              background: 'var(--olive-light)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--charcoal)', marginBottom: '8px' }}>
                Olá! Sou o G.A.R.V.I.S., o assistente de IA do GAVINHO.
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Posso ajudar-te com resumos de conversas, encontrar mensagens, criar tarefas e muito mais.
              </div>
            </div>

            {state.aiMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: msg.role === 'user' ? 'var(--off-white)' : 'var(--olive-light)',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  marginLeft: msg.role === 'user' ? '40px' : '0',
                  marginRight: msg.role === 'assistant' ? '40px' : '0'
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--charcoal)', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {state.aiLoading && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div className="loading-spinner" style={{ width: '24px', height: '24px' }} />
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--stone)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Perguntar ao G.A.R.V.I.S...."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const query = e.target.value
                    actions.addAiMessage({ role: 'user', content: query })
                    actions.setAiLoading(true)
                    e.target.value = ''

                    // Simulate AI response
                    setTimeout(() => {
                      let response = 'Entendi! Posso ajudar-te com informações sobre este projeto.'
                      if (query.toLowerCase().includes('resumo')) {
                        response = `📋 Resumo do canal ${canalAtivo?.codigo}:\n\n• ${posts.length} mensagens\n• ${membros.length} membros ativos`
                      } else if (query.toLowerCase().includes('ajuda')) {
                        response = 'Posso ajudar-te com:\n• Resumir conversas\n• Encontrar mensagens\n• Criar tarefas\n• Agendar reuniões'
                      }
                      actions.addAiMessage({ role: 'assistant', content: response })
                      actions.setAiLoading(false)
                    }, 1000)
                  }
                }}
              />
              <button
                style={{
                  background: 'var(--olive)',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main export with Provider wrapper
export default function Workspace() {
  return (
    <WorkspaceProvider>
      <WorkspaceContent />
    </WorkspaceProvider>
  )
}
