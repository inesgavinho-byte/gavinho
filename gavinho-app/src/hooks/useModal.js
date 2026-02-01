// =====================================================
// useModal - Custom hook para gestão de modais
// =====================================================

import { useState, useCallback } from 'react'

/**
 * Hook para gerir o estado de modais de forma simplificada
 *
 * @param {boolean} initialState - Estado inicial (default: false)
 * @returns {object} - { isOpen, open, close, toggle, data, openWith }
 *
 * @example
 * const editModal = useModal()
 *
 * // Abrir modal simples
 * <button onClick={editModal.open}>Editar</button>
 *
 * // Abrir modal com dados
 * <button onClick={() => editModal.openWith(item)}>Editar Item</button>
 *
 * // Usar no modal
 * {editModal.isOpen && (
 *   <Modal onClose={editModal.close} data={editModal.data} />
 * )}
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)
  const [data, setData] = useState(null)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const openWith = useCallback((newData) => {
    setData(newData)
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    data,
    openWith
  }
}

export default useModal
