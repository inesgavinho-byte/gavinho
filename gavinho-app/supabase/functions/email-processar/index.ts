import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

// =====================================================
// GAVINHO Platform - Email Processor
// =====================================================
// Processa emails e cria:
// 1. Entrada no Diário do Projeto
// 2. Tarefa de follow-up (se necessário)
// 3. Decisões detectadas (se aplicável)
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuração de prazos por tipo de email (em dias)
const PRAZOS_CONFIG: Record<string, number> = {
  'pedido_informacao': 2,      // 48h para responder pedido de info
  'pedido_orcamento': 5,       // 5 dias para orçamento
  'questao_cliente': 1,        // 24h para responder cliente
  'aguarda_aprovacao': 7,      // 7 dias para follow-up de aprovação
  'pedido_desenhos': 3,        // 3 dias para enviar desenhos
  'pedido_reuniao': 2,         // 2 dias para agendar reunião
  'reclamacao': 1,             // 24h para tratar reclamação
  'entrega_material': 0,       // Apenas registar
  'confirmacao': 0,            // Apenas registar
  'informativo': 0,            // Apenas registar
  'decisao': 0,                // Registar + criar decisão
}

// Prioridades por tipo
const PRIORIDADES_CONFIG: Record<string, string> = {
  'pedido_informacao': 'media',
  'pedido_orcamento': 'media',
  'questao_cliente': 'alta',
  'aguarda_aprovacao': 'media',
  'pedido_desenhos': 'alta',
  'pedido_reuniao': 'media',
  'reclamacao': 'urgente',
  'entrega_material': 'baixa',
  'confirmacao': 'baixa',
  'informativo': 'baixa',
  'decisao': 'alta',
}

interface EmailData {
  id: string
  assunto: string
  corpo_texto: string
  corpo_html?: string
  de_email: string
  de_nome?: string
  para_emails?: any[]
  data_recebido: string
  projeto_id?: string
  obra_id?: string
  tipo?: string // 'recebido' | 'enviado'
}

