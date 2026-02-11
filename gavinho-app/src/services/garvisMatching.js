// =====================================================
// G.A.R.V.I.S. Matching Service
// Algoritmo de scoring fornecedor-projeto
// Calcula e cacheia compatibilidade por especialidade
// =====================================================

import { supabase } from '../lib/supabase'

// Weight configuration for scoring
const WEIGHTS = {
  especialidade: 25,    // Specialty match
  rating: 20,           // Historical rating
  preco: 20,            // Price competitiveness
  prazo: 15,            // Delivery reliability
  experiencia: 10,      // Past work count
  zona: 5,              // Geographic proximity
  preferencial: 5       // Preferred supplier bonus
}

/**
 * Calculate matching score between a supplier and requirements
 * Returns 0-100 score with breakdown
 */
export function calculateMatchScore(fornecedor, requirements = {}) {
  const breakdown = {}
  let totalScore = 0

  // 1. Specialty match (0-25)
  if (requirements.especialidade && fornecedor.especialidade) {
    const reqEsp = requirements.especialidade.toLowerCase()
    const fornEsp = fornecedor.especialidade.toLowerCase()
    if (fornEsp === reqEsp) {
      breakdown.especialidade = WEIGHTS.especialidade
    } else if (fornEsp.includes(reqEsp) || reqEsp.includes(fornEsp)) {
      breakdown.especialidade = WEIGHTS.especialidade * 0.7
    } else {
      breakdown.especialidade = 0
    }
  } else {
    breakdown.especialidade = fornecedor.especialidade ? WEIGHTS.especialidade * 0.3 : 0
  }

  // 2. Rating (0-20)
  if (fornecedor.rating) {
    breakdown.rating = (fornecedor.rating / 5) * WEIGHTS.rating
  } else {
    breakdown.rating = WEIGHTS.rating * 0.3 // No rating = neutral
  }

  // 3. Price competitiveness (0-20)
  if (fornecedor.avgQuoteDeviation !== undefined) {
    // Lower deviation = better score
    const deviationFactor = Math.max(0, 1 - Math.abs(fornecedor.avgQuoteDeviation) / 30)
    breakdown.preco = deviationFactor * WEIGHTS.preco
  } else if (fornecedor.desconto_acordado > 0) {
    breakdown.preco = Math.min(fornecedor.desconto_acordado / 15, 1) * WEIGHTS.preco
  } else {
    breakdown.preco = WEIGHTS.preco * 0.5
  }

  // 4. Delivery reliability (0-15)
  if (fornecedor.avgPrazoRating) {
    breakdown.prazo = (fornecedor.avgPrazoRating / 5) * WEIGHTS.prazo
  } else if (fornecedor.lead_time_medio && requirements.prazoNecessario) {
    const onTime = fornecedor.lead_time_medio <= requirements.prazoNecessario
    breakdown.prazo = onTime ? WEIGHTS.prazo : WEIGHTS.prazo * 0.4
  } else {
    breakdown.prazo = WEIGHTS.prazo * 0.5
  }

  // 5. Experience (0-10)
  const fornecimentos = fornecedor.fornecimentosCount || 0
  if (fornecimentos >= 5) {
    breakdown.experiencia = WEIGHTS.experiencia
  } else if (fornecimentos >= 2) {
    breakdown.experiencia = WEIGHTS.experiencia * 0.7
  } else if (fornecimentos >= 1) {
    breakdown.experiencia = WEIGHTS.experiencia * 0.4
  } else {
    breakdown.experiencia = 0
  }

  // 6. Geographic zone (0-5)
  if (requirements.zona && fornecedor.zona_atuacao?.length > 0) {
    const match = fornecedor.zona_atuacao.some(z =>
      z.toLowerCase().includes(requirements.zona.toLowerCase())
    )
    breakdown.zona = match ? WEIGHTS.zona : 0
  } else {
    breakdown.zona = WEIGHTS.zona * 0.5
  }

  // 7. Preferred supplier bonus (0-5)
  breakdown.preferencial = fornecedor.is_preferencial ? WEIGHTS.preferencial : 0

  // Calculate total
  totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

  return {
    score: Math.round(totalScore),
    breakdown,
    justificacao: generateJustificacao(fornecedor, breakdown, totalScore)
  }
}

/**
 * Generate human-readable justification
 */
function generateJustificacao(fornecedor, breakdown, totalScore) {
  const pontos = []

  if (breakdown.especialidade >= WEIGHTS.especialidade * 0.7) {
    pontos.push(`Especialista em ${fornecedor.especialidade}`)
  }
  if (breakdown.rating >= WEIGHTS.rating * 0.8) {
    pontos.push(`Rating elevado (${fornecedor.rating}/5)`)
  }
  if (breakdown.preco >= WEIGHTS.preco * 0.7) {
    pontos.push('Preços competitivos')
  }
  if (breakdown.prazo >= WEIGHTS.prazo * 0.7) {
    pontos.push('Cumprimento de prazos')
  }
  if (breakdown.experiencia >= WEIGHTS.experiencia * 0.7) {
    pontos.push(`${fornecedor.fornecimentosCount || 'Várias'} colaborações anteriores`)
  }
  if (breakdown.preferencial > 0) {
    pontos.push('Fornecedor preferencial')
  }

  return pontos
}

/**
 * Get enriched supplier data with evaluation averages and supply counts
 */
