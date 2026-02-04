/**
 * Utilitarios de sanitizacao de texto
 * Previne ataques XSS escapando caracteres HTML perigosos
 */

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto com caracteres HTML escapados
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return ''

  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }

  return text.replace(/[&<>"'/]/g, char => htmlEntities[char])
}

/**
 * Remove tags HTML de um texto
 * @param {string} text - Texto com possivel HTML
 * @returns {string} Texto sem tags HTML
 */
export function stripHtml(text) {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Sanitiza texto para exibicao segura
 * Combina escape de HTML com limite de comprimento
 * @param {string} text - Texto a sanitizar
 * @param {number} maxLength - Comprimento maximo (opcional)
 * @returns {string} Texto sanitizado
 */
export function sanitizeText(text, maxLength = null) {
  if (!text || typeof text !== 'string') return ''

  let sanitized = escapeHtml(text)

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...'
  }

  return sanitized
}

/**
 * Sanitiza URL para prevenir javascript: e data: URLs maliciosos
 * @param {string} url - URL a validar
 * @returns {string} URL segura ou string vazia
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return ''

  const trimmedUrl = url.trim().toLowerCase()

  // Bloquear protocolos perigosos
  if (
    trimmedUrl.startsWith('javascript:') ||
    trimmedUrl.startsWith('data:') ||
    trimmedUrl.startsWith('vbscript:')
  ) {
    return ''
  }

  return url
}

/**
 * Sanitiza nome de ficheiro
 * Remove caracteres que podem causar problemas no sistema de ficheiros
 * @param {string} filename - Nome do ficheiro
 * @returns {string} Nome sanitizado
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'file'

  // Remover caracteres perigosos
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 255)
}

/**
 * Componente React para exibir texto sanitizado
 * Uso: <SafeText text={userInput} />
 */
export function SafeText({ text, maxLength = null, className = '' }) {
  const sanitized = sanitizeText(text, maxLength)
  return <span className={className}>{sanitized}</span>
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  SafeText
}
