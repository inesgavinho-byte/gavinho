// =====================================================
// FORMATTERS UNIT TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatFileSize,
  formatTime,
  formatDateTime,
  getInitials,
  extractUrls,
  isValidUrl,
  truncateText,
  formatActivityDate
} from './formatters'

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('formatTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Agora" for recent times', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    expect(formatTime(now.toISOString())).toBe('Agora')
  })

  it('should return minutes for times under 1 hour', () => {
    const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z')
    expect(formatTime(fiveMinutesAgo.toISOString())).toBe('5m')
  })

  it('should return hours for times under 24 hours', () => {
    const threeHoursAgo = new Date('2024-01-15T09:00:00Z')
    expect(formatTime(threeHoursAgo.toISOString())).toBe('3h')
  })

  it('should return days for times under 7 days', () => {
    const twoDaysAgo = new Date('2024-01-13T12:00:00Z')
    expect(formatTime(twoDaysAgo.toISOString())).toBe('2d')
  })
})

describe('getInitials', () => {
  it('should return initials for full name', () => {
    expect(getInitials('João Silva')).toBe('JS')
    expect(getInitials('Maria Ana Costa')).toBe('MA')
  })

  it('should return single initial for single name', () => {
    expect(getInitials('João')).toBe('J')
  })

  it('should handle empty or null input', () => {
    expect(getInitials('')).toBe('U')
    expect(getInitials(null)).toBe('U')
    expect(getInitials(undefined)).toBe('U')
  })

  it('should limit to 2 characters', () => {
    expect(getInitials('Ana Beatriz Costa Dias')).toBe('AB')
  })

  it('should uppercase initials', () => {
    expect(getInitials('joão silva')).toBe('JS')
  })
})

describe('extractUrls', () => {
  it('should extract single URL', () => {
    const text = 'Check out https://example.com for more info'
    expect(extractUrls(text)).toEqual(['https://example.com'])
  })

  it('should extract multiple URLs', () => {
    const text = 'Visit https://google.com and http://example.org today'
    expect(extractUrls(text)).toEqual(['https://google.com', 'http://example.org'])
  })

  it('should return empty array for text without URLs', () => {
    expect(extractUrls('No URLs here')).toEqual([])
  })

  it('should handle null/undefined input', () => {
    expect(extractUrls(null)).toEqual([])
    expect(extractUrls(undefined)).toEqual([])
    expect(extractUrls('')).toEqual([])
  })
})

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
    expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true)
  })

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })
})

describe('truncateText', () => {
  it('should truncate long text', () => {
    const longText = 'This is a very long text that should be truncated'
    expect(truncateText(longText, 20)).toBe('This is a very long ...')
  })

  it('should not truncate short text', () => {
    const shortText = 'Short'
    expect(truncateText(shortText, 20)).toBe('Short')
  })

  it('should handle null/undefined input', () => {
    expect(truncateText(null)).toBe(null)
    expect(truncateText(undefined)).toBe(undefined)
  })

  it('should use default max length of 100', () => {
    const text = 'a'.repeat(150)
    const result = truncateText(text)
    expect(result.length).toBe(103) // 100 + '...'
  })
})

describe('formatActivityDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Agora mesmo" for very recent times', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    expect(formatActivityDate(now.toISOString())).toBe('Agora mesmo')
  })

  it('should return minutes in Portuguese', () => {
    const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z')
    expect(formatActivityDate(fiveMinutesAgo.toISOString())).toBe('Há 5 minutos')
  })

  it('should return singular minute', () => {
    const oneMinuteAgo = new Date('2024-01-15T11:59:00Z')
    expect(formatActivityDate(oneMinuteAgo.toISOString())).toBe('Há 1 minuto')
  })

  it('should return hours in Portuguese', () => {
    const threeHoursAgo = new Date('2024-01-15T09:00:00Z')
    expect(formatActivityDate(threeHoursAgo.toISOString())).toBe('Há 3 horas')
  })
})
