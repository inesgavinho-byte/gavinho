// =====================================================
// USE LOCAL STORAGE HOOK
// Persist drafts, preferences, and other data locally
// =====================================================

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEYS = {
  DRAFTS: 'gavinho_chat_drafts',
  PREFERENCES: 'gavinho_chat_preferences',
  COLLAPSED_TEAMS: 'gavinho_collapsed_teams',
  RECENT_EMOJIS: 'gavinho_recent_emojis',
  PINNED_CHANNELS: 'gavinho_pinned_channels'
}

// Helper to safely parse JSON
const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str) || fallback
  } catch {
    return fallback
  }
}

export default function useLocalStorage(userId) {
  // ========== DRAFTS ==========
  const [drafts, setDraftsState] = useState({})

  // Load drafts on mount
  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`${STORAGE_KEYS.DRAFTS}_${userId}`)
    if (stored) {
      setDraftsState(safeJsonParse(stored, {}))
    }
  }, [userId])

  // Save draft for a specific channel
  const saveDraft = useCallback((channelId, content) => {
    if (!userId || !channelId) return

    setDraftsState(prev => {
      const updated = { ...prev }
      if (content?.trim()) {
        updated[channelId] = {
          content,
          timestamp: Date.now()
        }
      } else {
        delete updated[channelId]
      }
      localStorage.setItem(`${STORAGE_KEYS.DRAFTS}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  // Get draft for a specific channel
  const getDraft = useCallback((channelId) => {
    if (!channelId) return ''
    return drafts[channelId]?.content || ''
  }, [drafts])

  // Clear draft for a channel (after sending)
  const clearDraft = useCallback((channelId) => {
    saveDraft(channelId, '')
  }, [saveDraft])

  // Clear old drafts (older than 7 days)
  const clearOldDrafts = useCallback(() => {
    if (!userId) return
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

    setDraftsState(prev => {
      const updated = {}
      Object.entries(prev).forEach(([channelId, draft]) => {
        if (draft.timestamp > sevenDaysAgo) {
          updated[channelId] = draft
        }
      })
      localStorage.setItem(`${STORAGE_KEYS.DRAFTS}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  // ========== PREFERENCES ==========
  const [preferences, setPreferencesState] = useState({
    soundEnabled: true,
    desktopNotifications: true,
    showTypingIndicator: true,
    compactMode: false,
    theme: 'light',
    fontSize: 'medium',
    enterToSend: true
  })

  // Load preferences on mount
  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`${STORAGE_KEYS.PREFERENCES}_${userId}`)
    if (stored) {
      setPreferencesState(prev => ({ ...prev, ...safeJsonParse(stored, {}) }))
    }
  }, [userId])

  // Update a preference
  const setPreference = useCallback((key, value) => {
    if (!userId) return

    setPreferencesState(prev => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem(`${STORAGE_KEYS.PREFERENCES}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  // Update multiple preferences
  const setPreferences = useCallback((updates) => {
    if (!userId) return

    setPreferencesState(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem(`${STORAGE_KEYS.PREFERENCES}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  // ========== COLLAPSED TEAMS ==========
  const [collapsedTeams, setCollapsedTeamsState] = useState({})

  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`${STORAGE_KEYS.COLLAPSED_TEAMS}_${userId}`)
    if (stored) {
      setCollapsedTeamsState(safeJsonParse(stored, {}))
    }
  }, [userId])

  const toggleTeamCollapsed = useCallback((teamId) => {
    if (!userId || !teamId) return

    setCollapsedTeamsState(prev => {
      const updated = { ...prev, [teamId]: !prev[teamId] }
      localStorage.setItem(`${STORAGE_KEYS.COLLAPSED_TEAMS}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  const isTeamCollapsed = useCallback((teamId) => {
    return collapsedTeams[teamId] || false
  }, [collapsedTeams])

  // ========== RECENT EMOJIS ==========
  const [recentEmojis, setRecentEmojisState] = useState([])

  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`${STORAGE_KEYS.RECENT_EMOJIS}_${userId}`)
    if (stored) {
      setRecentEmojisState(safeJsonParse(stored, []))
    }
  }, [userId])

  const addRecentEmoji = useCallback((emoji) => {
    if (!userId || !emoji) return

    setRecentEmojisState(prev => {
      // Remove if already exists, add to front, limit to 24
      const filtered = prev.filter(e => e !== emoji)
      const updated = [emoji, ...filtered].slice(0, 24)
      localStorage.setItem(`${STORAGE_KEYS.RECENT_EMOJIS}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  // ========== PINNED CHANNELS ==========
  const [pinnedChannels, setPinnedChannelsState] = useState([])

  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`${STORAGE_KEYS.PINNED_CHANNELS}_${userId}`)
    if (stored) {
      setPinnedChannelsState(safeJsonParse(stored, []))
    }
  }, [userId])

  const togglePinnedChannel = useCallback((channelId) => {
    if (!userId || !channelId) return

    setPinnedChannelsState(prev => {
      const updated = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
      localStorage.setItem(`${STORAGE_KEYS.PINNED_CHANNELS}_${userId}`, JSON.stringify(updated))
      return updated
    })
  }, [userId])

  const isChannelPinned = useCallback((channelId) => {
    return pinnedChannels.includes(channelId)
  }, [pinnedChannels])

  // Clear old drafts on mount
  useEffect(() => {
    clearOldDrafts()
  }, [clearOldDrafts])

  return {
    // Drafts
    drafts,
    saveDraft,
    getDraft,
    clearDraft,

    // Preferences
    preferences,
    setPreference,
    setPreferences,

    // Collapsed teams
    collapsedTeams,
    toggleTeamCollapsed,
    isTeamCollapsed,

    // Recent emojis
    recentEmojis,
    addRecentEmoji,

    // Pinned channels
    pinnedChannels,
    togglePinnedChannel,
    isChannelPinned
  }
}
