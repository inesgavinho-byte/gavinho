// =====================================================
// TOAST NOTIFICATIONS - Replace native alert()
// =====================================================

import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// Individual Toast component
const ToastItem = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => onDismiss(toast.id), 300)
      }, toast.duration || 4000)
      return () => clearTimeout(timer)
    }
  }, [toast, onDismiss])

  const icons = {
    success: <CheckCircle size={20} className="text-green-400" />,
    error: <AlertCircle size={20} className="text-red-400" />,
    warning: <AlertTriangle size={20} className="text-yellow-400" />,
    info: <Info size={20} className="text-blue-400" />
  }

  const backgrounds = {
    success: 'bg-green-900/90 border-green-700',
    error: 'bg-red-900/90 border-red-700',
    warning: 'bg-yellow-900/90 border-yellow-700',
    info: 'bg-blue-900/90 border-blue-700'
  }

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${backgrounds[toast.type]}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        transition-all duration-300
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-medium text-white mb-1">{toast.title}</p>
        )}
        <p className="text-sm text-gray-200">{toast.message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        aria-label="Fechar notificação"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// Toast Container component
const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        .animate-slide-out {
          animation: slideOut 0.3s ease-in forwards;
        }
      `}</style>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export { ToastContainer, ToastItem }
export default ToastContainer
