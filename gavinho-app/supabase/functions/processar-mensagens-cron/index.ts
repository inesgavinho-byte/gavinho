// Supabase Edge Function para processamento automático de emails com IA
// Deploy: supabase functions deploy processar-mensagens-cron
// Chamada via cron ou webhook para processamento periódico

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

// Configuração de processamento
const CONFIG = {
  BATCH_SIZE_EMAIL: 10,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
}

interface ProcessingResult {
  email: {
    processed: number
    suggestions: number
    errors: number
  }
  duration_ms: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Verificar autenticação (cron key ou service role)
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    // Aceita Bearer token ou cron secret no header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !authHeader?.includes('service_role')) {
      // Permitir também chamadas internas do Supabase
      const apikey = req.headers.get('apikey')
      if (!apikey) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const result: ProcessingResult = {
      email: { processed: 0, suggestions: 0, errors: 0 },
      duration_ms: 0,
    }

    // Processar emails
    const emailResult = await processarEmails(
      supabase, anthropicApiKey, openaiApiKey
    )
    result.email = emailResult

    result.duration_ms = Date.now() - startTime

    // Registar execução no log
    await registarExecucao(supabase, result)


    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        message: `Processados ${result.email.processed} emails`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro no processamento:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Processar emails não processados
async function processarEmails(
  supabase: any,
  anthropicApiKey: string | undefined,
  openaiApiKey: string | undefined
) {
  const result = { processed: 0, suggestions: 0, errors: 0 }

  const { data: emails, error: fetchError } = await supabase
    .from('obra_emails')
    .select('id, assunto, corpo_texto, obra_id, de_nome, de_email, created_at')
    .eq('processado_ia', false)
    .eq('tipo', 'recebido')
    .not('corpo_texto', 'is', null)
    .order('created_at', { ascending: true })
    .limit(CONFIG.BATCH_SIZE_EMAIL)

  if (fetchError) {
    console.error('Erro ao buscar emails:', fetchError)
    throw fetchError
  }

  if (!emails || emails.length === 0) {
    return result
  }


  for (const email of emails) {
    try {
      // Combinar assunto e corpo para análise
      const textoCompleto = `Assunto: ${email.assunto}\n\n${email.corpo_texto}`

      const sugestoes = await analisarMensagem(
        textoCompleto,
        anthropicApiKey,
        openaiApiKey
      )

      // Guardar sugestões
      for (const sugestao of sugestoes) {
        const { error: insertError } = await supabase
          .from('ia_sugestoes')
          .insert({
            email_id: email.id,
            obra_id: email.obra_id,
            tipo: sugestao.tipo,
            dados: sugestao.dados,
            texto_original: textoCompleto.substring(0, 1000),
            confianca: sugestao.confianca || 0.8,
            status: 'pendente',
            fonte: 'email',
          })

        if (!insertError) {
          result.suggestions++
        }
      }

      // Marcar como processado
      await supabase
        .from('obra_emails')
        .update({ processado_ia: true })
        .eq('id', email.id)

      result.processed++
    } catch (error) {
      console.error(`Erro ao processar email ${email.id}:`, error)
      result.errors++
    }
  }

  return result
}

// Função unificada para analisar mensagem com IA
async function analisarMensagem(
  texto: string,
  anthropicApiKey: string | undefined,
  openaiApiKey: string | undefined
): Promise<any[]> {
  if (!texto || texto.trim().length < 5) {
    return []
  }

  // Tentar com Claude primeiro
  if (anthropicApiKey) {
    try {
      return await analisarComClaude(texto, anthropicApiKey)
    } catch (error) {
      console.error('Erro com Claude, tentando fallback:', error)
    }
  }

  // Fallback para OpenAI
  if (openaiApiKey) {
    try {
      return await analisarComOpenAI(texto, openaiApiKey)
    } catch (error) {
      console.error('Erro com OpenAI, usando análise local:', error)
    }
  }

  // Fallback final: análise por palavras-chave
  return analisarPorPalavrasChave(texto)
}

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
    throw new Error(data.error?.message || 'Erro na API Claude')
  }

  try {
    const content = data.content[0].text
    // Extrair JSON do texto (pode vir com texto extra)
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
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
    throw new Error(data.error?.message || 'Erro na API OpenAI')
  }

  try {
    const content = data.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
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
  const materiaisKeywords = ['preciso', 'falta', 'enviar', 'material', 'sacos', 'metros', 'kg', 'unidades', 'cimento', 'ferro', 'tubo', 'tinta', 'tijolo', 'encomendar']
  if (materiaisKeywords.some(kw => textoLower.includes(kw))) {
    const numMatch = texto.match(/(\d+)\s*(sacos?|metros?|m|kg|unidades?|m2|m3)/i)
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
  const horasKeywords = ['horas', 'pessoas', 'trabalharam', 'estivemos', 'equipa', 'funcionários']
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
  const trabalhoKeywords = ['acabámos', 'terminámos', 'concluímos', 'fizemos', 'estamos a meio', 'progresso', 'concluído', 'terminado', 'feito']
  if (trabalhoKeywords.some(kw => textoLower.includes(kw))) {
    sugestoes.push({
      tipo: TIPOS_SUGESTAO.TRABALHO_EXECUTADO,
      confianca: 0.6,
      dados: {
        descricao: texto.substring(0, 100),
        percentagem: textoLower.includes('acabámos') || textoLower.includes('terminámos') || textoLower.includes('concluído') ? 100 : 50,
      },
    })
  }

  // Detectar não conformidades
  const ncKeywords = ['problema', 'defeito', 'danificado', 'oxidado', 'partido', 'errado', 'fora de esquadria', 'demolir', 'refazer', 'erro', 'falha']
  if (ncKeywords.some(kw => textoLower.includes(kw))) {
    sugestoes.push({
      tipo: TIPOS_SUGESTAO.NAO_CONFORMIDADE,
      confianca: 0.75,
      dados: {
        descricao: texto.substring(0, 150),
        gravidade: textoLower.includes('demolir') || textoLower.includes('urgente') || textoLower.includes('grave') ? 'alta' : 'media',
      },
    })
  }

  // Detectar novas tarefas
  const tarefaKeywords = ['temos de', 'precisamos', 'não esquecer', 'amanhã', 'chamar', 'encomendar', 'marcar', 'agendar', 'lembrar']
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

// Registar execução do cron para monitorização
async function registarExecucao(supabase: any, result: ProcessingResult) {
  try {
    await supabase.from('ia_processamento_log').insert({
      tipo: 'cron_automatico',
      email_processadas: result.email.processed,
      email_sugestoes: result.email.suggestions,
      email_erros: result.email.errors,
      duracao_ms: result.duration_ms,
      sucesso: result.email.errors === 0,
    })
  } catch (error) {
    // Ignorar erro se tabela de log não existir
    console.log('Nota: Tabela de log não existe, ignorando registo')
  }
}
