// Supabase Edge Function para enviar emails de notificações
// Deploy: supabase functions deploy notification-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationEmailRequest {
  notification_id?: string  // Enviar email para uma notificação específica
  process_pending?: boolean // Processar todas as notificações pendentes
  table?: 'app_notificacoes' | 'notificacoes' // Qual tabela usar
}

// Templates de email por tipo de notificação
const emailTemplates: Record<string, { subject: string; getBody: (data: any) => string }> = {
  // Tipos da tabela app_notificacoes
  'requisicao_nova': {
    subject: 'Nova Requisição',
    getBody: (n) => `
      <p>Tens uma nova requisição que requer a tua atenção.</p>
      <p><strong>${n.titulo}</strong></p>
      <p>${n.mensagem}</p>
    `
  },
  'requisicao_aprovada': {
    subject: 'Requisição Aprovada',
    getBody: (n) => `
      <p>A tua requisição foi aprovada!</p>
      <p><strong>${n.titulo}</strong></p>
      <p>${n.mensagem}</p>
    `
  },
  'tarefa_atribuida': {
    subject: 'Nova Tarefa Atribuída',
    getBody: (n) => `
      <p>Tens uma nova tarefa atribuída.</p>
      <p><strong>${n.titulo}</strong></p>
      <p>${n.mensagem}</p>
    `
  },
  // Tipos da tabela notificacoes (Teams-like)
  'mention': {
    subject: 'Foste Mencionado',
    getBody: (n) => `
      <p>${n.message}</p>
      ${n.context?.project ? `<p><small>Projeto: ${n.context.project}</small></p>` : ''}
    `
  },
  'message': {
    subject: 'Nova Mensagem',
    getBody: (n) => `
      <p>${n.message}</p>
      ${n.context?.channel ? `<p><small>Canal: ${n.context.channel}</small></p>` : ''}
    `
  },
  'comment': {
    subject: 'Novo Comentário',
    getBody: (n) => `
      <p>${n.message}</p>
      ${n.context?.project ? `<p><small>Projeto: ${n.context.project}</small></p>` : ''}
    `
  },
  'task': {
    subject: 'Atualização de Tarefa',
    getBody: (n) => `
      <p>${n.message}</p>
      ${n.context?.project ? `<p><small>Projeto: ${n.context.project}</small></p>` : ''}
    `
  },
  'project': {
    subject: 'Atualização de Projeto',
    getBody: (n) => `
      <p>${n.message}</p>
    `
  },
  'approval': {
    subject: 'Aprovação Pendente',
    getBody: (n) => `
      <p>Tens uma aprovação pendente.</p>
      <p>${n.message}</p>
    `
  },
  'system': {
    subject: 'Notificação do Sistema',
    getBody: (n) => `<p>${n.message}</p>`
  },
}

