// supabase/functions/projeto-chat/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { buildContext, BuildContextResult } from './context-builder.ts'
import { SYSTEM_PROMPT_BASE } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Projeto {
  id: string
  codigo: string
  nome: string
  estado: string
  cliente?: { nome: string } | null
}

interface Chat {
  id: string
  projeto_id: string
  titulo: string
  skills_override?: string[] | null
  projeto: Projeto
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chatId, mensagem, userId } = await req.json()

    if (!chatId || !mensagem) {
      throw new Error('chatId e mensagem sao obrigatorios')
    }

    // Inicializar clientes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // 1. Buscar dados do chat e projecto
    const { data: chat, error: chatError } = await supabase
      .from('projeto_chats')
      .select(`
        *,
        projeto:projetos(
          id,
          codigo,
          nome,
          cliente:clientes(nome),
          estado
        )
      `)
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      throw new Error('Chat nao encontrado')
    }

    const typedChat = chat as Chat
    const projetoId = typedChat.projeto_id

    // 2. Construir contexto (skills + contexto do projecto)
    const contexto = await buildContext(
      supabase,
      projetoId,
      typedChat.skills_override || undefined
    )

    // 3. Buscar historico do chat (ultimas 20 mensagens)
    const { data: historico } = await supabase
      .from('projeto_chat_mensagens')
      .select('role, conteudo')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(20)

    // 4. Buscar nome do utilizador
    let autorNome = 'Utilizador'
    if (userId) {
      const { data: user } = await supabase
        .from('utilizadores')
        .select('nome')
        .eq('id', userId)
        .single()
      if (user) autorNome = user.nome
    }

    // 5. Guardar mensagem do utilizador
    await supabase
      .from('projeto_chat_mensagens')
      .insert({
        chat_id: chatId,
        role: 'user',
        conteudo: mensagem,
        autor_id: userId || null,
        autor_nome: autorNome,
      })

    // 6. Construir system prompt
    const systemPrompt = buildSystemPrompt(
      typedChat.projeto,
      contexto,
      typedChat.titulo
    )

    // 7. Preparar mensagens para Claude
    const messages = [
      ...(historico || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.conteudo
      })),
      { role: 'user' as const, content: mensagem }
    ]

    // 8. Chamar Claude
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    })

    const tempoResposta = Date.now() - startTime

    // 9. Extrair resposta
    const assistantContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text', text: string }).text)
      .join('\n')

    // 10. Guardar resposta da IA
    const { data: assistantMessage, error: insertError } = await supabase
      .from('projeto_chat_mensagens')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        conteudo: assistantContent,
        modelo: 'claude-sonnet-4-20250514',
        tokens_input: response.usage.input_tokens,
        tokens_output: response.usage.output_tokens,
        tempo_resposta_ms: tempoResposta,
        contexto_usado: {
          skills: contexto.skills.map(s => s.codigo),
          contexto_items: contexto.contextoItems.length
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao guardar resposta:', insertError)
    }

    // 11. Retornar resposta
    return new Response(
      JSON.stringify({
        success: true,
        mensagem: assistantMessage,
        resposta: assistantContent,
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
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function buildSystemPrompt(
  projeto: Projeto,
  contexto: BuildContextResult,
  chatTitulo: string
): string {
  let prompt = SYSTEM_PROMPT_BASE

  // Info do projecto
  prompt += `\n\n## PROJECTO ACTUAL
- Codigo: ${projeto.codigo}
- Nome: ${projeto.nome}
- Cliente: ${projeto.cliente?.nome || 'N/A'}
- Estado: ${projeto.estado}
- Chat: ${chatTitulo}`

  // Contexto do projecto
  if (contexto.contextoItems.length > 0) {
    prompt += '\n\n## CONTEXTO DO PROJECTO\n'
    for (const item of contexto.contextoItems) {
      prompt += `\n### ${item.titulo}\n${item.conteudo}\n`
    }
  }

  // Skills activas
  if (contexto.skills.length > 0) {
    prompt += '\n\n## CONHECIMENTO ESPECIALIZADO ACTIVO\n'
    for (const skill of contexto.skills) {
      prompt += `\n### ${skill.nome}\n${skill.prompt_sistema}\n`
    }
  }

  return prompt
}
