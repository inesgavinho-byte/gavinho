// ══════════════════════════════════════════════════════════════
// GAVINHO Platform — Router Agent (Email Classifier)
// ══════════════════════════════════════════════════════════════
// Processa emails da fila: busca conteúdo do Graph, classifica
// com Claude (17 categorias + 62 subcategorias), extrai entidades,
// propõe ações e routes para sub-agentes especializados.
//
// Deploy: supabase functions deploy agent-router
// Disparado por: DB trigger (new_email_queued) ou chamada directa
// ══════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const GRAPH_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID')!
const GRAPH_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')!
const GRAPH_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')!
const OUTLOOK_EMAIL = Deno.env.get('OUTLOOK_EMAIL') || 'geral@gavinhogroup.com'

// ═══════════════════════════════════════
// TAXONOMIA COMPLETA
// ═══════════════════════════════════════

const TAXONOMY = {
  comercial_financeiro: {
    label: 'Comercial e Financeiro',
    categories: {
      pedido_cotacao: ['pedido_inicial', 'follow_up', 'comparacao_propostas', 'negociacao'],
      encomenda: ['nova_encomenda', 'confirmacao', 'modificacao', 'cancelamento', 'reclamacao'],
      aviso_entrega: ['agendamento', 'confirmacao', 'atraso', 'entrega_parcial'],
      faturacao: ['nova_fatura', 'nota_credito', 'lembrete_pagamento', 'confirmacao_pagamento', 'retencao'],
      proposta_financeira: ['orcamento_cliente', 'revisao_orcamento', 'trabalhos_extra', 'auto_medicao'],
    }
  },
  projeto_design: {
    label: 'Projeto e Design',
    categories: {
      decisao_projeto: ['aprovacao_design', 'selecao_materiais', 'revisao_projeto', 'alteracao_scope'],
      licenciamento: ['submissao_licenca', 'aprovacao', 'inspecao_camararia', 'renovacao', 'pedido_info_municipal'],
      rfi: ['esclarecimento_projeto', 'construtibilidade', 'condicoes_local', 'documentos_falta'],
    }
  },
  construcao_obra: {
    label: 'Construção e Obra',
    categories: {
      progresso: ['relatorio_diario', 'atualizacao_milestone', 'relatorio_fotografico', 'relatorio_semanal'],
      nao_conformidade: ['relatorio_nc', 'acao_corretiva', 'follow_up', 'encerramento'],
      subempreiteiro: ['contrato', 'agendamento_trabalhos', 'controlo_qualidade', 'backcharge'],
      agendamento: ['reuniao_obra', 'visita_cliente', 'inspecao', 'visita_tecnica'],
      seguranca: ['incidente', 'observacao', 'relatorio_periodico', 'formacao'],
    }
  },
  relacoes_comunicacao: {
    label: 'Relações e Comunicação',
    categories: {
      cliente: ['atualizacao_estado', 'decisao_cliente', 'reclamacao', 'pedido_alteracao', 'agradecimento'],
      fornecedor: ['negociacao', 'questao_tecnica', 'garantia', 'avaliacao'],
      ata_reuniao: ['reuniao_projeto', 'reuniao_cliente', 'reuniao_obra', 'reuniao_interna'],
      interno: ['coordenacao_equipa', 'rh_admin', 'anuncio_geral'],
    }
  }
}

// Gerar lista de categorias e subcategorias para o prompt
function getTaxonomyPrompt(): string {
  const lines: string[] = []
  for (const [domainKey, domain] of Object.entries(TAXONOMY)) {
    lines.push(`\n## ${domain.label} (${domainKey})`)
    for (const [catKey, subcats] of Object.entries(domain.categories)) {
      lines.push(`  - ${catKey}: ${(subcats as string[]).join(', ')}`)
    }
  }
  return lines.join('\n')
}

// ═══════════════════════════════════════
// DETERMINISTIC RULES (Layer 1)
// ═══════════════════════════════════════
// Regras que NUNCA dependem da IA

