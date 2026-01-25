// Supabase Edge Function para pesquisa semântica de decisões
// Deploy: supabase functions deploy decisoes-search

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  query: string
  projeto_id?: string
  tipo?: string
  impacto?: string
  estado?: string
  mode?: 'semantic' | 'fulltext' | 'hybrid'
  limit?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, projeto_id, tipo, impacto, estado, mode = 'hybrid', limit = 20 }: SearchRequest = await req.json()

    if (!query || query.trim().length < 2) {
      throw new Error('Query deve ter pelo menos 2 caracteres')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let results: any[] = []

    // Full-text search
    if (mode === 'fulltext' || mode === 'hybrid') {
      const { data: fulltextResults, error: ftError } = await supabase.rpc('search_decisoes_fulltext', {
        search_query: query,
        filter_projeto_id: projeto_id || null,
        filter_estado: estado || 'validada',
        filter_tipo: tipo || null,
        filter_impacto: impacto || null,
        max_results: limit
      })

      if (!ftError && fulltextResults) {
        results = fulltextResults.map((r: any) => ({
          ...r,
          search_type: 'fulltext',
          score: r.rank
        }))
      }
    }

    // Semantic search (requires embedding)
    if ((mode === 'semantic' || mode === 'hybrid') && results.length < limit) {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

      if (anthropicApiKey) {
        // Generate embedding for query using Anthropic (via proxy to OpenAI-compatible endpoint)
        // Note: For production, use a proper embedding service
        try {
          const voyageApiKey = Deno.env.get('VOYAGE_API_KEY')
          const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

          let embedding: number[] | null = null

          // Try Voyage AI first (recommended for Portuguese)
          if (voyageApiKey) {
            const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${voyageApiKey}`
              },
              body: JSON.stringify({
                model: 'voyage-multilingual-2',
                input: query
              })
            })

            if (voyageResponse.ok) {
              const voyageData = await voyageResponse.json()
              embedding = voyageData.data?.[0]?.embedding
            }
          }

          // Fallback to OpenAI
          if (!embedding && openaiApiKey) {
            const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: query
              })
            })

            if (openaiResponse.ok) {
              const openaiData = await openaiResponse.json()
              embedding = openaiData.data?.[0]?.embedding
            }
          }

          if (embedding) {
            const { data: semanticResults, error: semError } = await supabase.rpc('search_decisoes', {
              query_embedding: embedding,
              filter_projeto_id: projeto_id || null,
              filter_estado: estado || 'validada',
              match_count: limit,
              match_threshold: 0.5
            })

            if (!semError && semanticResults) {
              // Merge and dedupe results
              const existingIds = new Set(results.map(r => r.id))
              const newResults = semanticResults
                .filter((r: any) => !existingIds.has(r.id))
                .map((r: any) => ({
                  ...r,
                  search_type: 'semantic',
                  score: r.similarity
                }))

              results = [...results, ...newResults]
            }
          }
        } catch (embeddingError) {
          console.error('Erro ao gerar embedding:', embeddingError)
          // Continue with fulltext results only
        }
      }
    }

    // Sort by score and limit
    results = results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)

    return new Response(
      JSON.stringify({
        success: true,
        query,
        mode,
        count: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
