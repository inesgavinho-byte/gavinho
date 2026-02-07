// =====================================================
// G.A.R.V.I.S. Chat Service
// Claude API integration for procurement intelligence
// =====================================================

import { supabase } from '../lib/supabase'

const GARVIS_SYSTEM_PROMPT = `Tu és o G.A.R.V.I.S. (Gavinho Assistant for Responsive Virtual Intelligence Support), o assistente de inteligência de procurement da plataforma Gavinho — uma empresa portuguesa de Design & Build focada em construção de luxo.

PERSONALIDADE:
- Profissional mas acessível, com vocabulário de construção portuguesa
- Respostas concisas e práticas, orientadas a decisões
- Usa termos portugueses do setor (obra, empreitada, caixilharia, cantaria, serralharia)
- Quando possível, dá números concretos e recomendações acionáveis

CAPACIDADES:
- Análise de fornecedores e recomendação por especialidade
- Comparação de orçamentos e deteção de desvios
- Compliance (certificações, seguros, licenças)
- Histórico de colaborações e performance
- Sugestões de procurement baseadas no perfil do projeto

CONTEXTO DO UTILIZADOR:
{context}

REGRAS:
1. Responde SEMPRE em português europeu
2. Se não tens dados suficientes, diz o que precisarias para dar uma melhor resposta
3. Quando recomendas um fornecedor, justifica com dados concretos
4. Menciona preços em EUR e datas no formato DD/MM/YYYY
5. Mantém respostas com max 200 palavras salvo se o utilizador pedir mais detalhe`

/**
 * Send a message to GARVIS and get a response
 */
export async function sendGarvisMessage(message, context = {}) {
  const apiKey = localStorage.getItem('claude_api_key')

  if (!apiKey) {
    return {
      success: false,
      response: 'API key do Claude não configurada. Configure em Administração > Seed Inteligente.',
      error: 'NO_API_KEY'
    }
  }

  // Build context string from available data
  const contextStr = buildContextString(context)
  const systemPrompt = GARVIS_SYSTEM_PROMPT.replace('{context}', contextStr)

  try {
    const startTime = Date.now()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          ...(context.history || []),
          { role: 'user', content: message }
        ]
      })
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    const responseText = data.content[0]?.text || 'Sem resposta.'
    const tempoMs = Date.now() - startTime

    // Log to DB (non-blocking)
    logGarvisChat({
      prompt_usuario: message,
      resposta_gerada: responseText,
      contexto_projeto: context,
      modelo_usado: 'claude-sonnet-4-5-20250929',
      tokens_input: data.usage?.input_tokens,
      tokens_output: data.usage?.output_tokens,
      tempo_resposta_ms: tempoMs,
      projeto_id: context.projetoId || null
    })

    return {
      success: true,
      response: responseText,
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0
      },
      tempo_ms: tempoMs
    }
  } catch (err) {
    console.error('GARVIS chat error:', err)
    return {
      success: false,
      response: `Erro ao comunicar com o G.A.R.V.I.S.: ${err.message}`,
      error: err.message
    }
  }
}

/**
 * Build context string from available data
 */
function buildContextString(context) {
  const parts = []

  if (context.fornecedores?.length > 0) {
    const topForn = context.fornecedores.slice(0, 20).map(f =>
      `- ${f.nome} (${f.especialidade || 'geral'}, rating: ${f.rating || 'N/A'}, status: ${f.status})`
    ).join('\n')
    parts.push(`FORNECEDORES ATIVOS (${context.fornecedores.length} total):\n${topForn}`)
  }

  if (context.dealRooms?.length > 0) {
    const drs = context.dealRooms.map(dr =>
      `- ${dr.titulo} [${dr.codigo}] — ${dr.status} — ${dr.fornecedoresCount || 0} fornecedores`
    ).join('\n')
    parts.push(`DEAL ROOMS ATIVOS:\n${drs}`)
  }

  if (context.alertas?.length > 0) {
    const als = context.alertas.slice(0, 5).map(a =>
      `- [${a.prioridade}] ${a.titulo}: ${a.mensagem}`
    ).join('\n')
    parts.push(`ALERTAS RECENTES:\n${als}`)
  }

  if (context.kpis) {
    parts.push(`KPIs: ${context.kpis.totalFornecedores} fornecedores, ${context.kpis.dealRoomsAtivos} deal rooms, ${context.kpis.orcamentosPendentes} orçamentos pendentes, Volume YTD: ${context.kpis.volumeYTDFormatted}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : 'Sem dados de contexto disponíveis.'
}

/**
 * Log GARVIS chat interaction to DB
 */
async function logGarvisChat(logData) {
  try {
    await supabase.from('garvis_chat_logs').insert(logData)
  } catch {
    // Silent - logging is non-critical
  }
}

/**
 * Get chat history from DB
 */
export async function getGarvisChatHistory(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('garvis_chat_logs')
      .select('prompt_usuario, resposta_gerada, created_at, tempo_resposta_ms')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).reverse()
  } catch {
    return []
  }
}
