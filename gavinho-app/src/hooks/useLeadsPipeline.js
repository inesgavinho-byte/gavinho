// =====================================================
// LEADS PIPELINE HOOK
// Data fetching, CRUD, KPIs, and realtime subscription
// for the Leads Pipeline kanban board
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry'

const FASES = ['contacto_inicial', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido']

/**
 * Hook para o pipeline de leads — kanban board, CRUD, KPIs, interações.
 *
 * @returns {{ leads: object[], loading: boolean, error: string|null, equipa: object[], kpis: object, leadsByFase: Record<string, object[]>, fetchLeads: () => Promise<void>, createLead: (data: object) => Promise<object|null>, updateLead: (id: string, data: object) => Promise<boolean>, deleteLead: (id: string) => Promise<boolean>, moveLead: (id: string, fase: string) => Promise<boolean> }}
 */
export function useLeadsPipeline() {
  const [leads, setLeads] = useState([])
  const [interacoes, setInteracoes] = useState({}) // keyed by lead_id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [equipa, setEquipa] = useState([])

  // ── Fetch all leads ──
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) {
        // Table doesn't exist yet — gracefully degrade
        if (err.code === '42P01') {
          setLeads([])
          return
        }
        throw err
      }
      setLeads(data || [])
    } catch (err) {
      Sentry.captureException(err, { tags: { hook: 'useLeadsPipeline' } })
      console.error('Erro ao carregar leads:', err)
      setError(err.message)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch team members for assignment ──
  const fetchEquipa = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('equipa')
        .select('id, nome, email, cargo, avatar_url, user_id')
        .order('nome')
      setEquipa(data || [])
    } catch {
      // equipa table may not exist
      setEquipa([])
    }
  }, [])

  // ── Fetch interactions for a specific lead ──
  const fetchInteracoes = useCallback(async (leadId) => {
    try {
      const { data, error: err } = await supabase
        .from('lead_interacoes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (err) {
        if (err.code === '42P01') return []
        throw err
      }
      setInteracoes(prev => ({ ...prev, [leadId]: data || [] }))
      return data || []
    } catch (err) {
      console.error('Erro ao carregar interacoes:', err)
      return []
    }
  }, [])

  // ── Initial fetch + realtime ──
  useEffect(() => {
    fetchLeads()
    fetchEquipa()

    // Realtime subscription for leads changes
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new : l))
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== payload.old.id))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_interacoes' }, (payload) => {
        const leadId = payload.new.lead_id
        setInteracoes(prev => ({
          ...prev,
          [leadId]: [payload.new, ...(prev[leadId] || [])]
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLeads, fetchEquipa])

  // ── Create lead ──
  const createLead = useCallback(async (leadData) => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    const { data, error: err } = await supabase
      .from('leads')
      .insert({
        ...leadData,
        responsavel_id: leadData.responsavel_id || userId,
        data_contacto: leadData.data_contacto || new Date().toISOString().split('T')[0],
        data_ultima_interacao: new Date().toISOString()
      })
      .select()
      .single()

    if (err) throw err
    return data
  }, [])

  // ── Update lead ──
  const updateLead = useCallback(async (leadId, updates) => {
    const { data, error: err } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single()

    if (err) throw err
    return data
  }, [])

  // ── Move lead to new phase ──
  const moveLead = useCallback(async (leadId, newFase) => {
    const updates = { fase: newFase }

    // If moved to ganho, set conversion date
    if (newFase === 'ganho') {
      updates.data_conversao = new Date().toISOString()
    }
    // If moved to perdido, keep motivo_perda as is (set from detail panel)
    // Clear conversion date if moved back from ganho
    if (newFase !== 'ganho') {
      updates.data_conversao = null
    }

    const { data, error: err } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single()

    if (err) throw err

    // Auto-log the phase change as an interaction
    const { data: userData } = await supabase.auth.getUser()
    const faseLabels = {
      contacto_inicial: 'Contacto Inicial',
      qualificacao: 'Qualificacao',
      proposta: 'Proposta',
      negociacao: 'Negociacao',
      ganho: 'Ganho',
      perdido: 'Perdido'
    }
    await supabase.from('lead_interacoes').insert({
      lead_id: leadId,
      tipo: 'nota',
      descricao: `Fase alterada para: ${faseLabels[newFase] || newFase}`,
      created_by: userData?.user?.id
    })

    return data
  }, [])

  // ── Delete lead ──
  const deleteLead = useCallback(async (leadId) => {
    const { error: err } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)

    if (err) throw err
  }, [])

  // ── Add interaction ──
  const addInteracao = useCallback(async (leadId, interacaoData) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error: err } = await supabase
      .from('lead_interacoes')
      .insert({
        lead_id: leadId,
        ...interacaoData,
        created_by: userData?.user?.id
      })
      .select()
      .single()

    if (err) throw err
    return data
  }, [])

  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    const total = leads.length
    const byFase = {}
    for (const f of FASES) {
      byFase[f] = leads.filter(l => l.fase === f).length
    }

    // Conversion rate: ganho / (ganho + perdido)
    const closed = byFase.ganho + byFase.perdido
    const taxaConversao = closed > 0 ? (byFase.ganho / closed) * 100 : 0

    // Active pipeline (not ganho/perdido)
    const pipelineAtivo = total - byFase.ganho - byFase.perdido

    // Pipeline value (active leads only)
    const valorPipeline = leads
      .filter(l => !['ganho', 'perdido'].includes(l.fase))
      .reduce((s, l) => s + (l.orcamento_estimado || 0), 0)

    // Value won
    const valorGanho = leads
      .filter(l => l.fase === 'ganho')
      .reduce((s, l) => s + (l.orcamento_estimado || 0), 0)

    // Average time to close (days) for won leads
    const temposConversao = leads
      .filter(l => l.fase === 'ganho' && l.data_conversao && l.data_contacto)
      .map(l => {
        const start = new Date(l.data_contacto)
        const end = new Date(l.data_conversao)
        return Math.floor((end - start) / 86400000)
      })
    const tempoMedioConversao = temposConversao.length > 0
      ? Math.round(temposConversao.reduce((a, b) => a + b, 0) / temposConversao.length)
      : 0

    return {
      total,
      byFase,
      taxaConversao,
      pipelineAtivo,
      valorPipeline,
      valorGanho,
      tempoMedioConversao
    }
  }, [leads])

  // ── Leads grouped by fase for kanban ──
  const leadsByFase = useMemo(() => {
    const grouped = {}
    for (const f of FASES) {
      grouped[f] = leads.filter(l => l.fase === f)
    }
    return grouped
  }, [leads])

  return {
    leads,
    leadsByFase,
    interacoes,
    loading,
    error,
    equipa,
    kpis,
    fetchLeads,
    fetchInteracoes,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    addInteracao
  }
}

export default useLeadsPipeline
