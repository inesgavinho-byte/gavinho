// ══════════════════════════════════════════════════════════════
// GAVINHO Platform — Microsoft Graph Subscription Manager
// ══════════════════════════════════════════════════════════════
// Cria e renova subscrições do Microsoft Graph para receber
// notificações de novos emails em tempo real.
//
// Deploy: supabase functions deploy renew-subscription
// Chamado via pg_cron a cada 2 dias OU manualmente
// ══════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRAPH_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID')!
const GRAPH_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')!
const GRAPH_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')!
const OUTLOOK_EMAIL = Deno.env.get('OUTLOOK_EMAIL') || 'geral@gavinhogroup.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLIENT_STATE = Deno.env.get('GRAPH_WEBHOOK_CLIENT_STATE') || 'gavinho-agent-2026'

// Tempo máximo de vida: 4230 minutos (~2.94 dias)
const SUBSCRIPTION_LIFETIME_MINUTES = 4200 // ~2.9 dias (margem de segurança)

async function getAccessToken(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GRAPH_CLIENT_ID,
      client_secret: GRAPH_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })

  const data = await response.json()
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GRAPH_TENANT_ID || !GRAPH_CLIENT_ID || !GRAPH_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Microsoft Graph credentials not configured',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const accessToken = await getAccessToken()

    // Calcular nova data de expiração
    const expirationDate = new Date(Date.now() + SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000)
    const notificationUrl = `${SUPABASE_URL}/functions/v1/graph-webhook`

    // Verificar se já existe subscrição ativa
    const { data: existingSub } = await supabase
      .from('graph_subscriptions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let result: any

    if (existingSub) {
      // ═══════════════════════════════════════
      // RENOVAR subscrição existente
      // ═══════════════════════════════════════

      const renewResponse = await fetch(
        `https://graph.microsoft.com/v1.0/subscriptions/${existingSub.subscription_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expirationDateTime: expirationDate.toISOString(),
          }),
        }
      )

      if (renewResponse.ok) {
        const renewData = await renewResponse.json()

        // Atualizar registo
        await supabase
          .from('graph_subscriptions')
          .update({
            expiration_date: renewData.expirationDateTime,
            renewed_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id)

        result = {
          action: 'renewed',
          subscription_id: existingSub.subscription_id,
          expires: renewData.expirationDateTime,
        }
      } else {
        const errorData = await renewResponse.text()
        console.error('Failed to renew subscription:', errorData)

        // Marcar como inativa e criar nova
        await supabase
          .from('graph_subscriptions')
          .update({ active: false })
          .eq('id', existingSub.id)

        // Criar nova subscrição (fallthrough)
        result = await createNewSubscription(accessToken, supabase, notificationUrl, expirationDate)
      }
    } else {
      // ═══════════════════════════════════════
      // CRIAR nova subscrição
      // ═══════════════════════════════════════
      result = await createNewSubscription(accessToken, supabase, notificationUrl, expirationDate)
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error managing subscription:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function createNewSubscription(
  accessToken: string,
  supabase: any,
  notificationUrl: string,
  expirationDate: Date
) {

  const createResponse = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changeType: 'created',
      notificationUrl,
      resource: `users/${OUTLOOK_EMAIL}/messages`,
      expirationDateTime: expirationDate.toISOString(),
      clientState: CLIENT_STATE,
      latestSupportedTlsVersion: 'v1_2',
    }),
  })

  if (!createResponse.ok) {
    const errorData = await createResponse.text()
    throw new Error(`Failed to create subscription: ${errorData}`)
  }

  const subData = await createResponse.json()

  // Guardar na base de dados
  await supabase.from('graph_subscriptions').insert({
    subscription_id: subData.id,
    resource: `users/${OUTLOOK_EMAIL}/messages`,
    change_type: 'created',
    notification_url: notificationUrl,
    expiration_date: subData.expirationDateTime,
    client_state: CLIENT_STATE,
  })

  return {
    action: 'created',
    subscription_id: subData.id,
    expires: subData.expirationDateTime,
  }
}
