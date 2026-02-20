// =====================================================
// useDealRooms - Hook para gestão de Deal Rooms
// CRUD, convidar fornecedores, acompanhar status
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry'

// Generate deal room code (GA + 5 digits)
function generateCodigo() {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `GA${num}`
}

/**
 * Hook para gestão de Deal Rooms — CRUD, convidar fornecedores, acompanhar status.
 *
 * @param {{ projetoId?: string|null, status?: string|null }} [options]
 * @returns {{ dealRooms: object[], loading: boolean, error: string|null, fetchDealRooms: () => Promise<void>, createDealRoom: (data: object) => Promise<object|null>, updateDealRoom: (id: string, data: object) => Promise<boolean> }}
 */
export function useDealRooms(options = {}) {
  const { projetoId = null, status = null } = options

  const [dealRooms, setDealRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  // Fetch deal rooms with supplier counts
  const fetchDealRooms = useCallback(async () => {
    try {
      let query = supabase
        .from('deal_rooms')
        .select(`
          *,
          deal_room_fornecedores(
            id, fornecedor_id, status, data_orcamento,
            fornecedores(id, nome, especialidade, rating)
          ),
          orcamentos_recebidos(id, valor_total, status)
        `)
        .order('created_at', { ascending: false })

      if (projetoId) query = query.eq('projeto_id', projetoId)
      if (status) query = query.eq('status', status)

      const { data, error: fetchErr } = await query

      if (fetchErr) {
        // Table may not exist yet
        if (fetchErr.code === '42P01') {
          if (mountedRef.current) {
            setDealRooms([])
            setLoading(false)
          }
          return
        }
        throw fetchErr
      }

      // Enrich with computed fields
      const enriched = (data || []).map(dr => ({
        ...dr,
        fornecedoresCount: dr.deal_room_fornecedores?.length || 0,
        orcamentosCount: dr.orcamentos_recebidos?.length || 0,
        orcamentosRecebidos: dr.deal_room_fornecedores?.filter(
          f => f.status === 'orcamento_recebido'
        ).length || 0,
        // Badge for panel display
        badge: getBadge(dr),
        badgeColor: getBadgeColor(dr),
        detalhe: getDetalhe(dr)
      }))

      if (mountedRef.current) {
        setDealRooms(enriched)
        setError(null)
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { hook: 'useDealRooms' } })
      if (mountedRef.current) {
        setError(err.message)
        setDealRooms([])
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [projetoId, status])

  // Create deal room
  const createDealRoom = useCallback(async (dealRoomData) => {
    try {
      const { data, error } = await supabase
        .from('deal_rooms')
        .insert({
          ...dealRoomData,
          codigo: dealRoomData.codigo || generateCodigo(),
          status: 'aberto'
        })
        .select()
        .single()

      if (error) throw error
      await fetchDealRooms()
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }, [fetchDealRooms])

  // Update deal room
  const updateDealRoom = useCallback(async (id, updates) => {
    try {
      const { error } = await supabase
        .from('deal_rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await fetchDealRooms()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }, [fetchDealRooms])

  // Invite supplier to deal room
  const inviteSupplier = useCallback(async (dealRoomId, fornecedorId) => {
    try {
      const { error } = await supabase
        .from('deal_room_fornecedores')
        .insert({
          deal_room_id: dealRoomId,
          fornecedor_id: fornecedorId,
          status: 'convidado'
        })

      if (error) throw error
      await fetchDealRooms()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }, [fetchDealRooms])

  // Update supplier status in deal room
  const updateSupplierStatus = useCallback(async (dealRoomId, fornecedorId, newStatus) => {
    try {
      const updates = { status: newStatus }
      if (newStatus === 'orcamento_recebido') {
        updates.data_orcamento = new Date().toISOString()
      }

      const { error } = await supabase
        .from('deal_room_fornecedores')
        .update(updates)
        .eq('deal_room_id', dealRoomId)
        .eq('fornecedor_id', fornecedorId)

      if (error) throw error
      await fetchDealRooms()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }, [fetchDealRooms])

  // Select winner supplier
  const selectWinner = useCallback(async (dealRoomId, fornecedorId, justificacao) => {
    try {
      const { error } = await supabase
        .from('deal_rooms')
        .update({
          fornecedor_selecionado_id: fornecedorId,
          justificacao_decisao: justificacao,
          status: 'decidido',
          data_decisao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dealRoomId)

      if (error) throw error
      await fetchDealRooms()
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }, [fetchDealRooms])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    fetchDealRooms()
    return () => { mountedRef.current = false }
  }, [fetchDealRooms])

  // Computed
  const activeDealRooms = dealRooms.filter(dr =>
    dr.status === 'aberto' || dr.status === 'em_analise' || dr.status === 'negociacao'
  )

  return {
    dealRooms,
    activeDealRooms,
    loading,
    error,
    fetchDealRooms,
    createDealRoom,
    updateDealRoom,
    inviteSupplier,
    updateSupplierStatus,
    selectWinner
  }
}

// Helper: generate badge text for display
function getBadge(dr) {
  const orcCount = dr.deal_room_fornecedores?.filter(
    f => f.status === 'orcamento_recebido'
  ).length || 0

  if (dr.status === 'decidido') return 'Decidido'
  if (orcCount > 0) return `${orcCount} orçamento${orcCount > 1 ? 's' : ''}`
  const invited = dr.deal_room_fornecedores?.length || 0
  if (invited > 0) return `${invited} convidado${invited > 1 ? 's' : ''}`
  return 'Novo'
}

// Helper: badge color
function getBadgeColor(dr) {
  const orcCount = dr.deal_room_fornecedores?.filter(
    f => f.status === 'orcamento_recebido'
  ).length || 0

  if (dr.status === 'decidido') return 'olive'
  if (orcCount > 0) return 'olive'
  return 'warning'
}

// Helper: detalhe text
function getDetalhe(dr) {
  if (dr.status === 'decidido') return 'Fornecedor selecionado'
  if (dr.prazo_necessario) {
    return `Decisão até ${new Date(dr.prazo_necessario).toLocaleDateString('pt-PT')}`
  }
  const count = dr.deal_room_fornecedores?.length || 0
  return `${count} fornecedor${count !== 1 ? 'es' : ''}`
}

export default useDealRooms
