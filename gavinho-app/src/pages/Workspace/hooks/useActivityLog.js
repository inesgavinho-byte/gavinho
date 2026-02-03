// =====================================================
// USE ACTIVITY LOG HOOK
// Activity log state, filtering, and navigation
// =====================================================

import { useState, useCallback } from 'react'

// Activity types constant
export const ACTIVITY_TYPES = {
  MENTION: 'mention',
  REPLY: 'reply',
  REACTION: 'reaction',
  THREAD: 'thread',
  CHANNEL: 'channel',
  DM: 'dm'
}

export default function useActivityLog({ canais, selectCanal } = {}) {
  // Activity log state
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [activityLog, setActivityLog] = useState([])

  // ========== OPEN/CLOSE HELPERS ==========
  const openActivityLog = useCallback(() => {
    setShowActivityLog(true)
  }, [])

  const closeActivityLog = useCallback(() => {
    setShowActivityLog(false)
  }, [])

  // ========== FILTERING ==========
  // Filter activity log based on current filter
  const getFilteredActivity = useCallback(() => {
    switch (activityFilter) {
      case 'mentions':
        return activityLog.filter(a => a.type === ACTIVITY_TYPES.MENTION)
      case 'unread':
        return activityLog.filter(a => a.unread)
      default:
        return activityLog
    }
  }, [activityFilter, activityLog])

  // ========== MARK AS READ ==========
  // Mark single activity as read
  const markActivityAsRead = useCallback((activityId) => {
    setActivityLog(prev => prev.map(a =>
      a.id === activityId ? { ...a, unread: false } : a
    ))
  }, [])

  // Mark all activities as read
  const markAllActivityAsRead = useCallback(() => {
    setActivityLog(prev => prev.map(a => ({ ...a, unread: false })))
  }, [])

  // ========== NAVIGATION ==========
  // Navigate to activity source
  const navigateToActivity = useCallback((activity) => {
    if (canais && selectCanal) {
      const canal = canais.find(c => c.codigo === activity.canal?.codigo)
      if (canal) {
        selectCanal(canal)
      }
    }
    markActivityAsRead(activity.id)
    setShowActivityLog(false)
  }, [canais, selectCanal, markActivityAsRead])

  // ========== COUNTS ==========
  // Get unread activity count
  const getUnreadActivityCount = useCallback(() => {
    return activityLog.filter(a => a.unread).length
  }, [activityLog])

  // Get mention count
  const getMentionCount = useCallback(() => {
    return activityLog.filter(a => a.type === ACTIVITY_TYPES.MENTION && a.unread).length
  }, [activityLog])

  return {
    // State
    showActivityLog,
    activityFilter,
    activityLog,

    // Setters
    setShowActivityLog,
    setActivityFilter,
    setActivityLog,

    // Helpers
    openActivityLog,
    closeActivityLog,

    // Actions
    getFilteredActivity,
    markActivityAsRead,
    markAllActivityAsRead,
    navigateToActivity,
    getUnreadActivityCount,
    getMentionCount
  }
}
