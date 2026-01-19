// Supabase Edge Function para gestão de canais Twilio Conversations
// Deploy: supabase functions deploy twilio-conversations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateConversationRequest {
  obra_id: string
  canal_nome: string
  canal_tipo: string
  participantes?: Array<{ telefone: string; nome: string }>
}

interface AddParticipantRequest {
  conversation_sid: string
  canal_id: string
  telefone: string
  nome: string
}

interface SendToConversationRequest {
  conversation_sid: string
  canal_id: string
  body: string
  autor_nome?: string
  mediaUrl?: string
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

    // Obter configuração do Twilio
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('ativo', true)
      .single()

    if (configError || !config) {
      throw new Error('Configuração WhatsApp não encontrada')
    }

    const twilioAuth = btoa(`${config.twilio_account_sid}:${config.twilio_auth_token_encrypted}`)
    const twilioBaseUrl = `https://conversations.twilio.com/v1`

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // CRIAR CONVERSATION (CANAL)
    if (action === 'create' && req.method === 'POST') {
      const { obra_id, canal_nome, canal_tipo, participantes }: CreateConversationRequest = await req.json()

      if (!obra_id || !canal_nome || !canal_tipo) {
        throw new Error('Parâmetros obra_id, canal_nome e canal_tipo são obrigatórios')
      }

      // Obter dados da obra para o friendly name
      const { data: obra } = await supabase
        .from('obras')
        .select('codigo, codigo_canonico, nome')
        .eq('id', obra_id)
        .single()

      const friendlyName = `${obra?.codigo_canonico || obra?.codigo || obra_id} - ${canal_nome}`

      // Criar Conversation no Twilio
      const createResponse = await fetch(`${twilioBaseUrl}/Conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          FriendlyName: friendlyName,
          UniqueName: `obra_${obra_id}_${canal_tipo}_${Date.now()}`,
        }),
      })

      const conversationData = await createResponse.json()

      if (!createResponse.ok) {
        console.error('Erro ao criar Conversation:', conversationData)
        throw new Error(conversationData.message || 'Erro ao criar canal Twilio')
      }

      // Guardar canal na base de dados
      const { data: canal, error: canalError } = await supabase
        .from('obra_canais')
        .insert({
          obra_id,
          nome: canal_nome,
          tipo: canal_tipo,
          twilio_conversation_sid: conversationData.sid,
          twilio_friendly_name: friendlyName,
          ativo: true,
        })
        .select()
        .single()

      if (canalError) {
        console.error('Erro ao guardar canal:', canalError)
        throw new Error('Erro ao guardar canal na base de dados')
      }

      // Adicionar participantes se fornecidos
      if (participantes && participantes.length > 0) {
        for (const p of participantes) {
          try {
            await fetch(`${twilioBaseUrl}/Conversations/${conversationData.sid}/Participants`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${twilioAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                'MessagingBinding.Address': `whatsapp:${p.telefone.startsWith('+') ? p.telefone : '+' + p.telefone}`,
                'MessagingBinding.ProxyAddress': `whatsapp:${config.twilio_phone_number}`,
              }),
            })

            // Guardar participante na base de dados
            await supabase
              .from('obra_canal_participantes')
              .insert({
                canal_id: canal.id,
                telefone: p.telefone,
                nome: p.nome,
                papel: 'participante',
              })
          } catch (err) {
            console.error(`Erro ao adicionar participante ${p.telefone}:`, err)
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          conversation_sid: conversationData.sid,
          canal,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ADICIONAR PARTICIPANTE
    if (action === 'add-participant' && req.method === 'POST') {
      const { conversation_sid, canal_id, telefone, nome }: AddParticipantRequest = await req.json()

      if (!conversation_sid || !telefone) {
        throw new Error('Parâmetros conversation_sid e telefone são obrigatórios')
      }

      const addResponse = await fetch(`${twilioBaseUrl}/Conversations/${conversation_sid}/Participants`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'MessagingBinding.Address': `whatsapp:${telefone.startsWith('+') ? telefone : '+' + telefone}`,
          'MessagingBinding.ProxyAddress': `whatsapp:${config.twilio_phone_number}`,
        }),
      })

      const participantData = await addResponse.json()

      if (!addResponse.ok) {
        console.error('Erro ao adicionar participante:', participantData)
        throw new Error(participantData.message || 'Erro ao adicionar participante')
      }

      // Guardar na base de dados
      if (canal_id) {
        await supabase
          .from('obra_canal_participantes')
          .insert({
            canal_id,
            telefone,
            nome: nome || telefone,
            papel: 'participante',
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          participant_sid: participantData.sid,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ENVIAR MENSAGEM PARA CONVERSATION
    if (action === 'send' && req.method === 'POST') {
      const { conversation_sid, canal_id, body, autor_nome, mediaUrl }: SendToConversationRequest = await req.json()

      if (!conversation_sid || !body) {
        throw new Error('Parâmetros conversation_sid e body são obrigatórios')
      }

      const formData = new URLSearchParams()
      formData.append('Body', body)
      formData.append('Author', autor_nome || 'Gavinho')
      if (mediaUrl) {
        formData.append('MediaUrl', mediaUrl)
      }

      const sendResponse = await fetch(`${twilioBaseUrl}/Conversations/${conversation_sid}/Messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      const messageData = await sendResponse.json()

      if (!sendResponse.ok) {
        console.error('Erro ao enviar mensagem:', messageData)
        throw new Error(messageData.message || 'Erro ao enviar mensagem')
      }

      // Buscar obra_id do canal
      let obra_id = null
      if (canal_id) {
        const { data: canal } = await supabase
          .from('obra_canais')
          .select('obra_id')
          .eq('id', canal_id)
          .single()
        obra_id = canal?.obra_id
      }

      // Guardar mensagem na base de dados
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          twilio_sid: messageData.sid,
          telefone_origem: config.twilio_phone_number,
          telefone_destino: 'conversation',
          conteudo: body,
          tipo: 'enviada',
          obra_id,
          canal_id,
          autor_nome: autor_nome || 'Gavinho',
          anexos: mediaUrl ? [{ url: mediaUrl, tipo: 'media' }] : null,
          lida: true,
          processada_ia: true,
        })
        .select()
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          message_sid: messageData.sid,
          mensagem,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // LISTAR CANAIS DE UMA OBRA
    if (action === 'list' && req.method === 'GET') {
      const obra_id = url.searchParams.get('obra_id')

      if (!obra_id) {
        throw new Error('Parâmetro obra_id é obrigatório')
      }

      const { data: canais, error } = await supabase
        .from('obra_canais')
        .select(`
          *,
          participantes:obra_canal_participantes(*)
        `)
        .eq('obra_id', obra_id)
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, canais }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CRIAR CANAIS PADRÃO PARA OBRA
    if (action === 'create-defaults' && req.method === 'POST') {
      const { obra_id } = await req.json()

      if (!obra_id) {
        throw new Error('Parâmetro obra_id é obrigatório')
      }

      // Chamar função SQL para criar canais padrão
      const { error } = await supabase.rpc('criar_canais_padrao_obra', { p_obra_id: obra_id })

      if (error) throw error

      // Buscar canais criados
      const { data: canais } = await supabase
        .from('obra_canais')
        .select('*')
        .eq('obra_id', obra_id)
        .order('ordem', { ascending: true })

      return new Response(
        JSON.stringify({ success: true, canais }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Ação "${action}" não reconhecida`)

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
