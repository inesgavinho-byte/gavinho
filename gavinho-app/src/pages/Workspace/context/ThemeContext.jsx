// =====================================================
// THEME CONTEXT
// Manages dark/light mode and user theme preferences
// Persists to localStorage and syncs across tabs
// =====================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

// Theme modes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
}

// Local storage key
const THEME_STORAGE_KEY = 'gavinho_theme_preference'

// Get system preference
const getSystemTheme = () => {
  if (typeof window === 'undefined') return THEMES.LIGHT
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT
}

// Get stored theme preference
const getStoredTheme = () => {
  if (typeof window === 'undefined') return THEMES.SYSTEM
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM
  } catch {
    return THEMES.SYSTEM
  }
}

// Resolve theme to actual light/dark
const resolveTheme = (theme) => {
  if (theme === THEMES.SYSTEM) {
    return getSystemTheme()
  }
  return theme
}

// Create context
const ThemeContext = createContext(null)

// CSS variable mappings for dark mode
const DARK_MODE_VARS = {
  // Background colors
  '--white': '#1a1a1a',
  '--cream': '#242424',
  '--stone': '#333333',
  '--stone-dark': '#404040',

  // Text colors
  '--brown': '#e5e5e5',
  '--brown-light': '#a0a0a0',
  '--brown-dark': '#ffffff',

  // Accent colors (keep similar but adjust for dark)
  '--blush': '#4a3c36',
  '--blush-dark': '#5d4d46',
  '--blush-light': '#3d322d',

  '--accent-olive': '#8fb88f',
  '--accent-olive-light': '#a5c9a5',
  '--accent-olive-dark': '#6b946b',

  // Status colors (slightly adjusted for dark)
  '--success': '#4caf50',
  '--warning': '#ffb74d',
  '--error': '#f44336',
  '--info': '#42a5f5',

  // Shadows (more subtle in dark mode)
  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
  '--shadow-md': '0 2px 8px rgba(0,0,0,0.4)',
  '--shadow-lg': '0 4px 16px rgba(0,0,0,0.5)',

  // Borders
  '--border-color': '#404040',
  '--border-light': '#333333'
}

// CSS variable mappings for light mode (reset to defaults)
const LIGHT_MODE_VARS = {
  '--white': '#ffffff',
  '--cream': '#faf8f5',
  '--stone': '#f0ebe3',
  '--stone-dark': '#e0d9ce',

  '--brown': '#5d4e41',
  '--brown-light': '#8a7a6e',
  '--brown-dark': '#3d3128',

  '--blush': '#e8d4c8',
  '--blush-dark': '#d4b8a8',
  '--blush-light': '#f5ebe4',

  '--accent-olive': '#7a9e7a',
  '--accent-olive-light': '#9db89d',
  '--accent-olive-dark': '#5a7e5a',

  '--success': '#4caf50',
  '--warning': '#c9a882',
  '--error': '#dc3545',
  '--info': '#17a2b8',

  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
  '--shadow-md': '0 2px 8px rgba(0,0,0,0.08)',
  '--shadow-lg': '0 4px 16px rgba(0,0,0,0.12)',

  '--border-color': '#e0d9ce',
  '--border-light': '#f0ebe3'
}

// Apply theme variables to document
const applyThemeVariables = (resolvedTheme) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const vars = resolvedTheme === THEMES.DARK ? DARK_MODE_VARS : LIGHT_MODE_VARS

  // Apply CSS variables
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', resolvedTheme)

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolvedTheme === THEMES.DARK ? '#1a1a1a' : '#ffffff')
  }
}

// Provider component
export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useState(THEMES.SYSTEM)
  const [resolvedTheme, setResolvedTheme] = useState(THEMES.LIGHT)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    const stored = getStoredTheme()
    setThemePreference(stored)
    const resolved = resolveTheme(stored)
    setResolvedTheme(resolved)
    applyThemeVariables(resolved)
    setIsInitialized(true)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (themePreference === THEMES.SYSTEM) {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyThemeVariables(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themePreference])

  // Listen for localStorage changes (sync across tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue
        setThemePreference(newTheme)
        const resolved = resolveTheme(newTheme)
        setResolvedTheme(resolved)
        applyThemeVariables(resolved)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Set theme preference
  const setTheme = useCallback((theme) => {
    if (!Object.values(THEMES).includes(theme)) return

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage might be full or disabled
    }

    setThemePreference(theme)
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    applyThemeVariables(resolved)
  }, [])

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  // Check if dark mode
  const isDarkMode = useMemo(() => resolvedTheme === THEMES.DARK, [resolvedTheme])

  // Context value
  const value = useMemo(() => ({
    themePreference,
    resolvedTheme,
    isDarkMode,
    isInitialized,
    setTheme,
    toggleTheme,
    THEMES
  }), [themePreference, resolvedTheme, isDarkMode, isInitialized, setTheme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
