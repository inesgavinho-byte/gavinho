// Supabase Edge Function para chat interativo de viabilidade urbanística
// Deploy: supabase functions deploy viabilidade-chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System prompt para o assistente de viabilidade
const CHAT_SYSTEM_PROMPT = `És um assistente especializado em urbanismo e licenciamentos municipais em Portugal.
Chamas-te "Assistente GAVINHO" e ajudas gestores de projeto a analisar viabilidade urbanística.

CONHECIMENTO:
- Regulamento Jurídico da Urbanização e Edificação (RJUE)
- Regulamento Geral das Edificações Urbanas (RGEU)
- Planos Diretores Municipais (especialmente Sintra e Lisboa)
- Reserva Ecológica Nacional (REN) e Reserva Agrícola Nacional (RAN)
- Servidões e restrições de utilidade pública

ESTILO DE COMUNICAÇÃO:
- Responde em português de Portugal
- Sê direto e técnico, mas acessível
- Quando relevante, cita artigos específicos da legislação
- Se não tiveres certeza, indica claramente e sugere verificação junto da câmara municipal

FUNCIONALIDADES:
- Responder a dúvidas sobre classificação de solo
- Explicar condicionantes e servidões
- Ajudar a interpretar plantas de ordenamento e condicionantes
- Sugerir procedimentos de licenciamento adequados
- Esclarecer requisitos documentais

Tens acesso ao contexto da análise atual, incluindo dados do terreno e operação pretendida.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { analise_id, message, history = [] } = await req.json()

    if (!analise_id) {
      throw new Error('analise_id é obrigatório')
    }

    if (!message) {
      throw new Error('message é obrigatória')
    }


    // 1. Carregar contexto da análise
    const { data: analise, error: analiseError } = await supabase
      .from('v_analises_completas')
      .select('*')
      .eq('id', analise_id)
      .single()

    if (analiseError || !analise) {
      throw new Error(`Análise não encontrada: ${analiseError?.message || 'ID inválido'}`)
    }

    // 2. Carregar prompts do concelho (se existir prompt de chat)
    const { data: prompts } = await supabase
      .from('concelho_prompts')
      .select('*')
      .eq('concelho_id', analise.concelho_id)
      .eq('tipo', 'chat')
      .eq('activo', true)
      .single()

    // 3. Construir system prompt com contexto
    const systemPrompt = buildChatSystemPrompt(analise, prompts?.prompt)

    // 4. Construir histórico de mensagens
    const messages: ChatMessage[] = [
      ...history.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ]

    // 5. Chamar Claude API
    const response = await chatComClaude(systemPrompt, messages, anthropicApiKey)

    return new Response(
      JSON.stringify({
        success: true,
        response: response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Construir system prompt com contexto da análise
function buildChatSystemPrompt(analise: any, customPrompt?: string): string {
  let prompt = CHAT_SYSTEM_PROMPT

  // Adicionar prompt customizado do concelho
  if (customPrompt) {
    prompt += `\n\nINSTRUÇÕES ESPECÍFICAS DO CONCELHO:\n${customPrompt}`
  }

  // Adicionar contexto da análise atual
  prompt += `\n\nCONTEXTO DA ANÁLISE ATUAL:`
  prompt += `\nCódigo: ${analise.codigo}`
  prompt += `\nConcelho: ${analise.concelho_nome || 'Não especificado'}`

  const dados = analise.dados_entrada || {}

  if (dados.localizacao) {
    prompt += `\n\nLocalização:`
    if (dados.localizacao.morada) prompt += `\n- Morada: ${dados.localizacao.morada}`
    if (dados.localizacao.freguesia) prompt += `\n- Freguesia: ${dados.localizacao.freguesia}`
    if (dados.localizacao.area_terreno) prompt += `\n- Área do Terreno: ${dados.localizacao.area_terreno} m²`
  }

  if (dados.solo) {
    prompt += `\n\nClassificação do Solo:`
    if (dados.solo.tipo) prompt += `\n- Tipo: ${dados.solo.tipo}`
    if (dados.solo.categoria) prompt += `\n- Categoria: ${dados.solo.categoria}`
  }

  if (dados.regimes) {
    prompt += `\n\nRegimes e Servidões:`
    if (dados.regimes.ren?.length) prompt += `\n- REN: ${dados.regimes.ren.join(', ')}`
    if (dados.regimes.ran) prompt += `\n- RAN: Sim`
    if (dados.regimes.servidoes?.length) prompt += `\n- Servidões: ${dados.regimes.servidoes.join(', ')}`
  }

  if (dados.operacao) {
    prompt += `\n\nOperação Pretendida:`
    if (dados.operacao.tipo) prompt += `\n- Tipo: ${dados.operacao.tipo}`
    if (dados.operacao.uso_pretendido) prompt += `\n- Uso: ${dados.operacao.uso_pretendido}`
  }

  // Adicionar resultado da análise se existir
  if (analise.resultado) {
    prompt += `\n\nRESULTADO DA ANÁLISE:`
    prompt += `\n- Classificação: ${analise.classificacao}`
    if (analise.resultado.fundamentacao) {
      prompt += `\n- Fundamentação: ${analise.resultado.fundamentacao}`
    }
  }

  return prompt
}

// Chamar Claude API para chat
async function chatComClaude(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro Claude:', data)
    throw new Error(`Erro na API Claude: ${data.error?.message || 'Desconhecido'}`)
  }

  return data.content[0].text
}
