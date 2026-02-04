// supabase/functions/garvis-chat/index.ts
// G.A.R.V.I.S. - Gavinho Assistant for Responsive Virtual Intelligence Support
// Edge function that responds to @GARVIS mentions in project chat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

const GARVIS_USER_ID = 'garvis-bot-001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjetoData {
  id: string
  codigo: string
  nome: string
  estado: string
  tipologia?: string
  morada?: string
  cliente?: { nome: string } | null
}

interface TopicoData {
  id: string
  titulo: string
  canal?: {
    id: string
    nome: string
    projeto_id: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      projetoId,
      topicoId,
      mensagem,
      mensagemId,
      autorNome
    } = await req.json()

    if (!projetoId || !topicoId || !mensagem) {
      throw new Error('projetoId, topicoId e mensagem são obrigatórios')
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // 1. Fetch project data
    const { data: projeto, error: projetoError } = await supabase
      .from('projetos')
      .select(`
        id,
        codigo,
        nome,
        estado,
        tipologia,
        morada,
        cliente:clientes(nome)
      `)
      .eq('id', projetoId)
      .single()

    if (projetoError || !projeto) {
      throw new Error('Projeto não encontrado')
    }

    // 2. Fetch topic data
    const { data: topico } = await supabase
      .from('chat_topicos')
      .select(`
        id,
        titulo,
        canal:chat_canais(id, nome, projeto_id)
      `)
      .eq('id', topicoId)
      .single()

    // 3. Fetch recent chat history (last 10 messages)
    const { data: historico } = await supabase
      .from('chat_mensagens')
      .select(`
        id,
        conteudo,
        autor_id,
        autor:utilizadores(nome, is_bot),
        created_at
      `)
      .eq('topico_id', topicoId)
      .eq('eliminado', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // 4. Fetch project context (decisions, phases, team)
    const contextData = await buildProjectContext(supabase, projetoId)

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(
      projeto as ProjetoData,
      topico as TopicoData,
      contextData
    )

    // 6. Build conversation messages
    const messages = buildConversationMessages(
      historico || [],
      mensagem,
      autorNome
    )

    // 7. Call Claude
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    })

    const tempoResposta = Date.now() - startTime

    // 8. Extract response
    const respostaContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text', text: string }).text)
      .join('\n')

