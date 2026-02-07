// =====================================================
// WORKSPACE PRESENCE UTILITIES
// Funções utilitárias para gestão de presença online
// =====================================================

/**
 * Get the presence color based on user status
 */
export const getPresenceColor = (status) => {
  switch (status) {
    case 'online':
    case 'available':
      return '#22c55e' // Green
    case 'busy':
    case 'dnd':
      return '#ef4444' // Red
    case 'away':
      return '#f59e0b' // Yellow/Orange
    case 'meeting':
      return '#8b5cf6' // Purple
    case 'offline':
    default:
      return '#9ca3af' // Gray
  }
}

/**
 * Get presence status label
 */
export const getPresenceLabel = (status) => {
  const labels = {
    online: 'Online',
    available: 'Disponível',
    busy: 'Ocupado',
    dnd: 'Não incomodar',
    away: 'Ausente',
    meeting: 'Em reunião',
    lunch: 'Almoço',
    vacation: 'Férias',
    wfh: 'A trabalhar de casa',
    offline: 'Offline'
  }
  return labels[status] || 'Offline'
}

/**
 * Check if a user is online based on their presence data
 */
export const isUserOnline = (onlineUsers, userId) => {
  const status = onlineUsers[userId]
  return status && status !== 'offline'
}

/**
 * Calculate user status based on last activity time
 */
export const calculateUserStatus = (lastActivity, baseStatus = 'online') => {
  if (!lastActivity) return 'offline'

  const lastActive = new Date(lastActivity)
  const diffMinutes = (Date.now() - lastActive.getTime()) / 60000

  if (diffMinutes > 15) {
    return 'offline'
  } else if (diffMinutes > 5) {
    return 'away'
  }

  return baseStatus
}

/**
 * Format "last seen" time
 */
export const formatLastSeen = (lastActivity) => {
  if (!lastActivity) return 'Nunca visto'

  const lastActive = new Date(lastActivity)
  const diffMinutes = Math.floor((Date.now() - lastActive.getTime()) / 60000)

  if (diffMinutes < 1) return 'Visto agora'
  if (diffMinutes < 60) return `Visto há ${diffMinutes}m`
  if (diffMinutes < 1440) return `Visto há ${Math.floor(diffMinutes / 60)}h`
  return `Visto há ${Math.floor(diffMinutes / 1440)}d`
}

/**
 * Get typing indicator text
 */
export const getTypingText = (typingUsers) => {
  if (!typingUsers || typingUsers.length === 0) return null

  if (typingUsers.length === 1) {
    return `${typingUsers[0].nome} está a escrever...`
  } else if (typingUsers.length === 2) {
    return `${typingUsers[0].nome} e ${typingUsers[1].nome} estão a escrever...`
  } else {
    return `${typingUsers.length} pessoas estão a escrever...`
  }
}
