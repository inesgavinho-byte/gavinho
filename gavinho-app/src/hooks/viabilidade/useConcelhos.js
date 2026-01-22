import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function useConcelhos() {
  const [concelhos, setConcelhos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadConcelhos()
  }, [])

  const loadConcelhos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('concelhos')
        .select('*')
        .order('nome')

      if (error) throw error
      setConcelhos(data || [])
    } catch (err) {
      console.error('Erro ao carregar concelhos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getConcelhoById = (id) => {
    return concelhos.find(c => c.id === id)
  }

  const getConcelhoAtivos = () => {
    return concelhos.filter(c => c.activo)
  }

  return {
    concelhos,
    loading,
    error,
    getConcelhoById,
    getConcelhoAtivos,
    reload: loadConcelhos
  }
}
