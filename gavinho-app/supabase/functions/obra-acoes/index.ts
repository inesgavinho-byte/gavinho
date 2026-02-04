// Supabase Edge Function para gestão de ações operacionais
// Deploy: supabase functions deploy obra-acoes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CriarAcaoRequest {
  obra_id: string
  tipo_acao: 'tarefa' | 'incidente' | 'confirmacao' | 'evento' | 'evidencia'
  titulo: string
  descricao?: string
  origem_tipo: 'whatsapp' | 'email' | 'manual' | 'ia_sugestao' | 'sistema'
  origem_mensagem_id?: string
  origem_sugestao_id?: string
  responsavel_nome?: string
  responsavel_id?: string
  prazo?: string
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
  severidade?: 'menor' | 'maior' | 'critica'
  canal_id?: string
  tags?: string[]
  metadados?: Record<string, any>
}

interface AtualizarEstadoRequest {
  acao_id: string
  novo_estado: 'pendente' | 'em_progresso' | 'aguarda_validacao' | 'concluida' | 'cancelada' | 'adiada'
  motivo?: string
  atualizado_por?: string
}

interface AdicionarComentarioRequest {
  acao_id: string
  conteudo: string
  autor_id?: string
  autor_nome: string
  anexos?: Array<{ nome: string; url: string; tipo: string }>
}

