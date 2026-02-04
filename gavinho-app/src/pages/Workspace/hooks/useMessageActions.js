// =====================================================
// USE MESSAGE ACTIONS HOOK
// Enviar, editar, apagar, reagir a mensagens
// =====================================================

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

export default function useMessageActions(profile) {
  // Posts/Messages
  const [posts, setPosts] = useState([])

  // Input
  const [messageInput, setMessageInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const messageInputRef = useRef(null)

  // Edit/Reply
  const [editingMessage, setEditingMessage] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [showMessageMenu, setShowMessageMenu] = useState(null)

  // Threads
  const [activeThread, setActiveThread] = useState(null)
  const [threadReplies, setThreadReplies] = useState({})

  // Upload
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  // Emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Frequentes')

  // Mentions
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Formatting
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true)

  // Saved/Bookmarks
  const [savedMessages, setSavedMessages] = useState([])

  // Tags
  const [messageTags, setMessageTags] = useState({})
  const [showTagSelector, setShowTagSelector] = useState(null)

  // ========== LOAD POSTS ==========
  const loadPosts = useCallback(async (canalId) => {
    if (!canalId) return

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
        // Load reply counts, reactions, and format attachments
        const postsWithReplies = await Promise.all(data.map(async (post) => {
          // Get reply count
          const { count } = await supabase
            .from('chat_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', post.id)
            .eq('eliminado', false)

          // Get reactions for this post
          let reacoes = []
          try {
            const { data: reactionData } = await supabase
              .from('chat_reacoes')
              .select(`
                emoji,
                utilizador:utilizador_id(id, nome)
              `)
              .eq('mensagem_id', post.id)

            if (reactionData && reactionData.length > 0) {
              // Group reactions by emoji
              const reactionMap = {}
              reactionData.forEach(r => {
                if (!reactionMap[r.emoji]) {
                  reactionMap[r.emoji] = { emoji: r.emoji, users: [] }
                }
                reactionMap[r.emoji].users.push(r.utilizador?.nome || 'Utilizador')
              })
              reacoes = Object.values(reactionMap)
            }
          } catch (err) {
            // Silent fail - reactions table might not exist
          }

          // Build attachments array from file fields
          let attachments = []
          if (post.ficheiro_url) {
            const isImage = post.tipo === 'imagem' || post.ficheiro_nome?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
            attachments.push({
              name: post.ficheiro_nome || 'Ficheiro',
              url: post.ficheiro_url,
              type: isImage ? 'image' : 'file',
              size: post.ficheiro_tamanho
            })
          }

          return {
            ...post,
            replyCount: count || 0,
            reacoes: reacoes.length > 0 ? reacoes : post.reacoes || [],
            attachments: attachments.length > 0 ? attachments : undefined
          }
        }))

        setPosts(postsWithReplies)
      } else {
        setPosts([])
      }
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      setPosts([])
    }
  }, [])

  // ========== LOAD THREAD REPLIES ==========
  const loadThreadReplies = useCallback(async (postId) => {
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
      }
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
    }
  }, [threadReplies])

  // ========== SEND MESSAGE ==========
  const sendMessage = useCallback(async (canalAtivo) => {
    if (!messageInput.trim() && selectedFiles.length === 0) return false
    if (!canalAtivo) return false

    try {
      setUploading(true)

      // Upload files
      let attachments = []
      let uploadErrors = []
      for (const file of selectedFiles) {
        const fileName = `${canalAtivo.id}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(fileName, file.file)

        if (uploadError) {
          uploadErrors.push(`${file.name}: ${uploadError.message}`)
        } else {
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

      // If all uploads failed and no message text, throw error
      if (uploadErrors.length > 0 && attachments.length === 0 && !messageInput.trim()) {
        throw new Error('Erro ao carregar ficheiro(s): ' + uploadErrors.join(', '))
      }

      // Insert message
      const { data: insertedMessage, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conteudo: messageInput,
          tipo: attachments.length > 0 ? (attachments[0].type === 'image' ? 'imagem' : 'ficheiro') : 'texto',
          autor_id: profile?.id,
          canal_id: canalAtivo?.id,
          topico_id: null,
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

      if (insertError) throw insertError

      // Insert additional attachments
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

      return true
    } catch (err) {
      // Error will be handled by the calling component via onError callback
      throw new Error('Erro ao enviar mensagem: ' + err.message)
    } finally {
      setUploading(false)
    }
  }, [messageInput, selectedFiles, profile, replyingTo])

  // ========== SEND REPLY (Thread) ==========
  const sendReply = useCallback(async (postId, canalId) => {
    if (!replyInput.trim()) return false

    try {
      // Insert reply to database with parent_id
      const { data: insertedReply, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conteudo: replyInput,
          tipo: 'texto',
          autor_id: profile?.id,
          canal_id: canalId,
          parent_id: postId,
          topico_id: null
        })
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url, funcao)
        `)
        .single()

      if (insertError) throw insertError

      // Update local thread replies
      setThreadReplies(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), insertedReply]
      }))

      // Update reply count in posts
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p
      ))

      setReplyInput('')
      return true
    } catch (err) {
      throw new Error('Erro ao enviar resposta: ' + err.message)
    }
  }, [replyInput, profile])

  // ========== EDIT MESSAGE ==========
  const editMessage = useCallback(async (messageId, newContent) => {
    if (!newContent.trim()) return false

    try {
      const { error } = await supabase
        .from('chat_mensagens')
        .update({ conteudo: newContent, editado: true })
        .eq('id', messageId)

      if (error) throw error

      setPosts(prev => prev.map(p =>
        p.id === messageId ? { ...p, conteudo: newContent, editado: true } : p
      ))

      setEditingMessage(null)
      setEditingContent('')
      return true
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      return false
    }
  }, [])

  // ========== DELETE MESSAGE ==========
  const deleteMessage = useCallback(async (messageId) => {
    try {
      const { error } = await supabase
        .from('chat_mensagens')
        .update({ eliminado: true })
        .eq('id', messageId)

      if (error) throw error

      setPosts(prev => prev.filter(p => p.id !== messageId))
      return true
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      return false
    }
  }, [])

  // ========== REACT TO MESSAGE (with DB persistence) ==========
  const addReaction = useCallback(async (messageId, emoji) => {
    if (!profile?.id || !messageId) return

    try {
      // Check if user already reacted with this emoji
      const { data: existingReaction } = await supabase
        .from('chat_reacoes')
        .select('id')
        .eq('mensagem_id', messageId)
        .eq('utilizador_id', profile.id)
        .eq('emoji', emoji)
        .single()

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('chat_reacoes')
          .delete()
          .eq('id', existingReaction.id)
      } else {
        // Add reaction
        await supabase
          .from('chat_reacoes')
          .insert({
            mensagem_id: messageId,
            utilizador_id: profile.id,
            emoji
          })
      }

      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id !== messageId) return p
        const reacoes = p.reacoes || []
        const existing = reacoes.find(r => r.emoji === emoji)

        if (existing) {
          // Toggle own reaction
          if (existing.users?.includes(profile?.nome || profile?.id)) {
            existing.users = existing.users.filter(u => u !== profile?.nome && u !== profile?.id)
            if (existing.users.length === 0) {
              return { ...p, reacoes: reacoes.filter(r => r.emoji !== emoji) }
            }
          } else {
            existing.users = [...(existing.users || []), profile?.nome || profile?.id]
          }
          return { ...p, reacoes: [...reacoes] }
        } else {
          return {
            ...p,
            reacoes: [...reacoes, { emoji, users: [profile?.nome || profile?.id] }]
          }
        }
      }))
    } catch (err) {
      // Fallback to local-only reaction if DB fails
      setPosts(prev => prev.map(p => {
        if (p.id !== messageId) return p
        const reacoes = p.reacoes || []
        const existing = reacoes.find(r => r.emoji === emoji)

        if (existing) {
          if (existing.users?.includes(profile?.nome || profile?.id)) {
            existing.users = existing.users.filter(u => u !== profile?.nome && u !== profile?.id)
            if (existing.users.length === 0) {
              return { ...p, reacoes: reacoes.filter(r => r.emoji !== emoji) }
            }
          } else {
            existing.users = [...(existing.users || []), profile?.nome || profile?.id]
          }
          return { ...p, reacoes: [...reacoes] }
        } else {
          return {
            ...p,
            reacoes: [...reacoes, { emoji, users: [profile?.nome || profile?.id] }]
          }
        }
      }))
    }
  }, [profile])

  // ========== SAVE/BOOKMARK MESSAGE ==========
  const toggleSaveMessage = useCallback((message) => {
    setSavedMessages(prev => {
      const exists = prev.find(m => m.id === message.id)
      if (exists) {
        return prev.filter(m => m.id !== message.id)
      }
      return [...prev, message]
    })
  }, [])

  const isMessageSaved = useCallback((messageId) => {
    return savedMessages.some(m => m.id === messageId)
  }, [savedMessages])

  // ========== FORWARD MESSAGE ==========
  const forwardMessage = useCallback(async (message, targetCanalId) => {
    try {
      const { error } = await supabase
        .from('chat_mensagens')
        .insert({
          conteudo: `[Reencaminhado de ${message.autor?.nome}]\n\n${message.conteudo}`,
          tipo: 'texto',
          autor_id: profile?.id,
          canal_id: targetCanalId,
          topico_id: null
        })

      if (error) throw error
      return true
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      return false
    }
  }, [profile])

  // ========== TAG MESSAGE ==========
  const tagMessage = useCallback((messageId, tag) => {
    setMessageTags(prev => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), tag]
    }))
    setShowTagSelector(null)
  }, [])

  const removeTag = useCallback((messageId, tag) => {
    setMessageTags(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || []).filter(t => t !== tag)
    }))
  }, [])

  // ========== OPEN THREAD ==========
  const openThread = useCallback((post) => {
    setActiveThread(post)
    loadThreadReplies(post.id)
  }, [loadThreadReplies])

  const closeThread = useCallback(() => {
    setActiveThread(null)
  }, [])

  // ========== FILE HANDLING ==========
  const handleFileSelect = useCallback((files) => {
    const newFiles = Array.from(files).map(file => ({
      file,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ========== EMOJI INSERTION ==========
  const insertEmoji = useCallback((emoji) => {
    const input = messageInputRef.current
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const newValue = messageInput.substring(0, start) + emoji + messageInput.substring(end)
      setMessageInput(newValue)
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length
        input.focus()
      }, 0)
    } else {
      setMessageInput(prev => prev + emoji)
    }
    setShowEmojiPicker(false)
  }, [messageInput])

  return {
    // State
    posts,
    messageInput,
    replyInput,
    messageInputRef,
    editingMessage,
    editingContent,
    replyingTo,
    showMessageMenu,
    activeThread,
    threadReplies,
    selectedFiles,
    uploading,
    showEmojiPicker,
    emojiCategory,
    showMentions,
    mentionQuery,
    mentionStartIndex,
    showFormattingToolbar,
    savedMessages,
    messageTags,
    showTagSelector,

    // Setters
    setPosts,
    setMessageInput,
    setReplyInput,
    setEditingMessage,
    setEditingContent,
    setReplyingTo,
    setShowMessageMenu,
    setActiveThread,
    setSelectedFiles,
    setUploading,
    setShowEmojiPicker,
    setEmojiCategory,
    setShowMentions,
    setMentionQuery,
    setMentionStartIndex,
    setShowFormattingToolbar,
    setShowTagSelector,

    // Actions
    loadPosts,
    loadThreadReplies,
    sendMessage,
    sendReply,
    editMessage,
    deleteMessage,
    addReaction,
    toggleSaveMessage,
    isMessageSaved,
    forwardMessage,
    tagMessage,
    removeTag,
    openThread,
    closeThread,
    handleFileSelect,
    removeFile,
    insertEmoji
  }
}
