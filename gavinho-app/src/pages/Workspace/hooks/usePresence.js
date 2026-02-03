// =====================================================
// USE PRESENCE HOOK
// Estado online/offline, typing indicators, read receipts
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function usePresence(profile, membros = []) {
  // Typing
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)

  // Online status
  const [onlineUsers, setOnlineUsers] = useState({})

  // Read receipts
  const [readReceipts, setReadReceipts] = useState({})

  // User status
  const [userStatus, setUserStatus] = useState('available')
  const [customStatusMessage, setCustomStatusMessage] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // ========== UPDATE MY PRESENCE ==========
  const updateMyPresence = useCallback(async (status = 'online') => {
    if (!profile?.id) return

    try {
      await supabase.from('chat_presenca').upsert({
        utilizador_id: profile.id,
        estado: status,
        ultima_actividade: new Date().toISOString(),
        dispositivo: 'web'
      }, { onConflict: 'utilizador_id' })
    } catch (err) {
      // Silent fail
    }
  }, [profile?.id])

  // ========== LOAD ONLINE USERS ==========
  const loadOnlineUsers = useCallback(async () => {
    if (!membros.length) return

    try {
      const { data } = await supabase
        .from('chat_presenca')
        .select('utilizador_id, estado, ultima_actividade')
        .in('utilizador_id', membros.map(m => m.id))

      const map = {}
      data?.forEach(p => {
        const lastActive = new Date(p.ultima_actividade)
        const diffMinutes = (Date.now() - lastActive.getTime()) / 60000

        if (diffMinutes > 15) {
          map[p.utilizador_id] = 'offline'
        } else if (diffMinutes > 5) {
          map[p.utilizador_id] = 'away'
        } else {
          map[p.utilizador_id] = p.estado
        }
      })

      setOnlineUsers(map)
    } catch (err) {
      // Silent fail
    }
  }, [membros])

  // ========== TYPING INDICATOR ==========
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator after 3 seconds of no input
    }, 3000)
  }, [])

  const setUserTyping = useCallback((userId, isTyping) => {
    setTypingUsers(prev => {
      if (isTyping && !prev.includes(userId)) {
        return [...prev, userId]
      }
      if (!isTyping) {
        return prev.filter(id => id !== userId)
      }
      return prev
    })
  }, [])

  // ========== ONLINE STATUS HELPERS ==========
  const isUserOnline = useCallback((userId) => {
    return onlineUsers[userId] === 'online'
  }, [onlineUsers])

  const getUserStatus = useCallback((userId) => {
    return onlineUsers[userId] || 'offline'
  }, [onlineUsers])

  const getPresenceColor = useCallback((userId) => {
    const estado = onlineUsers[userId]
    if (estado === 'online') return '#22c55e' // Green
    if (estado === 'away') return '#eab308' // Yellow
    return '#9ca3af' // Gray
  }, [onlineUsers])

  const getPresenceLabel = useCallback((userId) => {
    const estado = onlineUsers[userId]
    if (estado === 'online') return 'Online'
    if (estado === 'away') return 'Ausente'
    return 'Offline'
  }, [onlineUsers])

  // ========== READ RECEIPTS ==========
  const markMessageAsRead = useCallback((messageId) => {
    setReadReceipts(prev => ({
      ...prev,
      [messageId]: {
        read: true,
        readAt: new Date().toISOString(),
        readBy: [...(prev[messageId]?.readBy || []), profile?.id]
      }
    }))
  }, [profile?.id])

  const getReadStatus = useCallback((message) => {
    const receipt = readReceipts[message.id]
    if (!receipt) return 'sent'
    if (receipt.readBy?.length > 0) return 'read'
    return 'delivered'
  }, [readReceipts])

  const isMessageRead = useCallback((messageId) => {
    return readReceipts[messageId]?.read || false
  }, [readReceipts])

  // ========== USER STATUS ==========
  const updateUserStatus = useCallback(async (status, message = '') => {
    setUserStatus(status)
    setCustomStatusMessage(message)

    if (profile?.id) {
      try {
        await supabase.from('chat_presenca').upsert({
          utilizador_id: profile.id,
          estado: status === 'available' ? 'online' : status,
          status_message: message,
          ultima_actividade: new Date().toISOString()
        }, { onConflict: 'utilizador_id' })
      } catch (err) {
        // Silent fail
      }
    }
  }, [profile?.id])

  // ========== AUTO-UPDATE PRESENCE ==========
  useEffect(() => {
    if (!profile?.id) return

    // Update presence on mount
    updateMyPresence()

    // Update presence every 5 minutes
    const interval = setInterval(() => {
      updateMyPresence()
    }, 5 * 60 * 1000)

    // Set offline on unmount
    return () => {
      clearInterval(interval)
      updateMyPresence('offline')
    }
  }, [profile?.id, updateMyPresence])

  // ========== AUTO-LOAD ONLINE USERS ==========
  useEffect(() => {
    if (membros.length > 0) {
      loadOnlineUsers()
      // Reload every minute
      const interval = setInterval(loadOnlineUsers, 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [membros, loadOnlineUsers])

  return {
    // State
    typingUsers,
    onlineUsers,
    readReceipts,
    userStatus,
    customStatusMessage,
    showStatusMenu,

    // Setters
    setTypingUsers,
    setUserStatus,
    setCustomStatusMessage,
    setShowStatusMenu,

    // Actions
    updateMyPresence,
    loadOnlineUsers,
    handleTyping,
    setUserTyping,
    isUserOnline,
    getUserStatus,
    getPresenceColor,
    getPresenceLabel,
    markMessageAsRead,
    getReadStatus,
    isMessageRead,
    updateUserStatus
  }
}
