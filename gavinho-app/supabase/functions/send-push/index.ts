// Supabase Edge Function para enviar Web Push notifications
// Deploy: supabase functions deploy send-push
// Secrets needed: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushRequest {
  user_id: string
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
  actions?: { action: string; title: string }[]
}

// Import Web Push for Deno
// @ts-ignore - npm compat
import webpush from 'npm:web-push@3.6.7'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
      || 'BPkKiHHAbgn22NzEo3ZH-JviNtGe0f8Mtr8FPNp07eveAkFmUnZ0v_y_h1evJqfPukW4FgkCX0kQfFkDU5NCsj4'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:suporte@gavinhogroup.com'

    if (!vapidPrivateKey) {
      console.error('VAPID_PRIVATE_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Push not configured: missing VAPID_PRIVATE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: PushRequest = await req.json()

    if (!payload.user_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all active push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('chat_push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('utilizador_id', payload.user_id)
      .eq('activo', true)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No active subscriptions for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build push payload
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'gavinho',
      icon: payload.icon || '/icons/icon.svg',
      actions: payload.actions || [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    })

    // Send to each subscription
    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, pushPayload)
        sent++

        // Update last-used timestamp
        await supabase
          .from('chat_push_subscriptions')
          .update({ ultimo_uso: new Date().toISOString() })
          .eq('id', sub.id)
      } catch (pushErr: any) {
        failed++
        console.error(`Push failed for subscription ${sub.id}:`, pushErr.statusCode, pushErr.body)

        // If subscription expired or invalid (410 Gone, 404 Not Found),
        // deactivate it so we stop trying
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          expiredIds.push(sub.id)
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase
        .from('chat_push_subscriptions')
        .update({ activo: false })
        .in('id', expiredIds)
      console.log(`Deactivated ${expiredIds.length} expired subscriptions`)
    }

    return new Response(
      JSON.stringify({ sent, failed, expired: expiredIds.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
