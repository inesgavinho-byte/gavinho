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
        // Load reply counts and format attachments
        const postsWithReplies = await Promise.all(data.map(async (post) => {
          const { count } = await supabase
            .from('chat_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', post.id)
            .eq('eliminado', false)

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
            attachments: attachments.length > 0 ? attachments : undefined
          }
        }))

        setPosts(postsWithReplies)
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Error loading posts:', err)
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
      console.error('Error loading thread replies:', err)
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
      alert('Erro ao enviar mensagem: ' + err.message)
      return false
    } finally {
      setUploading(false)
    }
  }, [messageInput, selectedFiles, profile, replyingTo])

  // ========== SEND REPLY ==========
  const sendReply = useCallback(async (postId) => {
    if (!replyInput.trim()) return false

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

    // Update reply count
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p
    ))

    setReplyInput('')
    return true
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
      console.error('Error editing message:', err)
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
      console.error('Error deleting message:', err)
      return false
    }
  }, [])

  // ========== REACT TO MESSAGE ==========
  const addReaction = useCallback((messageId, emoji) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== messageId) return p
      const reactions = p.reactions || []
      const existing = reactions.find(r => r.emoji === emoji)

      if (existing) {
        // Toggle own reaction
        if (existing.users?.includes(profile?.id)) {
          existing.count--
          existing.users = existing.users.filter(u => u !== profile?.id)
          if (existing.count === 0) {
            return { ...p, reactions: reactions.filter(r => r.emoji !== emoji) }
          }
        } else {
          existing.count++
          existing.users = [...(existing.users || []), profile?.id]
        }
        return { ...p, reactions: [...reactions] }
      } else {
        return {
          ...p,
          reactions: [...reactions, { emoji, count: 1, users: [profile?.id] }]
        }
      }
    }))
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
      console.error('Error forwarding message:', err)
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
