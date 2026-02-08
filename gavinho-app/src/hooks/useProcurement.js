import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { requisicoes: [], cotacoes: [], purchaseOrders: [], facturas: [] }

export function useProcurement(projectId = null, obraId = null) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total_requisicoes: 0,
    total_cotacoes: 0,
    total_pos: 0,
    total_facturas: 0,
    valor_pos_aprovadas: 0,
    valor_facturas_pendentes: 0,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build filters
      const filters = []
      if (projectId) filters.push({ col: 'projeto_id', val: projectId })
      if (obraId) filters.push({ col: 'obra_id', val: obraId })

      // Fetch requisições
      let reqQuery = supabase
        .from('requisicoes')
        .select('*')
        .order('created_at', { ascending: false })
      for (const f of filters) reqQuery = reqQuery.eq(f.col, f.val)
      const { data: reqs, error: reqErr } = await reqQuery
      if (reqErr && reqErr.code !== '42P01') throw reqErr

      // Fetch cotações
      let cotQuery = supabase
        .from('cotacoes')
        .select('*')
        .order('created_at', { ascending: false })
      for (const f of filters) cotQuery = cotQuery.eq(f.col, f.val)
      const { data: cots, error: cotErr } = await cotQuery
      if (cotErr && cotErr.code !== '42P01') throw cotErr

      // Fetch purchase orders
      let poQuery = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
      for (const f of filters) poQuery = poQuery.eq(f.col, f.val)
      const { data: pos, error: poErr } = await poQuery
      if (poErr && poErr.code !== '42P01') throw poErr

      // Fetch facturas
      let fatQuery = supabase
        .from('procurement_facturas')
        .select('*')
        .order('created_at', { ascending: false })
      for (const f of filters) fatQuery = fatQuery.eq(f.col, f.val)
      const { data: fats, error: fatErr } = await fatQuery
      if (fatErr && fatErr.code !== '42P01') throw fatErr

      const result = {
        requisicoes: reqs || [],
        cotacoes: cots || [],
        purchaseOrders: pos || [],
        facturas: fats || [],
      }
      setData(result)

      // Calculate stats
      const posAprovadas = (pos || []).filter(p => ['aprovada', 'confirmada', 'entregue', 'entrega_parcial'].includes(p.estado))
      const fatsPendentes = (fats || []).filter(f => ['pendente_validacao', 'sem_po'].includes(f.estado))
      setStats({
        total_requisicoes: (reqs || []).length,
        total_cotacoes: (cots || []).length,
        total_pos: (pos || []).length,
        total_facturas: (fats || []).length,
        valor_pos_aprovadas: posAprovadas.reduce((sum, p) => sum + (p.valor_total || 0), 0),
        valor_facturas_pendentes: fatsPendentes.reduce((sum, f) => sum + (f.valor_com_iva || 0), 0),
      })
    } catch (err) {
      console.error('useProcurement error:', err)
      setError(err.message)
      setData(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [projectId, obraId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // CRUD operations
  const createRequisicao = async (formData) => {
    const { data: result, error } = await supabase
      .from('requisicoes')
      .insert({
        ...formData,
        projeto_id: projectId || formData.projeto_id,
        obra_id: obraId || formData.obra_id,
        estado: 'rascunho',
      })
      .select()
      .single()
    if (error) throw error
    await fetchAll()
    return result
  }

  const updateRequisicao = async (id, updates) => {
    const { error } = await supabase
      .from('requisicoes')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  const createPurchaseOrder = async (formData) => {
    const { data: result, error } = await supabase
      .from('purchase_orders')
      .insert({
        ...formData,
        projeto_id: projectId || formData.projeto_id,
        obra_id: obraId || formData.obra_id,
        estado: 'rascunho',
      })
      .select()
      .single()
    if (error) throw error
    await fetchAll()
    return result
  }

  const approvePO = async (id) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'aprovada',
        aprovado_por: null, // Will be set by RLS context
        data_aprovacao: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return {
    ...data,
    stats,
    loading,
    error,
    refetch: fetchAll,
    createRequisicao,
    updateRequisicao,
    createPurchaseOrder,
    approvePO,
  }
}
