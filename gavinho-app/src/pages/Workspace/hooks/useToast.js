// =====================================================
// USE TOAST HOOK - Toast notification management
// =====================================================

import { useState, useCallback } from 'react'

let toastIdCounter = 0

const useToast = () => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastIdCounter
    const newToast = { id, type, title, message, duration }

    setToasts(prev => [...prev, newToast])

    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback((message, title) => {
    return addToast({ type: 'success', message, title })
  }, [addToast])

  const error = useCallback((message, title = 'Erro') => {
    return addToast({ type: 'error', message, title, duration: 6000 })
  }, [addToast])

  const warning = useCallback((message, title = 'Aviso') => {
    return addToast({ type: 'warning', message, title })
  }, [addToast])

  const info = useCallback((message, title) => {
    return addToast({ type: 'info', message, title })
  }, [addToast])

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  }
}

export default useToast
