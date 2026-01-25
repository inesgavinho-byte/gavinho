import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export function useAnalise(analiseId = null) {
  const { user } = useAuth()
  const [analise, setAnalise] = useState(null)
  const [analises, setAnalises] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Carregar análise específica
  const loadAnalise = useCallback(async () => {
    if (!analiseId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_analises_completas')
        .select('*')
        .eq('id', analiseId)
        .single()

      if (error) throw error
      setAnalise(data)
    } catch (err) {
      console.error('Erro ao carregar análise:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [analiseId])

  // Carregar lista de análises (por projeto ou todas)
  const loadAnalises = useCallback(async (projetoId = null) => {
    try {
      setLoading(true)
      let query = supabase
        .from('v_analises_completas')
        .select('*')
        .order('created_at', { ascending: false })

      if (projetoId) {
        query = query.eq('projeto_id', projetoId)
      }

      const { data, error } = await query

      if (error) throw error
      setAnalises(data || [])
    } catch (err) {
      console.error('Erro ao carregar análises:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (analiseId) {
      loadAnalise()
    }
  }, [analiseId, loadAnalise])

  // Criar nova análise
  const createAnalise = async (dados) => {
    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('analises_viabilidade')
        .insert({
          ...dados,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      console.error('Erro ao criar análise:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  // Atualizar análise
  const updateAnalise = async (dados) => {
    if (!analiseId) return { success: false, error: 'ID não definido' }

    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('analises_viabilidade')
        .update({
          ...dados,
          updated_at: new Date().toISOString()
        })
        .eq('id', analiseId)
        .select()
        .single()

      if (error) throw error

      // Recarregar análise completa
      await loadAnalise()

      return { success: true, data }
    } catch (err) {
      console.error('Erro ao atualizar análise:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  // Atualizar resultado da análise
  const updateResultado = async (resultado) => {
    return updateAnalise({ resultado })
  }

  // Validar análise
  const validarAnalise = async () => {
    if (!analiseId) return { success: false, error: 'ID não definido' }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('analises_viabilidade')
        .update({
          estado: 'validado',
          validado_por: user.id,
          validado_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', analiseId)

      if (error) throw error

      await loadAnalise()
      return { success: true }
    } catch (err) {
      console.error('Erro ao validar análise:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  // Alterar estado
  const alterarEstado = async (novoEstado) => {
    return updateAnalise({ estado: novoEstado })
  }

  // Eliminar análise
  const deleteAnalise = async () => {
    if (!analiseId) return { success: false, error: 'ID não definido' }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('analises_viabilidade')
        .delete()
        .eq('id', analiseId)

      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('Erro ao eliminar análise:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }

  return {
    analise,
    analises,
    loading,
    saving,
    error,
    loadAnalise,
    loadAnalises,
    createAnalise,
    updateAnalise,
    updateResultado,
    validarAnalise,
    alterarEstado,
    deleteAnalise
  }
}

// Hook para lista de análises de um projeto
export function useProjetoAnalises(projetoId) {
  const [analises, setAnalises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projetoId) {
      setLoading(false)
      return
    }

    const loadAnalises = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('v_analises_completas')
          .select('*')
          .eq('projeto_id', projetoId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAnalises(data || [])
      } catch (err) {
        console.error('Erro ao carregar análises do projeto:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAnalises()
  }, [projetoId])

  return { analises, loading, error }
}
