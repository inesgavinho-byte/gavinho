import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

  try {
    const { conteudo, projeto_id, fonte, metadata, evento_id } = await req.json()

    let textoParaAnalisar = conteudo
    let fonteInfo = { tipo: fonte || 'email', metadata }

    if (evento_id) {
      const { data: evento } = await supabase.from('ia_eventos').select('*').eq('id', evento_id).single()
      if (evento) {
        textoParaAnalisar = evento.conteudo
        fonteInfo = { tipo: evento.tipo, metadata: evento.metadata }
      }
    }

    if (!textoParaAnalisar || !projeto_id) {
      return new Response(JSON.stringify({ success: false, error: 'conteudo e projeto_id são obrigatórios' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const systemPrompt = `És um assistente especializado em detectar DECISÕES em comunicações de projectos de construção e design de interiores de luxo.

Uma DECISÃO é uma escolha CONFIRMADA que afecta o projecto. Só marca como decisão se houver confirmação clara.

Para cada decisão detectada, extrai:
- titulo: resumo curto (máx 80 chars)
- descricao: descrição completa
- tipo: design | material | tecnico | financeiro | prazo | fornecedor | alteracao
- impacto: critico (>5% orçamento ou >2 semanas) | alto (1-5% ou 1-2 semanas) | medio (<1%, sem prazo) | baixo (reversível)
- decidido_por: nome de quem decidiu
- decidido_por_tipo: cliente | gavinho | conjunto
- impacto_orcamento: valor em euros (positivo = aumento, negativo = poupança) ou null
- impacto_prazo_dias: dias (positivo = atraso, negativo = antecipação) ou null
- divisao: zona afectada (ex: "Cozinha", "WC Suite") ou null
- justificacao: razão da escolha ou null
- alternativas: array de {opcao, motivo_rejeicao} ou []
- excerto: frase exacta do texto que confirma a decisão

Responde APENAS com JSON válido: { "tem_decisoes": boolean, "decisoes": [...], "motivo": "..." }`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Analisa este conteúdo e detecta decisões:\n\n${textoParaAnalisar}` }]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    let resultado
    try {
      resultado = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim())
    } catch {
      resultado = { tem_decisoes: false, motivo: 'Erro ao processar resposta da IA' }
    }

    let decisoesCriadas = 0
    if (resultado.tem_decisoes && resultado.decisoes?.length > 0) {
      for (const dec of resultado.decisoes) {
        // Mapear tipo para categoria (valores permitidos: cliente, tecnica, financeira, planeamento)
        const categoriaMap: Record<string, string> = {
          'design': 'tecnica',
          'material': 'tecnica',
          'tecnico': 'tecnica',
          'financeiro': 'financeira',
          'prazo': 'planeamento',
          'fornecedor': 'tecnica',
          'alteracao': 'cliente'
        }
        const categoria = categoriaMap[dec.tipo] || 'tecnica'

        // Usar apenas colunas que existem na tabela
        const { error: insertError } = await supabase.from('decisoes').insert({
          projeto_id,
          titulo: dec.titulo,
          descricao: dec.descricao,
          categoria,
          tipo: dec.tipo || 'design',
          impacto: dec.impacto || 'medio',
          decidido_por_tipo: dec.decidido_por_tipo || 'cliente',
          impacto_prazo_dias: dec.impacto_prazo_dias || null,
          divisao: dec.divisao || null,
          justificacao: dec.justificacao || null,
          fonte: fonteInfo.tipo,
          fonte_excerto: dec.excerto || null,
          estado: 'sugerida'
        })

        if (insertError) {
          console.error('Erro ao inserir decisão:', insertError.message, insertError)
          // Retornar erro para debug
          return new Response(JSON.stringify({
            success: false,
            error: insertError.message,
            errorDetails: insertError,
            decisao: dec,
            categoria,
            tipo: dec.tipo
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
        } else {
          decisoesCriadas++
        }
      }
    }

    if (evento_id) {
      await supabase.from('ia_eventos').update({ processado: true, resultado: { decisoes_detectadas: decisoesCriadas } }).eq('id', evento_id)
    }

    return new Response(JSON.stringify({ success: true, tem_decisoes: resultado.tem_decisoes, decisoes_criadas: decisoesCriadas, motivo: resultado.motivo, decisoes: resultado.decisoes }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
