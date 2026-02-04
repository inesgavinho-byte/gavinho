// =====================================================
// CONFIRM MODAL - Replace native window.confirm
// =====================================================

import React from 'react'
import { X, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react'

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar',
  message = 'Tens a certeza?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  isLoading = false
}) => {
  if (!isOpen) return null

  const icons = {
    warning: <AlertTriangle size={24} className="text-yellow-500" />,
    danger: <Trash2 size={24} className="text-red-500" />,
    info: <Info size={24} className="text-blue-500" />,
    success: <CheckCircle size={24} className="text-green-500" />
  }

  const buttonStyles = {
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    danger: 'bg-red-500 hover:bg-red-600',
    info: 'bg-blue-500 hover:bg-blue-600',
    success: 'bg-green-500 hover:bg-green-600'
  }

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-[#1a1d21] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-white mb-2">
              {title}
            </h3>
            <p className="text-gray-300 text-sm">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm text-white rounded transition-colors disabled:opacity-50 ${buttonStyles[type]}`}
          >
            {isLoading ? 'A processar...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
