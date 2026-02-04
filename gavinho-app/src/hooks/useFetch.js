// =====================================================
// useFetch - Custom hook para fetch de dados
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook para fetch de dados com gestão de loading, erro e cache
 *
 * @param {Function} fetchFn - Função async que retorna os dados
 * @param {Array} deps - Dependências para re-fetch (default: [])
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.immediate - Executar imediatamente (default: true)
 * @param {boolean} options.cache - Usar cache (default: false)
 *
 * @returns {object} - { data, loading, error, refetch, setData }
 *
 * @example
 * const { data: projetos, loading, error, refetch } = useFetch(
 *   () => supabase.from('projetos').select('*'),
 *   [clienteId]
 * )
 */
export function useFetch(fetchFn, deps = [], options = {}) {
  const { immediate = true, cache = false } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  // Ref para evitar updates após unmount
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn()

      if (mountedRef.current) {
        // Supabase retorna { data, error }
        if (result?.error) {
          throw result.error
        }
        setData(result?.data ?? result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        console.error('useFetch error:', err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchFn])

  const refetch = useCallback(() => {
    return execute()
  }, [execute])

  useEffect(() => {
    mountedRef.current = true

    if (immediate) {
      execute()
    }

    return () => {
      mountedRef.current = false
    }
  }, deps)

  return {
    data,
    loading,
    error,
    refetch,
    setData
  }
}

/**
 * Hook simplificado para múltiplos fetches em paralelo
 *
 * @example
 * const { data, loading, errors } = useFetchAll({
 *   projetos: () => supabase.from('projetos').select('*'),
 *   clientes: () => supabase.from('clientes').select('*'),
 * })
 */
export function useFetchAll(fetchFunctions, deps = []) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    let mounted = true

    const execute = async () => {
      setLoading(true)
      const newData = {}
      const newErrors = {}

      await Promise.all(
        Object.entries(fetchFunctions).map(async ([key, fn]) => {
          try {
            const result = await fn()
            if (result?.error) {
              newErrors[key] = result.error
            } else {
              newData[key] = result?.data ?? result
            }
          } catch (err) {
            newErrors[key] = err
          }
        })
      )

      if (mounted) {
        setData(newData)
        setErrors(newErrors)
        setLoading(false)
      }
    }

    execute()

    return () => {
      mounted = false
    }
  }, deps)

  return { data, loading, errors }
}

export default useFetch
