// =====================================================
// FINANCEIRO DASHBOARD HOOK
// Data fetching, projections, and alert engine for the
// real-time financial dashboard
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry'

// ── Projection engine ────────────────────────────────
function calcularProjecao(cap) {
  const orcCusto = cap.orcamento_custo || 0
  const comprometido = cap.comprometido || 0
  const progresso = cap.progresso || 0

  // Chapter completed (>=95%)
  if (progresso >= 95) {
    const eac = comprometido
    return { etc: 0, eac, desvio: eac - orcCusto, desvio_pct: orcCusto ? ((eac - orcCusto) / orcCusto * 100) : 0 }
  }

  // Chapter not started
  if (progresso === 0 && comprometido === 0) {
    return { etc: orcCusto, eac: orcCusto, desvio: 0, desvio_pct: 0 }
  }

  // In-progress: project based on spend rate
  const custoProjectado = progresso > 0
    ? (comprometido / (progresso / 100))
    : orcCusto

  return {
    etc: Math.max(0, custoProjectado - comprometido),
    eac: custoProjectado,
    desvio: custoProjectado - orcCusto,
    desvio_pct: orcCusto ? ((custoProjectado - orcCusto) / orcCusto * 100) : 0
  }
}

// ── Alert rules engine ───────────────────────────────
function gerarAlertas(capitulos, extras, facturas, pos, obrasData) {
  const alertas = []

  // Physical vs financial progress alert
  const obrasActivas = (obrasData || []).filter(o => o.status !== 'suspensa')
  const progressoFisico = obrasActivas.length > 0
    ? Math.round(obrasActivas.reduce((s, o) => s + (o.progresso || 0), 0) / obrasActivas.length)
    : 0

  for (const cap of capitulos) {
    const pctFinanceiro = cap.percentagem_comprometido || 0
    const gap = pctFinanceiro - progressoFisico

    if (gap > 30) {
      alertas.push({
        tipo: 'financeiro_adianta_fisico', gravidade: 'critico',
        titulo: `${cap.capitulo}: financeiro ${gap.toFixed(0)}pp à frente do físico`,
        descricao: `Comprometido a ${pctFinanceiro.toFixed(0)}% mas obra a ${progressoFisico}% — risco de sobrecusto`,
        capitulo: cap.capitulo, valor_referencia: progressoFisico, valor_actual: pctFinanceiro,
        desvio_percentual: gap
      })
    } else if (gap > 15) {
      alertas.push({
        tipo: 'financeiro_adianta_fisico', gravidade: 'atencao',
        titulo: `${cap.capitulo}: financeiro ${gap.toFixed(0)}pp à frente do físico`,
        descricao: `Comprometido a ${pctFinanceiro.toFixed(0)}% mas obra a ${progressoFisico}% — monitorizar`,
        capitulo: cap.capitulo, valor_referencia: progressoFisico, valor_actual: pctFinanceiro,
        desvio_percentual: gap
      })
    }
  }

  // Per-chapter alerts
  for (const cap of capitulos) {
    const pct = cap.percentagem_comprometido || 0

    if (pct >= 100) {
      alertas.push({
        tipo: 'capitulo_100', gravidade: 'urgente',
        titulo: `${cap.capitulo} ultrapassou orçamento`,
        descricao: `Comprometido a ${pct.toFixed(0)}% — €${cap.comprometido?.toLocaleString('pt-PT')} de €${cap.orcamento_custo?.toLocaleString('pt-PT')}`,
        capitulo: cap.capitulo, valor_referencia: cap.orcamento_custo, valor_actual: cap.comprometido,
        desvio_percentual: pct
      })
    } else if (pct >= 95) {
      alertas.push({
        tipo: 'capitulo_95', gravidade: 'critico',
        titulo: `${cap.capitulo} a ${pct.toFixed(0)}% do orçamento`,
        descricao: `Margem restante: €${cap.margem_restante?.toLocaleString('pt-PT')}`,
        capitulo: cap.capitulo, valor_referencia: cap.orcamento_custo, valor_actual: cap.comprometido,
        desvio_percentual: pct
      })
    } else if (pct >= 85) {
      alertas.push({
        tipo: 'capitulo_85', gravidade: 'atencao',
        titulo: `${cap.capitulo} a ${pct.toFixed(0)}% do orçamento`,
        descricao: `Margem restante: €${cap.margem_restante?.toLocaleString('pt-PT')}`,
        capitulo: cap.capitulo, valor_referencia: cap.orcamento_custo, valor_actual: cap.comprometido,
        desvio_percentual: pct
      })
    }
  }

  // Invoice deviation alerts
  for (const f of facturas) {
    if (f.desvio_percentual && f.desvio_percentual > 5) {
      alertas.push({
        tipo: 'factura_excede_po', gravidade: 'atencao',
        titulo: `Factura ${f.numero_fatura} excede PO em ${f.desvio_percentual?.toFixed(1)}%`,
        descricao: `Desvio de €${f.desvio_valor?.toLocaleString('pt-PT')}`,
        factura_id: f.id, po_id: f.po_id,
        valor_referencia: f.total - (f.desvio_valor || 0), valor_actual: f.total,
        desvio_percentual: f.desvio_percentual
      })
    }
    if (!f.po_id) {
      alertas.push({
        tipo: 'factura_sem_po', gravidade: 'atencao',
        titulo: `Factura ${f.numero_fatura} sem PO associada`,
        descricao: `Valor: €${f.total?.toLocaleString('pt-PT')}`,
        factura_id: f.id, valor_actual: f.total
      })
    }
  }

  // Pending extras >7 days
  for (const ext of extras) {
    if (ext.estado === 'pendente') {
      const diasPendente = Math.floor((Date.now() - new Date(ext.created_at)) / 86400000)
      if (diasPendente > 7) {
        alertas.push({
          tipo: 'extra_pendente', gravidade: 'atencao',
          titulo: `Extra "${ext.titulo}" pendente há ${diasPendente} dias`,
          descricao: `Valor: €${ext.preco_cliente?.toLocaleString('pt-PT')}`,
          extra_id: ext.id, valor_actual: ext.preco_cliente
        })
      }
    }
  }

  // Sort by severity
  const gravOrder = { urgente: 0, critico: 1, atencao: 2, info: 3 }
  alertas.sort((a, b) => (gravOrder[a.gravidade] ?? 9) - (gravOrder[b.gravidade] ?? 9))

  return alertas
}

