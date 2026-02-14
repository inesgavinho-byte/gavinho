// Supabase Edge Function para receber webhooks do Telegram
// Deploy: supabase functions deploy telegram-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    first_name: string
    last_name?: string
    username?: string
  }
  chat: {
    id: number
    title?: string
    type: 'private' | 'group' | 'supergroup' | 'channel'
  }
  date: number
  text?: string
  photo?: Array<{
    file_id: string
    file_unique_id: string
    width: number
    height: number
  }>
  document?: {
    file_id: string
    file_name: string
    mime_type: string
  }
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const update: TelegramUpdate = await req.json()


    // Ignorar updates sem mensagem
    if (!update.message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const message = update.message

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Identificar o autor
    const autorNome = [message.from.first_name, message.from.last_name]
      .filter(Boolean)
      .join(' ')
    const autorUsername = message.from.username || null
    const chatId = message.chat.id.toString()
    const chatTitle = message.chat.title || 'Chat Privado'
    const chatType = message.chat.type


    // Procurar grupo/chat associado a uma obra
    const { data: grupoConfig } = await supabase
      .from('telegram_grupos')
      .select('id, obra_id, obras(codigo, nome)')
      .eq('chat_id', chatId)
      .eq('ativo', true)
      .single()

    // Se não encontrou grupo configurado, verificar se é comando /start ou /registar
    if (!grupoConfig) {
      if (message.text?.startsWith('/start') || message.text?.startsWith('/registar')) {
        // Não responder automaticamente para evitar spam
        // O admin pode registar o grupo manualmente na plataforma
      }

      // Guardar mensagem mesmo sem obra associada (para posterior associação)
      const { error: insertError } = await supabase
        .from('telegram_mensagens')
        .insert({
          telegram_message_id: message.message_id,
          chat_id: chatId,
          chat_title: chatTitle,
          chat_type: chatType,
          autor_telegram_id: message.from.id.toString(),
          autor_nome: autorNome,
          autor_username: autorUsername,
          conteudo: message.text || null,
          tipo: 'recebida',
          obra_id: null, // Sem obra associada ainda
          processada_ia: false,
          created_at: new Date(message.date * 1000).toISOString(),
        })

      if (insertError) {
        console.error('Erro ao guardar mensagem:', insertError)
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Procurar contacto existente
    const { data: contacto } = await supabase
      .from('telegram_contactos')
      .select('id, nome')
      .eq('telegram_id', message.from.id.toString())
      .single()

    // Se não existe contacto, criar automaticamente
    let contactoId = contacto?.id
    if (!contacto) {
      const { data: novoContacto, error: contactoError } = await supabase
        .from('telegram_contactos')
        .insert({
          telegram_id: message.from.id.toString(),
          username: autorUsername,
          nome: autorNome,
          obra_id: grupoConfig.obra_id,
          ativo: true,
        })
        .select()
        .single()

      if (!contactoError && novoContacto) {
        contactoId = novoContacto.id
      }
    }

    // Processar anexos (fotos, documentos)
    const anexos = []
    if (message.photo && message.photo.length > 0) {
      // Pegar a maior resolução
      const largestPhoto = message.photo[message.photo.length - 1]
      anexos.push({
        tipo: 'photo',
        file_id: largestPhoto.file_id,
      })
    }
    if (message.document) {
      anexos.push({
        tipo: 'document',
        file_id: message.document.file_id,
        file_name: message.document.file_name,
        mime_type: message.document.mime_type,
      })
    }

    // Guardar mensagem na base de dados
    const { data: mensagem, error: insertError } = await supabase
      .from('telegram_mensagens')
      .insert({
        telegram_message_id: message.message_id,
        chat_id: chatId,
        chat_title: chatTitle,
        chat_type: chatType,
        autor_telegram_id: message.from.id.toString(),
        autor_nome: autorNome,
        autor_username: autorUsername,
        conteudo: message.text || null,
        tipo: 'recebida',
        contacto_id: contactoId || null,
        obra_id: grupoConfig.obra_id,
        anexos: anexos.length > 0 ? anexos : null,
        processada_ia: false,
        created_at: new Date(message.date * 1000).toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao guardar mensagem:', insertError)
      throw insertError
    }


    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro no webhook Telegram:', error)

    // Retornar 200 mesmo com erro para não bloquear o Telegram
    return new Response(JSON.stringify({ ok: true, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
