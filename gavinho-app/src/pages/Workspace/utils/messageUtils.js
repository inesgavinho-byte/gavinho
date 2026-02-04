// =====================================================
// WORKSPACE MESSAGE UTILITIES
// Funções utilitárias para mensagens
// Enhanced markdown rendering support
// =====================================================

import { createElement } from 'react'

// Escape HTML to prevent XSS
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Render formatted text with full markdown support
 * Supports: headers, bold, italic, strikethrough, code blocks,
 * inline code, links, lists, blockquotes, mentions, horizontal rules
 */
export const renderFormattedText = (text, options = {}) => {
  if (!text) return null

  const { currentUserName = null, highlightMentionsEnabled = true } = options

  // Store code blocks and inline code to protect them from other formatting
  const codeBlocks = []
  const inlineCodes = []

  let result = text

  // 1. Extract and protect code blocks
  result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length
    codeBlocks.push({ lang: lang || '', code: escapeHtml(code.trim()) })
    return `__CODEBLOCK_${index}__`
  })

  // 2. Extract and protect inline code
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodes.length
    inlineCodes.push(escapeHtml(code))
    return `__INLINECODE_${index}__`
  })

  // 3. Escape remaining HTML
  result = escapeHtml(result)

  // 4. Headers (only at start of line)
  result = result.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
  result = result.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  result = result.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')

  // 5. Horizontal rule
  result = result.replace(/^[-*_]{3,}$/gm, '<hr class="md-hr" />')

  // 6. Blockquotes
  result = result.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
  // Merge consecutive blockquotes
  result = result.replace(/<\/blockquote>\n<blockquote class="md-quote">/g, '<br/>')

  // 7. Bold (** or __)
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // 8. Italic (* or _) - be careful not to match inside words
  result = result.replace(/(?<![*_])\*(?![*\s])(.+?)(?<![*\s])\*(?![*_])/g, '<em>$1</em>')
  result = result.replace(/(?<![*_])_(?![_\s])(.+?)(?<![_\s])_(?![*_])/g, '<em>$1</em>')

  // 9. Strikethrough
  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // 10. Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')

  // 11. Auto-link URLs (but not if already in an href)
  result = result.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')

  // 12. Mentions
  if (highlightMentionsEnabled) {
    result = result.replace(/@(\w+(?:\s+\w+)?)/g, (match, name) => {
      const isCurrentUser = currentUserName &&
        name.toLowerCase().startsWith(currentUserName.toLowerCase().split(' ')[0])
      return `<span class="md-mention ${isCurrentUser ? 'md-mention-me' : ''}">${match}</span>`
    })
  }

  // 13. Unordered lists (- or *)
  result = result.replace(/^[\-\*] (.+)$/gm, '<li class="md-li">$1</li>')
  result = result.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>')

  // 14. Ordered lists (1. 2. etc)
  result = result.replace(/^\d+\. (.+)$/gm, '<li class="md-li-num">$1</li>')
  result = result.replace(/(<li class="md-li-num">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>')

  // 15. Restore code blocks with syntax highlighting styles
  codeBlocks.forEach((block, index) => {
    const langClass = block.lang ? ` lang-${block.lang}` : ''
    const langLabel = block.lang ? `<span class="code-lang">${block.lang}</span>` : ''
    result = result.replace(
      `__CODEBLOCK_${index}__`,
      `<div class="md-codeblock${langClass}">${langLabel}<pre><code>${block.code}</code></pre></div>`
    )
  })

  // 16. Restore inline code
  inlineCodes.forEach((code, index) => {
    result = result.replace(`__INLINECODE_${index}__`, `<code class="md-code">${code}</code>`)
  })

  // 17. Convert newlines to <br> (but not inside pre/code blocks)
  result = result.replace(/\n/g, '<br/>')

  return createElement('span', {
    className: 'md-content',
    dangerouslySetInnerHTML: { __html: result }
  })
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
