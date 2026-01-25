// Supabase Edge Function para análise de viabilidade urbanística com IA
// Deploy: supabase functions deploy analisar-viabilidade

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Classificações de viabilidade
type Classificacao = 'viavel' | 'viavel_condicionado' | 'inviavel'

interface AnaliseResult {
  classificacao: Classificacao
  fundamentacao: string
  enquadramento_legal: string[]
  condicionantes: string[]
  recomendacoes: string[]
  indicadores_urbanisticos: {
    indice_ocupacao_calculado: number | null
    indice_construcao_calculado: number | null
    n_pisos_permitido: number | null
  }
}

// Base system prompt para análise de viabilidade
const BASE_SYSTEM_PROMPT = `És um especialista em urbanismo e licenciamentos municipais em Portugal.
A tua função é analisar a viabilidade urbanística de operações imobiliárias.

CONTEXTO TÉCNICO:
- Trabalhas no contexto de legislação portuguesa (RJUE, PDM, RGEU)
- Deves ser rigoroso na aplicação das regras urbanísticas
- As tuas análises serão usadas por gestores de projeto para orientar clientes

FORMATO DE RESPOSTA:
Responde APENAS com um objeto JSON válido com a seguinte estrutura:
{
  "classificacao": "viavel" | "viavel_condicionado" | "inviavel",
  "fundamentacao": "Texto explicativo da classificação...",
  "enquadramento_legal": ["Artigo X do PDM", "Artigo Y do RJUE"],
  "condicionantes": ["Lista de condicionantes aplicáveis"],
  "recomendacoes": ["Recomendações técnicas para o promotor"],
  "indicadores_urbanisticos": {
    "indice_ocupacao_calculado": null,
    "indice_construcao_calculado": null,
    "n_pisos_permitido": null
  }
}

CRITÉRIOS DE CLASSIFICAÇÃO:
- "viavel": Operação claramente permitida, sem condicionantes significativas
- "viavel_condicionado": Operação possível mediante cumprimento de condições específicas
- "inviavel": Operação não permitida pelo enquadramento legal aplicável`

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
    const { analise_id, modo = 'interno' } = await req.json()

    if (!analise_id) {
      throw new Error('analise_id é obrigatório')
    }

    console.log(`Analisando viabilidade: ${analise_id}, modo: ${modo}`)

    // 1. Carregar dados da análise
    const { data: analise, error: analiseError } = await supabase
      .from('v_analises_completas')
      .select('*')
      .eq('id', analise_id)
      .single()

    if (analiseError || !analise) {
      throw new Error(`Análise não encontrada: ${analiseError?.message || 'ID inválido'}`)
    }

    // 2. Carregar matriz do concelho
    const { data: matrizes, error: matrizError } = await supabase
      .from('concelho_matrizes')
      .select('*')
      .eq('concelho_id', analise.concelho_id)
      .eq('activa', true)

    if (matrizError) {
      console.warn('Erro ao carregar matrizes:', matrizError)
    }

    // 3. Carregar prompts do concelho
    const { data: prompts, error: promptsError } = await supabase
      .from('concelho_prompts')
      .select('*')
      .eq('concelho_id', analise.concelho_id)
      .eq('activo', true)

    if (promptsError) {
      console.warn('Erro ao carregar prompts:', promptsError)
    }

    // 4. Construir system prompt completo
    const systemPrompt = buildSystemPrompt(analise, matrizes || [], prompts || [], modo)

    // 5. Construir user prompt com os dados da análise
    const userPrompt = buildUserPrompt(analise)

    // 6. Chamar Claude API
    const result = await analisarComClaude(systemPrompt, userPrompt, anthropicApiKey)

    // 7. Guardar resultado na análise
    const { error: updateError } = await supabase
      .from('analises_viabilidade')
      .update({
        resultado: result,
        classificacao: result.classificacao,
        estado: 'concluido',
        updated_at: new Date().toISOString()
      })
      .eq('id', analise_id)

    if (updateError) {
      console.error('Erro ao guardar resultado:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        analise_id,
        resultado: result
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

// Construir system prompt com contexto do concelho
function buildSystemPrompt(
  analise: any,
  matrizes: any[],
  prompts: any[],
  modo: string
): string {
  let prompt = BASE_SYSTEM_PROMPT

  // Adicionar contexto do concelho
  if (analise.concelho_nome) {
    prompt += `\n\nCONCELHO: ${analise.concelho_nome}`
  }

  // Adicionar prompts específicos do concelho
  const promptModo = prompts.find(p => p.tipo === (modo === 'cliente' ? 'cliente' : 'interno'))
  if (promptModo) {
    prompt += `\n\nINSTRUÇÕES ESPECÍFICAS:\n${promptModo.prompt}`
  }

  // Adicionar matriz de decisão se disponível
  const matrizSoloUso = matrizes.find(m => m.tipo === 'solo_uso')
  if (matrizSoloUso && matrizSoloUso.dados) {
    prompt += `\n\nMATRIZ SOLO x USO (${analise.concelho_nome}):\n`
    prompt += `Esta matriz indica a viabilidade base de cada uso por categoria de solo:\n`
    prompt += JSON.stringify(matrizSoloUso.dados, null, 2)
  }

  // Adicionar matriz de parâmetros urbanísticos
  const matrizParams = matrizes.find(m => m.tipo === 'parametros_urbanisticos')
  if (matrizParams && matrizParams.dados) {
    prompt += `\n\nPARÂMETROS URBANÍSTICOS (${analise.concelho_nome}):\n`
    prompt += JSON.stringify(matrizParams.dados, null, 2)
  }

  // Instruções finais baseadas no modo
  if (modo === 'cliente') {
    prompt += `\n\nIMPORTANTE: Esta análise será apresentada ao cliente.
Use linguagem acessível, evitando jargão técnico excessivo.
Seja claro sobre as próximas etapas e prazos expectáveis.`
  } else {
    prompt += `\n\nIMPORTANTE: Esta é uma análise técnica interna.
Seja específico nas referências legais e condicionantes técnicas.
Inclua todos os detalhes relevantes para a equipa de projeto.`
  }

  return prompt
}

// Construir prompt do utilizador com os dados da análise
function buildUserPrompt(analise: any): string {
  const dados = analise.dados_entrada || {}

  let prompt = `DADOS DA OPERAÇÃO:\n`
  prompt += `Código: ${analise.codigo}\n`
  prompt += `Concelho: ${analise.concelho_nome || 'Não especificado'}\n`

  // Localização
  if (dados.localizacao) {
    prompt += `\nLOCALIZAÇÃO:\n`
    if (dados.localizacao.morada) prompt += `- Morada: ${dados.localizacao.morada}\n`
    if (dados.localizacao.freguesia) prompt += `- Freguesia: ${dados.localizacao.freguesia}\n`
    if (dados.localizacao.artigo_matricial) prompt += `- Artigo Matricial: ${dados.localizacao.artigo_matricial}\n`
    if (dados.localizacao.area_terreno) prompt += `- Área do Terreno: ${dados.localizacao.area_terreno} m²\n`
  }

  // Classificação do Solo
  if (dados.solo) {
    prompt += `\nCLASSIFICAÇÃO DO SOLO:\n`
    if (dados.solo.tipo) prompt += `- Tipo: ${dados.solo.tipo}\n`
    if (dados.solo.categoria) prompt += `- Categoria: ${dados.solo.categoria}\n`
    if (dados.solo.subcategoria) prompt += `- Subcategoria: ${dados.solo.subcategoria}\n`
  }

  // Regimes
  if (dados.regimes) {
    prompt += `\nREGIMES E SERVIDÕES:\n`
    if (dados.regimes.uopg) prompt += `- UOPG: ${dados.regimes.uopg}\n`
    if (dados.regimes.ren && dados.regimes.ren.length > 0) prompt += `- REN: ${dados.regimes.ren.join(', ')}\n`
    if (dados.regimes.ran) prompt += `- RAN: ${dados.regimes.ran ? 'Sim' : 'Não'}\n`
    if (dados.regimes.servidoes && dados.regimes.servidoes.length > 0) {
      prompt += `- Servidões: ${dados.regimes.servidoes.join(', ')}\n`
    }
  }

  // Preexistência
  if (dados.preexistencia) {
    prompt += `\nPREEXISTÊNCIA:\n`
    prompt += `- Existe edificação: ${dados.preexistencia.existe_edificacao ? 'Sim' : 'Não'}\n`
    if (dados.preexistencia.existe_edificacao) {
      if (dados.preexistencia.area_implantacao) prompt += `- Área de Implantação: ${dados.preexistencia.area_implantacao} m²\n`
      if (dados.preexistencia.area_construcao) prompt += `- Área de Construção: ${dados.preexistencia.area_construcao} m²\n`
      if (dados.preexistencia.numero_pisos) prompt += `- Número de Pisos: ${dados.preexistencia.numero_pisos}\n`
      if (dados.preexistencia.uso_atual) prompt += `- Uso Atual: ${dados.preexistencia.uso_atual}\n`
      if (dados.preexistencia.licenciada !== undefined) prompt += `- Licenciada: ${dados.preexistencia.licenciada ? 'Sim' : 'Não'}\n`
    }
  }

  // Operação Pretendida
  if (dados.operacao) {
    prompt += `\nOPERAÇÃO PRETENDIDA:\n`
    if (dados.operacao.tipo) prompt += `- Tipo de Operação: ${dados.operacao.tipo}\n`
    if (dados.operacao.uso_pretendido) prompt += `- Uso Pretendido: ${dados.operacao.uso_pretendido}\n`
    if (dados.operacao.area_construcao_pretendida) prompt += `- Área de Construção Pretendida: ${dados.operacao.area_construcao_pretendida} m²\n`
    if (dados.operacao.numero_pisos_pretendido) prompt += `- Número de Pisos Pretendido: ${dados.operacao.numero_pisos_pretendido}\n`
    if (dados.operacao.numero_fogos) prompt += `- Número de Fogos: ${dados.operacao.numero_fogos}\n`
    if (dados.operacao.descricao) prompt += `- Descrição: ${dados.operacao.descricao}\n`
  }

  prompt += `\nAnalisa a viabilidade desta operação urbanística e fornece a tua avaliação técnica.`

  return prompt
}

// Chamar Claude API para análise
async function analisarComClaude(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AnaliseResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Erro Claude:', data)
    throw new Error(`Erro na API Claude: ${data.error?.message || 'Desconhecido'}`)
  }

  try {
    const content = data.content[0].text
    // Extrair JSON da resposta (pode vir com texto antes/depois)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido')
    }
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Erro a parsear resposta Claude:', e)
    // Retornar resultado padrão em caso de erro de parsing
    return {
      classificacao: 'viavel_condicionado',
      fundamentacao: 'Não foi possível processar a análise automaticamente. Por favor, reveja manualmente.',
      enquadramento_legal: [],
      condicionantes: ['Análise manual necessária'],
      recomendacoes: ['Contactar equipa técnica para revisão'],
      indicadores_urbanisticos: {
        indice_ocupacao_calculado: null,
        indice_construcao_calculado: null,
        n_pisos_permitido: null
      }
    }
  }
}
