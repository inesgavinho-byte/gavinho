// =====================================================
// G.A.R.V.I.S. Quote Analysis Service
// Análise de orçamentos com preços de referência
// Comparação, desvios, alertas automáticos
// =====================================================

import { supabase } from '../lib/supabase'

/**
 * Analyze a quote against reference prices
 * Returns analysis with deviations per line
 */
export async function analyzeQuote(orcamentoId) {
  try {
    // Fetch quote with lines
    const { data: orcamento, error } = await supabase
      .from('orcamentos_recebidos')
      .select(`
        *,
        fornecedores(nome, especialidade),
        orcamento_recebido_linhas(*)
      `)
      .eq('id', orcamentoId)
      .single()

    if (error) throw error
    if (!orcamento) return { error: 'Orçamento não encontrado' }

    const linhas = orcamento.orcamento_recebido_linhas || []
    const analysis = {
      orcamento_id: orcamentoId,
      fornecedor: orcamento.fornecedores?.nome,
      valor_total: orcamento.valor_total,
      linhas_analisadas: 0,
      linhas_com_desvio: 0,
      desvio_medio: 0,
      desvio_max: 0,
      linhas: [],
      alertas: [],
      resumo: ''
    }

    // Fetch reference prices
    const { data: referencias } = await supabase
      .from('precos_referencia')
      .select('*')

    const refMap = new Map()
    if (referencias) {
      for (const ref of referencias) {
        refMap.set((ref.descricao_normalizada || '').toLowerCase(), ref)
        if (ref.categoria) {
          refMap.set(`${ref.categoria}:${ref.subcategoria || ''}`.toLowerCase(), ref)
        }
      }
    }

    let totalDesvio = 0
    let linhasComRef = 0

    for (const linha of linhas) {
      const lineAnalysis = {
        ...linha,
        preco_referencia: null,
        desvio: null,
        status: 'sem_referencia'
      }

      // Try to find matching reference price
      const descLower = (linha.descricao || '').toLowerCase()
      let ref = refMap.get(descLower)

      // Fuzzy match: try partial matches
      if (!ref) {
        for (const [key, value] of refMap.entries()) {
          if (descLower.includes(key) || key.includes(descLower)) {
            ref = value
            break
          }
        }
      }

      if (ref && linha.preco_unitario) {
        const refPreco = ref.preco_medio || ((ref.preco_minimo + ref.preco_maximo) / 2)
        const desvio = ((linha.preco_unitario - refPreco) / refPreco) * 100

        lineAnalysis.preco_referencia = refPreco
        lineAnalysis.desvio = Math.round(desvio * 10) / 10
        lineAnalysis.status = Math.abs(desvio) <= 5 ? 'normal'
          : desvio > 15 ? 'acima' : desvio > 5 ? 'atencao'
          : desvio < -15 ? 'abaixo_suspeito' : 'abaixo'

        totalDesvio += Math.abs(desvio)
        linhasComRef++

        // Update the line in DB with deviation
        await supabase
          .from('orcamento_recebido_linhas')
          .update({
            preco_referencia: refPreco,
            desvio_percentual: Math.round(desvio * 10) / 10
          })
          .eq('id', linha.id)

        // Generate alerts for significant deviations
        if (desvio > 15) {
          analysis.alertas.push({
            tipo: 'preco_alto',
            linha: linha.descricao,
            desvio: lineAnalysis.desvio,
            mensagem: `"${linha.descricao}" está ${lineAnalysis.desvio}% acima do preço de referência (€${refPreco.toFixed(2)} vs €${linha.preco_unitario.toFixed(2)})`
          })
        }

        if (desvio < -20) {
          analysis.alertas.push({
            tipo: 'preco_suspeito',
            linha: linha.descricao,
            desvio: lineAnalysis.desvio,
            mensagem: `"${linha.descricao}" está ${Math.abs(lineAnalysis.desvio)}% abaixo do mercado — verificar especificações`
          })
        }

        analysis.linhas_analisadas++
      }

      analysis.linhas.push(lineAnalysis)
    }

    analysis.linhas_com_desvio = analysis.alertas.length
    analysis.desvio_medio = linhasComRef > 0 ? Math.round(totalDesvio / linhasComRef * 10) / 10 : 0
    analysis.desvio_max = Math.max(...analysis.linhas.filter(l => l.desvio !== null).map(l => Math.abs(l.desvio)), 0)

    // Generate summary
    if (linhasComRef === 0) {
      analysis.resumo = 'Sem preços de referência disponíveis para comparação. Adicione preços de referência para análises futuras.'
    } else {
      const overLines = analysis.linhas.filter(l => l.desvio && l.desvio > 15).length
      if (overLines > 0) {
        analysis.resumo = `${overLines} de ${linhasComRef} linhas acima do mercado (desvio médio: ${analysis.desvio_medio}%). Recomenda-se negociação.`
      } else if (analysis.desvio_medio <= 5) {
        analysis.resumo = `Orçamento alinhado com o mercado (desvio médio: ${analysis.desvio_medio}%). Bom para aprovar.`
      } else {
        analysis.resumo = `Orçamento ligeiramente acima do mercado (desvio médio: ${analysis.desvio_medio}%). Considere negociar os itens mais caros.`
      }
    }

    // Save analysis to orcamento
    await supabase
      .from('orcamentos_recebidos')
      .update({ analise_ia: analysis })
      .eq('id', orcamentoId)

    return analysis
  } catch (err) {
    console.error('Quote analysis error:', err)
    return { error: err.message }
  }
}