    // 9. Insert GARVIS response into chat
    const { data: garvisMessage, error: insertError } = await supabase
      .from('chat_mensagens')
      .insert({
        topico_id: topicoId,
        parent_id: mensagemId || null,
        conteudo: respostaContent,
        tipo: 'texto',
        autor_id: GARVIS_USER_ID
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao inserir resposta GARVIS:', insertError)
      throw new Error('Erro ao guardar resposta')
    }

    // 10. Update topic timestamp
    await supabase
      .from('chat_topicos')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', topicoId)

    // 11. Log the interaction
    await supabase
      .from('garvis_chat_logs')
      .insert({
        projeto_id: projetoId,
        topico_id: topicoId,
        mensagem_utilizador_id: mensagemId || null,
        mensagem_resposta_id: garvisMessage?.id,
        prompt_usuario: mensagem,
        resposta_gerada: respostaContent,
        contexto_projeto: contextData,
        modelo_usado: 'claude-sonnet-4-20250514',
        tokens_input: response.usage.input_tokens,
        tokens_output: response.usage.output_tokens,
        tempo_resposta_ms: tempoResposta
      })

    // 12. Return response
    return new Response(
      JSON.stringify({
        success: true,
        mensagem: garvisMessage,
        resposta: respostaContent,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          tempo_ms: tempoResposta
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('GARVIS Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function buildProjectContext(
  supabase: ReturnType<typeof createClient>,
  projetoId: string
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {}

  // Fetch recent decisions/duvidas
  const { data: duvidas } = await supabase
    .from('duvidas')
    .select('id, titulo, descricao, status, prioridade, created_at')
    .eq('projeto_id', projetoId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (duvidas && duvidas.length > 0) {
    context.duvidas_recentes = duvidas
  }

  // Fetch project phases
  const { data: fases } = await supabase
    .from('projeto_fases_contratuais')
    .select('nome, estado, data_inicio, data_fim')
    .eq('projeto_id', projetoId)
    .order('data_inicio')

  if (fases && fases.length > 0) {
    context.fases = fases
  }

  // Fetch team members
  const { data: equipa } = await supabase
    .from('projeto_equipa')
    .select(`
      funcao,
      utilizador:utilizadores(nome, cargo)
    `)
    .eq('projeto_id', projetoId)

  if (equipa && equipa.length > 0) {
    context.equipa = equipa
  }

  // Fetch recent renders count
  const { count: rendersCount } = await supabase
    .from('projeto_renders')
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId)

  context.total_renders = rendersCount || 0

  // Fetch stakeholders
  const { data: intervenientes } = await supabase
    .from('projeto_intervenientes')
    .select('tipo, entidade, responsavel_nome')
    .eq('projeto_id', projetoId)

  if (intervenientes && intervenientes.length > 0) {
    context.intervenientes = intervenientes
  }

  return context
}

function buildSystemPrompt(
  projeto: ProjetoData,
  topico: TopicoData | null,
  contexto: Record<string, unknown>
): string {
  let prompt = `És o G.A.R.V.I.S. (Gavinho Assistant for Responsive Virtual Intelligence Support), o assistente IA integrado na plataforma GAVINHO.

## IDENTIDADE
- Nome: G.A.R.V.I.S.
- Papel: Assistente de projeto inteligente
- Idioma: Português de Portugal (PT-PT)
- Tom: Profissional, prestável, conciso

## COMPORTAMENTO
- Responde sempre em português de Portugal
- Sê direto e útil - os utilizadores estão a trabalhar
- Usa formatação Markdown quando apropriado
- Se não souberes algo específico do projeto, diz que podes ajudar a encontrar ou sugere onde procurar
- Nunca inventes dados - usa apenas o contexto fornecido

## CAPACIDADES
- Responder a perguntas sobre o projeto atual
- Ajudar a encontrar informação nos dados do projeto
- Sugerir próximos passos com base no estado do projeto
- Esclarecer dúvidas técnicas gerais de arquitetura/design

## LIMITAÇÕES
- Não podes executar ações na plataforma (apenas informar)
- Não tens acesso a sistemas externos em tempo real
- Recomenda validação humana para decisões críticas`

  // Project info
  prompt += `\n\n## PROJETO ATUAL
- **Código**: ${projeto.codigo}
- **Nome**: ${projeto.nome}
- **Cliente**: ${projeto.cliente?.nome || 'N/A'}
- **Estado**: ${projeto.estado}
- **Tipologia**: ${projeto.tipologia || 'N/A'}
- **Localização**: ${projeto.morada || 'N/A'}`

  // Topic info
  if (topico) {
    prompt += `\n\n## CONTEXTO DA CONVERSA
- **Tópico**: ${topico.titulo}
- **Canal**: ${topico.canal?.nome || 'N/A'}`
  }

  // Project context
  if (Object.keys(contexto).length > 0) {
    prompt += '\n\n## DADOS DO PROJETO'

    if (contexto.duvidas_recentes) {
      prompt += '\n\n### Dúvidas/Questões Recentes'
      const duvidas = contexto.duvidas_recentes as Array<{
        titulo: string
        status: string
        prioridade: string
      }>
      for (const d of duvidas) {
        prompt += `\n- **${d.titulo}** (${d.status}, ${d.prioridade})`
      }
    }

    if (contexto.fases) {
      prompt += '\n\n### Fases do Projeto'
      const fases = contexto.fases as Array<{
        nome: string
        estado: string
      }>
      for (const f of fases) {
        prompt += `\n- ${f.nome}: ${f.estado}`
      }
    }

    if (contexto.equipa) {
      prompt += '\n\n### Equipa'
      const equipa = contexto.equipa as Array<{
        funcao: string
        utilizador: { nome: string } | null
      }>
      for (const e of equipa) {
        if (e.utilizador) {
          prompt += `\n- ${e.utilizador.nome} (${e.funcao})`
        }
      }
    }

    if (contexto.intervenientes) {
      prompt += '\n\n### Intervenientes'
      const interv = contexto.intervenientes as Array<{
        tipo: string
        entidade: string
        responsavel_nome: string
      }>
      for (const i of interv) {
        prompt += `\n- ${i.tipo}: ${i.entidade || ''} ${i.responsavel_nome ? `(${i.responsavel_nome})` : ''}`
      }
    }

    if (contexto.total_renders) {
      prompt += `\n\n### Renders: ${contexto.total_renders} imagens no projeto`
    }
  }

  return prompt
}

function buildConversationMessages(
  historico: Array<{
    id: string
    conteudo: string
    autor_id: string
    autor: { nome: string; is_bot: boolean } | null
    created_at: string
  }>,
  mensagemAtual: string,
  autorNome: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  // Add history (reversed to be chronological)
  const historicoOrdenado = [...historico].reverse()

  for (const msg of historicoOrdenado) {
    const isGarvis = msg.autor_id === GARVIS_USER_ID || msg.autor?.is_bot

    if (isGarvis) {
      messages.push({
        role: 'assistant',
        content: msg.conteudo
      })
    } else {
      // Include author name for context
      const nome = msg.autor?.nome || 'Utilizador'
      messages.push({
        role: 'user',
        content: `[${nome}]: ${msg.conteudo}`
      })
    }
  }

  // Add current message
  messages.push({
    role: 'user',
    content: `[${autorNome}]: ${mensagemAtual}`
  })

  return messages
}
