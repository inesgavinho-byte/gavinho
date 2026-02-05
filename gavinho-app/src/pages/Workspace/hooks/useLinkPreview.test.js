// =====================================================
// USE LINK PREVIEW HOOK TESTS
// =====================================================

import { describe, it, expect } from 'vitest'
import { isValidUrl, getDomain, generateFallbackPreview } from './useLinkPreview'

describe('isValidUrl', () => {
  it('should return true for valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
  })

  it('should return true for valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('https://sub.domain.com/path')).toBe(true)
  })

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })
})

describe('getDomain', () => {
  it('should extract domain from URL', () => {
    expect(getDomain('https://example.com/path')).toBe('example.com')
    expect(getDomain('https://www.example.com')).toBe('example.com')
  })

  it('should handle subdomains', () => {
    expect(getDomain('https://sub.example.com')).toBe('sub.example.com')
  })

  it('should return empty string for invalid URLs', () => {
    expect(getDomain('invalid')).toBe('')
  })
})

describe('generateFallbackPreview', () => {
  it('should generate preview for GitHub URLs', () => {
    const preview = generateFallbackPreview('https://github.com/user/repo')
    expect(preview.siteName).toBe('GitHub')
    expect(preview.domain).toBe('github.com')
    expect(preview.isFallback).toBe(true)
  })

  it('should generate preview for YouTube URLs', () => {
    const preview = generateFallbackPreview('https://www.youtube.com/watch?v=abc123')
    expect(preview.siteName).toBe('YouTube')
    expect(preview.image).toContain('img.youtube.com')
  })

  it('should generate preview for youtu.be URLs', () => {
    const preview = generateFallbackPreview('https://youtu.be/abc123')
    expect(preview.siteName).toBe('YouTube')
    expect(preview.image).toContain('abc123')
  })

  it('should generate preview for Twitter URLs', () => {
    const preview = generateFallbackPreview('https://twitter.com/user/status/123')
    expect(preview.siteName).toBe('Twitter')
  })

  it('should generate preview for X.com URLs', () => {
    const preview = generateFallbackPreview('https://x.com/user/status/123')
    expect(preview.siteName).toBe('X')
  })

  it('should generate preview for LinkedIn URLs', () => {
    const preview = generateFallbackPreview('https://linkedin.com/in/user')
    expect(preview.siteName).toBe('LinkedIn')
  })

  it('should generate preview for Figma URLs', () => {
    const preview = generateFallbackPreview('https://figma.com/file/abc')
    expect(preview.siteName).toBe('Figma')
  })

  it('should generate preview for Notion URLs', () => {
    const preview = generateFallbackPreview('https://notion.so/page-id')
    expect(preview.siteName).toBe('Notion')
  })

  it('should generate generic fallback for unknown URLs', () => {
    const preview = generateFallbackPreview('https://unknown-site.com/page')
    expect(preview.siteName).toBe('unknown-site.com')
    expect(preview.domain).toBe('unknown-site.com')
    expect(preview.isFallback).toBe(true)
    expect(preview.image).toBeNull()
  })

  it('should include url and domain in preview', () => {
    const url = 'https://example.com/test'
    const preview = generateFallbackPreview(url)
    expect(preview.url).toBe(url)
    expect(preview.domain).toBe('example.com')
  })
})
