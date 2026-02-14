// Supabase Edge Function para analisar escopo de trabalho com IA
// Deploy: supabase functions deploy analisar-escopo

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `És um assistente especializado em gestão de projetos de arquitetura e design de interiores.
Analisa o escopo de trabalho fornecido e extrai informação estruturada.

TAREFA:
Analisa o texto do escopo e retorna um JSON com:
1. fases - Array de fases do projeto com nome, descrição e duração estimada
2. entregaveis - Array de entregáveis com nome, fase associada e descrição
3. marcos - Marcos importantes do projeto
4. notas - Observações adicionais relevantes

FORMATO DE RESPOSTA (JSON):
{
  "fases": [
    {
      "numero": 1,
      "nome": "Nome da Fase",
      "descricao": "Descrição breve",
      "duracao_estimada": "X semanas/meses",
      "estado_sugerido": "concluido|em_curso|nao_iniciado"
    }
  ],
  "entregaveis": [
    {
      "codigo": "ENT-001",
      "descricao": "Descrição do entregável",
      "fase": "Nome da fase associada",
      "tipo": "desenho|documento|modelo3d|imagem|outro"
    }
  ],
  "marcos": [
    {
      "nome": "Nome do marco",
      "descricao": "Descrição",
      "fase": "Fase associada"
    }
  ],
  "notas": [
    "Nota 1",
    "Nota 2"
  ]
}

REGRAS:
- Extrai APENAS informação que está explícita ou fortemente implícita no texto
- Se uma fase diz "CONCLUÍDO", marca estado_sugerido como "concluido"
- Identifica datas quando mencionadas
- Agrupa entregáveis por fase
- Responde APENAS com o JSON, sem texto adicional`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada')
    }

    const { escopo_texto, projeto_nome } = await req.json()

    if (!escopo_texto) {
      throw new Error('escopo_texto é obrigatório')
    }


    // Chamar Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analisa o seguinte escopo de trabalho do projeto "${projeto_nome || 'Projeto'}":\n\n${escopo_texto}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro Claude API:', errorText)
      throw new Error(`Erro na API Claude: ${response.status}`)
    }

    const result = await response.json()
    const assistantMessage = result.content[0]?.text || ''

    // Tentar parsear o JSON da resposta
    let sugestoes
    try {
      // Remove possíveis markdown code blocks
      const jsonStr = assistantMessage
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      sugestoes = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError)
      console.log('Resposta bruta:', assistantMessage)
      // Retorna estrutura vazia se não conseguir parsear
      sugestoes = {
        fases: [],
        entregaveis: [],
        marcos: [],
        notas: ['Não foi possível extrair informação estruturada do escopo.']
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sugestoes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
