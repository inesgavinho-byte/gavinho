import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry'

const INITIAL_FORM = {
  projeto_id: '',
  capitulo_id: '',
  descricao: '',
  subtotal: '',
  iva_percentagem: '23',
  data_facturada: new Date().toISOString().split('T')[0],
  data_vencimento: '',
  condicoes_pagamento_dias: 30,
  notas: ''
}

/**
 * Hook para gestão de faturação — CRUD faturas, projetos, capitulos, KPIs.
 *
 * @returns {{ faturas: object[], projetos: object[], loading: boolean, saving: boolean, error: string|null, fetchFaturas: () => Promise<void>, createFatura: (form: object) => Promise<void>, updateFatura: (id: string, data: object) => Promise<void>, deleteFatura: (id: string) => Promise<void>, kpis: object }}
 */
export function useFaturacao() {
  const [faturas, setFaturas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [capitulosPorProjeto, setCapitulosPorProjeto] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // ── Fetch faturas ──
  const fetchFaturas = useCallback(async () => {
    try {
      setError(null)
      const { data, error: err } = await supabase
        .from('facturacao_cliente')
        .select(`
          *,
          projetos:projeto_id (id, codigo, nome),
          capitulo:capitulo_id (id, nome)
        `)
        .order('created_at', { ascending: false })

      if (err) {
        if (err.code === '42P01') {
          setFaturas([])
          return
        }
        throw err
      }
      setFaturas(data || [])
    } catch (err) {
      Sentry.captureException(err, { tags: { hook: 'useFaturacao' } })
      console.error('Erro ao carregar faturas:', err)
      setError(err.message)
      setFaturas([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch projetos ──
  const fetchProjetos = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .order('nome')
      setProjetos(data || [])
    } catch (err) {
      console.error('Erro ao carregar projetos:', err)
    }
  }, [])

  // ── Fetch capítulos de um projeto ──
  const fetchCapitulos = useCallback(async (projetoId) => {
    if (!projetoId || capitulosPorProjeto[projetoId]) return
    try {
      const { data: orc } = await supabase
        .from('orcamentos')
        .select('id')
        .eq('projeto_id', projetoId)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!orc) return

      const { data: caps } = await supabase
        .from('orcamento_capitulos')
        .select('id, nome, ordem, valor')
        .eq('orcamento_id', orc.id)
        .order('ordem')

      setCapitulosPorProjeto(prev => ({ ...prev, [projetoId]: caps || [] }))
    } catch (err) {
      console.error('Erro ao carregar capítulos:', err)
    }
  }, [capitulosPorProjeto])

  useEffect(() => {
    fetchFaturas()
    fetchProjetos()
  }, [fetchFaturas, fetchProjetos])

  // ── Generate invoice number ──
  const gerarNumero = useCallback(async () => {
    const ano = new Date().getFullYear()
    const { count } = await supabase
      .from('facturacao_cliente')
      .select('id', { count: 'exact', head: true })
      .like('numero_factura', `FAT-${ano}-%`)

    const seq = (count || 0) + 1
    return `FAT-${ano}-${String(seq).padStart(4, '0')}`
  }, [])

  // ── Create ──
  const createFatura = useCallback(async (formData) => {
    setSaving(true)
    try {
      const subtotal = parseFloat(formData.subtotal)
      const ivaPct = parseFloat(formData.iva_percentagem)
      const ivaValor = Math.round(subtotal * (ivaPct / 100) * 100) / 100
      const total = Math.round((subtotal + ivaValor) * 100) / 100
      const numero = await gerarNumero()

      const record = {
        numero_factura: numero,
        projeto_id: formData.projeto_id || null,
        capitulo_id: formData.capitulo_id || null,
        descricao: formData.descricao,
        subtotal,
        iva_percentagem: ivaPct,
        iva_valor: ivaValor,
        total,
        valor: subtotal,
        estado: 'rascunho',
        data_facturada: formData.data_facturada || null,
        data_vencimento: formData.data_vencimento || null,
        condicoes_pagamento_dias: parseInt(formData.condicoes_pagamento_dias) || 30,
        notas: formData.notas || null
      }

      const { error: err } = await supabase
        .from('facturacao_cliente')
        .insert([record])

      if (err) throw err
      await fetchFaturas()
      return { success: true }
    } catch (err) {
      console.error('Erro ao criar fatura:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [fetchFaturas, gerarNumero])

  // ── Update (só rascunho) ──
  const updateFatura = useCallback(async (id, formData) => {
    setSaving(true)
    try {
      const fatura = faturas.find(f => f.id === id)
      if (fatura && fatura.estado !== 'rascunho') {
        return { success: false, error: 'Apenas faturas em rascunho podem ser editadas' }
      }

      const subtotal = parseFloat(formData.subtotal)
      const ivaPct = parseFloat(formData.iva_percentagem)
      const ivaValor = Math.round(subtotal * (ivaPct / 100) * 100) / 100
      const total = Math.round((subtotal + ivaValor) * 100) / 100

      const updates = {
        projeto_id: formData.projeto_id || null,
        capitulo_id: formData.capitulo_id || null,
        descricao: formData.descricao,
        subtotal,
        iva_percentagem: ivaPct,
        iva_valor: ivaValor,
        total,
        valor: subtotal,
        data_facturada: formData.data_facturada || null,
        data_vencimento: formData.data_vencimento || null,
        condicoes_pagamento_dias: parseInt(formData.condicoes_pagamento_dias) || 30,
        notas: formData.notas || null
      }

      const { error: err } = await supabase
        .from('facturacao_cliente')
        .update(updates)
        .eq('id', id)

      if (err) throw err
      await fetchFaturas()
      return { success: true }
    } catch (err) {
      console.error('Erro ao atualizar fatura:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [faturas, fetchFaturas])

  // ── Emitir (rascunho → emitida) ──
  const emitirFatura = useCallback(async (id) => {
    setSaving(true)
    try {
      const fatura = faturas.find(f => f.id === id)
      if (!fatura) return { success: false, error: 'Fatura não encontrada' }
      if (fatura.estado !== 'rascunho') return { success: false, error: 'Apenas rascunhos podem ser emitidos' }
      if (!fatura.subtotal || !fatura.projeto_id) {
        return { success: false, error: 'Preencha projeto e valor antes de emitir' }
      }

      const { error: err } = await supabase
        .from('facturacao_cliente')
        .update({
          estado: 'emitida',
          data_facturada: fatura.data_facturada || new Date().toISOString().split('T')[0]
        })
        .eq('id', id)

      if (err) throw err
      await fetchFaturas()
      return { success: true }
    } catch (err) {
      console.error('Erro ao emitir fatura:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [faturas, fetchFaturas])

  // ── Marcar paga (emitida → paga) ──
  const marcarPaga = useCallback(async (id) => {
    setSaving(true)
    try {
      const fatura = faturas.find(f => f.id === id)
      if (!fatura) return { success: false, error: 'Fatura não encontrada' }
      if (fatura.estado !== 'emitida') return { success: false, error: 'Apenas faturas emitidas podem ser marcadas como pagas' }

      const { error: err } = await supabase
        .from('facturacao_cliente')
        .update({
          estado: 'paga',
          data_recebimento: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)

      if (err) throw err
      await fetchFaturas()
      return { success: true }
    } catch (err) {
      console.error('Erro ao marcar como paga:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [faturas, fetchFaturas])

  // ── Anular (qualquer → anulada) ──
  const anularFatura = useCallback(async (id, motivo) => {
    setSaving(true)
    try {
      if (!motivo?.trim()) return { success: false, error: 'Motivo de anulação é obrigatório' }

      const { error: err } = await supabase
        .from('facturacao_cliente')
        .update({
          estado: 'anulada',
          data_anulacao: new Date().toISOString().split('T')[0],
          motivo_anulacao: motivo.trim()
        })
        .eq('id', id)

      if (err) throw err
      await fetchFaturas()
      return { success: true }
    } catch (err) {
      console.error('Erro ao anular fatura:', err)
      return { success: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [fetchFaturas])

  // ── Totais computados ──
  const totais = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const activas = faturas.filter(f => f.estado !== 'anulada')
    const emitidas = faturas.filter(f => f.estado === 'emitida')
    const pagas = faturas.filter(f => f.estado === 'paga')
    const vencidas = emitidas.filter(f => f.data_vencimento && f.data_vencimento < hoje)

    const sum = (arr) => arr.reduce((s, f) => s + (f.total || f.valor || 0), 0)

    return {
      totalFaturado: sum(activas),
      totalPago: sum(pagas),
      totalPendente: sum(emitidas),
      totalVencido: sum(vencidas),
      countTotal: faturas.length,
      countRascunho: faturas.filter(f => f.estado === 'rascunho').length,
      countEmitida: emitidas.length,
      countPaga: pagas.length,
      countAnulada: faturas.filter(f => f.estado === 'anulada').length
    }
  }, [faturas])

  return {
    faturas,
    projetos,
    capitulosPorProjeto,
    loading,
    saving,
    error,
    totais,
    fetchFaturas,
    fetchCapitulos,
    createFatura,
    updateFatura,
    emitirFatura,
    marcarPaga,
    anularFatura,
    INITIAL_FORM
  }
}

export default useFaturacao
