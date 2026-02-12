// =====================================================
// USE NOTIFICATIONS HOOK
// Muted channels, pinned messages, sound, DND, reminders
// Mention notifications with real-time updates
// =====================================================

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function useNotifications(profile) {
  // Muted channels
  const [mutedChannels, setMutedChannels] = useState([])

  // Pinned messages (global)
  const [pinnedMessages, setPinnedMessages] = useState([])

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Channel-specific pinned messages
  const [channelPinnedMessages, setChannelPinnedMessages] = useState({})
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)

  // Do Not Disturb
  const [dndEnabled, setDndEnabled] = useState(false)
  const [dndSchedule, setDndSchedule] = useState({ start: '22:00', end: '08:00' })
  const [showDndSettings, setShowDndSettings] = useState(false)

  // Reminders
  const [reminders, setReminders] = useState([])
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderMessage, setReminderMessage] = useState(null)
  const [customReminderDate, setCustomReminderDate] = useState('')

  // Mention notifications
  const [mentionNotifications, setMentionNotifications] = useState([])
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0)

  // ========== MUTED CHANNELS ==========
  const toggleMuteChannel = useCallback((channelId) => {
    setMutedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }, [])

  const isChannelMuted = useCallback((channelId) => {
    return mutedChannels.includes(channelId)
  }, [mutedChannels])

  // ========== SOUND ==========
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || dndEnabled) return

    // Check DND schedule
    if (dndSchedule.start && dndSchedule.end) {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [startH, startM] = dndSchedule.start.split(':').map(Number)
      const [endH, endM] = dndSchedule.end.split(':').map(Number)
      const startTime = startH * 60 + startM
      const endTime = endH * 60 + endM

      // Check if current time is within DND schedule
      if (startTime > endTime) {
        // Overnight schedule (e.g., 22:00 - 08:00)
        if (currentTime >= startTime || currentTime < endTime) return
      } else {
        // Same day schedule
        if (currentTime >= startTime && currentTime < endTime) return
      }
    }

    // Play sound
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Silent fail if autoplay is blocked
      })
    } catch (err) {
      // Silent fail
    }
  }, [soundEnabled, dndEnabled, dndSchedule])

  // ========== PINNED MESSAGES ==========
  const togglePinMessage = useCallback((channelId, post) => {
    if (!channelId || !post) return

    setChannelPinnedMessages(prev => {
      const channelPins = prev[channelId] || []
      const isPinned = channelPins.some(m => m.id === post.id)

      return {
        ...prev,
        [channelId]: isPinned
          ? channelPins.filter(m => m.id !== post.id)
          : [...channelPins, { ...post, pinnedAt: new Date().toISOString() }]
      }
    })
  }, [])

  const isMessagePinned = useCallback((channelId, postId) => {
    return channelPinnedMessages[channelId]?.some(m => m.id === postId) || false
  }, [channelPinnedMessages])

  const getChannelPinnedMessages = useCallback((channelId) => {
    return channelPinnedMessages[channelId] || []
  }, [channelPinnedMessages])

  // ========== DO NOT DISTURB ==========
  const toggleDnd = useCallback(() => {
    setDndEnabled(prev => !prev)
  }, [])

  const updateDndSchedule = useCallback((schedule) => {
    setDndSchedule(schedule)
  }, [])

  const isDndActive = useCallback(() => {
    if (!dndEnabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = dndSchedule.start.split(':').map(Number)
    const [endH, endM] = dndSchedule.end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime
    }
    return currentTime >= startTime && currentTime < endTime
  }, [dndEnabled, dndSchedule])

  // ========== REMINDERS ==========
  const addReminder = useCallback((message, reminderTime) => {
    const reminder = {
      id: `reminder-${Date.now()}`,
      message,
      reminderTime,
      createdAt: new Date().toISOString(),
      completed: false
    }
    setReminders(prev => [...prev, reminder])
    setShowReminderModal(false)
    setReminderMessage(null)
    setCustomReminderDate('')
    return reminder
  }, [])

  const removeReminder = useCallback((reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId))
  }, [])

  const markReminderComplete = useCallback((reminderId) => {
    setReminders(prev => prev.map(r =>
      r.id === reminderId ? { ...r, completed: true } : r
    ))
  }, [])

  const getActiveReminders = useCallback(() => {
    return reminders.filter(r => !r.completed)
  }, [reminders])

  const openReminderModal = useCallback((message) => {
    setReminderMessage(message)
    setShowReminderModal(true)
  }, [])

  // ========== MENTION NOTIFICATIONS ==========

  // Parse mentions from message text - returns array of names
  const parseMentions = useCallback((text) => {
    if (!text) return []
    // Match @Name or @FirstName LastName patterns
    const mentionRegex = /@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)/g
    const matches = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push(match[1])
    }
    return matches
  }, [])

  // Find user IDs from mentioned names
  const findMentionedUserIds = useCallback((mentionedNames, membros) => {
    if (!mentionedNames.length || !membros.length) return []

    return mentionedNames.map(name => {
      const member = membros.find(m => {
        const memberName = m.nome?.toLowerCase() || ''
        const mentionName = name.toLowerCase()
        // Match full name or first name
        return memberName === mentionName ||
               memberName.startsWith(mentionName + ' ') ||
               memberName.split(' ')[0] === mentionName
      })
      return member?.id
    }).filter(Boolean)
  }, [])

  // Create mention notifications for a message
  const createMentionNotifications = useCallback(async (message, mentionedUserIds, canalInfo) => {
    if (!mentionedUserIds.length || !profile?.id) return

    try {
      // Insert notifications into notificacoes for each mentioned user (except self)
      const notificationsToInsert = mentionedUserIds
        .filter(userId => userId !== profile.id)
        .map(userId => ({
          user_id: userId,
          sender_id: profile.id,
          type: 'mention',
          title: '@Menção',
          message: `${profile.nome || 'Alguém'} mencionou-te: "${message.conteudo?.substring(0, 50)}${message.conteudo?.length > 50 ? '...' : ''}"`,
          context: {
            project: canalInfo?.codigo || canalInfo?.nome,
            channel: canalInfo?.nome,
            message_id: message.id,
            canal_id: message.canal_id
          },
          link: `/workspace?canal=${message.canal_id}`,
          read: false
        }))

      if (notificationsToInsert.length > 0) {
        const { error } = await supabase.from('notificacoes').insert(notificationsToInsert)
        if (error) throw error
      }

      // Also insert into chat_mencoes for mention tracking
      const mencoesToInsert = mentionedUserIds
        .filter(userId => userId !== profile.id)
        .map(userId => ({
          mensagem_id: message.id,
          utilizador_id: userId,
          lida: false
        }))

      if (mencoesToInsert.length > 0) {
        await supabase.from('chat_mencoes').insert(mencoesToInsert)
      }
    } catch (err) {
      console.error('Failed to create mention notifications:', err.message)
    }
  }, [profile])

  // Load mention notifications for current user
  const loadMentionNotifications = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          *,
          sender:sender_id(id, nome, avatar_url)
        `)
        .eq('user_id', profile.id)
        .eq('type', 'mention')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setMentionNotifications(data)
        setUnreadMentionsCount(data.filter(n => !n.read).length)
      }
    } catch (err) {
      // Silent fail - table might not exist yet
    }
  }, [profile?.id])

  // Mark mention as read
  const markMentionAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return

    try {
      await supabase
        .from('notificacoes')
        .update({ read: true })
        .eq('id', notificationId)

      setMentionNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadMentionsCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      // Silent fail
    }
  }, [])

  // Mark all mentions as read
  const markAllMentionsAsRead = useCallback(async () => {
    if (!profile?.id) return

    try {
      await supabase
        .from('notificacoes')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('type', 'mention')
        .eq('read', false)

      setMentionNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadMentionsCount(0)
    } catch (err) {
      // Silent fail
    }
  }, [profile?.id])

  // Subscribe to new mention notifications
  useEffect(() => {
    if (!profile?.id) return

    loadMentionNotifications()

    // Subscribe to new notifications
    const subscription = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        if (payload.new.type === 'mention') {
          setMentionNotifications(prev => [payload.new, ...prev])
          setUnreadMentionsCount(prev => prev + 1)
          playNotificationSound()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [profile?.id, loadMentionNotifications, playNotificationSound])

  // ========== CHECK DUE REMINDERS ==========
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      reminders.forEach(reminder => {
        if (reminder.completed) return
        const reminderTime = new Date(reminder.reminderTime)
        if (now >= reminderTime) {
          playNotificationSound()
          // Could trigger a toast notification here
        }
      })
    }

    // Check every minute
    const interval = setInterval(checkReminders, 60 * 1000)
    return () => clearInterval(interval)
  }, [reminders, playNotificationSound])

  return {
    // State
    mutedChannels,
    pinnedMessages,
    soundEnabled,
    channelPinnedMessages,
    showPinnedMessages,
    dndEnabled,
    dndSchedule,
    showDndSettings,
    reminders,
    showReminderModal,
    reminderMessage,
    customReminderDate,

    // Setters
    setMutedChannels,
    setPinnedMessages,
    setSoundEnabled,
    setShowPinnedMessages,
    setDndEnabled,
    setDndSchedule,
    setShowDndSettings,
    setReminders,
    setShowReminderModal,
    setReminderMessage,
    setCustomReminderDate,

    // Actions
    toggleMuteChannel,
    isChannelMuted,
    toggleSound,
    playNotificationSound,
    togglePinMessage,
    isMessagePinned,
    getChannelPinnedMessages,
    toggleDnd,
    updateDndSchedule,
    isDndActive,
    addReminder,
    removeReminder,
    markReminderComplete,
    getActiveReminders,
    openReminderModal,

    // Mention notifications
    mentionNotifications,
    unreadMentionsCount,
    parseMentions,
    findMentionedUserIds,
    createMentionNotifications,
    loadMentionNotifications,
    markMentionAsRead,
    markAllMentionsAsRead
  }
}
