// Supabase Edge Function para analisar mensagens com IA
// Deploy: supabase functions deploy analisar-mensagens

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tipos de sugestões que a IA pode identificar
const TIPOS_SUGESTAO = {
  REQUISICAO_MATERIAL: 'requisicao_material',
  REGISTO_HORAS: 'registo_horas',
  TRABALHO_EXECUTADO: 'trabalho_executado',
  NOVA_TAREFA: 'nova_tarefa',
  NAO_CONFORMIDADE: 'nao_conformidade',
}

// Prompt para a IA analisar mensagens de obra
const SYSTEM_PROMPT = `És um assistente especializado em análise de mensagens de obras de construção civil em Portugal.

Analisa cada mensagem e identifica se contém alguma das seguintes informações:

1. **Requisição de Material** - Pedidos de materiais, quantidades, urgência
2. **Registo de Horas** - Menções a horas trabalhadas, presenças, pessoas na obra
3. **Trabalho Executado** - Atualizações sobre trabalhos concluídos ou em progresso
4. **Nova Tarefa** - Tarefas a realizar, lembretes, agendamentos
5. **Não Conformidade** - Problemas, defeitos, materiais danificados, erros

Para cada identificação, extrai os dados relevantes em formato JSON.

Responde APENAS com um array JSON de sugestões. Se não houver nada relevante, responde com [].

Exemplo de resposta:
[
  {
    "tipo": "requisicao_material",
    "confianca": 0.95,
    "dados": {
      "material": "Cimento Portland",
      "quantidade": 50,
      "unidade": "sacos",
      "urgente": true
    }
  },
  {
    "tipo": "registo_horas",
    "confianca": 0.88,
    "dados": {
      "pessoas": 4,
      "horasTotal": 36,
      "data": "2025-01-17",
      "descricao": "Trabalho na estrutura"
    }
  }
]`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obter mensagens não processadas
    const { data: mensagens, error: fetchError } = await supabase
      .from('whatsapp_mensagens')
      .select('id, conteudo, obra_id, autor_nome, created_at')
      .eq('processada_ia', false)
      .eq('tipo', 'recebida')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      throw fetchError
    }

    if (!mensagens || mensagens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhuma mensagem para processar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    let totalSugestoes = 0

    for (const mensagem of mensagens) {
      if (!mensagem.conteudo) {
        // Marcar como processada mesmo sem conteúdo
        await supabase
          .from('whatsapp_mensagens')
          .update({ processada_ia: true })
          .eq('id', mensagem.id)
        continue
      }

      // Chamar API da IA (Claude ou OpenAI)
      let sugestoes = []

      if (anthropicApiKey) {
        sugestoes = await analisarComClaude(mensagem.conteudo, anthropicApiKey)
      } else if (openaiApiKey) {
        sugestoes = await analisarComOpenAI(mensagem.conteudo, openaiApiKey)
      } else {
        // Fallback: análise simples por palavras-chave
        sugestoes = analisarPorPalavrasChave(mensagem.conteudo)
      }

      // Guardar sugestões na base de dados
      for (const sugestao of sugestoes) {
        const { error: insertError } = await supabase
          .from('ia_sugestoes')
          .insert({
            mensagem_id: mensagem.id,
            obra_id: mensagem.obra_id,
            tipo: sugestao.tipo,
            dados: sugestao.dados,
            texto_original: mensagem.conteudo,
            confianca: sugestao.confianca || 0.8,
            status: 'pendente',
          })

        if (!insertError) {
          totalSugestoes++
        }
      }

      // Marcar mensagem como processada
      await supabase
        .from('whatsapp_mensagens')
        .update({ processada_ia: true })
        .eq('id', mensagem.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: mensagens.length,
        suggestions: totalSugestoes,
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

// Análise com Claude (Anthropic)
async function analisarComClaude(texto: string, apiKey: string): Promise<any[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analisa esta mensagem de obra:\n\n"${texto}"`,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro Claude:', data)
    return []
  }

  try {
    const content = data.content[0].text
    return JSON.parse(content)
  } catch (e) {
    console.error('Erro a parsear resposta Claude:', e)
    return []
  }
}

// Análise com OpenAI
async function analisarComOpenAI(texto: string, apiKey: string): Promise<any[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analisa esta mensagem de obra:\n\n"${texto}"` },
      ],
      temperature: 0.3,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro OpenAI:', data)
    return []
  }

  try {
    const content = data.choices[0].message.content
    return JSON.parse(content)
  } catch (e) {
    console.error('Erro a parsear resposta OpenAI:', e)
    return []
  }
}

