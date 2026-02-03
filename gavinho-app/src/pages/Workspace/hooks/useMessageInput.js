import { useState, useRef, useCallback } from 'react'

export function useMessageInput({ membros = [] }) {
  const [messageInput, setMessageInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Frequentes')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editingContent, setEditingContent] = useState('')

  const messageInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Handle message input change with mention detection
  const handleMessageChange = useCallback((e) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMessageInput(value)

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1)
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
  }, [])

  // Insert mention
  const insertMention = useCallback((membro) => {
    if (mentionStartIndex === -1) return

    const beforeMention = messageInput.substring(0, mentionStartIndex)
    const afterMention = messageInput.substring(mentionStartIndex + mentionQuery.length + 1)
    const newValue = `${beforeMention}@${membro.nome} ${afterMention}`

    setMessageInput(newValue)
    setShowMentions(false)
    setMentionQuery('')
    setMentionStartIndex(-1)

    setTimeout(() => messageInputRef.current?.focus(), 0)
  }, [messageInput, mentionQuery, mentionStartIndex])

  // Insert emoji at cursor position
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

  // Apply text formatting
  const applyFormatting = useCallback((format) => {
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
  }, [messageInput])

  // Start replying to a message
  const startReplyTo = useCallback((post) => {
    setReplyingTo(post)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }, [])

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  // Start editing a message
  const startEditMessage = useCallback((post) => {
    setEditingMessage(post)
    setEditingContent(post.conteudo)
  }, [])

  // Cancel editing
  const cancelEditMessage = useCallback(() => {
    setEditingMessage(null)
    setEditingContent('')
  }, [])

  // Clear input after send
  const clearInput = useCallback(() => {
    setMessageInput('')
    setReplyingTo(null)
  }, [])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator after 3 seconds of no input
    }, 3000)
  }, [])

  // Filter members for mention autocomplete
  const filteredMembros = mentionQuery
    ? membros.filter(m => m.nome?.toLowerCase().includes(mentionQuery))
    : membros.slice(0, 8)

  return {
    // State
    messageInput,
    setMessageInput,
    replyInput,
    setReplyInput,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiCategory,
    setEmojiCategory,
    showMentions,
    setShowMentions,
    mentionQuery,
    showFormattingToolbar,
    setShowFormattingToolbar,
    replyingTo,
    setReplyingTo,
    editingMessage,
    editingContent,
    setEditingContent,
    filteredMembros,

    // Refs
    messageInputRef,

    // Actions
    handleMessageChange,
    insertMention,
    insertEmoji,
    applyFormatting,
    startReplyTo,
    cancelReply,
    startEditMessage,
    cancelEditMessage,
    clearInput,
    handleTyping
  }
}
