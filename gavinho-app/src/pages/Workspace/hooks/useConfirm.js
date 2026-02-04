// =====================================================
// USE CONFIRM HOOK - Modal confirmation management
// =====================================================

import { useState, useCallback } from 'react'

const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: null,
    isLoading: false
  })

  const confirm = useCallback(({
    title = 'Confirmar',
    message = 'Tens a certeza?',
    type = 'warning',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        },
        isLoading: false
      })
    })
  }, [])

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setLoading = useCallback((loading) => {
    setConfirmState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  // Convenience methods for common confirmations
  const confirmDelete = useCallback((itemName) => {
    return confirm({
      title: 'Eliminar',
      message: `Tens a certeza que queres eliminar ${itemName}? Esta ação não pode ser revertida.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    })
  }, [confirm])

  const confirmArchive = useCallback((itemName) => {
    return confirm({
      title: 'Arquivar',
      message: `Tens a certeza que queres arquivar ${itemName}?`,
      type: 'warning',
      confirmText: 'Arquivar',
      cancelText: 'Cancelar'
    })
  }, [confirm])

  return {
    confirmState,
    confirm,
    closeConfirm,
    setLoading,
    confirmDelete,
    confirmArchive
  }
}

export default useConfirm