/**
 * Hook principal do dashboard financeiro.
 * Carrega capitulos, extras, facturas, POs e obras; calcula projecções ETC/EAC e gera alertas.
 *
 * @param {string} projetoId - UUID do projeto
 * @returns {{ loading: boolean, error: string|null, projeto: object|null, capitulos: object[], extras: object[], alertas: object[], totais: object, obrasData: object[], facturas: object[], purchaseOrders: object[], fetchData: () => Promise<void> }}
 */
export function useFinanceiroDashboard(projetoId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Raw data
  const [projeto, setProjeto] = useState(null)
  const [orcamento, setOrcamento] = useState(null)
  const [capitulos, setCapitulos] = useState([])
  const [pos, setPos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [extras, setExtras] = useState([])
  const [facturacaoCliente, setFacturacaoCliente] = useState([])
  const [alertasDb, setAlertasDb] = useState([])
  const [obras, setObras] = useState([])

  // ── Fetch all data ──
  const fetchAll = useCallback(async () => {
    if (!projetoId) return
    setLoading(true)
    setError(null)

    try {
      const [
        { data: proj },
        { data: orc },
        { data: posData },
        { data: fatData },
        { data: extData },
        { data: facClData },
        { data: alertData },
        { data: obrasData }
      ] = await Promise.all([
        supabase.from('projetos').select('id, codigo, nome, fase, status, orcamento_atual').eq('id', projetoId).single(),
        supabase.from('orcamentos').select('*, orcamento_capitulos(*)').eq('projeto_id', projetoId).eq('status', 'aprovado').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('purchase_orders').select('*').eq('projeto_id', projetoId).neq('estado', 'cancelada'),
        supabase.from('procurement_facturas').select('*').eq('projeto_id', projetoId),
        supabase.from('extras').select('*').eq('projeto_id', projetoId).order('created_at', { ascending: false }),
        supabase.from('facturacao_cliente').select('*').eq('projeto_id', projetoId).order('data_prevista'),
        supabase.from('alertas_financeiros').select('*').eq('projeto_id', projetoId).eq('estado', 'activo').order('created_at', { ascending: false }),
        supabase.from('obras').select('id, nome, progresso, status').eq('projeto_id', projetoId)
      ])

      setProjeto(proj)
      setOrcamento(orc)
      setPos(posData || [])
      setFacturas(fatData || [])
      setExtras(extData || [])
      setFacturacaoCliente(facClData || [])
      setAlertasDb(alertData || [])
      setObras(obrasData || [])

      // Compute average physical progress from obras (active ones)
      const obrasActivas = (obrasData || []).filter(o => o.status !== 'suspensa')
      const progressoFisicoMedio = obrasActivas.length > 0
        ? Math.round(obrasActivas.reduce((s, o) => s + (o.progresso || 0), 0) / obrasActivas.length)
        : 0

      // Build chapter-level aggregation client-side
      if (orc?.orcamento_capitulos) {
        const caps = orc.orcamento_capitulos.map(oc => {
          const margemPct = orc.margem_percentagem || 25
          const orcCusto = Math.round(oc.valor * (1 - margemPct / 100) * 100) / 100
          const capPOs = (posData || []).filter(po => po.capitulo_orcamento === oc.nome && po.estado !== 'rascunho')
          const comprometido = capPOs.reduce((s, po) => s + (po.total || 0), 0)
          const capFats = (fatData || []).filter(f => {
            const matchPO = capPOs.find(po => po.id === f.po_id)
            return matchPO && ['verificada', 'aprovada', 'em_pagamento', 'paga'].includes(f.estado)
          })
          const facturado = capFats.reduce((s, f) => s + (f.total || 0), 0)
          const pago = capFats.filter(f => f.estado === 'paga').reduce((s, f) => s + (f.total || 0), 0)
          const pctComprometido = orcCusto > 0 ? Math.round(comprometido / orcCusto * 1000) / 10 : 0

          return {
            id: oc.id,
            capitulo: oc.nome,
            ordem: oc.ordem,
            orcamento_cliente: oc.valor,
            orcamento_custo: orcCusto,
            margem_percentagem: margemPct,
            comprometido,
            facturado,
            pago,
            percentagem_comprometido: pctComprometido,
            margem_restante: Math.round((orcCusto - comprometido) * 100) / 100,
            estado_health: pctComprometido >= 95 ? 'critico' : pctComprometido >= 85 ? 'atencao' : comprometido === 0 ? 'nao_iniciado' : 'ok',
            num_pos: capPOs.length,
            num_facturas: capFats.length,
            pos: capPOs,
            facturas: capFats,
            progresso: progressoFisicoMedio
          }
        }).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

        setCapitulos(caps)
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { hook: 'useFinanceiroDashboard' } })
      console.error('Financeiro fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projetoId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Computed totals ──
  const totais = useMemo(() => {
    const orcamentoOriginal = capitulos.reduce((s, c) => s + (c.orcamento_cliente || 0), 0)
    const extrasAprovados = extras.filter(e => e.estado === 'aprovado').reduce((s, e) => s + (e.preco_cliente || 0), 0)
    const orcamentoRevisto = orcamentoOriginal + extrasAprovados
    const comprometido = capitulos.reduce((s, c) => s + (c.comprometido || 0), 0)
    const facturado = capitulos.reduce((s, c) => s + (c.facturado || 0), 0)
    const pago = capitulos.reduce((s, c) => s + (c.pago || 0), 0)

    const orcCustoTotal = capitulos.reduce((s, c) => s + (c.orcamento_custo || 0), 0)
    const margemPctGlobal = orcamentoRevisto > 0
      ? Math.round((orcamentoRevisto - comprometido) / orcamentoRevisto * 1000) / 10
      : 0

    // Projections
    const projecoes = capitulos.map(c => ({ ...c, ...calcularProjecao(c) }))
    const eacTotal = projecoes.reduce((s, c) => s + (c.eac || 0), 0)
    const etcTotal = projecoes.reduce((s, c) => s + (c.etc || 0), 0)
    const desvioProjectado = eacTotal - orcCustoTotal
    const margemProjectada = orcamentoRevisto > 0
      ? Math.round((orcamentoRevisto - eacTotal) / orcamentoRevisto * 1000) / 10
      : 0

    // Physical vs financial progress
    const obrasActivas = obras.filter(o => o.status !== 'suspensa')
    const progressoFisicoMedio = obrasActivas.length > 0
      ? Math.round(obrasActivas.reduce((s, o) => s + (o.progresso || 0), 0) / obrasActivas.length)
      : 0
    const progressoFinanceiro = orcCustoTotal > 0
      ? Math.round(comprometido / orcCustoTotal * 1000) / 10
      : 0

    return {
      orcamentoOriginal,
      orcamentoRevisto,
      extrasAprovados,
      comprometido,
      facturado,
      pago,
      orcCustoTotal,
      margemPctGlobal,
      eacTotal,
      etcTotal,
      desvioProjectado,
      margemProjectada,
      projecoes,
      progressoFisicoMedio,
      progressoFinanceiro
    }
  }, [capitulos, extras, obras])

  // ── Alertas (merge DB + computed) ──
  const alertas = useMemo(() => {
    const computed = gerarAlertas(capitulos, extras, facturas, pos, obras)
    // Merge: prefer DB alertas (they may have analise_ia), add computed ones not in DB
    const dbTipos = new Set(alertasDb.map(a => `${a.tipo}:${a.capitulo || a.po_id || a.factura_id || ''}`))
    const merged = [...alertasDb]
    for (const a of computed) {
      const key = `${a.tipo}:${a.capitulo || a.po_id || a.factura_id || ''}`
      if (!dbTipos.has(key)) merged.push(a)
    }
    const gravOrder = { urgente: 0, critico: 1, atencao: 2, info: 3 }
    merged.sort((a, b) => (gravOrder[a.gravidade] ?? 9) - (gravOrder[b.gravidade] ?? 9))
    return merged
  }, [capitulos, extras, facturas, pos, alertasDb, obras])

  // ── Extras helpers ──
  const createExtra = useCallback(async (extraData) => {
    const { data, error: err } = await supabase
      .from('extras')
      .insert({ ...extraData, projeto_id: projetoId })
      .select()
      .single()
    if (err) throw err
    await fetchAll()
    return data
  }, [projetoId, fetchAll])

  const updateExtra = useCallback(async (extraId, updates) => {
    const { error: err } = await supabase
      .from('extras')
      .update(updates)
      .eq('id', extraId)
    if (err) throw err
    await fetchAll()
  }, [fetchAll])

  // ── Alert actions ──
  const dismissAlerta = useCallback(async (alertaId) => {
    const { error: err } = await supabase
      .from('alertas_financeiros')
      .update({ estado: 'visto', visto_em: new Date().toISOString() })
      .eq('id', alertaId)
    if (!err) await fetchAll()
  }, [fetchAll])

  const resolveAlerta = useCallback(async (alertaId, nota) => {
    const { error: err } = await supabase
      .from('alertas_financeiros')
      .update({ estado: 'resolvido', resolvido_em: new Date().toISOString(), resolucao_nota: nota })
      .eq('id', alertaId)
    if (!err) await fetchAll()
  }, [fetchAll])

  return {
    loading, error,
    projeto, orcamento, capitulos, pos, facturas, extras, obras,
    facturacaoCliente, alertas, totais,
    fetchAll, createExtra, updateExtra, dismissAlerta, resolveAlerta
  }
}

export default useFinanceiroDashboard
