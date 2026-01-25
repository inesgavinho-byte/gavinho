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
async function fetchRecentEmails(accessToken: string, since?: string): Promise<Email[]> {
  const filter = since
    ? `&$filter=receivedDateTime ge ${since}`
    : ''

  const url = `https://graph.microsoft.com/v1.0/users/${OUTLOOK_EMAIL}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,hasAttachments,importance,isRead${filter}`

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
  // Procura por padrões como GA00413, GA00489, OB00123, etc.
  const match = text.match(/(GA|OB)\d{5}/i)
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

    // Obter última sincronização da tabela obra_emails
    const { data: lastSync } = await supabase
      .from('obra_emails')
      .select('data_recebido')
      .order('data_recebido', { ascending: false })
      .limit(1)
      .single()

    const sinceDate = lastSync?.data_recebido
      ? new Date(lastSync.data_recebido).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Últimos 7 dias

    console.log(`Fetching emails since: ${sinceDate}`)

    // Obter token e emails
    const accessToken = await getAccessToken()
    const emails = await fetchRecentEmails(accessToken, sinceDate)

    console.log(`Found ${emails.length} emails from Outlook`)

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

      if (projectCode) {
        // Primeiro tentar obras, depois projetos
        obraId = obraMap.get(projectCode) || projetoMap.get(projectCode) || null
      }

      if (!obraId) {
        console.log(`Skipping email "${email.subject}" - no project/obra code found`)
        noProject++
        continue
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

      // Inserir na tabela obra_emails
      const { error } = await supabase.from('obra_emails').insert({
        obra_id: obraId,
        de_email: email.from.emailAddress.address,
        de_nome: email.from.emailAddress.name || null,
        para_emails: paraEmails,
        cc_emails: ccEmails.length > 0 ? ccEmails : null,
        assunto: email.subject,
        corpo_texto: email.bodyPreview,
        corpo_html: email.body?.contentType === 'html' ? email.body.content : null,
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
        console.error(`Error inserting email: ${error.message}`)
      } else {
        imported++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync complete: ${imported} imported, ${skipped} already existed, ${noProject} without project code`,
        imported,
        skipped,
        noProject,
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
