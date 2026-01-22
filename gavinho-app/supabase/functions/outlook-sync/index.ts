// Supabase Edge Function para sincronizar emails do Outlook com o Diário de Bordo
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
  toRecipients: { emailAddress: { address: string } }[]
  receivedDateTime: string
  bodyPreview: string
  body?: { content: string }
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

  const url = `https://graph.microsoft.com/v1.0/users/${OUTLOOK_EMAIL}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview${filter}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(`Graph API error: ${data.error.message}`)
  }

  return data.value || []
}

// Extrair código de projeto do assunto do email
function extractProjectCode(subject: string): string | null {
  // Procura por padrões como GA00413, GA00489, etc.
  const match = subject.match(/GA\d{5}/i)
  return match ? match[0].toUpperCase() : null
}

// Mapear categoria com base no conteúdo do email
function detectCategory(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase()

  if (text.includes('render') || text.includes('3d') || text.includes('imagem')) return '3D / Renders'
  if (text.includes('desenho') || text.includes('planta') || text.includes('corte') || text.includes('cad')) return 'Desenhos'
  if (text.includes('reunião') || text.includes('meeting') || text.includes('agenda')) return 'Reunião'
  if (text.includes('fornecedor') || text.includes('orçamento') || text.includes('proposta')) return 'Fornecedor'

  return 'Email'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar configuração
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_TENANT_ID) {
      throw new Error('Microsoft credentials not configured. Check Supabase secrets.')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Obter última sincronização
    const { data: lastSync } = await supabase
      .from('projeto_diario')
      .select('created_at')
      .eq('tipo', 'email')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const sinceDate = lastSync?.created_at
      ? new Date(lastSync.created_at).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Últimos 7 dias

    console.log(`Fetching emails since: ${sinceDate}`)

    // Obter token e emails
    const accessToken = await getAccessToken()
    const emails = await fetchRecentEmails(accessToken, sinceDate)

    console.log(`Found ${emails.length} emails`)

    // Buscar projetos para mapear códigos
    const { data: projetos } = await supabase
      .from('projetos')
      .select('id, codigo')

    const projetoMap = new Map(projetos?.map(p => [p.codigo, p.id]) || [])

    // Buscar categorias
    const { data: categorias } = await supabase
      .from('diario_categorias')
      .select('id, nome')

    const categoriaMap = new Map(categorias?.map(c => [c.nome, c.id]) || [])

    let imported = 0
    let skipped = 0

    for (const email of emails) {
      // Verificar se já foi importado
      const { data: existing } = await supabase
        .from('projeto_diario')
        .select('id')
        .eq('email_message_id', email.id)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Extrair código do projeto
      const projectCode = extractProjectCode(email.subject)
      const projetoId = projectCode ? projetoMap.get(projectCode) : null

      if (!projetoId) {
        console.log(`Skipping email "${email.subject}" - no project code found`)
        skipped++
        continue
      }

      // Detectar categoria
      const categoriaNome = detectCategory(email.subject, email.bodyPreview)
      const categoriaId = categoriaMap.get(categoriaNome) || categoriaMap.get('Email')

      // Inserir no diário
      const { error } = await supabase.from('projeto_diario').insert({
        projeto_id: projetoId,
        categoria_id: categoriaId,
        titulo: email.subject.substring(0, 500),
        descricao: email.bodyPreview,
        tipo: 'email',
        fonte: 'outlook',
        email_de: email.from.emailAddress.address,
        email_para: email.toRecipients.map(r => r.emailAddress.address).join(', '),
        email_assunto: email.subject,
        email_message_id: email.id,
        data_evento: email.receivedDateTime,
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
        message: `Sync complete: ${imported} imported, ${skipped} skipped`,
        imported,
        skipped,
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