async function enrichSupplierData(fornecedor) {
  const enriched = { ...fornecedor }

  try {
    // Get evaluation averages
    const { data: avaliacoes } = await supabase
      .from('fornecedor_avaliacoes')
      .select('rating_qualidade, rating_prazo, rating_preco, rating_comunicacao')
      .eq('fornecedor_id', fornecedor.id)

    if (avaliacoes?.length > 0) {
      const avg = (field) => {
        const vals = avaliacoes.filter(a => a[field]).map(a => a[field])
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
      }
      enriched.avgQualidadeRating = avg('rating_qualidade')
      enriched.avgPrazoRating = avg('rating_prazo')
      enriched.avgPrecoRating = avg('rating_preco')
      enriched.avgComunicacaoRating = avg('rating_comunicacao')
    }

    // Get supply count
    const { count } = await supabase
      .from('fornecedor_fornecimentos')
      .select('id', { count: 'exact', head: true })
      .eq('fornecedor_id', fornecedor.id)

    enriched.fornecimentosCount = count || 0

    // Get quote deviation average
    const { data: quoteLinesData } = await supabase
      .from('orcamento_recebido_linhas')
      .select('desvio_percentual, orcamentos_recebidos!inner(fornecedor_id)')
      .eq('orcamentos_recebidos.fornecedor_id', fornecedor.id)
      .not('desvio_percentual', 'is', null)

    if (quoteLinesData?.length > 0) {
      const avgDev = quoteLinesData.reduce((s, l) => s + (l.desvio_percentual || 0), 0) / quoteLinesData.length
      enriched.avgQuoteDeviation = avgDev
    }

    // Get supplier profile if exists
    const { data: perfil } = await supabase
      .from('fornecedor_perfil')
      .select('*')
      .eq('fornecedor_id', fornecedor.id)
      .single()

    if (perfil) {
      enriched.zona_atuacao = perfil.zona_atuacao || []
      enriched.materiais_especialidade = perfil.materiais_especialidade || []
      enriched.capacidade_mensal = perfil.capacidade_mensal
    }
  } catch {
    // Silent - enrichment is best-effort
  }

  return enriched
}

/**
 * Rank all suppliers for given requirements
 * Returns sorted array with scores
 */
export async function rankSuppliers(fornecedores, requirements = {}) {
  const results = []

  for (const f of fornecedores) {
    // Only rank active/preferred suppliers
    if (f.status !== 'ativo' && f.status !== 'preferencial') continue

    const enriched = await enrichSupplierData(f)
    const { score, breakdown, justificacao } = calculateMatchScore(enriched, requirements)

    results.push({
      fornecedor: f,
      score,
      breakdown,
      justificacao,
      enrichedData: {
        avgQualidadeRating: enriched.avgQualidadeRating,
        avgPrazoRating: enriched.avgPrazoRating,
        fornecimentosCount: enriched.fornecimentosCount,
        avgQuoteDeviation: enriched.avgQuoteDeviation
      }
    })
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results
}

/**
 * Get top N recommendations for a specialty
 */
export async function getTopRecommendations(fornecedores, especialidade, topN = 3) {
  const ranked = await rankSuppliers(fornecedores, { especialidade })
  return ranked.slice(0, topN)
}

/**
 * Cache scores in database for a project
 */
export async function cacheProjectScores(projetoId, fornecedores, requirements) {
  try {
    const ranked = await rankSuppliers(fornecedores, requirements)

    const records = ranked.map(r => ({
      fornecedor_id: r.fornecedor.id,
      projeto_id: projetoId,
      especialidade: requirements.especialidade || null,
      score_total: r.score,
      score_breakdown: r.breakdown,
      justificacao: r.justificacao,
      calculado_em: new Date().toISOString()
    }))

    if (records.length > 0) {
      // Upsert scores
      await supabase
        .from('fornecedor_projeto_scores')
        .upsert(records, { onConflict: 'fornecedor_id,projeto_id,especialidade' })
    }

    return ranked
  } catch (err) {
    console.error('Error caching scores:', err)
    return []
  }
}

/**
 * Get cached scores from DB
 */
export async function getCachedScores(projetoId, especialidade = null) {
  try {
    let query = supabase
      .from('fornecedor_projeto_scores')
      .select('*, fornecedores(id, nome, especialidade, rating, status)')
      .eq('projeto_id', projetoId)
      .order('score_total', { ascending: false })

    if (especialidade) {
      query = query.eq('especialidade', especialidade)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

/**
 * Compare two or more suppliers side by side
 */
export async function compareSuppliers(fornecedorIds, fornecedores) {
  const suppliers = fornecedores.filter(f => fornecedorIds.includes(f.id))
  const comparison = []

  for (const f of suppliers) {
    const enriched = await enrichSupplierData(f)
    comparison.push({
      id: f.id,
      nome: f.nome,
      especialidade: f.especialidade,
      status: f.status,
      rating: f.rating,
      prazo_pagamento: f.prazo_pagamento,
      desconto_acordado: f.desconto_acordado,
      is_preferencial: f.is_preferencial,
      avgQualidade: enriched.avgQualidadeRating,
      avgPrazo: enriched.avgPrazoRating,
      avgPreco: enriched.avgPrecoRating,
      avgComunicacao: enriched.avgComunicacaoRating,
      fornecimentosCount: enriched.fornecimentosCount,
      avgQuoteDeviation: enriched.avgQuoteDeviation,
      zonas: enriched.zona_atuacao || [],
      materiais: enriched.materiais_especialidade || []
    })
  }

  return comparison
}
