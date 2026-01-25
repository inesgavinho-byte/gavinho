// Supabase Edge Function para detectar decisões em emails e outros conteúdos
// Deploy: supabase functions deploy decisoes-detectar

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectRequest {
  fonte: 'email' | 'reuniao' | 'chat'
  fonte_id: string
  projeto_id: string
  conteudo: string
  metadata?: {
    from?: string
    date?: string
    subject?: string
  }
}

interface DecisaoDetectada {
  titulo: string
  descricao: string
  tipo: string
  impacto: string
  decidido_por: string
  decidido_por_tipo: string
  impacto_orcamento?: number
  impacto_prazo_dias?: number
  divisao?: string
  justificacao?: string
  alternativas?: { opcao: string; motivo_rejeicao: string }[]
  excerto: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fonte, fonte_id, projeto_id, conteudo, metadata }: DetectRequest = await req.json()

    if (!fonte || !projeto_id || !conteudo) {
      throw new Error('Parâmetros fonte, projeto_id e conteudo são obrigatórios')
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar contexto do projecto
    const { data: projeto } = await supabase
      .from('projetos')
      .select('codigo, nome')
      .eq('id', projeto_id)
      .single()

    const systemPrompt = `Analisa o seguinte conteúdo de um projecto de construção/design de interiores e detecta se contém decisões.

Uma DECISÃO é uma escolha que:
- Afecta o projecto (design, materiais, orçamento, prazo, fornecedores)
- Foi tomada ou aprovada por alguém (cliente ou equipa)
- Deve ser registada para referência futura

PADRÕES QUE INDICAM DECISÃO:
- "Decidimos que...", "Fica aprovado...", "Vamos avançar com..."
- "O cliente escolheu...", "Confirmo a opção...", "Aprovo..."
- Aprovação de orçamento ou custo extra
- Escolha entre alternativas apresentadas
- Confirmação de material, acabamento ou fornecedor
- Alteração a algo previamente decidido

TIPOS DE DECISÃO:
- design: escolhas estéticas e funcionais (layout, cores, estilo)
- material: escolha de materiais e acabamentos (mármore, madeira, cerâmica)
- tecnico: soluções construtivas (estrutura, isolamento, sistemas)
- financeiro: aprovação de custos ou extras
- prazo: datas, adiamentos, sequências
- fornecedor: escolha de quem executa
- alteracao: mudança a algo já decidido

NÍVEIS DE IMPACTO:
- critico: afecta orçamento >5% ou prazo >2 semanas
- alto: afecta orçamento 1-5% ou prazo 1-2 semanas
- medio: afecta orçamento <1%, sem impacto prazo significativo
- baixo: decisão reversível, sem custo

Se encontrares decisões, responde em JSON:
{
  "tem_decisoes": true,
  "decisoes": [
    {
      "titulo": "Título curto e descritivo (máx 80 caracteres)",
      "descricao": "Descrição completa da decisão",
      "tipo": "design|material|tecnico|financeiro|prazo|fornecedor|alteracao",
      "impacto": "critico|alto|medio|baixo",
      "decidido_por": "Nome de quem decidiu",
      "decidido_por_tipo": "cliente|gavinho|conjunto",
      "impacto_orcamento": null ou número em euros (positivo = aumento),
      "impacto_prazo_dias": null ou número de dias (positivo = atraso),
      "divisao": "Divisão/zona afectada se aplicável (ex: Cozinha, WC Suite)",
      "justificacao": "Razão da decisão se mencionada",
      "alternativas": [{"opcao": "Alternativa rejeitada", "motivo_rejeicao": "Porquê"}],
      "excerto": "Frase exacta do texto que contém a decisão"
    }
  ]
}

Se NÃO houver decisões:
{
  "tem_decisoes": false,
  "motivo": "Explicação curta"
}

IMPORTANTE:
- Só extrair decisões CLARAS, não suposições
- O excerto deve ser uma citação directa do texto
- Se o valor financeiro não for explícito, usar null
- Preferir português europeu`

    const userPrompt = `CONTEXTO:
Projecto: ${projeto?.codigo || 'Desconhecido'} - ${projeto?.nome || ''}
Fonte: ${fonte === 'email' ? 'Email' : fonte === 'reuniao' ? 'Reunião gravada' : 'Chat'}
${metadata?.from ? `De: ${metadata.from}` : ''}
${metadata?.date ? `Data: ${metadata.date}` : ''}
${metadata?.subject ? `Assunto: ${metadata.subject}` : ''}

CONTEÚDO A ANALISAR:
${conteudo.substring(0, 4000)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro na API Anthropic:', errorData)
      throw new Error('Erro ao analisar conteúdo')
    }

    const data = await response.json()
    const textoResposta = data.content?.[0]?.text || ''

    // Extrair JSON da resposta
    const jsonMatch = textoResposta.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ success: true, tem_decisoes: false, decisoes_criadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resultado = JSON.parse(jsonMatch[0])

    if (!resultado.tem_decisoes || !resultado.decisoes?.length) {
      return new Response(
        JSON.stringify({ success: true, tem_decisoes: false, decisoes_criadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar sugestões de decisão na base de dados
    const decisoesCriadas = []
    for (const dec of resultado.decisoes as DecisaoDetectada[]) {
      const { data: novaDecisao, error } = await supabase
        .from('decisoes')
        .insert({
          projeto_id,
          titulo: dec.titulo,
          descricao: dec.descricao,
          tipo: dec.tipo,
          impacto: dec.impacto,
          decidido_por: dec.decidido_por,
          decidido_por_tipo: dec.decidido_por_tipo,
          data_decisao: metadata?.date ? new Date(metadata.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          impacto_orcamento: dec.impacto_orcamento,
          impacto_prazo_dias: dec.impacto_prazo_dias,
          divisao: dec.divisao,
          justificacao: dec.justificacao,
          alternativas_consideradas: dec.alternativas,
          fonte,
          fonte_referencia: fonte_id,
          fonte_excerto: dec.excerto,
          estado: 'sugerida'
        })
        .select()
        .single()

      if (!error && novaDecisao) {
        decisoesCriadas.push(novaDecisao)

        // Registar no histórico
        await supabase.from('decisoes_historico').insert({
          decisao_id: novaDecisao.id,
          campo_alterado: 'estado',
          valor_anterior: null,
          valor_novo: 'sugerida',
          motivo: `Detectada automaticamente de ${fonte}`
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tem_decisoes: true,
        decisoes_criadas: decisoesCriadas.length,
        decisoes: decisoesCriadas
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
