// =====================================================
// TOAST - Notification component
// =====================================================

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import './Toast.css'

// Toast Context
const ToastContext = createContext(null)

// Toast types configuration
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    className: 'toast-success'
  },
  error: {
    icon: AlertCircle,
    className: 'toast-error'
  },
  warning: {
    icon: AlertTriangle,
    className: 'toast-warning'
  },
  info: {
    icon: Info,
    className: 'toast-info'
  }
}

// Individual Toast component
function ToastItem({ id, type = 'info', title, message, duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const config = TOAST_CONFIG[type]
  const Icon = config.icon

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true))

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onClose(id), 300)
  }

  return (
    <div
      className={`toast ${config.className} ${isVisible ? 'toast-visible' : ''} ${isLeaving ? 'toast-leaving' : ''}`}
      role="alert"
    >
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        {message && <div className="toast-message">{message}</div>}
      </div>
      <button className="toast-close" onClick={handleClose} aria-label="Fechar">
        <X size={16} />
      </button>
    </div>
  )
}

// Toast Container
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  )
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, title, message, duration }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    show: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    dismiss: removeToast
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
