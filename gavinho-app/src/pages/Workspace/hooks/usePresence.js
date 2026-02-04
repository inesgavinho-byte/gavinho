// =====================================================
// USE PRESENCE HOOK
// Estado online/offline, typing indicators, read receipts
// Uses Supabase Realtime for real-time typing indicators
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function usePresence(profile, membros = [], canalId = null) {
  // Typing
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)
  const typingChannelRef = useRef(null)
  const typingCleanupRefs = useRef({}) // Track timeouts for each user

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

  // ========== TYPING INDICATOR WITH REALTIME ==========

  // Broadcast that current user is typing
  const broadcastTyping = useCallback((isTyping = true) => {
    if (!profile?.id || !profile?.nome || !typingChannelRef.current) return

    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: profile.id,
        userName: profile.nome,
        isTyping
      }
    })
  }, [profile?.id, profile?.nome])

  // Handle typing input - broadcasts typing and auto-stops after 3s
  const handleTyping = useCallback(() => {
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Broadcast that user is typing
    broadcastTyping(true)

    // Set timeout to stop typing indicator after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 3000)
  }, [broadcastTyping])

  // Manual set typing (for external use)
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

  // Subscribe to typing channel for a specific canal
  const subscribeToTypingChannel = useCallback((channelId) => {
    if (!channelId || !profile?.id) return

    // Unsubscribe from previous channel
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current)
    }

    // Create new channel
    const channel = supabase.channel(`typing:${channelId}`)

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        // Ignore own typing events
        if (payload.userId === profile.id) return

        if (payload.isTyping) {
          // Add user to typing list
          setTypingUsers(prev => {
            if (prev.includes(payload.userName)) return prev
            return [...prev, payload.userName]
          })

          // Clear previous timeout for this user
          if (typingCleanupRefs.current[payload.userId]) {
            clearTimeout(typingCleanupRefs.current[payload.userId])
          }

          // Set timeout to remove user from typing list after 4s (safety margin)
          typingCleanupRefs.current[payload.userId] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== payload.userName))
          }, 4000)
        } else {
          // Remove user from typing list
          setTypingUsers(prev => prev.filter(name => name !== payload.userName))

          // Clear timeout
          if (typingCleanupRefs.current[payload.userId]) {
            clearTimeout(typingCleanupRefs.current[payload.userId])
            delete typingCleanupRefs.current[payload.userId]
          }
        }
      })
      .subscribe()

    typingChannelRef.current = channel
  }, [profile?.id])

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

  // ========== TYPING CHANNEL SUBSCRIPTION ==========
  useEffect(() => {
    if (canalId) {
      subscribeToTypingChannel(canalId)
    }

    return () => {
      // Cleanup typing channel
      if (typingChannelRef.current) {
        broadcastTyping(false) // Stop typing on unmount
        supabase.removeChannel(typingChannelRef.current)
        typingChannelRef.current = null
      }
      // Clear all typing cleanup timeouts
      Object.values(typingCleanupRefs.current).forEach(clearTimeout)
      typingCleanupRefs.current = {}
      // Clear typing list
      setTypingUsers([])
    }
  }, [canalId, subscribeToTypingChannel, broadcastTyping])

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
    broadcastTyping,
    subscribeToTypingChannel,
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
