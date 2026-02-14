// Supabase Edge Function para receber webhooks do Twilio WhatsApp
// Deploy: supabase functions deploy twilio-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TwilioMessage {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
  MediaUrl0?: string
  MediaContentType0?: string
}

// Validar assinatura do Twilio (segurança)
async function validateTwilioSignature(
  req: Request,
  formData: FormData,
  authToken: string
): Promise<boolean> {
  const signature = req.headers.get('X-Twilio-Signature')
  if (!signature) {
    console.warn('Webhook sem assinatura Twilio')
    return false
  }

  // Construir URL completa
  const url = req.url

  // Ordenar parâmetros e construir string para validação
  const params: [string, string][] = []
  formData.forEach((value, key) => {
    params.push([key, value.toString()])
  })
  params.sort((a, b) => a[0].localeCompare(b[0]))

  const paramString = params.map(([k, v]) => k + v).join('')
  const data = url + paramString

  // Calcular HMAC-SHA1
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

  return signature === expectedSignature
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData()

    // Criar cliente Supabase primeiro para obter auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obter auth token para validação (opcional mas recomendado)
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    if (twilioAuthToken) {
      const isValid = await validateTwilioSignature(req, formData, twilioAuthToken)
      if (!isValid) {
        console.error('Assinatura Twilio inválida')
        // Em produção, rejeitar requests inválidos
        // Por agora, apenas logamos o warning
        console.warn('Continuando mesmo com assinatura inválida (desenvolvimento)')
      }
    } else {
      console.warn('TWILIO_AUTH_TOKEN não configurado - validação de assinatura desativada')
    }
    const message: TwilioMessage = {
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      NumMedia: formData.get('NumMedia') as string,
      MediaUrl0: formData.get('MediaUrl0') as string || undefined,
      MediaContentType0: formData.get('MediaContentType0') as string || undefined,
    }


    // Extrair número de telefone (formato: whatsapp:+351912345678)
    const telefone = message.From.replace('whatsapp:', '')

    // Procurar contacto associado a este número
    const { data: contacto } = await supabase
      .from('whatsapp_contactos')
      .select('id, nome, obra_id')
      .eq('telefone', telefone)
      .single()

    // Processar anexos/media
    const anexos = []
    const numMedia = parseInt(message.NumMedia || '0')
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string
      const mediaType = formData.get(`MediaContentType${i}`) as string
      if (mediaUrl) {
        anexos.push({
          url: mediaUrl,
          tipo: mediaType,
        })
      }
    }

    // Guardar mensagem na base de dados
    const { data: mensagem, error: insertError } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        twilio_sid: message.MessageSid,
        telefone_origem: telefone,
        telefone_destino: message.To.replace('whatsapp:', ''),
        conteudo: message.Body,
        tipo: 'recebida',
        contacto_id: contacto?.id || null,
        obra_id: contacto?.obra_id || null,
        autor_nome: contacto?.nome || telefone,
        anexos: anexos.length > 0 ? anexos : null,
        processada_ia: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao guardar mensagem:', insertError)
      throw insertError
    }


    // Responder ao Twilio com TwiML vazio (sem resposta automática)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    console.error('Erro no webhook:', error)

    // Responder com TwiML mesmo em caso de erro para não bloquear o Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    })
  }
})
