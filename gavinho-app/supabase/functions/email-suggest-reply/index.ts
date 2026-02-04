// Supabase Edge Function para sugerir respostas de email com IA
// Deploy: supabase functions deploy email-suggest-reply

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SuggestRequest {
  email_id: string
  assunto: string
  corpo: string
  de_nome: string
  de_email: string
  obra_id?: string
}

interface SuggestResponse {
  resposta: string
  contexto?: string
  notas?: string
  tom: 'formal' | 'cordial' | 'direto'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email_id, assunto, corpo, de_nome, de_email, obra_id }: SuggestRequest = await req.json()

    if (!email_id || !assunto) {
      throw new Error('Parâmetros email_id e assunto são obrigatórios')
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada')
    }

    // Buscar contexto da obra se disponível
    let obraContexto = ''
    if (obra_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: obra } = await supabase
        .from('obras')
        .select(`
          codigo, codigo_canonico, nome, estado,
          projetos(nome, cliente_id, clientes(nome))
        `)
        .eq('id', obra_id)
        .single()

      if (obra) {
        obraContexto = `
CONTEXTO DA OBRA:
- Código: ${obra.codigo_canonico || obra.codigo}
- Nome: ${obra.nome}
- Estado: ${obra.estado}
- Projeto: ${obra.projetos?.nome || 'N/A'}
- Cliente: ${obra.projetos?.clientes?.nome || 'N/A'}
`
      }

      // Buscar últimas decisões e acções relevantes
      const { data: decisoes } = await supabase
        .from('project_decisions')
        .select('questao, decisao, data_resolucao')
        .eq('projeto_id', obra_id)
        .eq('estado', 'resolvido')
        .order('data_resolucao', { ascending: false })
        .limit(3)

      if (decisoes && decisoes.length > 0) {
        obraContexto += `
ÚLTIMAS DECISÕES:
${decisoes.map(d => `- ${d.questao}: ${d.decisao}`).join('\n')}
`
      }
    }

    const systemPrompt = `És um assistente profissional da GAVINHO, uma empresa portuguesa de construção e design de interiores de luxo.

A tua tarefa é sugerir uma resposta profissional a um email recebido.

ESTILO DE COMUNICAÇÃO GAVINHO:
- Tom profissional mas cordial
- Respostas claras e objetivas
- Demonstrar conhecimento e confiança
- Usar "nós" em vez de "eu" (representamos a empresa)
- Português europeu (não brasileiro)
- Evitar anglicismos desnecessários
- Ser direto mas educado

ESTRUTURA DA RESPOSTA:
1. Saudação apropriada (Exmo./a Sr./a para clientes, Caro/a para fornecedores/parceiros)
2. Agradecimento ou reconhecimento do email (se apropriado)
3. Resposta ao conteúdo/questão
4. Próximos passos ou ação necessária
5. Fecho cordial

${obraContexto}

INSTRUÇÕES:
- Gera uma resposta completa e pronta a enviar
- Se não tiveres informação suficiente para responder, indica o que é necessário confirmar
- Mantém um tom consistente com a identidade GAVINHO: luxo, tradição, qualidade
- Responde APENAS em JSON válido com esta estrutura:

{
  "resposta": "texto completo da resposta sugerida",
  "contexto": "breve explicação do contexto considerado",
  "notas": "sugestões ou pontos a confirmar antes de enviar (opcional)",
  "tom": "formal|cordial|direto"
}`

    const userPrompt = `Sugere uma resposta a este email:

DE: ${de_nome || de_email}
ASSUNTO: ${assunto}

CONTEÚDO:
${corpo?.substring(0, 3000) || '(sem conteúdo)'}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro na API Anthropic:', errorData)
      throw new Error('Erro ao gerar sugestão')
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta inválida da IA')
    }

    const result: SuggestResponse = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify({
        success: true,
        ...result
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
