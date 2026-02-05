// =====================================================
// THEME CONTEXT TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme, THEMES } from './ThemeContext'

// Wrapper component for testing hooks
const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  describe('useTheme hook', () => {
    it('should provide theme context', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      expect(result.current).toHaveProperty('themePreference')
      expect(result.current).toHaveProperty('resolvedTheme')
      expect(result.current).toHaveProperty('isDarkMode')
      expect(result.current).toHaveProperty('setTheme')
      expect(result.current).toHaveProperty('toggleTheme')
    })

    it('should default to system theme preference', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      expect(result.current.themePreference).toBe(THEMES.SYSTEM)
    })

    it('should toggle between light and dark mode', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      // Start with light mode (mocked matchMedia returns false for dark)
      expect(result.current.isDarkMode).toBe(false)

      // Toggle to dark
      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.isDarkMode).toBe(true)
      expect(result.current.resolvedTheme).toBe(THEMES.DARK)

      // Toggle back to light
      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.isDarkMode).toBe(false)
      expect(result.current.resolvedTheme).toBe(THEMES.LIGHT)
    })

    it('should set specific theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(result.current.themePreference).toBe(THEMES.DARK)
      expect(result.current.resolvedTheme).toBe(THEMES.DARK)
      expect(result.current.isDarkMode).toBe(true)
    })

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('gavinho_theme_preference', THEMES.DARK)
    })

    it('should set data-theme attribute on document', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(document.documentElement.getAttribute('data-theme')).toBe(THEMES.DARK)
    })
  })

  describe('THEMES constant', () => {
    it('should have correct theme values', () => {
      expect(THEMES.LIGHT).toBe('light')
      expect(THEMES.DARK).toBe('dark')
      expect(THEMES.SYSTEM).toBe('system')
    })
  })
})

describe('useTheme without provider', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleSpy.mockRestore()
  })
})