interface DeterministicRule {
  condition: (entities: any, confidence: number) => boolean
  override: Partial<{ approval_tier: string; risk_level: string }>
}

const DETERMINISTIC_RULES: DeterministicRule[] = [
  // Faturas >€50.000 → sempre aprovação da direção
  {
    condition: (e) => {
      const values = e.monetary_values || []
      return values.some((v: number) => v > 50000)
    },
    override: { approval_tier: 'manual_only', risk_level: 'critical' }
  },
  // Incidentes de segurança → escalação imediata
  {
    condition: (e) => e.is_safety_incident === true,
    override: { approval_tier: 'escalate', risk_level: 'critical' }
  },
  // Modificações contratuais → sempre aprovação humana
  {
    condition: (e) => e.is_contract_modification === true,
    override: { approval_tier: 'manual_only', risk_level: 'high' }
  },
  // Submissões regulatórias → nunca automáticas
  {
    condition: (e) => e.is_regulatory_submission === true,
    override: { approval_tier: 'manual_only', risk_level: 'high' }
  },
]

// ═══════════════════════════════════════
// APPROVAL TIER CALCULATOR
// ═══════════════════════════════════════

function calculateApprovalTier(confidence: number, riskLevel: string): string {
  if (riskLevel === 'critical') return 'manual_only'
  if (riskLevel === 'high') return 'escalate'

  if (confidence >= 0.90) return 'auto_execute'
  if (confidence >= 0.75) return 'auto_notify'
  if (confidence >= 0.60) return 'review_required'
  if (confidence >= 0.40) return 'escalate'
  return 'manual_only'
}

// ═══════════════════════════════════════
// ACTION MAPPING
// ═══════════════════════════════════════

const CATEGORY_ACTIONS: Record<string, { action_type: string; description: string; risk: string }[]> = {
  pedido_cotacao: [
    { action_type: 'registar_cotacao_procurement', description: 'Registar cotação no pipeline de procurement', risk: 'low' },
    { action_type: 'notify_procurement_team', description: 'Notificar equipa de procurement', risk: 'low' },
  ],
  encomenda: [
    { action_type: 'actualizar_po_estado', description: 'Atualizar estado da purchase order', risk: 'medium' },
    { action_type: 'update_supplier_status', description: 'Atualizar estado do fornecedor', risk: 'low' },
  ],
  aviso_entrega: [
    { action_type: 'actualizar_entrega_po', description: 'Atualizar entrega na purchase order', risk: 'low' },
    { action_type: 'create_diary_entry', description: 'Registar entrega no diário de obra', risk: 'low' },
    { action_type: 'notify_site_manager', description: 'Notificar encarregado de obra', risk: 'low' },
  ],
  faturacao: [
    { action_type: 'match_fatura_po', description: 'Associar fatura à purchase order', risk: 'medium' },
    { action_type: 'alertar_desvio_preco', description: 'Alertar desvio de preço vs PO', risk: 'medium' },
  ],
  proposta_financeira: [
    { action_type: 'register_proposal', description: 'Registar proposta financeira', risk: 'medium' },
  ],
  decisao_projeto: [
    { action_type: 'register_decision', description: 'Registar decisão de projeto', risk: 'medium' },
    { action_type: 'update_design_review', description: 'Atualizar design review', risk: 'low' },
  ],
  licenciamento: [
    { action_type: 'update_permit_status', description: 'Atualizar estado do licenciamento', risk: 'high' },
  ],
  rfi: [
    { action_type: 'create_rfi_task', description: 'Criar tarefa de resposta a RFI', risk: 'low' },
  ],
  progresso: [
    { action_type: 'create_diary_entry', description: 'Registar progresso no diário de obra', risk: 'low' },
    { action_type: 'update_milestone', description: 'Atualizar milestone da obra', risk: 'low' },
  ],
  nao_conformidade: [
    { action_type: 'register_nc', description: 'Registar não-conformidade', risk: 'medium' },
    { action_type: 'notify_quality_team', description: 'Notificar equipa de qualidade', risk: 'low' },
  ],
  subempreiteiro: [
    { action_type: 'update_subcontractor', description: 'Atualizar informação do subempreiteiro', risk: 'low' },
  ],
  agendamento: [
    { action_type: 'create_calendar_event', description: 'Criar evento no calendário', risk: 'low' },
  ],
  seguranca: [
    { action_type: 'register_safety_event', description: 'Registar evento de segurança', risk: 'high' },
    { action_type: 'escalate_safety', description: 'Escalar incidente de segurança', risk: 'critical' },
  ],
  cliente: [
    { action_type: 'create_diary_entry', description: 'Registar comunicação com cliente', risk: 'low' },
    { action_type: 'create_follow_up_task', description: 'Criar tarefa de follow-up', risk: 'low' },
  ],
  fornecedor: [
    { action_type: 'update_supplier_record', description: 'Atualizar registo do fornecedor', risk: 'low' },
  ],
  ata_reuniao: [
    { action_type: 'create_meeting_minutes', description: 'Registar ata de reunião', risk: 'low' },
  ],
  interno: [
    { action_type: 'create_diary_entry', description: 'Registar comunicação interna', risk: 'low' },
  ],
}

