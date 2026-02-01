import { useEffect, useRef } from 'react'
import { X, AlertTriangle, Info, CheckCircle, Trash2, Loader2 } from 'lucide-react'
import './ConfirmModal.css'

/**
 * ConfirmModal - Componente reutilizavel para confirmacoes
 * Substitui alert() e confirm() nativos do browser
 *
 * @param {boolean} isOpen - Controla visibilidade do modal
 * @param {function} onClose - Callback ao fechar
 * @param {function} onConfirm - Callback ao confirmar
 * @param {string} title - Titulo do modal
 * @param {string} message - Mensagem/descricao
 * @param {string} type - Tipo: 'danger' | 'warning' | 'info' | 'success'
 * @param {string} confirmText - Texto do botao confirmar
 * @param {string} cancelText - Texto do botao cancelar
 * @param {boolean} loading - Estado de loading
 * @param {boolean} showCancel - Mostrar botao cancelar
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar',
  message = 'Tem a certeza que pretende continuar?',
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
  showCancel = true
}) {
  const modalRef = useRef(null)
  const confirmButtonRef = useRef(null)

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    // Focus confirm button when modal opens
    setTimeout(() => {
      confirmButtonRef.current?.focus()
    }, 100)

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, loading, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} />
      case 'warning':
        return <AlertTriangle size={24} />
      case 'success':
        return <CheckCircle size={24} />
      case 'info':
      default:
        return <Info size={24} />
    }
  }

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'confirm-modal-btn-danger'
      case 'warning':
        return 'confirm-modal-btn-warning'
      case 'success':
        return 'confirm-modal-btn-success'
      case 'info':
      default:
        return 'confirm-modal-btn-primary'
    }
  }

  return (
    <div
      className="confirm-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="confirm-modal" ref={modalRef}>
        <button
          className="confirm-modal-close"
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className={`confirm-modal-icon confirm-modal-icon-${type}`}>
          {getIcon()}
        </div>

        <h3 id="confirm-modal-title" className="confirm-modal-title">
          {title}
        </h3>

        <p className="confirm-modal-message">
          {message}
        </p>

        <div className="confirm-modal-actions">
          {showCancel && (
            <button
              className="confirm-modal-btn confirm-modal-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            className={`confirm-modal-btn ${getButtonClass()}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                A processar...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook para usar ConfirmModal de forma imperativa
 * Permite usar como: const confirmed = await confirm('Tens a certeza?')
 */
export function useConfirmModal() {
  // Este hook seria implementado com um contexto global
  // Por agora, retorna uma funcao que usa o ConfirmModal
  return {
    confirm: async (options) => {
      return new Promise((resolve) => {
        // Esta seria a implementacao com contexto
        // Por agora, usa-se o componente diretamente
        resolve(window.confirm(options.message || options))
      })
    }
  }
}

export default ConfirmModal
