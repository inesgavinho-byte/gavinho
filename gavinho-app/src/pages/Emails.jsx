import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Mail, Inbox, Send, Archive, Star, StarOff, Search, Filter,
  RefreshCw, MoreHorizontal, Paperclip, Clock, ChevronRight,
  ChevronDown, X, Check, Loader2, AlertCircle, Building,
  Reply, Forward, Trash2, Eye, EyeOff, Tag, Sparkles,
  Bot, Copy, Edit3, Send as SendIcon, Plus, ArrowLeft
} from 'lucide-react'

// Configuração de urgência
const URGENCIA_CONFIG = {
  urgente: { color: '#EF4444', label: 'Urgente', bg: '#FEE2E2' },
  alta: { color: '#F59E0B', label: 'Alta', bg: '#FEF3C7' },
  normal: { color: '#3B82F6', label: 'Normal', bg: '#DBEAFE' },
  baixa: { color: '#6B7280', label: 'Baixa', bg: '#F3F4F6' }
}

// Configuração de tipos
const TIPO_CONFIG = {
  recebido: { icon: Inbox, color: '#3B82F6', label: 'Recebido' },
  enviado: { icon: Send, color: '#10B981', label: 'Enviado' }
}

export default function Emails() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Estados principais
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Email selecionado
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [emailThread, setEmailThread] = useState([])

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') || 'todos')
  const [filtroObra, setFiltroObra] = useState(searchParams.get('obra') || 'todos')
  const [filtroUrgencia, setFiltroUrgencia] = useState(searchParams.get('urgencia') || 'todos')
  const [filtroLido, setFiltroLido] = useState(searchParams.get('lido') || 'todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Obras para filtro
  const [obras, setObras] = useState([])

  // Compose/Reply
  const [showCompose, setShowCompose] = useState(false)
  const [composeMode, setComposeMode] = useState('new') // new, reply, forward
  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeObraId, setComposeObraId] = useState('')
  const [sending, setSending] = useState(false)
  const [replyToEmail, setReplyToEmail] = useState(null)

  // AI Suggestion
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  // Detectar Decisões
  const [detectando, setDetectando] = useState(false)
  const [detectResult, setDetectResult] = useState(null)

  // Seed de dados de teste
  const [seeding, setSeeding] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, naoLidos: 0, urgentes: 0 })

  // Mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadEmails()
    loadObras()
  }, [])

  useEffect(() => {
    loadEmails()
  }, [filtroTipo, filtroObra, filtroUrgencia, filtroLido, searchTerm])

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams()
    if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    if (filtroObra !== 'todos') params.set('obra', filtroObra)
    if (filtroUrgencia !== 'todos') params.set('urgencia', filtroUrgencia)
    if (filtroLido !== 'todos') params.set('lido', filtroLido)
    setSearchParams(params)
  }, [filtroTipo, filtroObra, filtroUrgencia, filtroLido])

  const loadEmails = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('obra_emails')
        .select(`
          *,
          obras:obra_id (id, codigo, nome)
        `)
        .order('data_recebido', { ascending: false })
        .limit(100)

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }

      if (filtroObra !== 'todos') {
        query = query.eq('obra_id', filtroObra)
      }

      if (filtroLido === 'nao_lidos') {
        query = query.eq('lido', false)
      } else if (filtroLido === 'lidos') {
        query = query.eq('lido', true)
      }

      if (searchTerm) {
        query = query.or(`assunto.ilike.%${searchTerm}%,de_email.ilike.%${searchTerm}%,corpo_texto.ilike.%${searchTerm}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Classificar urgência se não tiver
      const emailsWithUrgency = await Promise.all((data || []).map(async (email) => {
        if (!email.urgencia && email.tipo === 'recebido' && !email.processado_ia) {
          // Classificar com IA em background
          classifyEmailUrgency(email.id, email.assunto, email.corpo_texto)
        }
        return {
          ...email,
          urgencia: email.urgencia || 'normal'
        }
      }))

      // Filtrar por urgência se necessário
      let filteredEmails = emailsWithUrgency
      if (filtroUrgencia !== 'todos') {
        filteredEmails = emailsWithUrgency.filter(e => e.urgencia === filtroUrgencia)
      }

      setEmails(filteredEmails)

      // Calcular stats
      const naoLidos = (data || []).filter(e => !e.lido).length
      const urgentes = (data || []).filter(e => e.urgencia === 'urgente' || e.urgencia === 'alta').length
      setStats({ total: data?.length || 0, naoLidos, urgentes })

    } catch (err) {
      console.error('Erro ao carregar emails:', err)
      setError('Erro ao carregar emails')
    } finally {
      setLoading(false)
    }
  }

  const loadObras = async () => {
    try {
      // Carregar tanto projetos como obras
      const [projetosRes, obrasRes] = await Promise.all([
        supabase
          .from('projetos')
          .select('id, codigo, nome')
          .eq('arquivado', false)
          .order('codigo', { ascending: false }),
        supabase
          .from('obras')
          .select('id, codigo, nome')
          .in('estado', ['em_curso', 'planeamento'])
          .order('codigo', { ascending: false })
      ])

      // Combinar projetos e obras numa lista
      const projetos = (projetosRes.data || []).map(p => ({
        ...p,
        tipo: 'projeto',
        label: `${p.codigo} - ${p.nome}`
      }))

      const obras = (obrasRes.data || []).map(o => ({
        ...o,
        tipo: 'obra',
        label: `${o.codigo} - ${o.nome}`
      }))

      setObras([...projetos, ...obras])
    } catch (err) {
      console.error('Erro ao carregar projetos/obras:', err)
    }
  }

  const classifyEmailUrgency = async (emailId, assunto, corpo) => {
    try {
      const { data, error } = await supabase.functions.invoke('email-classify', {
        body: { email_id: emailId, assunto, corpo }
      })

      if (!error && data?.urgencia) {
        // Atualizar email na lista
        setEmails(prev => prev.map(e =>
          e.id === emailId ? { ...e, urgencia: data.urgencia } : e
        ))
      }
    } catch (err) {
      console.error('Erro ao classificar email:', err)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)

    // Tentar sincronizar com Outlook
    try {
      await supabase.functions.invoke('outlook-sync')
    } catch (err) {
      console.error('Erro no sync Outlook:', err)
    }

    await loadEmails()
    setRefreshing(false)
  }

  const handleSelectEmail = async (email) => {
    setSelectedEmail(email)

    // Marcar como lido
    if (!email.lido) {
      await supabase
        .from('obra_emails')
        .update({ lido: true })
        .eq('id', email.id)

      setEmails(prev => prev.map(e =>
        e.id === email.id ? { ...e, lido: true } : e
      ))
    }

    // Carregar thread se existir
    if (email.thread_id) {
      const { data } = await supabase
        .from('obra_emails')
        .select('*')
        .eq('thread_id', email.thread_id)
        .order('data_recebido', { ascending: true })

      setEmailThread(data || [email])
    } else {
      setEmailThread([email])
    }
  }

  const handleToggleImportante = async (email, e) => {
    e.stopPropagation()
    const newValue = !email.importante

    await supabase
      .from('obra_emails')
      .update({ importante: newValue })
      .eq('id', email.id)

    setEmails(prev => prev.map(e =>
      e.id === email.id ? { ...e, importante: newValue } : e
    ))

    if (selectedEmail?.id === email.id) {
      setSelectedEmail(prev => ({ ...prev, importante: newValue }))
    }
  }

  const handleArchive = async (email) => {
    await supabase
      .from('obra_emails')
      .update({ arquivado: true })
      .eq('id', email.id)

    setEmails(prev => prev.filter(e => e.id !== email.id))
    setSelectedEmail(null)
  }

  // Compose functions
  const handleReply = (email) => {
    setComposeMode('reply')
    setReplyToEmail(email)
    setComposeTo(email.de_email)
    setComposeSubject(email.assunto.startsWith('Re:') ? email.assunto : `Re: ${email.assunto}`)
    setComposeBody(`\n\n---\nDe: ${email.de_nome || email.de_email}\nData: ${new Date(email.data_recebido).toLocaleString('pt-PT')}\nAssunto: ${email.assunto}\n\n${email.corpo_texto || ''}`)
    setComposeObraId(email.obra_id || '')
    setShowCompose(true)
  }

  const handleForward = (email) => {
    setComposeMode('forward')
    setReplyToEmail(null)
    setComposeTo('')
    setComposeSubject(email.assunto.startsWith('Fwd:') ? email.assunto : `Fwd: ${email.assunto}`)
    setComposeBody(`\n\n---\nMensagem encaminhada\nDe: ${email.de_nome || email.de_email}\nData: ${new Date(email.data_recebido).toLocaleString('pt-PT')}\nAssunto: ${email.assunto}\n\n${email.corpo_texto || ''}`)
    setComposeObraId(email.obra_id || '')
    setShowCompose(true)
  }

  const handleNewEmail = () => {
    setComposeMode('new')
    setReplyToEmail(null)
    setComposeTo('')
    setComposeCc('')
    setComposeSubject('')
    setComposeBody('')
    setComposeObraId('')
    setShowCompose(true)
  }

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject) {
      alert('Preencha o destinatário e o assunto')
      return
    }

    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('email-send', {
        body: {
          to: composeTo.split(',').map(e => e.trim()),
          cc: composeCc ? composeCc.split(',').map(e => e.trim()) : undefined,
          subject: composeSubject,
          body_text: composeBody,
          obra_id: composeObraId || undefined,
          reply_to_message_id: replyToEmail?.id
        }
      })

      if (error) throw error

      setShowCompose(false)
      await loadEmails()

      // Reset form
      setComposeTo('')
      setComposeCc('')
      setComposeSubject('')
      setComposeBody('')
      setComposeObraId('')
      setReplyToEmail(null)

    } catch (err) {
      console.error('Erro ao enviar email:', err)
      alert('Erro ao enviar email: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // AI Suggestion
  const handleGetSuggestion = async () => {
    if (!selectedEmail) return

    setLoadingSuggestion(true)
    setShowSuggestion(true)
    setSuggestion(null)

    try {
      const { data, error } = await supabase.functions.invoke('email-suggest-reply', {
        body: {
          email_id: selectedEmail.id,
          assunto: selectedEmail.assunto,
          corpo: selectedEmail.corpo_texto,
          de_nome: selectedEmail.de_nome,
          de_email: selectedEmail.de_email,
          obra_id: selectedEmail.obra_id
        }
      })

      if (error) throw error

      setSuggestion(data)
    } catch (err) {
      console.error('Erro ao obter sugestão:', err)
      setSuggestion({ error: 'Não foi possível gerar sugestão' })
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const handleUseSuggestion = () => {
    if (suggestion?.resposta) {
      handleReply(selectedEmail)
      setTimeout(() => {
        setComposeBody(suggestion.resposta + composeBody)
      }, 100)
      setShowSuggestion(false)
    }
  }

  // Detectar Decisões com IA
  const handleDetectarDecisoes = async (email) => {
    if (!email) return

    // Verificar se tem projeto/obra associado
    const projetoId = email.projeto_id || email.obra_id
    if (!projetoId) {
      alert('⚠️ Este email não está associado a nenhum projeto ou obra.\n\nPara detectar decisões, o email precisa estar associado a um projeto.')
      return
    }

    setDetectando(true)
    setDetectResult(null)

    try {
      // Construir texto para análise (assunto + corpo)
      const conteudo = `Assunto: ${email.assunto || ''}\n\nConteúdo:\n${email.corpo_texto || email.corpo_html?.replace(/<[^>]*>/g, '') || ''}`

      console.log('Detectar Decisões - Enviando request:', {
        conteudo: conteudo.substring(0, 200) + '...',
        projeto_id: projetoId,
        fonte: 'email'
      })

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decisoes-detectar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            conteudo,
            projeto_id: projetoId,
            fonte: 'email',
            metadata: {
              email_id: email.id,
              de: email.de_email,
              de_nome: email.de_nome,
              assunto: email.assunto,
              data: email.data_envio || email.created_at
            }
          })
        }
      )

      console.log('Detectar Decisões - Response status:', response.status)

      // Tentar ler a resposta como texto primeiro para debug
      const responseText = await response.text()
      console.log('Detectar Decisões - Response body:', responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', parseError)
        alert(`❌ Erro: Resposta inválida do servidor.\n\n${responseText.substring(0, 200)}`)
        return
      }

      setDetectResult(result)

      if (result.success && result.decisoes_criadas > 0) {
        alert(`✅ Detectadas ${result.decisoes_criadas} decisão(ões)!\n\nVai a Decisões > Validar para aprovar.`)
      } else if (result.success) {
        alert(`ℹ️ Nenhuma decisão detectada neste email.\n\n${result.motivo || ''}`)
      } else {
        // Mostrar erro detalhado
        const errorMsg = result.error || 'Erro desconhecido'
        console.error('Erro da Edge Function:', result)

        if (errorMsg.includes('ANTHROPIC_API_KEY') || errorMsg.includes('api_key')) {
          alert('❌ Erro de configuração:\n\nA chave da API Anthropic não está configurada no Supabase.\n\nConfigura em: Dashboard > Edge Functions > Secrets')
        } else if (response.status === 404) {
          alert('❌ Função não encontrada.\n\nA Edge Function "decisoes-detectar" precisa ser deployada.\n\nExecuta: supabase functions deploy decisoes-detectar')
        } else {
          alert(`❌ Erro: ${errorMsg}`)
        }
      }
    } catch (error) {
      console.error('Erro ao detectar decisões:', error)

      if (error.message?.includes('Failed to fetch')) {
        alert('❌ Erro de rede ao chamar a Edge Function.\n\nVerifica:\n1. Se a função está deployada\n2. Se tens conexão à internet\n3. Se o URL do Supabase está correto')
      } else {
        alert(`❌ Erro: ${error.message}\n\nVerifica a consola para mais detalhes.`)
      }
    } finally {
      setDetectando(false)
    }
  }

  // Seed de emails de teste
  const seedTestEmails = async () => {
    setSeeding(true)
    try {
      // Obter um projeto ou obra para associar
      const { data: projetos } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .eq('arquivado', false)
        .limit(1)

      let projetoId = projetos?.[0]?.id || null
      let projetoNome = projetos?.[0]?.nome || ''

      // Se não houver projetos, tentar obras
      if (!projetoId) {
        const { data: obrasData } = await supabase
          .from('obras')
          .select('id, codigo, nome')
          .in('estado', ['em_curso', 'planeamento'])
          .limit(1)

        projetoId = obrasData?.[0]?.id || null
        projetoNome = obrasData?.[0]?.nome || ''
      }

      if (!projetoId) {
        alert('⚠️ Não foi encontrado nenhum projeto ou obra ativo.\n\nCria primeiro um projeto ou obra para poder associar os emails de teste.')
        setSeeding(false)
        return
      }

      console.log('Seed: Usando projeto/obra:', projetoId, projetoNome)

      // Emails de teste com decisões
      const testEmails = [
        {
          obra_id: projetoId,
          de_email: 'joao.silva@cliente.com',
          de_nome: 'João Silva',
          para_emails: [{ email: 'ines@gavinhogroup.com', nome: 'Inês Gavinho' }],
          assunto: 'RE: Confirmação materiais WC Suite - Maria Residences',
          corpo_texto: `Olá Inês,

Após a reunião de ontem, venho confirmar as seguintes decisões:

1. BANCADA WC SUITE
Confirmamos que queremos avançar com o mármore Calacatta Gold para a bancada do WC Suite principal.

2. TORNEIRA WC
Aprovamos a torneira Fantini série Lamè em dourado escovado. Por favor encomendem 2 unidades.

3. ORÇAMENTO ADICIONAL
O orçamento adicional de €3.200 para os acabamentos premium está aprovado.

Por favor confirmem a recepção deste email.

Cumprimentos,
João Silva`,
          tipo: 'recebido',
          data_envio: new Date().toISOString(),
          data_recebido: new Date().toISOString(),
          lido: false,
          importante: true,
          urgencia: 'alta'
        },
        {
          obra_id: projetoId,
          de_email: 'fornecedor@pedras.pt',
          de_nome: 'Pedro Marques - PedrasLux',
          para_emails: [{ email: 'ines@gavinhogroup.com', nome: 'Inês Gavinho' }],
          assunto: 'Orçamento Pedras Naturais - GA00402',
          corpo_texto: `Boa tarde Inês,

Conforme solicitado, envio o orçamento para as pedras naturais:

- Mármore Calacatta Gold (bancada 2.5m²): €1.850
- Mármore Nero Marquina (pavimento entrada): €2.400
- Granito preto Zimbabwe (cozinha): €1.200

Total: €5.450 + IVA

Prazo de entrega: 3 semanas após confirmação.

Aguardo feedback.

Cumprimentos,
Pedro Marques`,
          tipo: 'recebido',
          data_envio: new Date(Date.now() - 86400000).toISOString(),
          data_recebido: new Date(Date.now() - 86400000).toISOString(),
          lido: true,
          importante: false,
          urgencia: 'normal'
        },
        {
          obra_id: projetoId,
          de_email: 'ines@gavinhogroup.com',
          de_nome: 'Inês Gavinho',
          para_emails: [{ email: 'joao.silva@cliente.com', nome: 'João Silva' }],
          assunto: 'RE: Reunião de acompanhamento - Maria Residences',
          corpo_texto: `Caro João,

Confirmo a reunião para amanhã às 15h no escritório.

Temas a abordar:
- Escolha de acabamentos
- Cronograma atualizado
- Orçamento extras

Até amanhã,
Inês Gavinho`,
          tipo: 'enviado',
          data_envio: new Date(Date.now() - 172800000).toISOString(),
          data_recebido: new Date(Date.now() - 172800000).toISOString(),
          lido: true,
          importante: false,
          urgencia: 'normal'
        }
      ]

      // Primeiro, atualizar emails órfãos (sem obra_id) com este projeto
      const { data: orphanEmails } = await supabase
        .from('obra_emails')
        .select('id')
        .is('obra_id', null)

      if (orphanEmails && orphanEmails.length > 0) {
        const { error: updateError } = await supabase
          .from('obra_emails')
          .update({ obra_id: projetoId })
          .is('obra_id', null)

        if (updateError) {
          console.error('Erro ao atualizar emails órfãos:', updateError)
        } else {
          console.log(`Atualizados ${orphanEmails.length} emails órfãos com projeto ${projetoNome}`)
        }
      }

      // Verificar se já existem emails de teste
      const { data: existingTest } = await supabase
        .from('obra_emails')
        .select('id')
        .ilike('assunto', '%Confirmação materiais WC Suite%')
        .limit(1)

      if (existingTest && existingTest.length > 0) {
        alert(`✅ Os emails existentes foram associados ao projeto "${projetoNome}".\n\nAgora podes usar "Detectar Decisões".`)
        loadEmails()
        setSeeding(false)
        return
      }

      const { error } = await supabase
        .from('obra_emails')
        .insert(testEmails)

      if (error) throw error

      alert(`✅ 3 emails de teste inseridos e associados ao projeto "${projetoNome}"!`)
      loadEmails()
    } catch (err) {
      console.error('Erro ao inserir emails de teste:', err)
      alert('❌ Erro: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // Format helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-PT', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    }
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--cream)',
      overflow: 'hidden'
    },
    header: {
      padding: '20px 24px',
      background: 'var(--white)',
      borderBottom: '1px solid var(--stone)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: 'var(--brown)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    stats: {
      display: 'flex',
      gap: '16px',
      fontSize: '13px',
      color: 'var(--brown-light)'
    },
    statBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      background: 'var(--cream)'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'var(--cream)',
      borderRadius: '8px',
      border: '1px solid var(--stone)',
      width: '280px'
    },
    searchInput: {
      flex: 1,
      border: 'none',
      background: 'transparent',
      fontSize: '14px',
      color: 'var(--brown)',
      outline: 'none'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    buttonPrimary: {
      background: 'var(--brown)',
      color: 'var(--white)'
    },
    buttonSecondary: {
      background: 'var(--cream)',
      color: 'var(--brown)',
      border: '1px solid var(--stone)'
    },
    content: {
      flex: 1,
      display: 'flex',
      overflow: 'hidden'
    },
    listPanel: {
      width: selectedEmail && !isMobile ? '400px' : '100%',
      borderRight: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--white)',
      transition: 'width 0.3s'
    },
    filters: {
      padding: '12px 16px',
      borderBottom: '1px solid var(--stone)',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    filterSelect: {
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid var(--stone)',
      fontSize: '13px',
      color: 'var(--brown)',
      background: 'var(--white)',
      cursor: 'pointer'
    },
    emailList: {
      flex: 1,
      overflowY: 'auto'
    },
    emailItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      borderBottom: '1px solid var(--stone)',
      cursor: 'pointer',
      transition: 'background 0.2s'
    },
    emailItemUnread: {
      background: 'var(--cream)'
    },
    emailItemSelected: {
      background: '#EDE9FE'
    },
    emailContent: {
      flex: 1,
      minWidth: 0
    },
    emailHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '4px'
    },
    emailFrom: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--brown)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    emailDate: {
      fontSize: '12px',
      color: 'var(--brown-light)',
      whiteSpace: 'nowrap'
    },
    emailSubject: {
      fontSize: '13px',
      color: 'var(--brown)',
      marginBottom: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    emailPreview: {
      fontSize: '12px',
      color: 'var(--brown-light)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    emailMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '6px'
    },
    tag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500
    },
    detailPanel: {
      flex: 1,
      display: selectedEmail ? 'flex' : 'none',
      flexDirection: 'column',
      background: 'var(--white)',
      overflow: 'hidden'
    },
    detailHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid var(--stone)'
    },
    detailSubject: {
      fontSize: '20px',
      fontWeight: 600,
      color: 'var(--brown)',
      marginBottom: '16px'
    },
    detailMeta: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    },
    avatar: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'var(--brown)',
      color: 'var(--white)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 600,
      flexShrink: 0
    },
    detailInfo: {
      flex: 1
    },
    detailFrom: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--brown)'
    },
    detailTo: {
      fontSize: '13px',
      color: 'var(--brown-light)',
      marginTop: '2px'
    },
    detailActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px'
    },
    detailBody: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto'
    },
    bodyText: {
      fontSize: '14px',
      lineHeight: 1.7,
      color: 'var(--brown)',
      whiteSpace: 'pre-wrap'
    },
    attachments: {
      padding: '16px 24px',
      borderTop: '1px solid var(--stone)',
      background: 'var(--cream)'
    },
    attachment: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'var(--white)',
      borderRadius: '8px',
      border: '1px solid var(--stone)',
      fontSize: '13px',
      color: 'var(--brown)',
      marginRight: '8px',
      marginBottom: '8px'
    },
    composeModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    composeBox: {
      width: '100%',
      maxWidth: '700px',
      maxHeight: '90vh',
      background: 'var(--white)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    composeHeader: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--stone)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    composeTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--brown)'
    },
    composeFields: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--stone)'
    },
    fieldRow: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '12px'
    },
    fieldLabel: {
      width: '60px',
      fontSize: '13px',
      color: 'var(--brown-light)'
    },
    fieldInput: {
      flex: 1,
      padding: '8px 12px',
      border: '1px solid var(--stone)',
      borderRadius: '6px',
      fontSize: '14px',
      color: 'var(--brown)',
      outline: 'none'
    },
    composeBody: {
      flex: 1,
      padding: '20px',
      minHeight: '200px'
    },
    composeTextarea: {
      width: '100%',
      height: '100%',
      minHeight: '200px',
      border: 'none',
      resize: 'none',
      fontSize: '14px',
      lineHeight: 1.6,
      color: 'var(--brown)',
      outline: 'none'
    },
    composeFooter: {
      padding: '16px 20px',
      borderTop: '1px solid var(--stone)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    suggestionPanel: {
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      width: '400px',
      maxHeight: '80vh',
      background: 'var(--white)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    suggestionHeader: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--stone)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
    },
    suggestionTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--white)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    suggestionBody: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto'
    },
    suggestionText: {
      fontSize: '14px',
      lineHeight: 1.7,
      color: 'var(--brown)',
      whiteSpace: 'pre-wrap',
      background: 'var(--cream)',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    suggestionContext: {
      fontSize: '12px',
      color: 'var(--brown-light)',
      marginBottom: '8px'
    },
    suggestionFooter: {
      padding: '16px 20px',
      borderTop: '1px solid var(--stone)',
      display: 'flex',
      gap: '8px'
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: 'var(--brown-light)'
    }
  }

  // Render
  if (loading && emails.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <Loader2 size={32} className="spin" style={{ marginBottom: '16px' }} />
          <p>A carregar emails...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            <Mail size={28} />
            Emails
          </h1>
          <div style={styles.stats}>
            <span style={styles.statBadge}>
              {stats.total} total
            </span>
            {stats.naoLidos > 0 && (
              <span style={{ ...styles.statBadge, background: '#DBEAFE', color: '#2563EB' }}>
                {stats.naoLidos} não lidos
              </span>
            )}
            {stats.urgentes > 0 && (
              <span style={{ ...styles.statBadge, background: '#FEE2E2', color: '#DC2626' }}>
                {stats.urgentes} urgentes
              </span>
            )}
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.searchBox}>
            <Search size={18} color="var(--brown-light)" />
            <input
              type="text"
              placeholder="Pesquisar emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button
            onClick={handleRefresh}
            style={{ ...styles.button, ...styles.buttonSecondary }}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>

          <button
            onClick={handleNewEmail}
            style={{ ...styles.button, ...styles.buttonPrimary }}
          >
            <Plus size={16} />
            Novo Email
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Email List */}
        <div style={{
          ...styles.listPanel,
          display: selectedEmail && isMobile ? 'none' : 'flex'
        }}>
          {/* Filters */}
          <div style={styles.filters}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="todos">Todos</option>
              <option value="recebido">Recebidos</option>
              <option value="enviado">Enviados</option>
            </select>

            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="todos">Todos Projetos/Obras</option>
              {obras.filter(o => o.tipo === 'projeto').length > 0 && (
                <optgroup label="Projetos">
                  {obras.filter(o => o.tipo === 'projeto').map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              )}
              {obras.filter(o => o.tipo === 'obra').length > 0 && (
                <optgroup label="Obras">
                  {obras.filter(o => o.tipo === 'obra').map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </optgroup>
              )}
            </select>

            <select
              value={filtroLido}
              onChange={(e) => setFiltroLido(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="todos">Todos</option>
              <option value="nao_lidos">Não Lidos</option>
              <option value="lidos">Lidos</option>
            </select>

            <select
              value={filtroUrgencia}
              onChange={(e) => setFiltroUrgencia(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="todos">Todas Urgências</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          {/* Email List */}
          <div style={styles.emailList}>
            {emails.length === 0 ? (
              <div style={styles.emptyState}>
                <Mail size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Nenhum email encontrado</p>
                <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                  Clica em "Sincronizar" para importar do Outlook ou insere dados de teste.
                </p>
                <button
                  onClick={seedTestEmails}
                  disabled={seeding}
                  style={{
                    padding: '10px 20px',
                    background: '#8B8670',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: seeding ? 'wait' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  {seeding ? 'A inserir...' : '+ Inserir Emails de Teste'}
                </button>
              </div>
            ) : (
              emails.map(email => (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  style={{
                    ...styles.emailItem,
                    ...(!email.lido ? styles.emailItemUnread : {}),
                    ...(selectedEmail?.id === email.id ? styles.emailItemSelected : {})
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEmail?.id !== email.id) {
                      e.currentTarget.style.background = 'var(--cream)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEmail?.id !== email.id && email.lido) {
                      e.currentTarget.style.background = 'var(--white)'
                    }
                  }}
                >
                  {/* Star */}
                  <button
                    onClick={(e) => handleToggleImportante(email, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: email.importante ? '#F59E0B' : 'var(--brown-light)'
                    }}
                  >
                    {email.importante ? <Star size={18} fill="#F59E0B" /> : <StarOff size={18} />}
                  </button>

                  {/* Content */}
                  <div style={styles.emailContent}>
                    <div style={styles.emailHeader}>
                      <span style={{
                        ...styles.emailFrom,
                        fontWeight: email.lido ? 400 : 600
                      }}>
                        {email.tipo === 'enviado' ? `Para: ${email.para_emails?.[0]?.email || ''}` : (email.de_nome || email.de_email)}
                      </span>
                      <span style={styles.emailDate}>
                        {formatDate(email.data_recebido || email.data_envio)}
                      </span>
                    </div>

                    <div style={{
                      ...styles.emailSubject,
                      fontWeight: email.lido ? 400 : 600
                    }}>
                      {email.assunto}
                    </div>

                    <div style={styles.emailPreview}>
                      {truncateText(email.corpo_texto, 80)}
                    </div>

                    <div style={styles.emailMeta}>
                      {email.urgencia && email.urgencia !== 'normal' && (
                        <span style={{
                          ...styles.tag,
                          background: URGENCIA_CONFIG[email.urgencia]?.bg,
                          color: URGENCIA_CONFIG[email.urgencia]?.color
                        }}>
                          {URGENCIA_CONFIG[email.urgencia]?.label}
                        </span>
                      )}

                      {email.obras && (
                        <span style={{
                          ...styles.tag,
                          background: '#E0E7FF',
                          color: '#4338CA'
                        }}>
                          <Building size={12} />
                          {email.obras.codigo_canonico || email.obras.codigo}
                        </span>
                      )}

                      {email.anexos && email.anexos.length > 0 && (
                        <span style={{ color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Paperclip size={12} />
                          {email.anexos.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--brown-light)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedEmail && (
          <div style={{
            ...styles.detailPanel,
            display: 'flex',
            ...(isMobile ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 } : {})
          }}>
            <div style={styles.detailHeader}>
              {isMobile && (
                <button
                  onClick={() => setSelectedEmail(null)}
                  style={{ ...styles.button, ...styles.buttonSecondary, marginBottom: '16px' }}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}

              <h2 style={styles.detailSubject}>{selectedEmail.assunto}</h2>

              <div style={styles.detailMeta}>
                <div style={styles.avatar}>
                  {(selectedEmail.de_nome || selectedEmail.de_email || '?')[0].toUpperCase()}
                </div>

                <div style={styles.detailInfo}>
                  <div style={styles.detailFrom}>
                    {selectedEmail.de_nome || selectedEmail.de_email}
                  </div>
                  <div style={styles.detailTo}>
                    Para: {selectedEmail.para_emails?.map(e => e.email).join(', ')}
                    {selectedEmail.cc_emails?.length > 0 && (
                      <> | CC: {selectedEmail.cc_emails.map(e => e.email).join(', ')}</>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                    {new Date(selectedEmail.data_recebido || selectedEmail.data_envio).toLocaleString('pt-PT')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedEmail.urgencia && (
                    <span style={{
                      ...styles.tag,
                      background: URGENCIA_CONFIG[selectedEmail.urgencia]?.bg,
                      color: URGENCIA_CONFIG[selectedEmail.urgencia]?.color
                    }}>
                      {URGENCIA_CONFIG[selectedEmail.urgencia]?.label}
                    </span>
                  )}

                  {selectedEmail.obras && (
                    <span style={{
                      ...styles.tag,
                      background: '#E0E7FF',
                      color: '#4338CA'
                    }}>
                      <Building size={12} />
                      {selectedEmail.obras.nome}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.detailActions}>
                <button
                  onClick={() => handleReply(selectedEmail)}
                  style={{ ...styles.button, ...styles.buttonPrimary }}
                >
                  <Reply size={16} />
                  Responder
                </button>

                <button
                  onClick={() => handleForward(selectedEmail)}
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                >
                  <Forward size={16} />
                  Encaminhar
                </button>

                {selectedEmail.tipo === 'recebido' && (
                  <button
                    onClick={handleGetSuggestion}
                    style={{
                      ...styles.button,
                      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      color: 'var(--white)'
                    }}
                  >
                    <Sparkles size={16} />
                    Sugerir Resposta
                  </button>
                )}

                {/* Detectar Decisões */}
                <button
                  onClick={() => handleDetectarDecisoes(selectedEmail)}
                  disabled={detectando}
                  style={{
                    ...styles.button,
                    background: detectando ? '#E5E5E5' : '#8B8670',
                    color: detectando ? '#9CA3AF' : 'var(--white)',
                    cursor: detectando ? 'wait' : 'pointer'
                  }}
                >
                  {detectando ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Detectar Decisões
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleArchive(selectedEmail)}
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                >
                  <Archive size={16} />
                </button>

                <button
                  onClick={(e) => handleToggleImportante(selectedEmail, e)}
                  style={{
                    ...styles.button,
                    ...styles.buttonSecondary,
                    color: selectedEmail.importante ? '#F59E0B' : 'var(--brown)'
                  }}
                >
                  {selectedEmail.importante ? <Star size={16} fill="#F59E0B" /> : <StarOff size={16} />}
                </button>
              </div>
            </div>

            <div style={styles.detailBody}>
              <div style={styles.bodyText}>
                {selectedEmail.corpo_texto || selectedEmail.corpo_html?.replace(/<[^>]*>/g, '') || '(Sem conteúdo)'}
              </div>
            </div>

            {selectedEmail.anexos && selectedEmail.anexos.length > 0 && (
              <div style={styles.attachments}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '12px' }}>
                  <Paperclip size={14} style={{ marginRight: '6px' }} />
                  {selectedEmail.anexos.length} anexo(s)
                </div>
                {selectedEmail.anexos.map((anexo, idx) => (
                  <div key={idx} style={styles.attachment}>
                    <Paperclip size={14} />
                    {anexo.nome}
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      ({Math.round((anexo.tamanho || 0) / 1024)}KB)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state when no email selected */}
        {!selectedEmail && !isMobile && (
          <div style={{ ...styles.detailPanel, display: 'flex', ...styles.emptyState }}>
            <Mail size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ fontSize: '16px' }}>Selecione um email para ver os detalhes</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={styles.composeModal} onClick={() => setShowCompose(false)}>
          <div style={styles.composeBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.composeHeader}>
              <span style={styles.composeTitle}>
                {composeMode === 'new' ? 'Novo Email' : composeMode === 'reply' ? 'Responder' : 'Encaminhar'}
              </span>
              <button
                onClick={() => setShowCompose(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} color="var(--brown-light)" />
              </button>
            </div>

            <div style={styles.composeFields}>
              <div style={styles.fieldRow}>
                <span style={styles.fieldLabel}>Para:</span>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="email@exemplo.com"
                  style={styles.fieldInput}
                />
              </div>

              <div style={styles.fieldRow}>
                <span style={styles.fieldLabel}>CC:</span>
                <input
                  type="text"
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  placeholder="email@exemplo.com (opcional)"
                  style={styles.fieldInput}
                />
              </div>

              <div style={styles.fieldRow}>
                <span style={styles.fieldLabel}>Assunto:</span>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Assunto do email"
                  style={styles.fieldInput}
                />
              </div>

              <div style={styles.fieldRow}>
                <span style={styles.fieldLabel}>Projeto/Obra:</span>
                <select
                  value={composeObraId}
                  onChange={(e) => setComposeObraId(e.target.value)}
                  style={{ ...styles.fieldInput, cursor: 'pointer' }}
                >
                  <option value="">Nenhum (não adicionar código)</option>
                  {obras.filter(o => o.tipo === 'projeto').length > 0 && (
                    <optgroup label="Projetos">
                      {obras.filter(o => o.tipo === 'projeto').map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {obras.filter(o => o.tipo === 'obra').length > 0 && (
                    <optgroup label="Obras">
                      {obras.filter(o => o.tipo === 'obra').map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div style={styles.composeBody}>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                style={styles.composeTextarea}
              />
            </div>

            <div style={styles.composeFooter}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowCompose(false)}
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                >
                  Cancelar
                </button>
              </div>

              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={{ ...styles.button, ...styles.buttonPrimary }}
              >
                {sending ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <SendIcon size={16} />
                )}
                {sending ? 'A enviar...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestion Panel */}
      {showSuggestion && (
        <div style={styles.suggestionPanel}>
          <div style={styles.suggestionHeader}>
            <span style={styles.suggestionTitle}>
              <Bot size={18} />
              Sugestão de Resposta
            </span>
            <button
              onClick={() => setShowSuggestion(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="var(--white)" />
            </button>
          </div>

          <div style={styles.suggestionBody}>
            {loadingSuggestion ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 size={32} className="spin" style={{ color: '#8B5CF6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--brown-light)' }}>A gerar sugestão...</p>
              </div>
            ) : suggestion?.error ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>
                <AlertCircle size={32} style={{ marginBottom: '16px' }} />
                <p>{suggestion.error}</p>
              </div>
            ) : suggestion ? (
              <>
                {suggestion.contexto && (
                  <div style={styles.suggestionContext}>
                    <strong>Contexto:</strong> {suggestion.contexto}
                  </div>
                )}

                <div style={styles.suggestionText}>
                  {suggestion.resposta}
                </div>

                {suggestion.notas && (
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', fontStyle: 'italic' }}>
                    <strong>Notas:</strong> {suggestion.notas}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {suggestion && !suggestion.error && (
            <div style={styles.suggestionFooter}>
              <button
                onClick={() => navigator.clipboard.writeText(suggestion.resposta)}
                style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }}
              >
                <Copy size={16} />
                Copiar
              </button>

              <button
                onClick={handleUseSuggestion}
                style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }}
              >
                <Edit3 size={16} />
                Usar e Editar
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
