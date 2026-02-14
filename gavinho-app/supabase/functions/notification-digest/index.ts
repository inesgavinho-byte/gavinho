// =====================================================
// NOTIFICATION DIGEST - Resumo diário/semanal de notificações
// Deploy: supabase functions deploy notification-digest
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DigestRequest {
  process_all?: boolean // Processar todos os digests pendentes
  user_id?: string     // Processar para utilizador específico
  tipo?: 'daily' | 'weekly'
}

interface DigestItem {
  tipo: string
  titulo: string
  contagem: number
  mais_recente: string
  exemplos: Array<{
    title: string
    message: string
    created_at: string
  }>
}

// Gerar HTML do email de digest
function generateDigestEmailHtml(
  userName: string,
  items: DigestItem[],
  periodo: string,
  appUrl: string
): string {
  const totalNotifs = items.reduce((acc, item) => acc + item.contagem, 0)
  const periodoLabel = periodo === 'weekly' ? 'esta semana' : 'hoje'

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e9ecef;">
        <table role="presentation" style="width: 100%;">
          <tr>
            <td style="width: 50px; vertical-align: top;">
              <div style="width: 40px; height: 40px; background: #f0f9ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                ${getTypeEmoji(item.tipo)}
              </div>
            </td>
            <td style="padding-left: 12px;">
              <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                ${item.titulo}
                <span style="background: #e5e7eb; color: #374151; font-size: 12px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">
                  ${item.contagem}
                </span>
              </div>
              ${item.exemplos && item.exemplos.length > 0 ? `
                <div style="font-size: 13px; color: #666; margin-top: 4px;">
                  ${item.exemplos.slice(0, 2).map(ex =>
                    `<div style="margin-bottom: 4px;">• ${ex.message.substring(0, 80)}${ex.message.length > 80 ? '...' : ''}</div>`
                  ).join('')}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo de Notificações - Gavinho</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700;">
                Gavinho
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Resumo de Atividade
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 16px;">
              <h2 style="margin: 0 0 8px; color: #333; font-size: 22px; font-weight: 600;">
                Olá${userName ? `, ${userName}` : ''}!
              </h2>
              <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.5;">
                Tens <strong style="color: #667eea;">${totalNotifs} notificações não lidas</strong> ${periodoLabel}.
                Aqui está o teu resumo:
              </p>
            </td>
          </tr>

          <!-- Summary Cards -->
          <tr>
            <td style="padding: 16px 40px;">
              <table role="presentation" style="width: 100%; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                Ver Todas as Notificações
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 12px; color: #6c757d; font-size: 13px; text-align: center;">
                Este é o teu resumo ${periodo === 'weekly' ? 'semanal' : 'diário'} automático.
              </p>
              <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center;">
                <a href="${appUrl}/configuracoes" style="color: #667eea; text-decoration: none;">Alterar preferências de email</a>
                &nbsp;•&nbsp;
                <a href="${appUrl}/configuracoes" style="color: #667eea; text-decoration: none;">Cancelar resumos</a>
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

function getTypeEmoji(tipo: string): string {
  const emojis: Record<string, string> = {
    mention: '@',
    message: '💬',
    comment: '💬',
    task: '📋',
    tarefa_atribuida: '📋',
    tarefa_concluida: '✅',
    requisicao_nova: '📦',
    material_aprovado: '✓',
    aprovacao_pendente: '⏳',
    project: '📁'
  }
  return emojis[tipo] || '🔔'
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

    const { process_all, user_id, tipo }: DigestRequest = await req.json()

    let usersToProcess: Array<{
      utilizador_id: string
      email: string
      frequencia: string
      total_nao_lidas: number
    }> = []

    if (process_all) {
      // Buscar todos os utilizadores com digests pendentes
      const { data, error } = await supabase.rpc('processar_digests_pendentes')
      if (error) throw new Error(`Erro ao buscar digests: ${error.message}`)
      usersToProcess = data || []
    } else if (user_id) {
      // Buscar preferências do utilizador específico
      const { data: userData } = await supabase
        .from('utilizadores')
        .select('id, email, nome')
        .eq('id', user_id)
        .single()

      if (userData) {
        usersToProcess = [{
          utilizador_id: user_id,
          email: userData.email,
          frequencia: tipo || 'daily',
          total_nao_lidas: 0
        }]
      }
    }

    if (usersToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum digest para processar', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { user_id: string; success: boolean; error?: string }[] = []

    // Obter email remetente
    const { data: config } = await supabase
      .from('email_config')
      .select('email_principal')
      .eq('ativo', true)
      .single()

    const fromEmail = config?.email_principal || 'notificacoes@gavinhogroup.com'

    for (const user of usersToProcess) {
      try {
        // Obter digest do utilizador
        const { data: digestData, error: digestError } = await supabase.rpc('get_notificacao_digest', {
          p_utilizador_id: user.utilizador_id,
          p_periodo: user.frequencia
        })

        if (digestError) {
          results.push({ user_id: user.utilizador_id, success: false, error: digestError.message })
          continue
        }

        if (!digestData || digestData.length === 0) {
          results.push({ user_id: user.utilizador_id, success: true }) // Nada para enviar
          continue
        }

        // Obter nome do utilizador
        const { data: userInfo } = await supabase
          .from('utilizadores')
          .select('nome')
          .eq('id', user.utilizador_id)
          .single()

        const userName = userInfo?.nome?.split(' ')[0] || ''

        // Gerar email
        const htmlBody = generateDigestEmailHtml(userName, digestData, user.frequencia, appUrl)
        const subject = user.frequencia === 'weekly'
          ? `[Gavinho] Resumo Semanal: ${digestData.reduce((acc: number, d: DigestItem) => acc + d.contagem, 0)} notificações`
          : `[Gavinho] Resumo Diário: ${digestData.reduce((acc: number, d: DigestItem) => acc + d.contagem, 0)} notificações não lidas`

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
              to: [user.email],
              subject,
              html: htmlBody,
            }),
          })
          sendSuccess = response.ok
        } else if (sendgridApiKey) {
          const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: user.email }] }],
              from: { email: fromEmail },
              subject,
              content: [{ type: 'text/html', value: htmlBody }],
            }),
          })
          sendSuccess = response.ok
        } else {
          sendSuccess = true
        }

        if (sendSuccess) {
          // Registar envio no log
          await supabase.from('notificacao_digest_log').insert({
            utilizador_id: user.utilizador_id,
            tipo: user.frequencia,
            periodo_inicio: new Date(Date.now() - (user.frequencia === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString(),
            periodo_fim: new Date().toISOString(),
            total_notificacoes: digestData.reduce((acc: number, d: DigestItem) => acc + d.contagem, 0),
            total_nao_lidas: digestData.reduce((acc: number, d: DigestItem) => acc + d.contagem, 0),
            sucesso: true
          })

          results.push({ user_id: user.utilizador_id, success: true })
        } else {
          results.push({ user_id: user.utilizador_id, success: false, error: 'Falha ao enviar email' })
        }

      } catch (err) {
        console.error(`Erro ao processar digest para ${user.utilizador_id}:`, err)
        results.push({ user_id: user.utilizador_id, success: false, error: err.message })
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
