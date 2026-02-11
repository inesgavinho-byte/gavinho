// =====================================================
// G.A.R.V.I.S. Chat Service
// Claude API integration for procurement intelligence
// Command processing + AI chat
// =====================================================

import { supabase } from '../lib/supabase'
import { rankSuppliers, compareSuppliers } from './garvisMatching'
import { compareDealRoomQuotes } from './garvisQuoteAnalysis'

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

// Command definitions
const COMMANDS = {
  '/recomendar': {
    pattern: /^\/recomendar\s+(.+)/i,
    description: 'Recomendar fornecedores por especialidade',
    handler: handleRecomendar
  },
  '/comparar': {
    pattern: /^\/comparar\s+(.+)/i,
    description: 'Comparar fornecedores',
    handler: handleComparar
  },
  '/analise': {
    pattern: /^\/analis[ea]r?\s*(.*)/i,
    description: 'Analisar deal room ou orçamento',
    handler: handleAnalise
  },
  '/status': {
    pattern: /^\/status\s*(.*)/i,
    description: 'Status dos deal rooms',
    handler: handleStatus
  }
}

/**
 * Process a message - check for commands first, then AI
 */
export async function sendGarvisMessage(message, context = {}) {
  // Check for commands
  const commandResult = await processCommand(message, context)
  if (commandResult) return commandResult

  // Regular AI message
  return sendAIMessage(message, context)
}

/**
 * Process slash commands
 */
async function processCommand(message, context) {
  const trimmed = message.trim()

  // Help command
  if (trimmed === '/ajuda' || trimmed === '/help') {
    return {
      success: true,
      response: `**Comandos disponíveis:**\n\n` +
        `**/recomendar [especialidade]** — Encontrar melhores fornecedores\n` +
        `Ex: /recomendar caixilharia\n\n` +
        `**/comparar [nomes]** — Comparar fornecedores lado a lado\n` +
        `Ex: /comparar Alumiber, Cortizo\n\n` +
        `**/analisar** — Analisar deal rooms ativos e orçamentos\n\n` +
        `**/status** — Resumo de deal rooms ativos\n\n` +
        `Pode também fazer perguntas em linguagem natural.`,
      isCommand: true,
      tempo_ms: 0
    }
  }

  for (const [, cmd] of Object.entries(COMMANDS)) {
    const match = trimmed.match(cmd.pattern)
    if (match) {
      try {
        const startTime = Date.now()
        const result = await cmd.handler(match[1]?.trim(), context)
        return {
          success: true,
          response: result,
          isCommand: true,
          tempo_ms: Date.now() - startTime
        }
      } catch (err) {
        return {
          success: false,
          response: `Erro ao processar comando: ${err.message}`,
          isCommand: true,
          tempo_ms: 0
        }
      }
    }
  }

  return null
}

/**
 * /recomendar [especialidade] - Recommend suppliers
 */
async function handleRecomendar(especialidade, context) {
  const fornecedores = context.fornecedores || []

  if (fornecedores.length === 0) {
    return 'Sem fornecedores registados. Adicione fornecedores para ativar recomendações.'
  }

  const ranked = await rankSuppliers(fornecedores, { especialidade })
  const top = ranked.slice(0, 5)

  if (top.length === 0) {
    return `Nenhum fornecedor ativo encontrado para "${especialidade}". Verifique os fornecedores registados.`
  }

  let response = `**Top ${top.length} fornecedores para ${especialidade}:**\n\n`

  top.forEach((r, i) => {
    const f = r.fornecedor
    response += `**${i + 1}. ${f.nome}** — Score: ${r.score}/100\n`
    if (r.justificacao.length > 0) {
      response += `   ${r.justificacao.join(' · ')}\n`
    }
    if (f.email) response += `   Contacto: ${f.email}\n`
    response += '\n'
  })

  if (top.length > 0 && top[0].score >= 70) {
    response += `\n💡 **Recomendação:** ${top[0].fornecedor.nome} é a melhor opção (${top[0].score}% match).`
  }

  return response
}

/**
 * /comparar [nomes separados por vírgula] - Compare suppliers
 */
async function handleComparar(args, context) {
  const fornecedores = context.fornecedores || []
  const nomes = args.split(',').map(n => n.trim().toLowerCase())

  const matchedIds = []
  for (const nome of nomes) {
    const found = fornecedores.find(f =>
      f.nome?.toLowerCase().includes(nome) || nome.includes(f.nome?.toLowerCase())
    )
    if (found) matchedIds.push(found.id)
  }

  if (matchedIds.length < 2) {
    return `Necessário pelo menos 2 fornecedores para comparar. Encontrados: ${matchedIds.length}.\nUse nomes separados por vírgula: /comparar Nome1, Nome2`
  }

  const comparison = await compareSuppliers(matchedIds, fornecedores)

  let response = `**Comparação de ${comparison.length} fornecedores:**\n\n`

  response += '| | ' + comparison.map(c => `**${c.nome}**`).join(' | ') + ' |\n'
  response += '|---|' + comparison.map(() => '---').join('|') + '|\n'
  response += '| Especialidade | ' + comparison.map(c => c.especialidade || '—').join(' | ') + ' |\n'
  response += '| Rating | ' + comparison.map(c => c.rating ? `${c.rating}/5` : '—').join(' | ') + ' |\n'
  response += '| Status | ' + comparison.map(c => c.status).join(' | ') + ' |\n'
  response += '| Colaborações | ' + comparison.map(c => c.fornecimentosCount || 0).join(' | ') + ' |\n'

  if (comparison.some(c => c.avgQualidade)) {
    response += '| Qualidade (avg) | ' + comparison.map(c => c.avgQualidade ? `${c.avgQualidade.toFixed(1)}/5` : '—').join(' | ') + ' |\n'
  }
  if (comparison.some(c => c.avgPrazo)) {
    response += '| Prazos (avg) | ' + comparison.map(c => c.avgPrazo ? `${c.avgPrazo.toFixed(1)}/5` : '—').join(' | ') + ' |\n'
  }
  if (comparison.some(c => c.avgQuoteDeviation !== undefined)) {
    response += '| Desvio preço | ' + comparison.map(c =>
      c.avgQuoteDeviation !== undefined ? `${c.avgQuoteDeviation > 0 ? '+' : ''}${c.avgQuoteDeviation.toFixed(1)}%` : '—'
    ).join(' | ') + ' |\n'
  }

  response += '| Preferencial | ' + comparison.map(c => c.is_preferencial ? '✓' : '—').join(' | ') + ' |\n'

  return response
}

