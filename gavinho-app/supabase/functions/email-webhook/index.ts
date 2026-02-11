// Supabase Edge Function para receber emails via webhook
// Este webhook pode ser integrado com serviços como SendGrid, Mailgun, AWS SES
// Deploy: supabase functions deploy email-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para email recebido (formato compatível com SendGrid Inbound Parse)
interface InboundEmail {
  from: string
  to: string
  cc?: string
  subject: string
  text?: string
  html?: string
  headers?: string
  envelope?: string
  attachments?: number
  'attachment-info'?: string
  charsets?: string
  SPF?: string
  dkim?: string
}

// Função para extrair nome e email de um endereço
function parseEmailAddress(address: string): { email: string; nome: string } {
  const match = address.match(/^(.+?)\s*<(.+?)>$/)
  if (match) {
    return { nome: match[1].trim().replace(/"/g, ''), email: match[2].trim() }
  }
  return { email: address.trim(), nome: address.trim().split('@')[0] }
}

// Função para extrair código da obra do assunto e/ou corpo
function extrairCodigoObra(assunto: string, corpo?: string): string | null {
  const text = `${assunto} ${corpo || ''}`
  // Padrões: GA00402, GB00402, OB00123, OBR-00402
  const gaMatch = text.match(/(GA|GB|OB)\d{5}/i)
  if (gaMatch) return gaMatch[0].toUpperCase()

  const obrMatch = text.match(/OBR-\d{5}/i)
  if (obrMatch) return obrMatch[0].toUpperCase()

  return null
}

// Função para gerar código canónico
function gerarCodigoCanonico(codigo: string): string {
  const numero = codigo.replace(/^[A-Za-z-]+/, '')
  return `OBR-${numero}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let emailData: InboundEmail

    // Suportar diferentes Content-Types
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // JSON payload (para testes ou integrações custom)
      emailData = await req.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Form data (SendGrid Inbound Parse)
      const formData = await req.formData()
      emailData = {
        from: formData.get('from') as string || '',
        to: formData.get('to') as string || '',
        cc: formData.get('cc') as string || undefined,
        subject: formData.get('subject') as string || '',
        text: formData.get('text') as string || undefined,
        html: formData.get('html') as string || undefined,
        headers: formData.get('headers') as string || undefined,
        envelope: formData.get('envelope') as string || undefined,
        attachments: parseInt(formData.get('attachments') as string || '0'),
        'attachment-info': formData.get('attachment-info') as string || undefined,
      }
    } else {
      throw new Error('Content-Type não suportado')
    }

    console.log('Email recebido:', emailData.subject, 'de', emailData.from)

    // Parse endereços
    const remetente = parseEmailAddress(emailData.from)
    const destinatarios = emailData.to.split(',').map(parseEmailAddress)
    const cc = emailData.cc ? emailData.cc.split(',').map(parseEmailAddress) : null

    // Extrair código da obra (procura no assunto E no corpo)
    const codigoDetectado = extrairCodigoObra(emailData.subject, emailData.text)

    // Procurar obra/projeto correspondente
    let obra_id: string | null = null
    let projeto_id: string | null = null
    if (codigoDetectado) {
      if (codigoDetectado.startsWith('GA')) {
        // GA codes -> projetos table
        const { data: projeto } = await supabase
          .from('projetos')
          .select('id')
          .eq('codigo', codigoDetectado)
          .single()

        if (projeto) {
          projeto_id = projeto.id
        }
      } else {
        // GB, OB, OBR codes -> obras table
        const codigoCanonico = gerarCodigoCanonico(codigoDetectado)

        const { data: obra } = await supabase
          .from('obras')
          .select('id')
          .or(`codigo.eq.${codigoDetectado},codigo_canonico.eq.${codigoCanonico}`)
          .single()

        if (obra) {
          obra_id = obra.id
        }
      }
    }

    // Gerar Message-ID único se não vier nos headers
    const messageId = emailData.headers?.match(/Message-ID:\s*<([^>]+)>/i)?.[1]
      || `${Date.now()}-${Math.random().toString(36).substring(7)}@gavinhogroup.com`

    // Processar anexos (se houver)
    let anexos = null
    if (emailData.attachments && emailData.attachments > 0 && emailData['attachment-info']) {
      try {
        const attachmentInfo = JSON.parse(emailData['attachment-info'])
        anexos = Object.entries(attachmentInfo).map(([key, info]: [string, any]) => ({
          nome: info.filename || key,
          tipo: info.type || info['content-type'] || 'application/octet-stream',
          tamanho: info.size || 0,
          // URL seria preenchida após upload para storage
          url_storage: null,
        }))
      } catch (e) {
        console.error('Erro ao processar anexos:', e)
      }
    }

    // Detectar thread (In-Reply-To header)
    const inReplyTo = emailData.headers?.match(/In-Reply-To:\s*<([^>]+)>/i)?.[1] || null

    // Se é resposta, encontrar thread existente
    let thread_id = null
    if (inReplyTo) {
      const { data: emailOriginal } = await supabase
        .from('obra_emails')
        .select('thread_id, id')
        .eq('message_id', inReplyTo)
        .single()

      if (emailOriginal) {
        thread_id = emailOriginal.thread_id || emailOriginal.id
      }
    }

    // Guardar email na base de dados
    const { data: emailSalvo, error: insertError } = await supabase
      .from('obra_emails')
      .insert({
        message_id: messageId,
        obra_id,
        projeto_id,
        assunto: emailData.subject,
        de_email: remetente.email,
        de_nome: remetente.nome,
        para_emails: destinatarios,
        cc_emails: cc,
        corpo_texto: emailData.text,
        corpo_html: emailData.html,
        anexos,
        tipo: 'recebido',
        codigo_obra_detectado: codigoDetectado,
        classificacao_automatica: !!(obra_id || projeto_id),
        in_reply_to: inReplyTo,
        thread_id,
        data_envio: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      // Verificar se é duplicado (message_id já existe)
      if (insertError.code === '23505') {
        console.log('Email duplicado ignorado:', messageId)
        return new Response(
          JSON.stringify({ success: true, message: 'Email já processado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw insertError
    }

    // Se email não tem thread_id, usar o próprio id como thread_id
    if (!thread_id && emailSalvo) {
      await supabase
        .from('obra_emails')
        .update({ thread_id: emailSalvo.id })
        .eq('id', emailSalvo.id)
    }

    console.log('Email guardado:', emailSalvo?.id, 'Obra:', obra_id, 'Projeto:', projeto_id)

    // Se obra/projeto não foram encontrados, tentar notificar para classificação manual
    if (!obra_id && !projeto_id && emailSalvo) {
      console.log('Email sem obra associada - requer classificação manual')
      // Aqui pode-se adicionar notificação ou criar entrada numa fila de classificação
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailSalvo?.id,
        obra_id,
        projeto_id,
        codigo_detectado: codigoDetectado,
        classificado_automaticamente: !!(obra_id || projeto_id),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao processar email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
