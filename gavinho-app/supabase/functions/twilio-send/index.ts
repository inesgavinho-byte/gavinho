// Supabase Edge Function para enviar mensagens WhatsApp via Twilio
// Deploy: supabase functions deploy twilio-send

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  to: string // Número de destino (ex: +351912345678)
  body: string // Conteúdo da mensagem
  obra_id?: string // ID da obra (opcional)
  mediaUrl?: string // URL de media a enviar (opcional)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado')
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obter configuração do Twilio
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('ativo', true)
      .single()

    if (configError || !config) {
      throw new Error('Configuração WhatsApp não encontrada')
    }

    // Parse do body
    const { to, body, obra_id, mediaUrl }: SendMessageRequest = await req.json()

    if (!to || !body) {
      throw new Error('Parâmetros "to" e "body" são obrigatórios')
    }

    // Formatar números para WhatsApp
    const fromNumber = `whatsapp:${config.twilio_phone_number}`
    const toNumber = `whatsapp:${to.startsWith('+') ? to : '+' + to}`

    // Enviar via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio_account_sid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('From', fromNumber)
    formData.append('To', toNumber)
    formData.append('Body', body)
    if (mediaUrl) {
      formData.append('MediaUrl', mediaUrl)
    }

    // Usar Supabase secrets para o auth token (mais seguro)
    // Se não houver secret, usar o token da config (fallback para desenvolvimento)
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || config.twilio_auth_token_encrypted
    const twilioAuth = btoa(`${config.twilio_account_sid}:${twilioAuthToken}`)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      console.error('Erro Twilio:', twilioData)
      throw new Error(twilioData.message || 'Erro ao enviar mensagem')
    }


    // Guardar mensagem enviada na base de dados
    const { data: mensagem, error: insertError } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        twilio_sid: twilioData.sid,
        telefone_origem: config.twilio_phone_number,
        telefone_destino: to.replace('+', ''),
        conteudo: body,
        tipo: 'enviada',
        obra_id: obra_id || null,
        autor_nome: 'Gavinho',
        anexos: mediaUrl ? [{ url: mediaUrl, tipo: 'media' }] : null,
        lida: true,
        processada_ia: true, // Mensagens enviadas não precisam de análise IA
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao guardar mensagem enviada:', insertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        mensagem,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
