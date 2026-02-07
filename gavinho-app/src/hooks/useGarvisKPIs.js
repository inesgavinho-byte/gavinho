// =====================================================
// useGarvisKPIs - Hook para KPIs reais de procurement
// Queries ao Supabase para métricas em tempo real
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useGarvisKPIs() {
  const [kpis, setKpis] = useState({
    totalFornecedores: 0,
    fornecedoresAtivos: 0,
    volumeYTD: 0,
    volumeYTDFormatted: '€0',
    dealRoomsAtivos: 0,
    orcamentosPendentes: 0,
    alertasCriticos: 0
  })
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchKPIs = useCallback(async () => {
    try {
      // Run all queries in parallel
      const [
        fornecedoresRes,
        dealRoomsRes,
        orcamentosRes,
        alertasRes,
        volumeRes
      ] = await Promise.all([
        // Total & active suppliers
        supabase.from('fornecedores').select('id, status'),

        // Active deal rooms
        supabase.from('deal_rooms')
          .select('id')
          .in('status', ['aberto', 'em_analise', 'negociacao'])
          .then(res => res)
          .catch(() => ({ data: [] })),

        // Pending quotes
        supabase.from('orcamentos_recebidos')
          .select('id')
          .eq('status', 'pendente')
          .then(res => res)
          .catch(() => ({ data: [] })),

        // Critical alerts (unread)
        supabase.from('alertas_garvis')
          .select('id')
          .eq('prioridade', 'critico')
          .eq('lido', false)
          .eq('arquivado', false)
          .then(res => res)
          .catch(() => ({ data: [] })),

        // Volume YTD (sum of approved quotes this year)
        supabase.from('orcamentos_recebidos')
          .select('valor_total')
          .eq('status', 'aprovado')
          .gte('data_aprovacao', `${new Date().getFullYear()}-01-01`)
          .then(res => res)
          .catch(() => ({ data: [] }))
      ])

      const allFornecedores = fornecedoresRes?.data || []
      const totalFornecedores = allFornecedores.length
      const fornecedoresAtivos = allFornecedores.filter(
        f => f.status === 'ativo' || f.status === 'preferencial'
      ).length

      const dealRoomsAtivos = dealRoomsRes?.data?.length || 0
      const orcamentosPendentes = orcamentosRes?.data?.length || 0
      const alertasCriticos = alertasRes?.data?.length || 0

      const volumeYTD = (volumeRes?.data || []).reduce(
        (sum, q) => sum + (parseFloat(q.valor_total) || 0), 0
      )

      const volumeYTDFormatted = volumeYTD > 0
        ? volumeYTD >= 1000000
          ? `€${(volumeYTD / 1000000).toFixed(1)}M`
          : volumeYTD >= 1000
            ? `€${(volumeYTD / 1000).toFixed(0)}k`
            : `€${volumeYTD.toFixed(0)}`
        : '€0'

      if (mountedRef.current) {
        setKpis({
          totalFornecedores,
          fornecedoresAtivos,
          volumeYTD,
          volumeYTDFormatted,
          dealRoomsAtivos,
          orcamentosPendentes,
          alertasCriticos
        })
      }
    } catch (err) {
      // Non-critical - if tables don't exist, use fallback from fornecedores
      try {
        const { data } = await supabase.from('fornecedores').select('id, status')
        const all = data || []
        if (mountedRef.current) {
          setKpis({
            totalFornecedores: all.length,
            fornecedoresAtivos: all.filter(f => f.status === 'ativo' || f.status === 'preferencial').length,
            volumeYTD: 0,
            volumeYTDFormatted: '€0',
            dealRoomsAtivos: 0,
            orcamentosPendentes: 0,
            alertasCriticos: 0
          })
        }
      } catch {
        // Total fallback
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchKPIs()
    return () => { mountedRef.current = false }
  }, [fetchKPIs])

  return { kpis, loading, refetch: fetchKPIs }
}

export default useGarvisKPIs
