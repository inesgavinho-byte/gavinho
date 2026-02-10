// =====================================================
// useGarvisAlerts - Hook para alertas G.A.R.V.I.S.
// Fetch, mark read, archive, generate automatic alerts
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGarvisAlerts(options = {}) {
  const { autoGenerate = true, pollInterval = 60000 } = options

  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)
  const pollRef = useRef(null)

  // Fetch all active alerts (not archived)
  const fetchAlertas = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('alertas_garvis')
        .select('*')
        .eq('arquivado', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchErr) {
        // Table may not exist yet - return empty
        if (fetchErr.code === '42P01') {
          if (mountedRef.current) {
            setAlertas([])
            setLoading(false)
          }
          return
        }
        throw fetchErr
      }

      if (mountedRef.current) {
        setAlertas(data || [])
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message)
        // Fallback to empty on any error
        setAlertas([])
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Mark alert as read
  const markRead = useCallback(async (alertId) => {
    try {
      const { error } = await supabase
        .from('alertas_garvis')
        .update({ lido: true, data_leitura: new Date().toISOString() })
        .eq('id', alertId)

      if (error) throw error

      setAlertas(prev => prev.map(a =>
        a.id === alertId ? { ...a, lido: true, data_leitura: new Date().toISOString() } : a
      ))
    } catch (err) {
      console.error('Error marking alert read:', err)
    }
  }, [])

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      const unreadIds = alertas.filter(a => !a.lido).map(a => a.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('alertas_garvis')
        .update({ lido: true, data_leitura: new Date().toISOString() })
        .in('id', unreadIds)

      if (error) throw error

      setAlertas(prev => prev.map(a => ({ ...a, lido: true, data_leitura: new Date().toISOString() })))
    } catch (err) {
      console.error('Error marking all read:', err)
    }
  }, [alertas])

  // Archive alert
  const archiveAlert = useCallback(async (alertId) => {
    try {
      const { error } = await supabase
        .from('alertas_garvis')
        .update({ arquivado: true })
        .eq('id', alertId)

      if (error) throw error

      setAlertas(prev => prev.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('Error archiving alert:', err)
    }
  }, [])

  // Generate automatic alerts from data analysis
  const generateAutoAlerts = useCallback(async () => {
    try {
      // 1. Check expiring certifications (within 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: expiringCerts } = await supabase
        .from('fornecedor_certificacoes')
        .select('*, fornecedores!inner(nome)')
        .lte('data_validade', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('data_validade', new Date().toISOString().split('T')[0])

      if (expiringCerts?.length > 0) {
        for (const cert of expiringCerts) {
          const daysLeft = Math.ceil(
            (new Date(cert.data_validade) - new Date()) / (1000 * 60 * 60 * 24)
          )

          // Check if alert already exists for this cert
          const { data: existing } = await supabase
            .from('alertas_garvis')
            .select('id')
            .eq('entidade_tipo', 'certificacao')
            .eq('entidade_id', cert.id)
            .eq('arquivado', false)
            .limit(1)

          if (!existing || existing.length === 0) {
            await supabase.from('alertas_garvis').insert({
              tipo: 'compliance',
              prioridade: daysLeft <= 7 ? 'critico' : daysLeft <= 15 ? 'importante' : 'normal',
              titulo: `Certificação ${cert.tipo} a expirar`,
              mensagem: `${cert.tipo} de ${cert.fornecedores?.nome} expira em ${daysLeft} dias (${new Date(cert.data_validade).toLocaleDateString('pt-PT')}).`,
              entidade_tipo: 'certificacao',
              entidade_id: cert.id,
              acao_sugerida: `/fornecedores/${cert.fornecedor_id}`,
              acao_label: 'Ver fornecedor'
            })
          }
        }
      }

      // 2. Check quote deviations (if price references exist)
      const { data: recentQuotes } = await supabase
        .from('orcamento_recebido_linhas')
        .select('*, orcamentos_recebidos!inner(fornecedor_id, fornecedores!inner(nome))')
        .gt('desvio_percentual', 15)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentQuotes?.length > 0) {
        for (const line of recentQuotes) {
          const { data: existing } = await supabase
            .from('alertas_garvis')
            .select('id')
            .eq('entidade_tipo', 'orcamento_linha')
            .eq('entidade_id', line.id)
            .eq('arquivado', false)
            .limit(1)

          if (!existing || existing.length === 0) {
            const fornNome = line.orcamentos_recebidos?.fornecedores?.nome || 'Fornecedor'
            await supabase.from('alertas_garvis').insert({
              tipo: 'orcamento',
              prioridade: line.desvio_percentual > 25 ? 'critico' : 'importante',
              titulo: 'Orçamento acima do mercado',
              mensagem: `${fornNome} cotou "${line.descricao}" ${line.desvio_percentual?.toFixed(0)}% acima do preço de referência.`,
              entidade_tipo: 'orcamento_linha',
              entidade_id: line.id,
              acao_label: 'Analisar orçamento'
            })
          }
        }
      }

      // Refresh alerts after generation
      await fetchAlertas()
    } catch (err) {
      // Silent fail - auto-generation is non-critical
      // Tables may not exist yet
    }
  }, [fetchAlertas])

  // Create a manual alert
  const createAlert = useCallback(async (alert) => {
    try {
      const { data, error } = await supabase
        .from('alertas_garvis')
        .insert(alert)
        .select()
        .single()

      if (error) throw error

      setAlertas(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating alert:', err)
      return null
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true
    fetchAlertas()

    // Auto-generate alerts on mount
    if (autoGenerate) {
      generateAutoAlerts()
    }

    // Poll for new alerts
    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchAlertas, pollInterval)
    }

    return () => {
      mountedRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchAlertas, autoGenerate, pollInterval])

  // Computed values
  const unreadCount = alertas.filter(a => !a.lido).length
  const criticalCount = alertas.filter(a => a.prioridade === 'critico' && !a.lido).length
  const topAlert = alertas.find(a => !a.lido && (a.prioridade === 'critico' || a.prioridade === 'importante'))

  return {
    alertas,
    loading,
    error,
    unreadCount,
    criticalCount,
    topAlert,
    fetchAlertas,
    markRead,
    markAllRead,
    archiveAlert,
    createAlert,
    generateAutoAlerts
  }
}

export default useGarvisAlerts