// Template HTML base
function generateEmailHtml(content: string, notification: any, appUrl: string): string {
  const link = notification.link ? `${appUrl}${notification.link}` : appUrl

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação Gavinho</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Gavinho
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${notification.titulo || notification.title ? `
                <h2 style="margin: 0 0 20px; color: #333; font-size: 20px; font-weight: 600;">
                  ${notification.titulo || notification.title}
                </h2>
              ` : ''}

              <div style="color: #555; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>

              ${notification.urgente ? `
                <div style="margin-top: 20px; padding: 12px 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                  <strong style="color: #856404;">Urgente</strong>
                </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="margin-top: 30px; text-align: center;">
                <a href="${link}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Detalhes
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 13px; text-align: center;">
                Esta é uma notificação automática do sistema Gavinho.<br>
                <a href="${appUrl}/configuracoes" style="color: #667eea; text-decoration: none;">Gerir preferências de email</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://app.gavinho.pt'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { notification_id, process_pending, table = 'app_notificacoes' }: NotificationEmailRequest = await req.json()

    // Obter email remetente da configuração
    const { data: config } = await supabase
      .from('email_config')
      .select('email_principal')
      .eq('ativo', true)
      .single()

    const fromEmail = config?.email_principal || 'notificacoes@gavinhogroup.com'

    let notifications: any[] = []

    if (notification_id) {
      // Buscar notificação específica
      if (table === 'app_notificacoes') {
        const { data, error } = await supabase
          .from('app_notificacoes')
          .select(`
            *,
            utilizador:utilizadores!app_notificacoes_utilizador_id_fkey(id, nome, email)
          `)
          .eq('id', notification_id)
          .single()

        if (error) throw new Error(`Notificação não encontrada: ${error.message}`)
        notifications = data ? [data] : []
      } else {
        const { data, error } = await supabase
          .from('notificacoes')
          .select(`
            *,
            user:utilizadores!notificacoes_user_id_fkey(id, nome, email)
          `)
          .eq('id', notification_id)
          .single()

        if (error) throw new Error(`Notificação não encontrada: ${error.message}`)
        notifications = data ? [data] : []
      }
    } else if (process_pending) {
      // Buscar todas as notificações pendentes de email
      if (table === 'app_notificacoes') {
        const { data, error } = await supabase
          .from('app_notificacoes')
          .select(`
            *,
            utilizador:utilizadores!app_notificacoes_utilizador_id_fkey(id, nome, email)
          `)
          .eq('email_enviado', false)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) throw new Error(`Erro ao buscar notificações: ${error.message}`)
        notifications = data || []
      } else {
        // Para tabela notificacoes, não há campo email_enviado ainda
        // Retornar vazio por agora
        notifications = []
      }
    } else {
      throw new Error('Forneça notification_id ou process_pending=true')
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma notificação para processar', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const notification of notifications) {
      try {
        // Determinar email do destinatário
        const userEmail = table === 'app_notificacoes'
          ? (notification.utilizador?.email || notification.utilizador_email)
          : notification.user?.email

        if (!userEmail) {
          results.push({ id: notification.id, success: false, error: 'Email do utilizador não encontrado' })
          continue
        }

        // Obter template
        const tipo = table === 'app_notificacoes' ? notification.tipo : notification.type
        const template = emailTemplates[tipo] || emailTemplates['system']

        // Gerar conteúdo
        const bodyContent = template.getBody(notification)
        const htmlBody = generateEmailHtml(bodyContent, notification, appUrl)
        const subject = notification.titulo || notification.title || template.subject

        // Enviar email
        let sendSuccess = false

        if (resendApiKey) {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [userEmail],
              subject: `[Gavinho] ${subject}`,
              html: htmlBody,
            }),
          })

          if (response.ok) {
            sendSuccess = true
          } else {
            const errorData = await response.json()
            console.error('Erro Resend:', errorData)
          }
        } else if (sendgridApiKey) {
          const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: userEmail }] }],
              from: { email: fromEmail },
              subject: `[Gavinho] ${subject}`,
              content: [{ type: 'text/html', value: htmlBody }],
            }),
          })

          sendSuccess = response.ok
          if (!response.ok) {
            const errorData = await response.json()
            console.error('Erro SendGrid:', errorData)
          }
        } else {
          // Sem provedor - simular para desenvolvimento
          console.log(`[DEV] Email simulado para ${userEmail}: ${subject}`)
          sendSuccess = true
        }

        if (sendSuccess) {
          // Marcar como enviado
          if (table === 'app_notificacoes') {
            await supabase
              .from('app_notificacoes')
              .update({ email_enviado: true, data_email: new Date().toISOString() })
              .eq('id', notification.id)
          }

          results.push({ id: notification.id, success: true })
        } else {
          results.push({ id: notification.id, success: false, error: 'Falha ao enviar email' })
        }

      } catch (err) {
        console.error(`Erro ao processar notificação ${notification.id}:`, err)
        results.push({ id: notification.id, success: false, error: err.message })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
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
