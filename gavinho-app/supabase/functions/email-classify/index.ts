// Supabase Edge Function para classificar urgência de emails com IA
// Deploy: supabase functions deploy email-classify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClassifyRequest {
  email_id: string
  assunto: string
  corpo: string
}

interface ClassifyResponse {
  urgencia: 'urgente' | 'alta' | 'normal' | 'baixa'
  razao: string
  categorias: string[]
}

// Palavras-chave para classificação rápida (fallback se IA falhar)
const URGENCIA_KEYWORDS = {
  urgente: [
    'urgente', 'urgent', 'asap', 'imediato', 'hoje', 'agora',
    'crítico', 'emergência', 'parar obra', 'acidente', 'prazo final',
    'multa', 'penalização', 'bloqueio', 'problema grave'
  ],
  alta: [
    'importante', 'prioridade', 'atenção', 'atraso', 'problema',
    'pendente', 'falta', 'erro', 'corrigir', 'resolver',
    'amanhã', 'esta semana', 'brevemente'
  ],
  baixa: [
    'fyi', 'informação', 'arquivo', 'referência', 'newsletter',
    'boletim', 'quando puder', 'sem pressa', 'oportunamente'
  ]
}

// Classificação baseada em regras (fallback)
function classifyByKeywords(assunto: string, corpo: string): 'urgente' | 'alta' | 'normal' | 'baixa' {
  const texto = `${assunto} ${corpo}`.toLowerCase()

  for (const keyword of URGENCIA_KEYWORDS.urgente) {
    if (texto.includes(keyword)) return 'urgente'
  }

  for (const keyword of URGENCIA_KEYWORDS.alta) {
    if (texto.includes(keyword)) return 'alta'
  }

  for (const keyword of URGENCIA_KEYWORDS.baixa) {
    if (texto.includes(keyword)) return 'baixa'
  }

  return 'normal'
}

// Classificação com Claude
async function classifyWithClaude(assunto: string, corpo: string): Promise<ClassifyResponse> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicApiKey) {
    console.warn('ANTHROPIC_API_KEY não configurada, usando classificação por keywords')
    return {
      urgencia: classifyByKeywords(assunto, corpo),
      razao: 'Classificação automática por palavras-chave',
      categorias: []
    }
  }

  const systemPrompt = `És um assistente especializado em classificar emails de uma empresa de construção e design de interiores de luxo (GAVINHO).

A tua tarefa é analisar emails e classificá-los por urgência, identificando:
1. Nível de urgência
2. Razão da classificação
3. Categorias relevantes

NÍVEIS DE URGÊNCIA:
- urgente: Requer ação imediata (problemas em obra, prazos críticos, bloqueios, acidentes, multas)
- alta: Importante e deve ser tratado em 24-48h (atrasos, problemas de fornecimento, decisões pendentes)
- normal: Assuntos correntes sem pressão temporal especial
- baixa: Informativos, newsletters, assuntos de baixa prioridade

CATEGORIAS POSSÍVEIS:
- obra (assuntos de construção)
- cliente (comunicação com cliente)
- fornecedor (materiais, entregas)
- financeiro (orçamentos, pagamentos)
- projeto (desenhos, entregáveis)
- legal (licenciamentos, contratos)
- rh (equipa, recursos)
- comercial (propostas, novos projetos)

Responde APENAS em JSON válido com esta estrutura:
{
  "urgencia": "urgente|alta|normal|baixa",
  "razao": "breve explicação da classificação",
  "categorias": ["categoria1", "categoria2"]
}`

  const userPrompt = `Classifica este email:

ASSUNTO: ${assunto}

CORPO:
${corpo?.substring(0, 2000) || '(sem conteúdo)'}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro na API Anthropic:', errorData)
      throw new Error('Erro na API')
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        urgencia: result.urgencia || 'normal',
        razao: result.razao || '',
        categorias: result.categorias || []
      }
    }

    throw new Error('Resposta inválida')
  } catch (err) {
    console.error('Erro ao classificar com Claude:', err)
    // Fallback para classificação por keywords
    return {
      urgencia: classifyByKeywords(assunto, corpo),
      razao: 'Classificação automática por palavras-chave (fallback)',
      categorias: []
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email_id, assunto, corpo }: ClassifyRequest = await req.json()

    if (!email_id || !assunto) {
      throw new Error('Parâmetros email_id e assunto são obrigatórios')
    }

    // Classificar email
    const classification = await classifyWithClaude(assunto, corpo)

    // Atualizar email na base de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: updateError } = await supabase
      .from('obra_emails')
      .update({
        urgencia: classification.urgencia,
        classificacao_ia: {
          urgencia: classification.urgencia,
          razao: classification.razao,
          categorias: classification.categorias,
          classificado_em: new Date().toISOString()
        },
        processado_ia: true
      })
      .eq('id', email_id)

    if (updateError) {
      console.error('Erro ao atualizar email:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...classification
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
