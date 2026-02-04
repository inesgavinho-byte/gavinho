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
    const { query, projeto_id, filters = {}, modo = 'hibrido', max_results = 10 } = await req.json()

    if (!query?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'query é obrigatório' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const startTime = Date.now()
    let results = []

    if (modo === 'semantico' || modo === 'hibrido') {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      })
      const queryEmbedding = embeddingResponse.data[0].embedding

      if (modo === 'semantico') {
        const { data } = await supabase.rpc('search_decisoes', {
          query_embedding: queryEmbedding,
          filter_projeto_id: projeto_id,
          filter_estado: filters.estado || 'validada',
          match_count: max_results,
          match_threshold: 0.4
        })
        results = data || []
      } else {
        const { data: semanticResults } = await supabase.rpc('search_decisoes', {
          query_embedding: queryEmbedding,
          filter_projeto_id: projeto_id,
          filter_estado: filters.estado || 'validada',
          match_count: max_results,
          match_threshold: 0.3
        })

        const { data: fulltextResults } = await supabase.rpc('search_decisoes_fulltext', {
          search_query: query,
          filter_projeto_id: projeto_id,
          filter_estado: filters.estado || 'validada',
          filter_tipo: filters.tipo,
          filter_impacto: filters.impacto,
          max_results: max_results
        })

        const combined = new Map()
        const semanticWeight = 0.6
        const fulltextWeight = 0.4

        for (const r of (semanticResults || [])) {
          combined.set(r.id, { ...r, score: (r.similarity || 0) * semanticWeight })
        }
        for (const r of (fulltextResults || [])) {
          if (combined.has(r.id)) {
            const existing = combined.get(r.id)
            existing.score += (r.rank || 0) * fulltextWeight
          } else {
            combined.set(r.id, { ...r, score: (r.rank || 0) * fulltextWeight })
          }
        }

        results = Array.from(combined.values()).sort((a, b) => b.score - a.score).slice(0, max_results)
      }
    } else {
      const { data } = await supabase.rpc('search_decisoes_fulltext', {
        search_query: query,
        filter_projeto_id: projeto_id,
        filter_estado: filters.estado || 'validada',
        filter_tipo: filters.tipo,
        filter_impacto: filters.impacto,
        max_results: max_results
      })
      results = data || []
    }

    if (results.length === 0) {
      let fallbackQuery = supabase.from('decisoes').select('*').eq('projeto_id', projeto_id).eq('estado', filters.estado || 'validada').ilike('texto_pesquisa', `%${query}%`).limit(max_results)
      const { data } = await fallbackQuery
      results = data || []
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      total: results.length,
      query,
      modo,
      tempo_ms: Date.now() - startTime
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