/**
 * /analisar - Analyze deal rooms or quotes
 */
async function handleAnalise(args, context) {
  const dealRooms = context.dealRooms || []

  if (dealRooms.length === 0) {
    return 'Sem deal rooms ativos para analisar. Crie um deal room primeiro.'
  }

  // If specific deal room code given
  if (args) {
    const dr = dealRooms.find(d =>
      d.codigo?.toLowerCase() === args.toLowerCase() ||
      d.titulo?.toLowerCase().includes(args.toLowerCase())
    )
    if (dr) {
      const comparison = await compareDealRoomQuotes(dr.id)
      if (comparison.quotes?.length > 0) {
        let response = `**Análise Deal Room: ${dr.titulo}** [${dr.codigo}]\n\n`
        response += `Orçamentos recebidos: ${comparison.total_quotes}\n`
        if (comparison.budget) response += `Orçamento disponível: €${parseFloat(comparison.budget).toLocaleString('pt-PT')}\n`
        response += `Valor mais baixo: €${comparison.lowest?.toLocaleString('pt-PT')}\n`
        response += `Valor mais alto: €${comparison.highest?.toLocaleString('pt-PT')}\n`
        if (comparison.spread > 0) response += `Amplitude: €${comparison.spread.toLocaleString('pt-PT')} (${comparison.spread_pct}%)\n`

        if (comparison.recomendacao) {
          response += `\n💡 **Recomendação:** ${comparison.recomendacao.fornecedor_nome} — ${comparison.recomendacao.motivo} (€${comparison.recomendacao.valor?.toLocaleString('pt-PT')})`
        }
        return response
      }
      return `Deal Room "${dr.titulo}" ainda não tem orçamentos recebidos.`
    }
    return `Deal Room "${args}" não encontrado. Deal rooms ativos: ${dealRooms.map(d => d.codigo).join(', ')}`
  }

  // General analysis of all deal rooms
  let response = `**Análise geral — ${dealRooms.length} deal rooms ativos:**\n\n`
  for (const dr of dealRooms.slice(0, 5)) {
    const orcRecebidos = dr.orcamentosRecebidos || 0
    const total = dr.fornecedoresCount || 0
    response += `**${dr.titulo}** [${dr.codigo}] — ${dr.status}\n`
    response += `  ${total} fornecedores convidados, ${orcRecebidos} orçamentos recebidos\n`
    if (dr.prazo_necessario) {
      response += `  Prazo: ${new Date(dr.prazo_necessario).toLocaleDateString('pt-PT')}\n`
    }
    response += '\n'
  }

  return response
}

/**
 * /status - Quick status of deal rooms
 */
async function handleStatus(args, context) {
  const dealRooms = context.dealRooms || []
  const kpis = context.kpis || {}

  let response = `**Status G.A.R.V.I.S.**\n\n`
  response += `📊 Fornecedores: ${kpis.total || kpis.totalFornecedores || '—'}\n`
  response += `💰 Volume YTD: ${kpis.volumeYTD || kpis.volumeYTDFormatted || '—'}\n`
  response += `🏗️ Deal Rooms ativos: ${dealRooms.length}\n`
  response += `📋 Orçamentos pendentes: ${kpis.orcamentos || kpis.orcamentosPendentes || 0}\n`
  response += `🚨 Alertas críticos: ${kpis.alertas || kpis.alertasCriticos || 0}\n`

  if (dealRooms.length > 0) {
    response += '\n**Deal Rooms:**\n'
    for (const dr of dealRooms) {
      response += `• ${dr.titulo} [${dr.codigo}] — ${dr.badge || dr.status}\n`
    }
  }

  return response
}

/**
 * Send message to Claude AI (non-command)
 */
async function sendAIMessage(message, context = {}) {
  let apiKey = localStorage.getItem('claude_api_key')

  // Fallback: try to load from garvis_configuracao table
  if (!apiKey) {
    try {
      const { data } = await supabase
        .from('garvis_configuracao')
        .select('valor')
        .eq('chave', 'claude_api_key')
        .single()
      if (data?.valor) {
        apiKey = data.valor
        localStorage.setItem('claude_api_key', apiKey)
      }
    } catch { /* table may not exist */ }
  }

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
    const k = context.kpis
    parts.push(`KPIs: ${k.totalFornecedores || k.total || '—'} fornecedores, ${k.dealRoomsAtivos || k.dealRooms || 0} deal rooms, ${k.orcamentosPendentes || k.orcamentos || 0} orçamentos pendentes, Volume YTD: ${k.volumeYTDFormatted || k.volumeYTD || '€0'}`)
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
