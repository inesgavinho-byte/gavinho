// =====================================================
// WORKSPACE FORMATTERS
// Funções utilitárias de formatação
// =====================================================

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Format date/time as relative time (e.g., "5m", "2h", "3d")
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
 * Format date/time in full format
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
 * Extract URLs from text
 */
export const extractUrls = (text) => {
  if (!text) return []
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

/**
 * Check if a string is a valid URL
 */
export const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Truncate text to a maximum length
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Format date for display in activity log
 */
export const formatActivityDate = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Agora mesmo'
  if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`

  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
