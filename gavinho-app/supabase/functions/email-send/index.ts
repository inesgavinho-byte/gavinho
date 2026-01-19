// Supabase Edge Function para enviar emails
// Deploy: supabase functions deploy email-send

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  to: string[]  // Array de emails destinatários
  cc?: string[] // CC (opcional)
  subject: string
  body_text?: string
  body_html?: string
  obra_id?: string
  canal_id?: string
  reply_to_message_id?: string // Para responder a um email
}

// Função para gerar código canónico
function gerarCodigoCanonico(codigo: string): string {
  const numero = codigo.replace(/^[A-Za-z-]+/, '')
  return `OBR-${numero}`
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

    // Obter configuração de email
    const { data: config, error: configError } = await supabase
      .from('email_config')
      .select('*')
      .eq('ativo', true)
      .single()

    if (configError || !config) {
      throw new Error('Configuração de email não encontrada')
    }

    const { to, cc, subject, body_text, body_html, obra_id, canal_id, reply_to_message_id }: SendEmailRequest = await req.json()

    if (!to || to.length === 0 || !subject) {
      throw new Error('Parâmetros "to" e "subject" são obrigatórios')
    }

    // Se temos obra_id, adicionar código ao assunto se não existir
    let finalSubject = subject
    if (obra_id) {
      const { data: obra } = await supabase
        .from('obras')
        .select('codigo, codigo_canonico')
        .eq('id', obra_id)
        .single()

      if (obra) {
        const codigo = obra.codigo_canonico || gerarCodigoCanonico(obra.codigo)
        if (!subject.includes(codigo) && !subject.match(/G[AB]\d{5}/i)) {
          finalSubject = `[${codigo}] ${subject}`
        }
      }
    }

    // Buscar In-Reply-To se estamos respondendo
    let inReplyTo = null
    let threadId = null
    if (reply_to_message_id) {
      const { data: emailOriginal } = await supabase
        .from('obra_emails')
        .select('message_id, thread_id, id')
        .eq('id', reply_to_message_id)
        .single()

      if (emailOriginal) {
        inReplyTo = emailOriginal.message_id
        threadId = emailOriginal.thread_id || emailOriginal.id
      }
    }

    // Gerar Message-ID único
    const messageId = `${Date.now()}-${Math.random().toString(36).substring(7)}@gavinho.pt`

    // Enviar email via SMTP (usando Resend, SendGrid, ou outro serviço)
    // Aqui usamos Resend como exemplo
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')

    let sendResult = null

    if (resendApiKey) {
      // Enviar via Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.email_principal,
          to,
          cc,
          subject: finalSubject,
          text: body_text,
          html: body_html,
          headers: {
            'Message-ID': `<${messageId}>`,
            ...(inReplyTo && { 'In-Reply-To': `<${inReplyTo}>` }),
          },
        }),
      })

      sendResult = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('Erro Resend:', sendResult)
        throw new Error(sendResult.message || 'Erro ao enviar email')
      }
    } else if (sendgridApiKey) {
      // Enviar via SendGrid
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: to.map(email => ({ email })),
            ...(cc && { cc: cc.map(email => ({ email })) }),
          }],
          from: { email: config.email_principal },
          subject: finalSubject,
          content: [
            ...(body_text ? [{ type: 'text/plain', value: body_text }] : []),
            ...(body_html ? [{ type: 'text/html', value: body_html }] : []),
          ],
          headers: {
            'Message-ID': `<${messageId}>`,
            ...(inReplyTo && { 'In-Reply-To': `<${inReplyTo}>` }),
          },
        }),
      })

      if (!sendgridResponse.ok) {
        const errorData = await sendgridResponse.json()
        console.error('Erro SendGrid:', errorData)
        throw new Error('Erro ao enviar email via SendGrid')
      }

      sendResult = { id: messageId }
    } else {
      // Sem provedor de email configurado - simular envio para desenvolvimento
      console.log('AVISO: Nenhum provedor de email configurado - simulando envio')
      sendResult = { id: messageId, simulated: true }
    }

    console.log('Email enviado:', messageId)

    // Guardar email enviado na base de dados
    const { data: emailSalvo, error: insertError } = await supabase
      .from('obra_emails')
      .insert({
        message_id: messageId,
        obra_id,
        canal_id,
        assunto: finalSubject,
        de_email: config.email_principal,
        de_nome: 'Gavinho',
        para_emails: to.map(email => ({ email, nome: email.split('@')[0] })),
        cc_emails: cc ? cc.map(email => ({ email, nome: email.split('@')[0] })) : null,
        corpo_texto: body_text,
        corpo_html: body_html,
        tipo: 'enviado',
        in_reply_to: inReplyTo,
        thread_id: threadId,
        data_envio: new Date().toISOString(),
        lido: true,
        processado_ia: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao guardar email enviado:', insertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailSalvo?.id,
        message_id: messageId,
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