interface ClassificacaoResult {
  tipo_email: string
  resumo: string
  acao_requerida: boolean
  titulo_tarefa?: string
  descricao_tarefa?: string
  prioridade_sugerida?: string
  decisoes?: Array<{
    titulo: string
    descricao: string
    categoria: string
    tipo: string
    decidido_por_tipo: string
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    // Parse request body
    const body = await req.json()
    const { email_id, email }: { email_id?: string, email?: EmailData } = body

    // Obter dados do email
    let emailData: EmailData

    if (email_id) {
      // Buscar email da base de dados
      const { data, error } = await supabase
        .from('obra_emails')
        .select('*')
        .eq('id', email_id)
        .single()

      if (error || !data) {
        throw new Error(`Email não encontrado: ${email_id}`)
      }

      emailData = {
        id: data.id,
        assunto: data.assunto,
        corpo_texto: data.corpo_texto || '',
        corpo_html: data.corpo_html,
        de_email: data.de_email,
        de_nome: data.de_nome,
        para_emails: data.para_emails,
        data_recebido: data.data_recebido,
        projeto_id: data.projeto_id,
        obra_id: data.obra_id,
        tipo: data.tipo
      }
    } else if (email) {
      emailData = email
    } else {
      throw new Error('Forneça email_id ou email')
    }

    // Verificar se tem projeto/obra associado
    const projetoId = emailData.projeto_id || emailData.obra_id
    if (!projetoId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email não está associado a nenhum projeto ou obra'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preparar conteúdo para análise
    const conteudo = `
De: ${emailData.de_nome || emailData.de_email} <${emailData.de_email}>
Data: ${emailData.data_recebido}
Assunto: ${emailData.assunto}

${emailData.corpo_texto || emailData.corpo_html?.replace(/<[^>]*>/g, '') || ''}
`.trim()

    // =====================================================
    // CLASSIFICAÇÃO COM IA
    // =====================================================
    const classificacaoPrompt = `Analisa este email de um projeto de arquitetura/construção e classifica-o.

EMAIL:
${conteudo}

TIPOS DE EMAIL POSSÍVEIS:
- pedido_informacao: Cliente ou fornecedor pede informação técnica
- pedido_orcamento: Pedido de orçamento ou proposta de preço
- questao_cliente: Pergunta direta do cliente que precisa resposta
- aguarda_aprovacao: Email que aguarda aprovação/confirmação de alguém
- pedido_desenhos: Pedido de desenhos, plantas ou documentos técnicos
- pedido_reuniao: Pedido para agendar reunião
- reclamacao: Reclamação ou queixa
- entrega_material: Notificação de entrega ou expedição
- confirmacao: Confirmação de algo (sem ação necessária)
- informativo: Email apenas informativo (sem ação necessária)
- decisao: Email que CONFIRMA uma decisão final tomada

RESPONDE EM JSON com esta estrutura:
{
  "tipo_email": "um dos tipos acima",
  "resumo": "resumo de 1-2 frases do email",
  "acao_requerida": true/false,
  "titulo_tarefa": "se acao_requerida=true, título curto para a tarefa de follow-up",
  "descricao_tarefa": "se acao_requerida=true, descrição da ação necessária",
  "prioridade_sugerida": "baixa/media/alta/urgente",
  "decisoes": [
    {
      "titulo": "se tipo=decisao, título da decisão",
      "descricao": "descrição completa da decisão",
      "categoria": "cliente/tecnica/financeira/planeamento",
      "tipo": "design/material/acabamento/equipamento/alteracao",
      "decidido_por_tipo": "cliente/equipa/fornecedor"
    }
  ]
}

Se não houver decisões, retorna "decisoes": []
Se não for necessária ação, retorna "acao_requerida": false e omite titulo_tarefa e descricao_tarefa.

IMPORTANTE: Analisa com cuidado. Pedidos de informação ou orçamento NÃO são decisões.
Só é decisão quando há CONFIRMAÇÃO FINAL de uma escolha.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: classificacaoPrompt }
      ]
    })

    // Extrair JSON da resposta
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    let classificacao: ClassificacaoResult

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta')
      }
      classificacao = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Erro ao fazer parse da classificação:', parseError)
      throw new Error('Falha ao classificar email')
    }

    // =====================================================
    // 1. CRIAR ENTRADA NO DIÁRIO DO PROJETO
    // =====================================================

    // Buscar categoria "Email" do diário
    const { data: categoriaEmail } = await supabase
      .from('diario_categorias')
      .select('id')
      .eq('nome', 'Email')
      .single()

    const diarioEntry = {
      projeto_id: projetoId,
      categoria_id: categoriaEmail?.id || null,
      titulo: emailData.assunto,
      descricao: classificacao.resumo,
      tipo: 'email',
      fonte: 'outlook',
      email_de: emailData.de_email,
      email_para: emailData.para_emails?.map((p: any) => p.email || p).join(', ') || '',
      email_assunto: emailData.assunto,
      email_message_id: emailData.id,
      data_evento: emailData.data_recebido,
      metadata: {
        tipo_classificado: classificacao.tipo_email,
        acao_requerida: classificacao.acao_requerida,
        de_nome: emailData.de_nome
      }
    }

    const { data: diarioCreated, error: diarioError } = await supabase
      .from('projeto_diario')
      .insert(diarioEntry)
      .select('id')
      .single()

    if (diarioError) {
      console.error('Erro ao criar entrada no diário:', diarioError)
      // Continuar mesmo se falhar o diário
    }

    // =====================================================
    // 2. CRIAR TAREFA (SE NECESSÁRIO)
    // =====================================================

    let tarefaCriada = null
    const prazo = PRAZOS_CONFIG[classificacao.tipo_email] || 0

    if (classificacao.acao_requerida && prazo > 0) {
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() + prazo)

      const tarefaEntry = {
        projeto_id: projetoId,
        titulo: classificacao.titulo_tarefa || `Follow-up: ${emailData.assunto}`,
        descricao: classificacao.descricao_tarefa || classificacao.resumo,
        categoria: `email_${classificacao.tipo_email}`,
        prioridade: classificacao.prioridade_sugerida || PRIORIDADES_CONFIG[classificacao.tipo_email] || 'media',
        status: 'pendente',
        data_limite: dataLimite.toISOString().split('T')[0],
        origem_tipo: 'email',
        origem_id: emailData.id,
        email_id: emailData.id,
        email_assunto: emailData.assunto,
        email_de: emailData.de_email,
        metadata: {
          tipo_email: classificacao.tipo_email,
          prazo_dias: prazo
        }
      }

      const { data: tarefaData, error: tarefaError } = await supabase
        .from('tarefas')
        .insert(tarefaEntry)
        .select('id, titulo, data_limite')
        .single()

      if (tarefaError) {
        console.error('Erro ao criar tarefa:', tarefaError)
      } else {
        tarefaCriada = tarefaData
      }
    }

    // =====================================================
    // 3. CRIAR DECISÕES (SE DETECTADAS)
    // =====================================================

    let decisoesCriadas = 0

    if (classificacao.tipo_email === 'decisao' && classificacao.decisoes && classificacao.decisoes.length > 0) {
      for (const dec of classificacao.decisoes) {
        // Validar categoria
        const categoriasValidas = ['cliente', 'tecnica', 'financeira', 'planeamento']
        let categoria = dec.categoria?.toLowerCase() || 'cliente'
        if (!categoriasValidas.includes(categoria)) {
          categoria = 'cliente'
        }

        const decisaoEntry = {
          projeto_id: projetoId,
          titulo: dec.titulo,
          descricao: dec.descricao,
          categoria,
          tipo: dec.tipo || 'design',
          decidido_por_tipo: dec.decidido_por_tipo || 'cliente',
          fonte: 'email',
          estado: 'sugerida',
          metadata: {
            email_id: emailData.id,
            email_assunto: emailData.assunto,
            email_de: emailData.de_email,
            data_email: emailData.data_recebido
          }
        }

        const { error: decisaoError } = await supabase
          .from('decisoes')
          .insert(decisaoEntry)

        if (!decisaoError) {
          decisoesCriadas++
        } else {
          console.error('Erro ao criar decisão:', decisaoError)
        }
      }
    }

    // =====================================================
    // 4. MARCAR EMAIL COMO PROCESSADO
    // =====================================================

    if (emailData.id) {
      await supabase
        .from('obra_emails')
        .update({
          processado_ia: true,
          classificacao_ia: classificacao.tipo_email
        })
        .eq('id', emailData.id)
    }

    // =====================================================
    // RESPOSTA
    // =====================================================

    return new Response(
      JSON.stringify({
        success: true,
        classificacao: {
          tipo: classificacao.tipo_email,
          resumo: classificacao.resumo,
          acao_requerida: classificacao.acao_requerida
        },
        diario: diarioCreated ? {
          id: diarioCreated.id,
          criado: true
        } : { criado: false },
        tarefa: tarefaCriada ? {
          id: tarefaCriada.id,
          titulo: tarefaCriada.titulo,
          data_limite: tarefaCriada.data_limite,
          criada: true
        } : { criada: false },
        decisoes: {
          detectadas: classificacao.decisoes?.length || 0,
          criadas: decisoesCriadas
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro no email-processar:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