interface ProcessarSugestaoIARequest {
  sugestao_id: string
  aceitar: boolean
  dados_modificados?: Record<string, any>
  processado_por?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // CRIAR AÇÃO
    if (action === 'criar' && req.method === 'POST') {
      const data: CriarAcaoRequest = await req.json()

      if (!data.obra_id || !data.tipo_acao || !data.titulo || !data.origem_tipo) {
        throw new Error('Campos obra_id, tipo_acao, titulo e origem_tipo são obrigatórios')
      }

      // Criar ação
      const { data: acao, error } = await supabase
        .from('obra_acoes')
        .insert({
          obra_id: data.obra_id,
          canal_id: data.canal_id,
          tipo_acao: data.tipo_acao,
          titulo: data.titulo,
          descricao: data.descricao,
          origem_tipo: data.origem_tipo,
          origem_mensagem_id: data.origem_mensagem_id,
          origem_sugestao_id: data.origem_sugestao_id,
          responsavel_nome: data.responsavel_nome,
          responsavel_id: data.responsavel_id,
          prazo: data.prazo,
          prioridade: data.prioridade || 'media',
          severidade: data.severidade,
          tags: data.tags,
          metadados: data.metadados,
          estado: 'pendente',
        })
        .select()
        .single()

      if (error) throw error

      // Adicionar à timeline
      await supabase.rpc('adicionar_timeline_entry', {
        p_obra_id: data.obra_id,
        p_tipo_item: `acao_${data.tipo_acao}`,
        p_item_id: acao.id,
        p_titulo: data.titulo,
        p_resumo: data.descricao || '',
        p_autor_nome: data.responsavel_nome || 'Sistema',
        p_canal_id: data.canal_id,
        p_metadados: { tipo_acao: data.tipo_acao, prioridade: data.prioridade },
      })

      return new Response(
        JSON.stringify({ success: true, acao }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ATUALIZAR ESTADO
    if (action === 'atualizar-estado' && req.method === 'POST') {
      const { acao_id, novo_estado, motivo, atualizado_por }: AtualizarEstadoRequest = await req.json()

      if (!acao_id || !novo_estado) {
        throw new Error('Campos acao_id e novo_estado são obrigatórios')
      }

      const updateData: any = {
        estado: novo_estado,
        atualizado_por,
      }

      // Se concluída, definir data de conclusão
      if (novo_estado === 'concluida') {
        updateData.data_conclusao = new Date().toISOString()
      }

      const { data: acao, error } = await supabase
        .from('obra_acoes')
        .update(updateData)
        .eq('id', acao_id)
        .select()
        .single()

      if (error) throw error

      // Se há motivo, adicionar ao histórico manualmente
      if (motivo) {
        await supabase
          .from('obra_acoes_historico')
          .insert({
            acao_id,
            campo_alterado: 'estado',
            valor_anterior: acao.estado,
            valor_novo: novo_estado,
            alterado_por: atualizado_por,
            motivo,
          })
      }

      return new Response(
        JSON.stringify({ success: true, acao }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ADICIONAR COMENTÁRIO
    if (action === 'comentar' && req.method === 'POST') {
      const { acao_id, conteudo, autor_id, autor_nome, anexos }: AdicionarComentarioRequest = await req.json()

      if (!acao_id || !conteudo || !autor_nome) {
        throw new Error('Campos acao_id, conteudo e autor_nome são obrigatórios')
      }

      const { data: comentario, error } = await supabase
        .from('obra_acoes_comentarios')
        .insert({
          acao_id,
          autor_id,
          autor_nome,
          conteudo,
          anexos,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, comentario }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PROCESSAR SUGESTÃO IA
    if (action === 'processar-sugestao' && req.method === 'POST') {
      const { sugestao_id, aceitar, dados_modificados, processado_por }: ProcessarSugestaoIARequest = await req.json()

      if (!sugestao_id || aceitar === undefined) {
        throw new Error('Campos sugestao_id e aceitar são obrigatórios')
      }

      // Buscar sugestão
      const { data: sugestao, error: fetchError } = await supabase
        .from('ia_sugestoes')
        .select('*, whatsapp_mensagens(*)')
        .eq('id', sugestao_id)
        .single()

      if (fetchError || !sugestao) {
        throw new Error('Sugestão não encontrada')
      }

      let entidade_criada_id = null

      if (aceitar) {
        // Converter tipo de sugestão IA para tipo de ação
        const tipoAcaoMap: Record<string, string> = {
          'requisicao_material': 'tarefa',
          'registo_horas': 'evidencia',
          'trabalho_executado': 'confirmacao',
          'nova_tarefa': 'tarefa',
          'nao_conformidade': 'incidente',
        }

        const tipoAcao = tipoAcaoMap[sugestao.tipo] || 'tarefa'
        const dados = dados_modificados || sugestao.dados

        // Criar ação a partir da sugestão
        const titulo = dados.titulo ||
          (sugestao.tipo === 'requisicao_material' ? `Requisição: ${dados.material}` :
           sugestao.tipo === 'nao_conformidade' ? `NC: ${dados.descricao || 'Não conformidade'}` :
           sugestao.tipo === 'nova_tarefa' ? dados.tarefa || 'Nova tarefa' :
           `Ação de ${sugestao.tipo}`)

        const { data: acao, error: acaoError } = await supabase
          .from('obra_acoes')
          .insert({
            obra_id: sugestao.obra_id,
            tipo_acao: tipoAcao,
            titulo,
            descricao: dados.descricao || sugestao.texto_original,
            origem_tipo: 'ia_sugestao',
            origem_mensagem_id: sugestao.mensagem_id,
            origem_sugestao_id: sugestao_id,
            prioridade: dados.urgente ? 'alta' : 'media',
            severidade: dados.severidade?.toLowerCase() || null,
            metadados: dados,
            estado: 'pendente',
          })
          .select()
          .single()

        if (acaoError) throw acaoError
        entidade_criada_id = acao.id
      }

      // Atualizar sugestão
      const { data: sugestaoAtualizada, error: updateError } = await supabase
        .from('ia_sugestoes')
        .update({
          status: aceitar ? 'aceite' : 'rejeitada',
          processado_por,
          processado_em: new Date().toISOString(),
          entidade_criada_id,
        })
        .eq('id', sugestao_id)
        .select()
        .single()

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({
          success: true,
          sugestao: sugestaoAtualizada,
          acao_criada_id: entidade_criada_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // LISTAR AÇÕES DE UMA OBRA
    if (action === 'listar' && req.method === 'GET') {
      const obra_id = url.searchParams.get('obra_id')
      const tipo = url.searchParams.get('tipo')
      const estado = url.searchParams.get('estado')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('obra_acoes')
        .select(`
          *,
          comentarios:obra_acoes_comentarios(count),
          historico:obra_acoes_historico(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (obra_id) query = query.eq('obra_id', obra_id)
      if (tipo) query = query.eq('tipo_acao', tipo)
      if (estado) query = query.eq('estado', estado)

      const { data: acoes, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, acoes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // OBTER DETALHES DE UMA AÇÃO
    if (action === 'detalhes' && req.method === 'GET') {
      const acao_id = url.searchParams.get('acao_id')

      if (!acao_id) {
        throw new Error('Parâmetro acao_id é obrigatório')
      }

      const { data: acao, error } = await supabase
        .from('obra_acoes')
        .select(`
          *,
          comentarios:obra_acoes_comentarios(*),
          historico:obra_acoes_historico(*)
        `)
        .eq('id', acao_id)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, acao }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ESTATÍSTICAS DE AÇÕES
    if (action === 'stats' && req.method === 'GET') {
      const obra_id = url.searchParams.get('obra_id')

      let query = supabase.from('v_obra_acoes_pendentes').select('*')

      if (obra_id) {
        query = query.eq('obra_id', obra_id)
      }

      const { data: pendentes, error: pendentesError } = await query

      if (pendentesError) throw pendentesError

      // Calcular estatísticas
      const stats = {
        total_pendentes: pendentes?.length || 0,
        por_tipo: {} as Record<string, number>,
        por_prioridade: {} as Record<string, number>,
        por_urgencia: {} as Record<string, number>,
        atrasadas: 0,
      }

      pendentes?.forEach((a: any) => {
        stats.por_tipo[a.tipo_acao] = (stats.por_tipo[a.tipo_acao] || 0) + 1
        stats.por_prioridade[a.prioridade] = (stats.por_prioridade[a.prioridade] || 0) + 1
        stats.por_urgencia[a.urgencia] = (stats.por_urgencia[a.urgencia] || 0) + 1
        if (a.urgencia === 'atrasada') stats.atrasadas++
      })

      return new Response(
        JSON.stringify({ success: true, stats, pendentes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Ação "${action}" não reconhecida`)

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
