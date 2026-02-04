// =====================================================
// WORKSPACE MESSAGE UTILITIES
// Funções utilitárias para mensagens
// =====================================================

import { createElement } from 'react'

/**
 * Render formatted text with markdown-like syntax
 * Supports: bold, italic, code blocks, inline code, links
 */
export const renderFormattedText = (text) => {
  if (!text) return null

  // Process code blocks first
  const codeBlockRegex = /```([\s\S]*?)```/g
  const inlineCodeRegex = /`([^`]+)`/g
  const boldRegex = /\*\*([^*]+)\*\*/g
  const italicRegex = /_([^_]+)_/g
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const urlRegex = /(https?:\/\/[^\s]+)/g

  let result = text

  // Code blocks
  result = result.replace(codeBlockRegex, '<pre class="code-block">$1</pre>')
  // Inline code
  result = result.replace(inlineCodeRegex, '<code class="inline-code">$1</code>')
  // Bold
  result = result.replace(boldRegex, '<strong>$1</strong>')
  // Italic
  result = result.replace(italicRegex, '<em>$1</em>')
  // Links
  result = result.replace(linkRegex, '<a href="$2" target="_blank" class="chat-link">$1</a>')
  // Auto-link URLs
  result = result.replace(urlRegex, (match) => {
    if (result.includes(`href="${match}"`)) return match
    return `<a href="${match}" target="_blank" class="chat-link">${match}</a>`
  })

  return createElement('span', { dangerouslySetInnerHTML: { __html: result } })
}

/**
 * Apply formatting to selected text
 */
export const applyFormatting = (inputRef, format, messageInput, setMessageInput) => {
  const input = inputRef?.current
  if (!input) return

  const start = input.selectionStart
  const end = input.selectionEnd
  const selectedText = messageInput.substring(start, end)

  let formattedText = ''
  let cursorOffset = 0

  switch (format) {
    case 'bold':
      formattedText = `**${selectedText}**`
      cursorOffset = selectedText ? 0 : 2
      break
    case 'italic':
      formattedText = `_${selectedText}_`
      cursorOffset = selectedText ? 0 : 1
      break
    case 'code':
      formattedText = `\`${selectedText}\``
      cursorOffset = selectedText ? 0 : 1
      break
    case 'codeblock':
      formattedText = `\`\`\`\n${selectedText}\n\`\`\``
      cursorOffset = selectedText ? 0 : 4
      break
    case 'link':
      formattedText = `[${selectedText || 'texto'}](url)`
      cursorOffset = selectedText ? 0 : 1
      break
    case 'list':
      formattedText = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : '- '
      cursorOffset = selectedText ? 0 : 2
      break
    case 'numbered':
      formattedText = selectedText
        ? selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
        : '1. '
      cursorOffset = selectedText ? 0 : 3
      break
    default:
      return
  }

  const newText = messageInput.substring(0, start) + formattedText + messageInput.substring(end)
  setMessageInput(newText)

  // Set cursor position
  setTimeout(() => {
    const newPos = start + formattedText.length - cursorOffset
    input.setSelectionRange(newPos, newPos)
    input.focus()
  }, 0)
}

/**
 * Insert emoji at cursor position
 */
export const insertEmoji = (inputRef, emoji, messageInput, setMessageInput, setShowEmojiPicker) => {
  const input = inputRef?.current
  if (input) {
    const start = input.selectionStart
    const end = input.selectionEnd
    const newText = messageInput.substring(0, start) + emoji + messageInput.substring(end)
    setMessageInput(newText)

    // Move cursor after emoji
    setTimeout(() => {
      input.setSelectionRange(start + emoji.length, start + emoji.length)
      input.focus()
    }, 0)
  } else {
    setMessageInput(prev => prev + emoji)
  }

  setShowEmojiPicker(false)
}

/**
 * Insert mention at cursor position
 */
export const insertMention = (inputRef, member, messageInput, setMessageInput, mentionStartIndex, setShowMentions, setMentionQuery) => {
  const input = inputRef?.current
  const mentionText = `@${member.nome} `

  if (input && mentionStartIndex !== null) {
    const beforeMention = messageInput.substring(0, mentionStartIndex)
    const afterMention = messageInput.substring(input.selectionStart)
    const newText = beforeMention + mentionText + afterMention
    setMessageInput(newText)

    // Move cursor after mention
    setTimeout(() => {
      const newPos = mentionStartIndex + mentionText.length
      input.setSelectionRange(newPos, newPos)
      input.focus()
    }, 0)
  } else {
    setMessageInput(prev => prev + mentionText)
  }

  setShowMentions(false)
  setMentionQuery('')
}

/**
 * Check if current user is the author of a message
 */
export const isOwnMessage = (message, profileId) => {
  return message.autor_id === profileId || message.autor?.id === profileId
}

/**
 * Parse mentions from message text
 * Returns array of user IDs that were mentioned
 */
export const parseMentions = (text) => {
  if (!text) return []
  const mentionRegex = /@(\w+)/g
  const matches = text.match(mentionRegex)
  return matches ? matches.map(m => m.substring(1)) : []
}

/**
 * Highlight mentions in text
 */
export const highlightMentions = (text, currentUserName) => {
  if (!text) return text
  const mentionRegex = /@(\w+)/g
  return text.replace(mentionRegex, (match, name) => {
    const isCurrentUser = name.toLowerCase() === currentUserName?.toLowerCase()
    return `<span class="mention ${isCurrentUser ? 'mention-me' : ''}">${match}</span>`
  })
}
