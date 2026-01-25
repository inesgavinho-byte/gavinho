import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

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

  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

  try {
    const { decisao_id, batch } = await req.json()

    const buildText = (d: any) => [d.titulo, d.descricao, d.justificacao, d.divisao, d.tags?.join(' ')].filter(Boolean).join('. ').substring(0, 8000)

    if (batch) {
      const { data: pendentes } = await supabase.from('decisoes').select('id, titulo, descricao, justificacao, divisao, tags').is('embedding', null).eq('estado', 'validada').limit(50)

      if (!pendentes?.length) {
        return new Response(JSON.stringify({ success: true, processadas: 0, message: 'Nenhuma pendente' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let processadas = 0, erros = 0
      for (const d of pendentes) {
        try {
          const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: buildText(d) })
          await supabase.from('decisoes').update({ embedding: res.data[0].embedding }).eq('id', d.id)
          processadas++
        } catch { erros++ }
      }

      return new Response(JSON.stringify({ success: true, processadas, erros }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!decisao_id) throw new Error('decisao_id é obrigatório')

    const { data: decisao } = await supabase.from('decisoes').select('id, titulo, descricao, justificacao, divisao, tags').eq('id', decisao_id).single()
    if (!decisao) throw new Error('Decisão não encontrada')

    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: buildText(decisao) })
    await supabase.from('decisoes').update({ embedding: res.data[0].embedding }).eq('id', decisao_id)

    return new Response(JSON.stringify({ success: true, decisao_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
