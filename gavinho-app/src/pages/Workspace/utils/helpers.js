// Workspace Helper Functions

/**
 * Format file size from bytes to human readable string
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Format relative time (e.g., "2h", "3d")
 */
export const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

/**
 * Format date and time (e.g., "15 Jan, 14:30")
 */
export const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get initials from a name
 */
export const getInitials = (nome) => {
  if (!nome) return 'U'
  return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

/**
 * Play notification sound
 */
export const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (e) {
    // Audio not supported - silent fail
  }
}

/**
 * Download a blob as a file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Extract URLs from text
 */
export const extractUrls = (text) => {
  if (!text) return []
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

/**
 * Render formatted text (bold, italic, code, links)
 */
export const renderFormattedText = (text) => {
  if (!text) return null

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

  return result
}

/**
 * Check if DND is active based on schedule
 */
export const isInDNDPeriod = (dndEnabled, dndSchedule) => {
  if (!dndEnabled) return false
  const now = new Date()
  const [startH, startM] = dndSchedule.start.split(':').map(Number)
  const [endH, endM] = dndSchedule.end.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Calculate reminder time from option
 */
export const calculateReminderTime = (option) => {
  const now = new Date()

  if (option.minutes === 'tomorrow') {
    const reminderTime = new Date(now)
    reminderTime.setDate(reminderTime.getDate() + 1)
    reminderTime.setHours(9, 0, 0, 0)
    return reminderTime
  }

  if (option.minutes === 'nextweek') {
    const reminderTime = new Date(now)
    reminderTime.setDate(reminderTime.getDate() + 7)
    reminderTime.setHours(9, 0, 0, 0)
    return reminderTime
  }

  return new Date(now.getTime() + option.minutes * 60000)
}

/**
 * Apply message filters
 */
export const applyFilters = (posts, { searchQuery, activeFilter, searchFilters, isMessageSaved }) => {
  let result = posts

  // Text search
  if (searchQuery) {
    result = result.filter(p =>
      p.conteudo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.autor?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Category filter
  switch (activeFilter) {
    case 'attachments':
      result = result.filter(p => p.attachments?.length > 0)
      break
    case 'images':
      result = result.filter(p => p.imagem_url || p.attachments?.some(a => a.type === 'image'))
      break
    case 'mentions':
      result = result.filter(p => p.conteudo?.includes('@'))
      break
    case 'saved':
      result = result.filter(p => isMessageSaved(p.id))
      break
  }

  // Advanced search filters
  if (searchFilters.author) {
    result = result.filter(p =>
      p.autor?.nome?.toLowerCase().includes(searchFilters.author.toLowerCase())
    )
  }

  if (searchFilters.dateFrom) {
    const fromDate = new Date(searchFilters.dateFrom)
    result = result.filter(p => new Date(p.created_at) >= fromDate)
  }

  if (searchFilters.dateTo) {
    const toDate = new Date(searchFilters.dateTo)
    toDate.setHours(23, 59, 59)
    result = result.filter(p => new Date(p.created_at) <= toDate)
  }

  if (searchFilters.hasAttachments) {
    result = result.filter(p => p.attachments?.length > 0 || p.imagem_url)
  }

  if (searchFilters.hasMentions) {
    result = result.filter(p => p.conteudo?.includes('@'))
  }

  return result
}

/**
 * Filter posts by topic
 */
export const getPostsForTopic = (posts, activeTopic) => {
  if (activeTopic === 'geral') return posts
  return posts.filter(p => p.topic === activeTopic)
}
