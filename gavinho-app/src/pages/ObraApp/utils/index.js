// =====================================================
// OBRA APP UTILITIES
// Shared utility functions for ObraApp
// =====================================================

/**
 * Format a date to Portuguese locale string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format a date to time string (HH:MM)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a date to date and time string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return ''
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  // Format as XXX XXX XXX
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

/**
 * Normalize phone number to international format
 * @param {string} phone - Phone number
 * @returns {string} Normalized phone number (+351XXXXXXXXX)
 */
export function normalizePhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('351')) {
    return `+${digits}`
  }
  return `+351${digits}`
}

/**
 * Convert Base64 URL to Uint8Array (for VAPID key)
 * @param {string} base64String - Base64 URL encoded string
 * @returns {Uint8Array} Converted array
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Calculate duration between two times
 * @param {string|Date} start - Start time
 * @param {string|Date} end - End time
 * @returns {string} Duration formatted as "Xh Xmin"
 */
export function calculateDuration(start, end) {
  if (!start || !end) return ''
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diff = endDate - startDate
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes}min`
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (first letter of first and last name)
 */
export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Generate a unique temporary ID
 * @returns {string} Temporary ID
 */
export function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if a date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

/**
 * Get relative date label (Hoje, Ontem, or date)
 * @param {string|Date} date - Date to format
 * @returns {string} Relative date label
 */
export function getRelativeDateLabel(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return 'Hoje'
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Ontem'
  }
  return formatDate(date)
}

// Storage keys
export const STORAGE_KEYS = {
  USER: 'obra_app_user',
  OBRAS: 'obra_app_obras',
  OBRA: 'obra_app_obra'
}

// Material units
export const MATERIAL_UNITS = [
  { value: 'un', label: 'Unidades' },
  { value: 'kg', label: 'Quilos' },
  { value: 'm', label: 'Metros' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'sacos', label: 'Sacos' },
  { value: 'L', label: 'Litros' }
]

// Request status
export const REQUEST_STATUS = {
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  VALIDADO: 'validado',
  REJEITADO: 'rejeitado',
  ENTREGUE: 'entregue'
}

export const REQUEST_STATUS_LABELS = {
  pendente: { label: 'Pendente', color: '#FF9800' },
  aprovado: { label: 'Aprovado', color: '#2196F3' },
  validado: { label: 'Validado', color: '#4CAF50' },
  rejeitado: { label: 'Rejeitado', color: '#F44336' },
  entregue: { label: 'Entregue', color: '#9E9E9E' }
}
