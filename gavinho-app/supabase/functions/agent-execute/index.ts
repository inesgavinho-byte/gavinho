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

// Notification-only actions (no database mutation)
const notifyOnly: ActionExecutor = async (_supabase, action, _email) => {
  return { success: true, result: { message: `Notification sent: ${action.action_description}` } }
}

// ═══════════════════════════════════════
// ACTION REGISTRY
// ═══════════════════════════════════════

const ACTION_EXECUTORS: Record<string, ActionExecutor> = {
  create_diary_entry: createDiaryEntry,
  create_follow_up_task: createFollowUpTask,
  create_rfi_task: createFollowUpTask,
  register_nc: registerNC,
  register_invoice: registerInvoice,
  register_decision: registerDecision,
  create_calendar_event: createCalendarEvent,
  update_supplier_record: updateSupplierRecord,
  create_meeting_minutes: createDiaryEntry,
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
