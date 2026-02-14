// Supabase Edge Function para sincronizar emails do Outlook
// Deploy: supabase functions deploy outlook-sync

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuração Microsoft Graph
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')!
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')!
const MICROSOFT_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID')!
const OUTLOOK_EMAIL = Deno.env.get('OUTLOOK_EMAIL') || 'backup@gavinhogroup.com'

// Supabase
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Email {
  id: string
  subject: string
  from: { emailAddress: { address: string; name: string } }
  toRecipients: { emailAddress: { address: string; name?: string } }[]
  ccRecipients?: { emailAddress: { address: string; name?: string } }[]
  receivedDateTime: string
  sentDateTime?: string
  bodyPreview: string
  body?: { content: string; contentType: string }
  hasAttachments?: boolean
  importance?: string
  isRead?: boolean
}

// Obter token de acesso do Microsoft Graph
async function getAccessToken(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
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

// Buscar emails recentes
async function fetchRecentEmails(accessToken: string, since?: string, limit: number = 50): Promise<Email[]> {
  const filter = since
    ? `&$filter=receivedDateTime ge ${since}`
    : ''

  const url = `https://graph.microsoft.com/v1.0/users/${OUTLOOK_EMAIL}/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,hasAttachments,importance,isRead${filter}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(`Graph API error: ${data.error.message}`)
  }

  return data.value || []
}

// Extrair código de projeto/obra do assunto ou corpo do email
function extractProjectCode(subject: string, body?: string): string | null {
  const text = `${subject} ${body || ''}`
  // Procura por padrões como GA00413, GB00466, OB00123, OBR-00123, etc.
  const match = text.match(/(GA|GB|OB)\d{5}/i) || text.match(/OBR-\d{5}/i)
  return match ? match[0].toUpperCase() : null
}

// Detectar urgência baseada no conteúdo
function detectUrgency(subject: string, body: string, importance?: string): string {
  const text = `${subject} ${body}`.toLowerCase()

  // Microsoft importance
  if (importance === 'high') return 'urgente'

  // Palavras-chave de urgência
  if (text.includes('urgente') || text.includes('urgent') || text.includes('asap')) return 'urgente'
  if (text.includes('importante') || text.includes('prioritário') || text.includes('priority')) return 'alta'
  if (text.includes('quando possível') || text.includes('sem pressa')) return 'baixa'

  return 'normal'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar configuração
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_TENANT_ID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Microsoft credentials not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in Supabase secrets.',
          help: 'Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parâmetros opcionais do request
    let daysBack = 30 // Default: últimos 30 dias
    let forceFullSync = false

    try {
      const body = await req.json()
      if (body.days_back) daysBack = parseInt(body.days_back)
      if (body.full_sync) forceFullSync = true
    } catch {
      // Request sem body, usar defaults
    }

    // Calcular data de início
    let sinceDate: string

    if (forceFullSync) {
      // Sync completo: últimos 90 dias
      sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      // Obter última sincronização ou usar days_back
      const { data: lastSync } = await supabase
        .from('obra_emails')
        .select('data_recebido')
        .order('data_recebido', { ascending: false })
        .limit(1)
        .single()

      sinceDate = lastSync?.data_recebido
        ? new Date(lastSync.data_recebido).toISOString()
        : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    }


    // Obter token e emails
    const accessToken = await getAccessToken()
    const emailLimit = forceFullSync ? 200 : 50
    const emails = await fetchRecentEmails(accessToken, sinceDate, emailLimit)


    // Buscar projetos e obras para mapear códigos
    const [projetosRes, obrasRes] = await Promise.all([
      supabase.from('projetos').select('id, codigo'),
      supabase.from('obras').select('id, codigo')
    ])

    const projetoMap = new Map(projetosRes.data?.map(p => [p.codigo, p.id]) || [])
    const obraMap = new Map(obrasRes.data?.map(o => [o.codigo, o.id]) || [])

    let imported = 0
    let skipped = 0
    let noProject = 0

    for (const email of emails) {
      // Verificar se já foi importado (por message_id do Outlook)
      const { data: existing } = await supabase
        .from('obra_emails')
        .select('id')
        .eq('outlook_message_id', email.id)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Extrair código do projeto/obra
      const projectCode = extractProjectCode(email.subject, email.bodyPreview)
      let obraId: string | null = null
      let projetoId: string | null = null

      if (projectCode) {
        // Códigos OB/OBR -> obra_id (FK para obras)
        // Códigos GB -> obra_id (FK para obras)
        // Códigos GA -> projeto_id (FK para projetos)
        if (projectCode.startsWith('OB') || projectCode.startsWith('GB')) {
          obraId = obraMap.get(projectCode) || null
          if (!obraId) {
          }
        } else if (projectCode.startsWith('GA')) {
          projetoId = projetoMap.get(projectCode) || null
          if (projetoId) {
          } else {
          }
        }
      } else {
        // Fallback: try to match by sender email to known fornecedores
        const senderEmail = email.from.emailAddress.address?.toLowerCase()
        if (senderEmail) {
          const { data: fornecedor } = await supabase
            .from('fornecedores')
            .select('id')
            .ilike('email', senderEmail)
            .limit(1)
            .single()

          if (fornecedor) {
            // Find recent emails from this fornecedor that DO have a project
            const { data: recentLinked } = await supabase
              .from('obra_emails')
              .select('obra_id, projeto_id')
              .eq('de_email', senderEmail)
              .not('obra_id', 'is', null)
              .order('data_recebido', { ascending: false })
              .limit(1)
              .single()

            if (recentLinked) {
              obraId = recentLinked.obra_id
              projetoId = recentLinked.projeto_id
            }
          }
        }

        if (!obraId && !projetoId) {
        }
      }

      // Detectar urgência
      const urgencia = detectUrgency(email.subject, email.bodyPreview, email.importance)

      // Preparar destinatários
      const paraEmails = email.toRecipients?.map(r => ({
        email: r.emailAddress.address,
        nome: r.emailAddress.name || null
      })) || []

      const ccEmails = email.ccRecipients?.map(r => ({
        email: r.emailAddress.address,
        nome: r.emailAddress.name || null
      })) || []

      // Extrair corpo do email (completo, não o preview truncado)
      let corpoTexto = email.bodyPreview // fallback
      let corpoHtml: string | null = null

      if (email.body?.content) {
        if (email.body.contentType === 'html') {
          corpoHtml = email.body.content
          // Extrair texto do HTML removendo tags
          corpoTexto = email.body.content
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove CSS
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ') // Normalizar espaços
            .trim()
        } else {
          corpoTexto = email.body.content
        }
      }

      // Inserir na tabela obra_emails
      // obra_id para códigos OB (obras), projeto_id para códigos GA (projetos)
      const { error } = await supabase.from('obra_emails').insert({
        obra_id: obraId,
        projeto_id: projetoId,
        de_email: email.from.emailAddress.address,
        de_nome: email.from.emailAddress.name || null,
        para_emails: paraEmails,
        cc_emails: ccEmails.length > 0 ? ccEmails : null,
        assunto: email.subject,
        corpo_texto: corpoTexto,
        corpo_html: corpoHtml,
        tipo: 'recebido',
        data_envio: email.sentDateTime || email.receivedDateTime,
        data_recebido: email.receivedDateTime,
        lido: email.isRead || false,
        importante: email.importance === 'high',
        urgencia,
        codigo_obra_detectado: projectCode,
        outlook_message_id: email.id,
        tem_anexos: email.hasAttachments || false,
        fonte: 'outlook'
      })

      if (error) {
        console.error(`Error inserting email "${email.subject}": ${error.message}`)
      } else {
        imported++
        if (!obraId && !projetoId) noProject++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync complete: ${imported} imported (${noProject} without project), ${skipped} already existed`,
        imported,
        skipped,
        withoutProject: noProject,
        total: emails.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
