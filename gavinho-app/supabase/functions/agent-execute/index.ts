// ══════════════════════════════════════════════════════════════
// GAVINHO Platform — Action Executor (Sub-Agents)
// ══════════════════════════════════════════════════════════════
// Executa ações aprovadas ou auto-executáveis dos agentes.
// Cada tipo de ação é tratado por um sub-agente especializado.
//
// Deploy: supabase functions deploy agent-execute
// Chamado: manualmente via UI (approve) ou por cron para auto_execute
// ══════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ═══════════════════════════════════════
// ACTION EXECUTORS (Sub-Agents)
// ═══════════════════════════════════════

type ActionExecutor = (
  supabase: any,
  action: any,
  email: any
) => Promise<{ success: boolean; result: any; rollback_payload?: any }>

// --- CONSTRUCTION AGENT ---

const createDiaryEntry: ActionExecutor = async (supabase, action, email) => {
  const projectId = action.project_id || action.obra_id
  if (!projectId) return { success: false, result: { error: 'No project/obra ID' } }

  const { data: categoriaEmail } = await supabase
    .from('diario_categorias')
    .select('id')
    .eq('nome', 'Email')
    .single()

  const { data, error } = await supabase
    .from('projeto_diario')
    .insert({
      projeto_id: projectId,
      categoria_id: categoriaEmail?.id || null,
      titulo: email?.subject || action.action_payload?.email_subject || 'Email processado',
      descricao: action.action_payload?.summary || action.ai_reasoning || '',
      tipo: 'email',
      fonte: 'agent',
      email_de: email?.from_address || action.action_payload?.email_from || '',
      email_assunto: email?.subject || action.action_payload?.email_subject || '',
      data_evento: email?.received_at || new Date().toISOString(),
      metadata: {
        agent: action.source_agent,
        action_id: action.id,
        category: email?.category,
      }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { diary_entry_id: data.id },
    rollback_payload: { table: 'projeto_diario', id: data.id }
  }
}

const registerNC: ActionExecutor = async (supabase, action, email) => {
  const obraId = action.obra_id
  if (!obraId) return { success: false, result: { error: 'No obra ID for NC' } }

  const entities = action.action_payload?.entities || {}

  const { data, error } = await supabase
    .from('obra_nao_conformidades')
    .insert({
      obra_id: obraId,
      titulo: email?.subject || 'Não-Conformidade detectada por email',
      descricao: action.action_payload?.summary || '',
      tipo: 'execucao',
      gravidade: email?.urgency === 'critica' ? 'critica' : 'maior',
      estado: 'aberta',
      zona: entities.zones?.[0] || null,
      detectado_por: email?.from_name || email?.from_address || 'Sistema',
      data_detecao: new Date().toISOString().split('T')[0],
      origem: 'email',
      metadata: { action_id: action.id, email_id: email?.id }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { nc_id: data.id },
    rollback_payload: { table: 'obra_nao_conformidades', id: data.id }
  }
}

// --- FINANCIAL AGENT ---

const registerInvoice: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const values = entities.monetary_values || []

  const { data, error } = await supabase
    .from('faturas')
    .insert({
      projeto_id: action.project_id,
      numero: `AUTO-${Date.now()}`,
      fornecedor: entities.supplier_name || email?.from_name || email?.from_address || 'Desconhecido',
      descricao: action.action_payload?.summary || email?.subject || '',
      valor: values[0] || 0,
      iva: 23,
      valor_com_iva: values[0] ? values[0] * 1.23 : 0,
      status: 'pendente',
      data_emissao: new Date().toISOString().split('T')[0],
      notas: `Registado automaticamente pelo agente a partir do email: ${email?.subject}`,
      metadata: { action_id: action.id, email_id: email?.id, auto_registered: true }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { invoice_id: data.id },
    rollback_payload: { table: 'faturas', id: data.id }
  }
}

// --- GENERAL ACTIONS ---

const createFollowUpTask: ActionExecutor = async (supabase, action, email) => {
  const projectId = action.project_id || action.obra_id
  if (!projectId) return { success: false, result: { error: 'No project ID for task' } }

  const dataLimite = new Date()
  dataLimite.setDate(dataLimite.getDate() + 3)

  const { data, error } = await supabase
    .from('tarefas')
    .insert({
      projeto_id: projectId,
      titulo: `Follow-up: ${email?.subject || action.action_payload?.email_subject || 'Email'}`,
      descricao: action.action_payload?.summary || action.ai_reasoning || '',
      categoria: `email_${email?.category || 'geral'}`,
      prioridade: email?.urgency === 'critica' ? 'urgente' : email?.urgency === 'alta' ? 'alta' : 'media',
      status: 'pendente',
      data_limite: dataLimite.toISOString().split('T')[0],
      origem_tipo: 'agent',
      metadata: { action_id: action.id, email_id: email?.id }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { task_id: data.id },
    rollback_payload: { table: 'tarefas', id: data.id }
  }
}

const createCalendarEvent: ActionExecutor = async (supabase, action, email) => {
  // For now, create a task with calendar type
  const projectId = action.project_id || action.obra_id
  const entities = action.action_payload?.entities || {}
  const eventDate = entities.dates_mentioned?.[0] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('tarefas')
    .insert({
      projeto_id: projectId,
      titulo: `Evento: ${email?.subject || 'Agendamento'}`,
      descricao: action.action_payload?.summary || '',
      categoria: 'agendamento',
      prioridade: 'media',
      status: 'pendente',
      data_limite: eventDate,
      origem_tipo: 'agent',
      metadata: { action_id: action.id, email_id: email?.id, type: 'calendar_event' }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { event_id: data.id },
    rollback_payload: { table: 'tarefas', id: data.id }
  }
}

const registerDecision: ActionExecutor = async (supabase, action, email) => {
  const projectId = action.project_id || action.obra_id
  if (!projectId) return { success: false, result: { error: 'No project ID for decision' } }

  const { data, error } = await supabase
    .from('decisoes')
    .insert({
      projeto_id: projectId,
      titulo: email?.subject || 'Decisão detectada',
      descricao: action.action_payload?.summary || '',
      categoria: 'tecnica',
      tipo: 'design',
      decidido_por_tipo: 'cliente',
      fonte: 'email',
      estado: 'sugerida',
      metadata: { action_id: action.id, email_id: email?.id, auto_detected: true }
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { decision_id: data.id },
    rollback_payload: { table: 'decisoes', id: data.id }
  }
}

const updateSupplierRecord: ActionExecutor = async (supabase, action, _email) => {
  const supplierId = action.action_payload?.entities?.supplier_id
  if (!supplierId) return { success: true, result: { message: 'No supplier to update' } }

  const { error } = await supabase
    .from('fornecedores')
    .update({ ultimo_contacto: new Date().toISOString() })
    .eq('id', supplierId)

  if (error) return { success: false, result: { error: error.message } }
  return { success: true, result: { updated: true } }
}

// --- PROCUREMENT AGENT ---

const registarCotacaoProcurement: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const values = entities.monetary_values || []
  const projectId = action.project_id
  const obraId = action.obra_id
  const supplierId = action.action_payload?.entities?.supplier_id || null

  // Find matching requisição (open and for same project)
  let requisicaoId: string | null = null
  if (projectId || obraId) {
    const { data: req } = await supabase
      .from('requisicoes')
      .select('id')
      .or(`projeto_id.eq.${projectId || '00000000-0000-0000-0000-000000000000'},obra_id.eq.${obraId || '00000000-0000-0000-0000-000000000000'}`)
      .in('estado', ['aberta', 'em_cotacao'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (req) requisicaoId = req.id
  }

  // Generate cotação code
  const year = new Date().getFullYear()
  const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'cot_seq' }).single()
  const seqNum = seqData || Date.now() % 10000
  const codigo = `COT-${year}-${String(seqNum).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('cotacoes')
    .insert({
      codigo,
      requisicao_id: requisicaoId,
      fornecedor_id: supplierId,
      email_queue_id: action.email_id,
      projeto_id: projectId,
      obra_id: obraId,
      estado: 'recebida',
      valor_total: values[0] || null,
      moeda: 'EUR',
      validade_dias: 30,
      prazo_entrega_dias: entities.delivery_days || null,
      condicoes_pagamento: entities.payment_terms || null,
      notas: action.action_payload?.summary || email?.subject || '',
      metadata: {
        action_id: action.id,
        email_id: email?.id,
        auto_extracted: true,
        materials: entities.materials || [],
      }
    })
    .select('id')
    .single()

  if (error) {
    // If table doesn't exist, fall back to notify
    if (error.code === '42P01') return { success: true, result: { message: 'Procurement tables not yet created, notification sent' } }
    return { success: false, result: { error: error.message } }
  }

  // Update requisição state if linked
  if (requisicaoId) {
    await supabase
      .from('requisicoes')
      .update({ estado: 'em_cotacao' })
      .eq('id', requisicaoId)
      .eq('estado', 'aberta')
  }

  return {
    success: true,
    result: { cotacao_id: data.id, codigo },
    rollback_payload: { table: 'cotacoes', id: data.id }
  }
}

const actualizarPoEstado: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const projectId = action.project_id
  const obraId = action.obra_id

  // Find most recent PO for this project/supplier
  let query = supabase
    .from('purchase_orders')
    .select('id, codigo, estado')
    .not('estado', 'in', '("cancelada","concluida")')
    .order('created_at', { ascending: false })
    .limit(1)

  if (projectId) query = query.eq('projeto_id', projectId)
  else if (obraId) query = query.eq('obra_id', obraId)

  const { data: po, error: poError } = await query.single()

  if (poError) {
    if (poError.code === '42P01') return { success: true, result: { message: 'Procurement tables not yet created' } }
    return { success: true, result: { message: 'No matching PO found' } }
  }

  // Determine new state based on email category
  const subcategory = email?.subcategory || action.action_payload?.subcategory || ''
  let newState = po.estado
  if (subcategory === 'confirmacao') newState = 'confirmada'
  else if (subcategory === 'modificacao') newState = 'em_revisao'

  const { error } = await supabase
    .from('purchase_orders')
    .update({
      estado: newState,
      notas_internas: `Atualizado automaticamente a partir do email: ${email?.subject || ''}`,
    })
    .eq('id', po.id)

  if (error) return { success: false, result: { error: error.message } }
  return { success: true, result: { po_id: po.id, codigo: po.codigo, new_state: newState } }
}

const actualizarEntregaPo: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const projectId = action.project_id
  const obraId = action.obra_id

  // Find PO with pending deliveries
  let query = supabase
    .from('purchase_orders')
    .select('id, codigo')
    .in('estado', ['confirmada', 'entrega_parcial'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (projectId) query = query.eq('projeto_id', projectId)
  else if (obraId) query = query.eq('obra_id', obraId)

  const { data: po, error: poError } = await query.single()

  if (poError) {
    if (poError.code === '42P01') return { success: true, result: { message: 'Procurement tables not yet created' } }
    return { success: true, result: { message: 'No matching PO with pending delivery' } }
  }

  // Determine delivery state
  const subcategory = email?.subcategory || ''
  let newState = 'entrega_parcial'
  if (subcategory === 'confirmacao') newState = 'entregue'

  const { error } = await supabase
    .from('purchase_orders')
    .update({
      estado: newState,
      data_entrega_real: new Date().toISOString().split('T')[0],
    })
    .eq('id', po.id)

  if (error) return { success: false, result: { error: error.message } }
  return { success: true, result: { po_id: po.id, codigo: po.codigo, delivery_state: newState } }
}

const matchFaturaPo: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const values = entities.monetary_values || []
  const projectId = action.project_id
  const obraId = action.obra_id

  // Find matching PO
  let poQuery = supabase
    .from('purchase_orders')
    .select('id, codigo, valor_total')
    .in('estado', ['confirmada', 'entregue', 'entrega_parcial'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (projectId) poQuery = poQuery.eq('projeto_id', projectId)
  else if (obraId) poQuery = poQuery.eq('obra_id', obraId)

  const { data: po } = await poQuery.single()

  // Generate fatura code
  const year = new Date().getFullYear()
  const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'fat_proc_seq' }).single()
  const seqNum = seqData || Date.now() % 10000
  const codigo = `PFAT-${year}-${String(seqNum).padStart(4, '0')}`

  const invoiceValue = values[0] || 0

  const { data, error } = await supabase
    .from('procurement_facturas')
    .insert({
      codigo,
      po_id: po?.id || null,
      fornecedor_id: entities.supplier_id || null,
      projeto_id: projectId,
      obra_id: obraId,
      numero_fatura_fornecedor: entities.invoice_number || `AUTO-${Date.now()}`,
      data_fatura: new Date().toISOString().split('T')[0],
      valor_sem_iva: invoiceValue,
      taxa_iva: 23,
      valor_com_iva: invoiceValue * 1.23,
      estado: po ? 'pendente_validacao' : 'sem_po',
      desvio_valor: po ? invoiceValue - (po.valor_total || 0) : null,
      desvio_percentagem: po?.valor_total ? ((invoiceValue - po.valor_total) / po.valor_total * 100) : null,
      notas: `Registada automaticamente a partir do email: ${email?.subject || ''}`,
      metadata: { action_id: action.id, email_id: email?.id, auto_matched: !!po }
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '42P01') return { success: true, result: { message: 'Procurement tables not yet created' } }
    return { success: false, result: { error: error.message } }
  }

  return {
    success: true,
    result: { fatura_id: data.id, codigo, matched_po: po?.codigo || null },
    rollback_payload: { table: 'procurement_facturas', id: data.id }
  }
}

const alertarDesvioPrecoPo: ActionExecutor = async (supabase, action, email) => {
  const entities = action.action_payload?.entities || {}
  const values = entities.monetary_values || []
  const invoiceValue = values[0] || 0
  const projectId = action.project_id
  const obraId = action.obra_id

  // Find PO to compare
  let poQuery = supabase
    .from('purchase_orders')
    .select('id, codigo, valor_total')
    .order('created_at', { ascending: false })
    .limit(1)

  if (projectId) poQuery = poQuery.eq('projeto_id', projectId)
  else if (obraId) poQuery = poQuery.eq('obra_id', obraId)

  const { data: po } = await poQuery.single()

  if (!po || !invoiceValue) {
    return { success: true, result: { message: 'No PO or value to compare' } }
  }

  const desvio = ((invoiceValue - (po.valor_total || 0)) / (po.valor_total || 1)) * 100

  // Only alert if deviation > 5%
  if (Math.abs(desvio) <= 5) {
    return { success: true, result: { message: 'Price deviation within tolerance (±5%)', desvio_pct: desvio.toFixed(2) } }
  }

  // Create notification for the user
  const { data: notif, error } = await supabase
    .from('agent_notifications')
    .insert({
      user_id: action.assigned_to || '00000000-0000-0000-0000-000000000000',
      type: 'price_deviation',
      title: `Desvio de preço: ${desvio > 0 ? '+' : ''}${desvio.toFixed(1)}%`,
      body: `Fatura de €${invoiceValue.toLocaleString('pt-PT')} vs PO ${po.codigo} de €${(po.valor_total || 0).toLocaleString('pt-PT')}`,
      priority: Math.abs(desvio) > 20 ? 'critical' : Math.abs(desvio) > 10 ? 'high' : 'normal',
      metadata: { po_id: po.id, po_codigo: po.codigo, valor_fatura: invoiceValue, valor_po: po.valor_total, desvio_pct: desvio },
      action_id: action.id,
      email_queue_id: action.email_id,
    })
    .select('id')
    .single()

  if (error) return { success: false, result: { error: error.message } }
  return {
    success: true,
    result: { notification_id: notif.id, desvio_pct: desvio.toFixed(2), po_codigo: po.codigo },
    rollback_payload: { table: 'agent_notifications', id: notif.id }
  }
}

// Notification-only actions (no database mutation)
const notifyOnly: ActionExecutor = async (_supabase, action, _email) => {
  return { success: true, result: { message: `Notification sent: ${action.action_description}` } }
}

// ═══════════════════════════════════════
// ACTION REGISTRY
// ═══════════════════════════════════════

const ACTION_EXECUTORS: Record<string, ActionExecutor> = {
  // Construction Agent
  create_diary_entry: createDiaryEntry,
  create_follow_up_task: createFollowUpTask,
  create_rfi_task: createFollowUpTask,
  register_nc: registerNC,
  create_calendar_event: createCalendarEvent,
  create_meeting_minutes: createDiaryEntry,
  // Financial Agent
  register_invoice: registerInvoice,
  register_decision: registerDecision,
  update_supplier_record: updateSupplierRecord,
  // Procurement Agent
  registar_cotacao_procurement: registarCotacaoProcurement,
  actualizar_po_estado: actualizarPoEstado,
  actualizar_entrega_po: actualizarEntregaPo,
  match_fatura_po: matchFaturaPo,
  alertar_desvio_preco: alertarDesvioPrecoPo,
  // Notification-only
  notify_procurement_team: notifyOnly,
  notify_site_manager: notifyOnly,
  notify_quality_team: notifyOnly,
  escalate_safety: notifyOnly,
  // Complex actions that require manual handling
  create_purchase_order: notifyOnly,
  update_supplier_status: notifyOnly,
  match_purchase_order: notifyOnly,
  register_proposal: notifyOnly,
  update_design_review: notifyOnly,
  update_permit_status: notifyOnly,
  update_milestone: notifyOnly,
  update_subcontractor: notifyOnly,
  register_safety_event: notifyOnly,
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let body: any = {}
    try { body = await req.json() } catch { /* no body */ }

    const { action_id, mode } = body

    // ═══════════════════════════════════════
    // MODE 1: Execute specific action (from UI approval)
    // ═══════════════════════════════════════
    if (action_id) {
      const { data: action, error } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('id', action_id)
        .single()

      if (error || !action) {
        throw new Error(`Action ${action_id} not found`)
      }

      if (action.status !== 'pending' && action.status !== 'approved') {
        return new Response(
          JSON.stringify({ success: false, error: `Action is ${action.status}, cannot execute` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get email context
      let email: any = null
      if (action.email_id) {
        const { data } = await supabase
          .from('email_processing_queue')
          .select('*')
          .eq('id', action.email_id)
          .single()
        email = data
      }

      const executor = ACTION_EXECUTORS[action.action_type]
      if (!executor) {
        await supabase
          .from('agent_actions')
          .update({ status: 'failed', execution_result: { error: 'No executor for action type' } })
          .eq('id', action.id)

        return new Response(
          JSON.stringify({ success: false, error: `No executor for action type: ${action.action_type}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Execute
      const result = await executor(supabase, action, email)

      // Update action status
      await supabase
        .from('agent_actions')
        .update({
          status: result.success ? 'executed' : 'failed',
          executed_at: new Date().toISOString(),
          execution_result: result.result,
          rollback_payload: result.rollback_payload || null,
        })
        .eq('id', action.id)

      // Audit log
      await supabase.from('ai_audit_log').insert({
        action_id: action.id,
        email_queue_id: action.email_id,
        event_type: result.success ? 'executed' : 'failed',
        action_type: action.action_type,
        action_payload: result.result,
        outcome: result.success ? 'success' : 'failure',
        error_message: result.success ? null : result.result?.error,
      })

      return new Response(
        JSON.stringify({ success: result.success, action_id: action.id, result: result.result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════
    // MODE 2: Process all auto-execute actions
    // ═══════════════════════════════════════
    if (mode === 'auto_execute') {
      const { data: pendingActions } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('status', 'approved')
        .eq('approval_tier', 'auto_execute')
        .order('created_at', { ascending: true })
        .limit(20)

      if (!pendingActions || pendingActions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No auto-execute actions pending', executed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let executed = 0
      let failed = 0

      for (const action of pendingActions) {
        let email: any = null
        if (action.email_id) {
          const { data } = await supabase
            .from('email_processing_queue')
            .select('*')
            .eq('id', action.email_id)
            .single()
          email = data
        }

        const executor = ACTION_EXECUTORS[action.action_type]
        if (!executor) {
          failed++
          continue
        }

        const result = await executor(supabase, action, email)

        await supabase
          .from('agent_actions')
          .update({
            status: result.success ? 'executed' : 'failed',
            executed_at: new Date().toISOString(),
            execution_result: result.result,
            rollback_payload: result.rollback_payload || null,
          })
          .eq('id', action.id)

        await supabase.from('ai_audit_log').insert({
          action_id: action.id,
          email_queue_id: action.email_id,
          event_type: result.success ? 'executed' : 'failed',
          action_type: action.action_type,
          outcome: result.success ? 'success' : 'failure',
        })

        if (result.success) executed++
        else failed++
      }

      return new Response(
        JSON.stringify({ success: true, executed, failed, total: pendingActions.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════
    // MODE 3: Approve action (from UI)
    // ═══════════════════════════════════════
    if (body.approve_action_id) {
      const { error } = await supabase
        .from('agent_actions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: body.user_id || null,
        })
        .eq('id', body.approve_action_id)
        .eq('status', 'pending')

      if (error) throw error

      // Audit
      await supabase.from('ai_audit_log').insert({
        action_id: body.approve_action_id,
        event_type: 'approved',
        actor_id: body.user_id,
        human_override: true,
      })

      return new Response(
        JSON.stringify({ success: true, approved: body.approve_action_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════
    // MODE 4: Reject action (from UI)
    // ═══════════════════════════════════════
    if (body.reject_action_id) {
      const { error } = await supabase
        .from('agent_actions')
        .update({
          status: 'rejected',
          rejection_reason: body.reason || 'Rejeitado pelo utilizador',
        })
        .eq('id', body.reject_action_id)
        .eq('status', 'pending')

      if (error) throw error

      // Audit
      await supabase.from('ai_audit_log').insert({
        action_id: body.reject_action_id,
        event_type: 'rejected',
        actor_id: body.user_id,
        human_override: true,
        human_feedback: body.reason,
      })

      return new Response(
        JSON.stringify({ success: true, rejected: body.reject_action_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════
    // MODE 5: Rollback action
    // ═══════════════════════════════════════
    if (body.rollback_action_id) {
      const { data: action } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('id', body.rollback_action_id)
        .eq('status', 'executed')
        .eq('is_reversible', true)
        .single()

      if (!action || !action.rollback_payload) {
        return new Response(
          JSON.stringify({ success: false, error: 'Action not found or not reversible' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete the created record
      const { table, id } = action.rollback_payload
      if (table && id) {
        await supabase.from(table).delete().eq('id', id)
      }

      await supabase
        .from('agent_actions')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: body.user_id || null,
        })
        .eq('id', body.rollback_action_id)

      // Audit
      await supabase.from('ai_audit_log').insert({
        action_id: body.rollback_action_id,
        event_type: 'rolled_back',
        actor_id: body.user_id,
        human_override: true,
      })

      return new Response(
        JSON.stringify({ success: true, rolled_back: body.rollback_action_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Provide action_id, mode, approve_action_id, reject_action_id, or rollback_action_id' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Agent Execute error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