/**
 * Compare multiple quotes for the same deal room
 */
export async function compareDealRoomQuotes(dealRoomId) {
  try {
    const { data: quotes, error } = await supabase
      .from('orcamentos_recebidos')
      .select(`
        *,
        fornecedores(id, nome, especialidade, rating),
        orcamento_recebido_linhas(*)
      `)
      .eq('deal_room_id', dealRoomId)
      .order('valor_total')

    if (error) throw error
    if (!quotes || quotes.length === 0) return { quotes: [], comparison: null }

    // Get deal room budget
    const { data: dealRoom } = await supabase
      .from('deal_rooms')
      .select('orcamento_disponivel, titulo, especialidade')
      .eq('id', dealRoomId)
      .single()

    const budget = dealRoom?.orcamento_disponivel

    const comparison = {
      deal_room: dealRoom?.titulo,
      total_quotes: quotes.length,
      budget,
      lowest: quotes[0]?.valor_total,
      highest: quotes[quotes.length - 1]?.valor_total,
      spread: quotes.length > 1 ? quotes[quotes.length - 1].valor_total - quotes[0].valor_total : 0,
      spread_pct: quotes.length > 1 && quotes[0].valor_total > 0
        ? ((quotes[quotes.length - 1].valor_total - quotes[0].valor_total) / quotes[0].valor_total * 100).toFixed(1)
        : 0,
      quotes: quotes.map((q, idx) => ({
        id: q.id,
        fornecedor: q.fornecedores?.nome,
        fornecedor_id: q.fornecedores?.id,
        rating: q.fornecedores?.rating,
        valor_total: q.valor_total,
        rank: idx + 1,
        vs_budget: budget ? ((q.valor_total - budget) / budget * 100).toFixed(1) : null,
        within_budget: budget ? q.valor_total <= budget : null,
        linhas_count: q.orcamento_recebido_linhas?.length || 0,
        referencia: q.referencia_fornecedor
      })),
      recomendacao: null
    }

    // Generate recommendation
    if (quotes.length >= 2) {
      const best = quotes[0]
      const bestWithinBudget = budget ? quotes.find(q => q.valor_total <= budget) : quotes[0]

      if (bestWithinBudget) {
        comparison.recomendacao = {
          fornecedor_id: bestWithinBudget.fornecedores?.id,
          fornecedor_nome: bestWithinBudget.fornecedores?.nome,
          motivo: budget && bestWithinBudget === quotes[0]
            ? 'Melhor preço e dentro do orçamento'
            : budget
              ? 'Melhor preço dentro do orçamento disponível'
              : 'Proposta mais competitiva',
          valor: bestWithinBudget.valor_total
        }
      }
    }

    return comparison
  } catch (err) {
    console.error('Deal room comparison error:', err)
    return { quotes: [], comparison: null, error: err.message }
  }
}

/**
 * Register quote lines from manual input or parsed data
 */
export async function registerQuoteLines(orcamentoId, lines) {
  try {
    const toInsert = lines.map((line, idx) => ({
      orcamento_id: orcamentoId,
      linha_numero: idx + 1,
      descricao: line.descricao,
      quantidade: line.quantidade || null,
      unidade: line.unidade || null,
      preco_unitario: line.preco_unitario || null,
      preco_total: line.preco_total || null,
      referencia_produto: line.referencia_produto || null,
      notas: line.notas || null
    }))

    const { data, error } = await supabase
      .from('orcamento_recebido_linhas')
      .insert(toInsert)
      .select()

    if (error) throw error

    // Trigger analysis after inserting lines
    await analyzeQuote(orcamentoId)

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Update reference prices from approved quotes
 * Called after approving a quote to build the price database
 */
export async function updateReferencePrices(orcamentoId) {
  try {
    const { data: linhas } = await supabase
      .from('orcamento_recebido_linhas')
      .select('descricao, unidade, preco_unitario')
      .eq('orcamento_id', orcamentoId)
      .not('preco_unitario', 'is', null)

    if (!linhas || linhas.length === 0) return

    for (const linha of linhas) {
      // Check if reference exists (usa descricao_normalizada do schema procurement_pipeline)
      const { data: existing } = await supabase
        .from('precos_referencia')
        .select('*')
        .ilike('descricao_normalizada', linha.descricao)
        .limit(1)

      if (existing && existing.length > 0) {
        const ref = existing[0]
        const newMin = Math.min(ref.preco_minimo || Infinity, linha.preco_unitario)
        const newMax = Math.max(ref.preco_maximo || 0, linha.preco_unitario)
        const newCount = (ref.num_cotacoes || 0) + 1
        const newMedio = ((ref.preco_medio || 0) * (ref.num_cotacoes || 0) + linha.preco_unitario) / newCount

        await supabase
          .from('precos_referencia')
          .update({
            preco_minimo: newMin,
            preco_maximo: newMax,
            preco_medio: Math.round(newMedio * 10000) / 10000,
            num_cotacoes: newCount,
            ultima_cotacao: new Date().toISOString()
          })
          .eq('id', ref.id)
      } else {
        // Create new reference
        await supabase
          .from('precos_referencia')
          .insert({
            descricao_normalizada: linha.descricao,
            categoria: 'geral',
            unidade: linha.unidade || 'un',
            preco_minimo: linha.preco_unitario,
            preco_medio: linha.preco_unitario,
            preco_maximo: linha.preco_unitario,
            num_cotacoes: 1,
            ultima_cotacao: new Date().toISOString()
          })
      }
    }
  } catch (err) {
    console.error('Error updating reference prices:', err)
  }
}