// ═══════════════════════════════════════
// GRAPH API: FETCH EMAIL CONTENT
// ═══════════════════════════════════════

async function getGraphAccessToken(): Promise<string> {
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
  if (!data.access_token) throw new Error(`Graph auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchEmailContent(accessToken: string, messageId: string) {
  const url = `https://graph.microsoft.com/v1.0/users/${OUTLOOK_EMAIL}/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,hasAttachments,importance,internetMessageId,conversationId`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Graph API error ${response.status}: ${errText}`)
  }

  return response.json()
}

// ═══════════════════════════════════════
// CLAUDE: CLASSIFY EMAIL
// ═══════════════════════════════════════

interface ClassificationResult {
  domain: string
  category: string
  subcategory: string
  confidence: number
  urgency: string
  language: string
  summary_pt: string
  entities: {
    project_ref?: string
    supplier_name?: string
    client_name?: string
    monetary_values?: number[]
    dates_mentioned?: string[]
    materials?: string[]
    zones?: string[]
    is_safety_incident?: boolean
    is_contract_modification?: boolean
    is_regulatory_submission?: boolean
  }
  suggested_actions: string[]
  target_agent: string
}

async function classifyEmail(subject: string, body: string, fromAddress: string, fromName: string): Promise<ClassificationResult> {
  const taxonomyPrompt = getTaxonomyPrompt()

  const systemPrompt = `És o Router Agent do sistema GAVINHO — uma empresa portuguesa de arquitetura e construção de luxo que opera em modelo Design & Build.

A tua tarefa é classificar emails recebidos em geral@gavinhogroup.com numa taxonomia de 4 domínios, 17 categorias e 62 subcategorias.

TAXONOMIA:
${taxonomyPrompt}

GLOSSÁRIO DE CONSTRUÇÃO PT:
- Auto de medição = Progress payment certificate
- MQT = Mapa de Quantidades de Trabalho (Bill of Quantities)
- POP = Procedimento Operacional Padrão
- NC = Não-Conformidade
- HSO = Higiene e Segurança em Obra
- Subempreiteiro = Subcontractor
- Encarregado = Site foreman
- Fiscal = Inspector/Supervisor
- Alvará = Contractor's license
- Câmara = Municipality/City Hall

PADRÕES DE CÓDIGO:
- GA##### = Projeto de design (ex: GA00413)
- GB##### = Obra de construção (ex: GB00466)
- OB##### = Obra (formato alternativo)
- OBR-##### = Obra (formato canónico)

REGRAS:
1. Analisa o assunto, corpo, remetente e contexto completo
2. Classifica na categoria mais específica possível
3. O confidence score deve refletir a certeza real (0.0 a 1.0)
4. Extrai TODAS as entidades mencionadas: referências de projeto, nomes de fornecedores, valores monetários, datas, materiais, zonas
5. Para emails em inglês, traduz o resumo para PT
6. Identifica flags especiais: is_safety_incident, is_contract_modification, is_regulatory_submission

Responde SEMPRE usando a ferramenta classify_email.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Classifica este email:\n\nDE: ${fromName || fromAddress} <${fromAddress}>\nASSUNTO: ${subject}\n\nCORPO:\n${body?.substring(0, 4000) || '(sem conteúdo)'}`
        }
      ],
      tools: [{
        name: 'classify_email',
        description: 'Classificar email e extrair dados estruturados',
        input_schema: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['comercial_financeiro', 'projeto_design', 'construcao_obra', 'relacoes_comunicacao'] },
            category: { type: 'string', enum: Object.keys(CATEGORY_ACTIONS) },
            subcategory: { type: 'string' },
            confidence: { type: 'number', description: 'Score de confiança 0.0-1.0' },
            urgency: { type: 'string', enum: ['critica', 'alta', 'media', 'baixa'] },
            language: { type: 'string', enum: ['pt', 'en', 'mixed'] },
            summary_pt: { type: 'string', description: 'Resumo em português, 1-2 frases' },
            entities: {
              type: 'object',
              properties: {
                project_ref: { type: 'string', description: 'Código do projeto/obra detectado (GA/GB/OB)' },
                supplier_name: { type: 'string' },
                client_name: { type: 'string' },
                monetary_values: { type: 'array', items: { type: 'number' } },
                dates_mentioned: { type: 'array', items: { type: 'string' } },
                materials: { type: 'array', items: { type: 'string' } },
                zones: { type: 'array', items: { type: 'string' } },
                is_safety_incident: { type: 'boolean' },
                is_contract_modification: { type: 'boolean' },
                is_regulatory_submission: { type: 'boolean' },
              }
            },
            suggested_actions: { type: 'array', items: { type: 'string' } },
            target_agent: { type: 'string', enum: ['construction', 'financial', 'licensing', 'client_relations', 'procurement', 'general'] },
          },
          required: ['domain', 'category', 'confidence', 'urgency', 'summary_pt', 'target_agent']
        }
      }],
      tool_choice: { type: 'tool', name: 'classify_email' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${errText}`)
  }

  const data = await response.json()

  // Extract tool use result
  const toolUse = data.content?.find((c: any) => c.type === 'tool_use')
  if (!toolUse?.input) {
    throw new Error('No tool_use result from Claude')
  }

  return toolUse.input as ClassificationResult
}

// ═══════════════════════════════════════
// PROJECT MATCHING
// ═══════════════════════════════════════

async function matchProject(
  supabase: any,
  projectRef: string | undefined,
  fromAddress: string
): Promise<{ project_id: string | null; obra_id: string | null; supplier_id: string | null }> {
  let project_id: string | null = null
  let obra_id: string | null = null
  let supplier_id: string | null = null

  // 1. Match by project code
  if (projectRef) {
    const code = projectRef.toUpperCase()

    if (code.startsWith('GA')) {
      const { data } = await supabase
        .from('projetos')
        .select('id')
        .eq('codigo', code)
        .single()
      if (data) project_id = data.id
    } else if (code.startsWith('GB') || code.startsWith('OB')) {
      const { data } = await supabase
        .from('obras')
        .select('id')
        .eq('codigo', code)
        .single()
      if (data) obra_id = data.id
    }
  }

  // 2. Match supplier by email domain
  const domain = fromAddress.split('@')[1]
  if (domain) {
    const { data: forn } = await supabase
      .from('fornecedores')
      .select('id')
      .ilike('email', `%@${domain}`)
      .limit(1)
      .single()
    if (forn) supplier_id = forn.id
  }

  // 3. Fallback: match by sender history
  if (!project_id && !obra_id) {
    const { data: recent } = await supabase
      .from('email_processing_queue')
      .select('project_id, obra_id')
      .eq('from_address', fromAddress)
      .not('project_id', 'is', null)
      .order('received_at', { ascending: false })
      .limit(1)
      .single()

    if (recent) {
      project_id = recent.project_id
      obra_id = recent.obra_id
    }
  }

  return { project_id, obra_id, supplier_id }
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Accept either a specific queue_id or process next pending
    let queueId: string | null = null
    try {
      const body = await req.json()
      queueId = body.queue_id || null
    } catch { /* no body */ }

    // Get item from queue
    let queueItem: any

    if (queueId) {
      const { data, error } = await supabase
        .from('email_processing_queue')
        .select('*')
        .eq('id', queueId)
        .single()
      if (error || !data) throw new Error(`Queue item ${queueId} not found`)
      queueItem = data
    } else {
      // Process next pending item
      const { data, error } = await supabase
        .from('email_processing_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (!data) {
        return new Response(
          JSON.stringify({ success: true, message: 'No pending emails in queue' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      queueItem = data
    }

    // ═══════════════════════════════════════
    // STEP 1: FETCH EMAIL CONTENT FROM GRAPH
    // ═══════════════════════════════════════

    await supabase
      .from('email_processing_queue')
      .update({ status: 'fetching' })
      .eq('id', queueItem.id)

    let emailContent: any
    try {
      const accessToken = await getGraphAccessToken()
      emailContent = await fetchEmailContent(accessToken, queueItem.graph_message_id)
    } catch (fetchError) {
      // If Graph fetch fails, mark for retry
      const retryCount = (queueItem.retry_count || 0) + 1
      const status = retryCount >= (queueItem.max_retries || 3) ? 'failed' : 'pending'

      await supabase
        .from('email_processing_queue')
        .update({
          status,
          retry_count: retryCount,
          error_message: fetchError.message,
        })
        .eq('id', queueItem.id)

      throw fetchError
    }

    // Extract body text from HTML
    let bodyText = emailContent.bodyPreview || ''
    if (emailContent.body?.content) {
      if (emailContent.body.contentType === 'html') {
        bodyText = emailContent.body.content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
      } else {
        bodyText = emailContent.body.content
      }
    }

    const fromAddress = emailContent.from?.emailAddress?.address || ''
    const fromName = emailContent.from?.emailAddress?.name || ''

    // Update queue with fetched content
    await supabase
      .from('email_processing_queue')
      .update({
        status: 'fetched',
        internet_message_id: emailContent.internetMessageId,
        conversation_id: emailContent.conversationId,
        subject: emailContent.subject,
        from_address: fromAddress,
        from_name: fromName,
        to_recipients: emailContent.toRecipients,
        cc_recipients: emailContent.ccRecipients,
        received_at: emailContent.receivedDateTime,
        body_preview: emailContent.bodyPreview,
        body_html: emailContent.body?.content,
        body_text: bodyText,
        has_attachments: emailContent.hasAttachments,
        importance: emailContent.importance,
      })
      .eq('id', queueItem.id)

    // Also insert/update in obra_emails for existing UI compatibility
    const { data: existingObraEmail } = await supabase
      .from('obra_emails')
      .select('id')
      .eq('outlook_message_id', queueItem.graph_message_id)
      .single()

    let obraEmailId = existingObraEmail?.id || null

    // ═══════════════════════════════════════
    // STEP 2: CLASSIFY WITH ROUTER AGENT
    // ═══════════════════════════════════════

    await supabase
      .from('email_processing_queue')
      .update({ status: 'classifying' })
      .eq('id', queueItem.id)

    const classification = await classifyEmail(
      emailContent.subject || '',
      bodyText,
      fromAddress,
      fromName
    )

    // ═══════════════════════════════════════
    // STEP 3: MATCH PROJECT/OBRA/SUPPLIER
    // ═══════════════════════════════════════

    const { project_id, obra_id, supplier_id } = await matchProject(
      supabase,
      classification.entities?.project_ref,
      fromAddress
    )

    // ═══════════════════════════════════════
    // STEP 4: APPLY DETERMINISTIC RULES
    // ═══════════════════════════════════════

    let overrides: any = {}
    for (const rule of DETERMINISTIC_RULES) {
      if (rule.condition(classification.entities || {}, classification.confidence)) {
        overrides = { ...overrides, ...rule.override }
      }
    }

    // ═══════════════════════════════════════
    // STEP 5: CREATE ACTIONS
    // ═══════════════════════════════════════

    await supabase
      .from('email_processing_queue')
      .update({ status: 'routing' })
      .eq('id', queueItem.id)

    const categoryActions = CATEGORY_ACTIONS[classification.category] || []
    const createdActions: string[] = []

    for (const action of categoryActions) {
      const riskLevel = overrides.risk_level || action.risk
      const tier = overrides.approval_tier || calculateApprovalTier(classification.confidence, riskLevel)

      const { data: actionData, error: actionError } = await supabase
        .from('agent_actions')
        .insert({
          email_id: queueItem.id,
          obra_email_id: obraEmailId,
          project_id,
          obra_id,
          source_agent: classification.target_agent,
          action_type: action.action_type,
          action_description: action.description,
          action_payload: {
            email_subject: emailContent.subject,
            email_from: fromAddress,
            entities: classification.entities,
            summary: classification.summary_pt,
          },
          confidence: classification.confidence,
          ai_reasoning: classification.summary_pt,
          model_id: 'claude-sonnet-4-5-20250929',
          risk_level: riskLevel,
          approval_tier: tier,
          status: tier === 'auto_execute' ? 'approved' : 'pending',
        })
        .select('id')
        .single()

      if (actionData) {
        createdActions.push(actionData.id)

        // Log to audit
        await supabase.from('ai_audit_log').insert({
          action_id: actionData.id,
          email_queue_id: queueItem.id,
          event_type: 'action_proposed',
          model_id: 'claude-sonnet-4-5-20250929',
          ai_reasoning: classification.summary_pt,
          confidence: classification.confidence,
          action_type: action.action_type,
          action_payload: { risk: riskLevel, tier },
          execution_time_ms: Date.now() - startTime,
        })
      }
    }

    // ═══════════════════════════════════════
    // STEP 6: UPDATE QUEUE AS COMPLETED
    // ═══════════════════════════════════════

    await supabase
      .from('email_processing_queue')
      .update({
        status: 'completed',
        domain: classification.domain,
        category: classification.category,
        subcategory: classification.subcategory,
        confidence: classification.confidence,
        urgency: classification.urgency,
        language_detected: classification.language,
        summary_pt: classification.summary_pt,
        extracted_entities: classification.entities,
        target_agent: classification.target_agent,
        project_id,
        obra_id,
        supplier_id,
        obra_email_id: obraEmailId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', queueItem.id)

    // Log classification to audit
    await supabase.from('ai_audit_log').insert({
      email_queue_id: queueItem.id,
      event_type: 'classification',
      model_id: 'claude-sonnet-4-5-20250929',
      ai_reasoning: classification.summary_pt,
      confidence: classification.confidence,
      action_type: 'classify',
      action_payload: {
        domain: classification.domain,
        category: classification.category,
        subcategory: classification.subcategory,
        entities: classification.entities,
      },
      execution_time_ms: Date.now() - startTime,
    })

    return new Response(
      JSON.stringify({
        success: true,
        queue_id: queueItem.id,
        classification: {
          domain: classification.domain,
          category: classification.category,
          subcategory: classification.subcategory,
          confidence: classification.confidence,
          urgency: classification.urgency,
          summary: classification.summary_pt,
          target_agent: classification.target_agent,
        },
        project_id,
        obra_id,
        supplier_id,
        actions_created: createdActions.length,
        processing_time_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Router Agent error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
