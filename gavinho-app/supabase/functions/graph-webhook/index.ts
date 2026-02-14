// ══════════════════════════════════════════════════════════════
// GAVINHO Platform — Microsoft Graph Webhook Handler
// ══════════════════════════════════════════════════════════════
// Recebe notificações do Microsoft Graph API quando novos emails
// chegam a geral@gavinhogroup.com e insere na fila de processamento.
//
// Deploy: supabase functions deploy graph-webhook
// Config: verify_jwt = false (Graph não envia JWT Supabase)
// ══════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const EXPECTED_CLIENT_STATE = Deno.env.get('GRAPH_WEBHOOK_CLIENT_STATE') || 'gavinho-agent-2026'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)

    // ═══════════════════════════════════════
    // 1. HANDSHAKE DE VALIDAÇÃO
    // ═══════════════════════════════════════
    // Quando se cria a subscrição, o Graph envia um pedido de validação
    // que deve ser respondido em <10 segundos com o validationToken em texto simples
    const validationToken = url.searchParams.get('validationToken')
    if (validationToken) {
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // ═══════════════════════════════════════
    // 2. PROCESSAR NOTIFICAÇÕES
    // ═══════════════════════════════════════
    // Notificações devem ser respondidas com 202 em <3 segundos
    // Se >15% das respostas excedem 10s, as notificações são descartadas

    const body = await req.json()
    const notifications = body.value || []

    if (notifications.length === 0) {
      return new Response(null, { status: 202 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Processar cada notificação sem bloquear a resposta
    const insertPromises = notifications
      .filter((n: any) => n.clientState === EXPECTED_CLIENT_STATE)
      .map(async (notification: any) => {
        const graphMessageId = notification.resourceData?.id
        const resourcePath = notification.resource

        if (!graphMessageId) {
          console.warn('Notification without resourceData.id:', notification)
          return
        }

        // Deduplicação: verificar se já está na fila
        const { data: existing } = await supabase
          .from('email_processing_queue')
          .select('id')
          .eq('graph_message_id', graphMessageId)
          .single()

        if (existing) {
          return
        }

        // Inserir na fila de processamento
        const { error } = await supabase
          .from('email_processing_queue')
          .insert({
            graph_message_id: graphMessageId,
            graph_resource_path: resourcePath,
            status: 'pending',
          })

        if (error) {
          console.error(`Error queuing email ${graphMessageId}:`, error.message)
        } else {
        }
      })

    // Não esperar — responder imediatamente
    // Em Deno Deploy, usar EdgeRuntime.waitUntil se disponível
    Promise.all(insertPromises).catch(err =>
      console.error('Error processing notifications:', err)
    )

    return new Response(null, { status: 202 })

  } catch (error) {
    console.error('Graph webhook error:', error)
    // Mesmo em caso de erro, devolver 202 para o Graph não reenviar
    return new Response(null, { status: 202 })
  }
})