// Análise simples por palavras-chave (fallback sem IA)
function analisarPorPalavrasChave(texto: string): any[] {
  const sugestoes = []
  const textoLower = texto.toLowerCase()

  // Detectar requisições de material
  const materiaisKeywords = ['preciso', 'falta', 'enviar', 'material', 'sacos', 'metros', 'kg', 'unidades', 'cimento', 'ferro', 'tubo', 'tinta', 'tijolo']
  if (materiaisKeywords.some(kw => textoLower.includes(kw))) {
    // Tentar extrair quantidade
    const numMatch = texto.match(/(\d+)\s*(sacos?|metros?|m|kg|unidades?)/i)
    if (numMatch) {
      sugestoes.push({
        tipo: TIPOS_SUGESTAO.REQUISICAO_MATERIAL,
        confianca: 0.7,
        dados: {
          quantidade: parseInt(numMatch[1]),
          unidade: numMatch[2],
          urgente: textoLower.includes('urgente') || textoLower.includes('amanhã'),
        },
      })
    }
  }

  // Detectar registo de horas
  const horasKeywords = ['horas', 'pessoas', 'trabalharam', 'estivemos', 'equipa']
  if (horasKeywords.some(kw => textoLower.includes(kw))) {
    const pessoasMatch = texto.match(/(\d+)\s*pessoas?/i)
    const horasMatch = texto.match(/(\d+)h/i) || texto.match(/das?\s*(\d+)h?\s*[àa]s?\s*(\d+)h?/i)

    if (pessoasMatch || horasMatch) {
      sugestoes.push({
        tipo: TIPOS_SUGESTAO.REGISTO_HORAS,
        confianca: 0.65,
        dados: {
          pessoas: pessoasMatch ? parseInt(pessoasMatch[1]) : null,
          horas: horasMatch ? parseInt(horasMatch[1]) : null,
        },
      })
    }
  }

  // Detectar trabalho executado
  const trabalhoKeywords = ['acabámos', 'terminámos', 'concluímos', 'fizemos', 'estamos a meio', 'progresso']
  if (trabalhoKeywords.some(kw => textoLower.includes(kw))) {
    sugestoes.push({
      tipo: TIPOS_SUGESTAO.TRABALHO_EXECUTADO,
      confianca: 0.6,
      dados: {
        descricao: texto.substring(0, 100),
        percentagem: textoLower.includes('acabámos') || textoLower.includes('terminámos') ? 100 : 50,
      },
    })
  }

  // Detectar não conformidades
  const ncKeywords = ['problema', 'defeito', 'danificado', 'oxidado', 'partido', 'errado', 'fora de esquadria', 'demolir']
  if (ncKeywords.some(kw => textoLower.includes(kw))) {
    sugestoes.push({
      tipo: TIPOS_SUGESTAO.NAO_CONFORMIDADE,
      confianca: 0.75,
      dados: {
        descricao: texto.substring(0, 150),
        gravidade: textoLower.includes('demolir') || textoLower.includes('urgente') ? 'alta' : 'media',
      },
    })
  }

  // Detectar novas tarefas
  const tarefaKeywords = ['temos de', 'precisamos', 'não esquecer', 'amanhã', 'chamar', 'encomendar', 'marcar']
  if (tarefaKeywords.some(kw => textoLower.includes(kw))) {
    sugestoes.push({
      tipo: TIPOS_SUGESTAO.NOVA_TAREFA,
      confianca: 0.6,
      dados: {
        descricao: texto.substring(0, 100),
        prioridade: textoLower.includes('urgente') || textoLower.includes('amanhã') ? 'alta' : 'media',
      },
    })
  }

  return sugestoes
}
