// =====================================================
// useAsync - Custom hook para operações assíncronas
// =====================================================

import { useState, useCallback, useRef } from 'react'

/**
 * Hook para executar operações assíncronas com gestão de estado
 *
 * @param {Function} asyncFunction - Função assíncrona a executar
 * @param {Object} options - Opções adicionais
 * @param {Function} options.onSuccess - Callback de sucesso
 * @param {Function} options.onError - Callback de erro
 *
 * @returns {object} - { execute, isLoading, error, data, reset }
 *
 * @example
 * const saveProject = useAsync(
 *   async (data) => {
 *     const result = await supabase.from('projetos').update(data)
 *     return result
 *   },
 *   {
 *     onSuccess: () => toast.success('Guardado!'),
 *     onError: (err) => toast.error(err.message)
 *   }
 * )
 *
 * <button
 *   onClick={() => saveProject.execute(formData)}
 *   disabled={saveProject.isLoading}
 * >
 *   {saveProject.isLoading ? 'A guardar...' : 'Guardar'}
 * </button>
 */
export function useAsync(asyncFunction, options = {}) {
  const { onSuccess, onError } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Ref para evitar updates após unmount
  const mountedRef = useRef(true)

  const execute = useCallback(async (...args) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await asyncFunction(...args)

      // Supabase retorna { data, error }
      if (result?.error) {
        throw result.error
      }

      const responseData = result?.data ?? result

      if (mountedRef.current) {
        setData(responseData)
        onSuccess?.(responseData)
      }

      return responseData
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        onError?.(err)
      }
      throw err
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [asyncFunction, onSuccess, onError])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  // Cleanup on unmount
  useState(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  })

  return {
    execute,
    isLoading,
    error,
    data,
    reset
  }
}

/**
 * Hook para debounce de operações assíncronas
 *
 * @example
 * const search = useDebouncedAsync(
 *   async (query) => fetchResults(query),
 *   300
 * )
 *
 * <input onChange={(e) => search.execute(e.target.value)} />
 */
export function useDebouncedAsync(asyncFunction, delay = 300, options = {}) {
  const timeoutRef = useRef(null)
  const asyncState = useAsync(asyncFunction, options)

  const debouncedExecute = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      asyncState.execute(...args)
    }, delay)
  }, [asyncState, delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    ...asyncState,
    execute: debouncedExecute,
    cancel
  }
}

export default useAsync
