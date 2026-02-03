import { useEffect, useCallback } from 'react'

export function useKeyboardShortcuts({
  onSendMessage,
  onSearch,
  onBold,
  onItalic,
  onCode,
  onEscape,
  messageInputRef
}) {
  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSendMessage?.()
      return
    }

    // Escape to close modals/menus
    if (e.key === 'Escape') {
      onEscape?.()
      return
    }

    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      onSearch?.()
      return
    }

    // Check if input is focused
    const inputFocused = document.activeElement === messageInputRef?.current

    // Ctrl/Cmd + B for bold (when input focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'b' && inputFocused) {
      e.preventDefault()
      onBold?.()
      return
    }

    // Ctrl/Cmd + I for italic (when input focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'i' && inputFocused) {
      e.preventDefault()
      onItalic?.()
      return
    }

    // Ctrl/Cmd + Shift + C for code (when input focused)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && inputFocused) {
      e.preventDefault()
      onCode?.()
      return
    }
  }, [onSendMessage, onSearch, onBold, onItalic, onCode, onEscape, messageInputRef])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
