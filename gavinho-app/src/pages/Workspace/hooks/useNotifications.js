// =====================================================
// USE NOTIFICATIONS HOOK
// Muted channels, pinned messages, sound, DND, reminders
// =====================================================

import { useState, useCallback, useEffect } from 'react'

export default function useNotifications() {
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
    openReminderModal
  }
}
