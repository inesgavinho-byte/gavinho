import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import {
  Search, Send, Image, X, HardHat, MessageSquare, Loader2, AlertCircle,
  Phone, Settings, Check, CheckCheck, Clock, Package, Users, Wrench,
  AlertTriangle, ListTodo, Sparkles, ChevronRight, RefreshCw, Plus,
  Wifi, WifiOff, Bot, ArrowLeft, Home
} from 'lucide-react'

// Empty default structure for AI suggestions
const EMPTY_AI_SUGGESTIONS = {
  materiais: [],
  horas: [],
  trabalhos: [],
  tarefas: [],
  naoConformidades: []
}

export default function ChatObras() {
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Estados WhatsApp
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [mensagens, setMensagens] = useState([])

  // Estados IA
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [processedSuggestions, setProcessedSuggestions] = useState({})

  // Estados Twilio Config
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState('')

  // Estados Contactos WhatsApp
  const [showContactModal, setShowContactModal] = useState(false)
  const [obraContacts, setObraContacts] = useState([])
  const [newContact, setNewContact] = useState({ nome: '', telefone: '', funcao: '' })
  const [savingContact, setSavingContact] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const isInitialLoad = useRef(true)
  const previousMessagesLength = useRef(0)

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      // Esconder painel IA em mobile por defeito
      if (window.innerWidth <= 768) {
        setShowAIPanel(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current) return

    // Só fazer scroll automático se:
    // 1. For forçado (ex: ao enviar mensagem)
    // 2. O utilizador já estiver perto do fim do chat
    const container = messagesContainerRef.current
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    // Só fazer scroll automático quando novas mensagens são adicionadas
    // (não quando a obra é selecionada inicialmente)
    if (mensagens.length > previousMessagesLength.current && !isInitialLoad.current) {
      scrollToBottom()
    }
    previousMessagesLength.current = mensagens.length

    // Depois da primeira carga, marcar como não sendo mais carga inicial
    if (isInitialLoad.current && mensagens.length > 0) {
      // Fazer scroll para o fim apenas na primeira carga, sem animação
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
        isInitialLoad.current = false
      }, 100)
    }
  }, [mensagens])

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      // Resetar estado de scroll quando muda de obra
      isInitialLoad.current = true
      previousMessagesLength.current = 0

      loadMensagens()
      loadAISugestoes()
      loadObraContacts()
      // Subscrever a novas mensagens em tempo real (obra_mensagens - partilhado com PWA)
      const channel = supabase
        .channel(`obra_chat_${selectedObra.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'obra_mensagens',
          filter: `obra_id=eq.${selectedObra.id}`
        }, (payload) => {
          loadMensagens()
        })
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [selectedObra])

  // Verificar configuração WhatsApp ao carregar
  useEffect(() => {
    checkWhatsAppConfig()
  }, [])

  const loadObras = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .in('status', ['em_curso', 'em_projeto'])
        .order('codigo', { ascending: false })

      if (error) throw error
      setObras(data || [])
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
      setError('Erro ao carregar obras')
    } finally {
      setLoading(false)
    }
  }

  // Verificar se WhatsApp está configurado
  const checkWhatsAppConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('ativo', true)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows

      if (error) {
        // Table might not exist yet
        console.error('Erro ao verificar config WhatsApp:', error)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Tabela whatsapp_config não existe - executar migração')
          setWhatsappConnected(false)
          return
        }
        throw error
      }

      if (data && data.twilio_account_sid && data.twilio_phone_number) {
        setWhatsappConnected(true)
        setTwilioConfig({
          accountSid: data.twilio_account_sid || '',
          authToken: '', // Never show auth token
          phoneNumber: data.twilio_phone_number || ''
        })
      } else {
        setWhatsappConnected(false)
      }
    } catch (err) {
      console.error('Erro ao verificar config:', err)
      setWhatsappConnected(false)
    }
  }

  // Guardar configuração Twilio
  const saveTwilioConfig = async () => {
    // Se já está conectado, o auth token pode ficar vazio (manter o existente)
    if (!twilioConfig.accountSid || !twilioConfig.phoneNumber) {
      setConfigError('Preenche Account SID e Número WhatsApp')
      return
    }

    // Auth token é obrigatório apenas na primeira configuração
    if (!whatsappConnected && !twilioConfig.authToken) {
      setConfigError('Preenche o Auth Token')
      return
    }

    setSavingConfig(true)
    setConfigError('')

    try {
      // Check if config exists (use maybeSingle to avoid error when no rows)
      const { data: existing, error: checkError } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('ativo', true)
        .maybeSingle()

      if (checkError) {
        console.error('Erro ao verificar config existente:', checkError)
        // If table doesn't exist, show specific message
        if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
          throw new Error('Tabela whatsapp_config não existe. Executa a migração primeiro.')
        }
      }

      const configData = {
        twilio_account_sid: twilioConfig.accountSid,
        twilio_phone_number: twilioConfig.phoneNumber.replace(/\s/g, ''),
        ativo: true,
        updated_at: new Date().toISOString()
      }

      // Só atualizar o token se foi preenchido
      if (twilioConfig.authToken) {
        configData.twilio_auth_token_encrypted = twilioConfig.authToken
      }

      if (existing) {
        // Update existing config
        const { data: updated, error } = await supabase
          .from('whatsapp_config')
          .update(configData)
          .eq('id', existing.id)
          .select()

        if (error) {
          console.error('Erro ao atualizar config:', error)
          throw error
        }
      } else {
        // Insert new config - auth token é obrigatório
        if (!twilioConfig.authToken) {
          throw new Error('Auth Token é obrigatório na primeira configuração')
        }
        const { data: inserted, error } = await supabase
          .from('whatsapp_config')
          .insert({
            ...configData,
            twilio_auth_token_encrypted: twilioConfig.authToken,
            created_at: new Date().toISOString()
          })
          .select()

        if (error) {
          console.error('Erro ao inserir config:', error)
          throw error
        }
      }

      setWhatsappConnected(true)
      setShowConfig(false)
      setTwilioConfig(prev => ({ ...prev, authToken: '' })) // Clear token from memory
    } catch (err) {
      console.error('Erro ao guardar config:', err)
      setConfigError(err.message || 'Erro ao guardar configuração')
    } finally {
      setSavingConfig(false)
    }
  }

  // Carregar contactos da obra
  const loadObraContacts = async () => {
    if (!selectedObra) return

    try {
      const { data, error } = await supabase
        .from('whatsapp_contactos')
        .select('*')
        .eq('obra_id', selectedObra.id)
        .order('nome')

      if (error) throw error
      setObraContacts(data || [])
    } catch (err) {
      console.error('Erro ao carregar contactos:', err)
      setObraContacts([])
    }
  }

  // Guardar novo contacto
  const saveContact = async () => {
    if (!newContact.nome || !newContact.telefone) return

    setSavingContact(true)
    try {
      // Format phone number
      let phone = newContact.telefone.replace(/\s/g, '')
      if (!phone.startsWith('+')) {
        phone = '+351' + phone // Default to Portugal
      }

      const { error } = await supabase
        .from('whatsapp_contactos')
        .insert({
          obra_id: selectedObra.id,
          nome: newContact.nome,
          telefone: phone,
          cargo: newContact.funcao || null, // Column in DB is 'cargo'
          ativo: true
        })

      if (error) throw error

      setNewContact({ nome: '', telefone: '', funcao: '' })
      await loadObraContacts()
    } catch (err) {
      console.error('Erro ao guardar contacto:', err)
      toast.error('Erro', 'Erro ao guardar contacto')
    } finally {
      setSavingContact(false)
    }
  }

  // Eliminar contacto
  const deleteContact = async (contactId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Contacto',
      message: 'Eliminar este contacto?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('whatsapp_contactos')
            .delete()
            .eq('id', contactId)

          if (error) throw error
          await loadObraContacts()
        } catch (err) {
          console.error('Erro ao eliminar contacto:', err)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  // Testar conexão Twilio
  const testTwilioConnection = async () => {
    if (!twilioConfig.accountSid || !twilioConfig.authToken) {
      setConfigError('Preenche Account SID e Auth Token')
      return
    }

    setSavingConfig(true)
    setConfigError('')

    try {
      // Test by fetching account info from Twilio
      const auth = btoa(`${twilioConfig.accountSid}:${twilioConfig.authToken}`)
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      )

      if (response.ok) {
        setConfigError('')
        toast.success('Sucesso', 'Conexão bem sucedida!')
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Credenciais inválidas')
      }
    } catch (err) {
      setConfigError(err.message || 'Erro ao testar conexão')
    } finally {
      setSavingConfig(false)
    }
  }

  // Carregar mensagens da obra (partilhado com PWA)
  const loadMensagens = async () => {
    if (!selectedObra) return

    try {
      const { data, error } = await supabase
        .from('obra_mensagens')
        .select('*')
        .eq('obra_id', selectedObra.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        // Se tabela não existe, mostrar mock
        if (error.code === '42P01') {
          console.warn('Tabela obra_mensagens não existe')
          setMensagens([])
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          tipo: msg.autor_nome === 'Gavinho' ? 'enviada' : 'recebida',
          autor: msg.autor_nome,
          conteudo: msg.conteudo,
          hora: new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          data: msg.created_at.split('T')[0],
          lida: msg.lida,
          anexos: msg.anexos,
          dadosTipo: msg.tipo // pedido_material, registo_horas, etc.
        }))
        setMensagens(formattedMessages)
      } else {
        // Sem mensagens ainda
        setMensagens([])
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
      setMensagens([])
    }
  }

  // Carregar sugestões da IA
  const loadAISugestoes = async () => {
    if (!selectedObra) return

    setAnalyzingAI(true)
    try {
      const { data, error } = await supabase
        .from('ia_sugestoes')
        .select('*')
        .eq('obra_id', selectedObra.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        // Organizar sugestões por tipo
        const organized = {
          materiais: [],
          horas: [],
          trabalhos: [],
          tarefas: [],
          naoConformidades: []
        }

        data.forEach(s => {
          const item = {
            id: s.id,
            texto: s.texto_original,
            confianca: s.confianca,
            ...s.dados
          }

          switch (s.tipo) {
            case 'requisicao_material':
              organized.materiais.push({ ...item, material: s.dados.material, quantidade: s.dados.quantidade, unidade: s.dados.unidade, urgente: s.dados.urgente })
              break
            case 'registo_horas':
              organized.horas.push({ ...item, pessoas: s.dados.pessoas, horasTotal: s.dados.horasTotal, horas: s.dados.horas, data: s.dados.data })
              break
            case 'trabalho_executado':
              organized.trabalhos.push({ ...item, trabalho: s.dados.descricao, percentagem: s.dados.percentagem })
              break
            case 'nova_tarefa':
              organized.tarefas.push({ ...item, tarefa: s.dados.descricao, prioridade: s.dados.prioridade })
              break
            case 'nao_conformidade':
              organized.naoConformidades.push({ ...item, descricao: s.dados.descricao, gravidade: s.dados.gravidade })
              break
          }
        })

        setAiSuggestions(organized)
      } else {
        // No pending suggestions
        setAiSuggestions(EMPTY_AI_SUGGESTIONS)
      }
    } catch (err) {
      console.error('Erro ao carregar sugestões IA:', err)
      setAiSuggestions(EMPTY_AI_SUGGESTIONS)
    } finally {
      setAnalyzingAI(false)
    }
  }

  // Reanalizar mensagens com IA
  const triggerAIAnalysis = async () => {
    setAnalyzingAI(true)
    try {
      // Chamar Edge Function de análise (se configurada)
      const { data, error } = await supabase.functions.invoke('analisar-mensagens')
      if (!error) {
        // Recarregar sugestões após análise
        await loadAISugestoes()
      }
    } catch (err) {
      console.error('Erro ao analisar:', err)
    } finally {
      setAnalyzingAI(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedObra) return

    setSending(true)
    const messageContent = newMessage.trim()

    // Adicionar mensagem localmente primeiro (optimistic update)
    const tempId = Date.now()
    const novaMensagem = {
      id: tempId,
      tipo: 'enviada',
      autor: 'Gavinho',
      conteudo: messageContent,
      hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      data: new Date().toISOString().split('T')[0],
      lida: false,
      pending: true
    }
    setMensagens(prev => [...prev, novaMensagem])
    setNewMessage('')

    // Forçar scroll para baixo ao enviar mensagem
    setTimeout(() => scrollToBottom(true), 50)

    try {
      // Se WhatsApp estiver configurado, enviar via Twilio
      if (whatsappConnected && obraContacts.length > 0) {
        const destinatario = obraContacts[0] // Primeiro contacto

        const { data, error } = await supabase.functions.invoke('twilio-send', {
          body: {
            to: destinatario.telefone,
            body: messageContent,
            obra_id: selectedObra.id
          }
        })

        if (error) {
          throw new Error(error.message || 'Erro ao enviar via Twilio')
        }

        // Update message to show as sent
        setMensagens(prev => prev.map(m =>
          m.id === tempId ? { ...m, pending: false, lida: true } : m
        ))

      }

      // Guardar sempre na tabela obra_mensagens (partilhada com PWA)
      const { error: obraError } = await supabase
        .from('obra_mensagens')
        .insert({
          obra_id: selectedObra.id,
          autor_id: 'backoffice',
          autor_nome: 'Gavinho',
          conteudo: messageContent,
          tipo: 'texto',
          lida: false
        })

      if (obraError) {
        console.error('Erro ao guardar mensagem na obra:', obraError)
      }

      // Update message to show as sent
      setMensagens(prev => prev.map(m =>
        m.id === tempId ? { ...m, pending: false, lida: true } : m
      ))
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      // Mark message as failed
      setMensagens(prev => prev.map(m =>
        m.id === tempId ? { ...m, pending: false, failed: true } : m
      ))

      // Show error to user
      if (!whatsappConnected) {
        // Silently save locally
      } else if (obraContacts.length === 0) {
        toast.warning('Aviso', 'Adiciona um contacto WhatsApp para esta obra primeiro')
      } else {
        toast.error('Erro', 'Erro ao enviar mensagem: ' + err.message)
      }
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAcceptSuggestion = async (tipo, id) => {
    setProcessedSuggestions(prev => ({
      ...prev,
      [`${tipo}-${id}`]: 'accepted'
    }))

    try {
      // Atualizar status na base de dados
      await supabase
        .from('ia_sugestoes')
        .update({
          status: 'aceite',
          processado_em: new Date().toISOString()
        })
        .eq('id', id)

      // Criar entidade correspondente na tabela apropriada
      let entidadeCriadaId = null
      const obraId = selectedObra?.id

      if (tipo === 'materiais') {
        const suggestion = aiSuggestions?.materiais?.find(s => s.id === id)
        if (suggestion && obraId) {
          const { data } = await supabase
            .from('requisicoes_materiais')
            .insert({
              obra_id: obraId,
              descricao: suggestion.material,
              quantidade: suggestion.quantidade,
              unidade: suggestion.unidade,
              urgencia: suggestion.urgente ? 'alta' : 'normal',
              estado: 'pendente'
            })
            .select('id')
            .single()
          entidadeCriadaId = data?.id
        }
      } else if (tipo === 'horas') {
        const suggestion = aiSuggestions?.horas?.find(s => s.id === id)
        if (suggestion && obraId) {
          const { data } = await supabase
            .from('obra_diario')
            .insert({
              obra_id: obraId,
              data: suggestion.data || new Date().toISOString().split('T')[0],
              mao_obra_propria: suggestion.pessoas || 0,
              descricao: suggestion.texto,
              notas: `Horas totais: ${suggestion.horasTotal || suggestion.horas || 0}`
            })
            .select('id')
            .single()
          entidadeCriadaId = data?.id
        }
      } else if (tipo === 'tarefas') {
        const suggestion = aiSuggestions?.tarefas?.find(s => s.id === id)
        if (suggestion && obraId) {
          const { data } = await supabase
            .from('tarefas')
            .insert({
              obra_id: obraId,
              titulo: suggestion.tarefa,
              descricao: suggestion.texto,
              prioridade: suggestion.prioridade || 'media',
              status: 'pendente',
              origem_tipo: 'sistema'
            })
            .select('id')
            .single()
          entidadeCriadaId = data?.id
        }
      } else if (tipo === 'naoConformidades') {
        const suggestion = aiSuggestions?.naoConformidades?.find(s => s.id === id)
        if (suggestion && obraId) {
          const { data } = await supabase
            .from('nao_conformidades')
            .insert({
              obra_id: obraId,
              codigo: `NC-${Date.now()}`,
              titulo: suggestion.descricao,
              descricao: suggestion.texto,
              gravidade: suggestion.gravidade || 'menor',
              estado: 'aberta'
            })
            .select('id')
            .single()
          entidadeCriadaId = data?.id
        }
      } else if (tipo === 'trabalhos') {
        const suggestion = aiSuggestions?.trabalhos?.find(s => s.id === id)
        if (suggestion && obraId) {
          const { data } = await supabase
            .from('obras_execucao')
            .insert({
              obra_id: obraId,
              percentagem_execucao: suggestion.percentagem || 0,
              data_registo: new Date().toISOString().split('T')[0],
              notas: suggestion.trabalho
            })
            .select('id')
            .single()
          entidadeCriadaId = data?.id
        }
      }

      // Guardar referência da entidade criada
      if (entidadeCriadaId) {
        await supabase
          .from('ia_sugestoes')
          .update({ entidade_criada_id: entidadeCriadaId })
          .eq('id', id)
      }

      toast.success('Sugestão aceite', 'Entidade criada com sucesso')
    } catch (err) {
      console.error('Erro ao aceitar sugestão:', err)
      toast.error('Erro', 'Não foi possível processar a sugestão')
    }
  }

  const handleRejectSuggestion = async (tipo, id) => {
    setProcessedSuggestions(prev => ({
      ...prev,
      [`${tipo}-${id}`]: 'rejected'
    }))

    try {
      await supabase
        .from('ia_sugestoes')
        .update({
          status: 'rejeitada',
          processado_em: new Date().toISOString()
        })
        .eq('id', id)
    } catch (err) {
      console.error('Erro ao rejeitar sugestão:', err)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoje'
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const getSuggestionStatus = (tipo, id) => processedSuggestions[`${tipo}-${id}`]

  const countPendingSuggestions = () => {
    if (!aiSuggestions) return 0
    let count = 0
    Object.entries(aiSuggestions).forEach(([tipo, items]) => {
      items.forEach(item => {
        if (!getSuggestionStatus(tipo, item.id)) count++
      })
    })
    return count
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <Loader2 className="chat-spinner" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: 'var(--error)' }} />
        <p>{error}</p>
      </div>
    )
  }

  const filteredObras = obras.filter(obra =>
    !searchTerm ||
    obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar mensagens por data
  const messagesByDate = mensagens.reduce((acc, msg) => {
    if (!acc[msg.data]) acc[msg.data] = []
    acc[msg.data].push(msg)
    return acc
  }, {})

  // Calcular grid columns baseado em mobile/desktop e painel IA
  const getGridColumns = () => {
    if (isMobile) {
      // Em mobile: se tem obra selecionada, mostrar só o chat; senão, mostrar só a lista
      return selectedObra ? '1fr' : '1fr'
    }
    return showAIPanel ? '260px 1fr 340px' : '260px 1fr'
  }

  return (
    <div className="chat-fullwidth" style={{
      display: 'grid',
      gridTemplateColumns: getGridColumns(),
      height: isMobile ? 'calc(100vh - 56px)' : '100vh',
      background: 'var(--cream)',
      overflow: 'hidden',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      {/* Sidebar - Lista de Obras */}
      <div style={{
        background: '#1e1e2d',
        color: 'white',
        display: isMobile && selectedObra ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/obras')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.8)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Voltar ao Dashboard Obras"
            >
              <Home style={{ width: 16, height: 16 }} />
            </button>
            <Phone style={{ width: 18, height: 18, color: '#25D366' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Chat Obras</span>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 6,
              padding: '6px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            <Settings style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Status conexão */}
        <div style={{
          padding: '10px 16px',
          background: whatsappConnected ? 'rgba(37, 211, 102, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12
        }}>
          {whatsappConnected ? (
            <>
              <Wifi style={{ width: 14, height: 14, color: '#25D366' }} />
              <span style={{ color: '#25D366' }}>WhatsApp conectado</span>
            </>
          ) : (
            <>
              <WifiOff style={{ width: 14, height: 14, color: '#FFC107' }} />
              <span style={{ color: '#FFC107' }}>Configurar Twilio</span>
            </>
          )}
        </div>

        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            padding: '8px 12px'
          }}>
            <Search style={{ width: 14, height: 14, opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredObras.map(obra => (
            <button
              key={obra.id}
              onClick={() => setSelectedObra(obra)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: selectedObra?.id === obra.id ? 'rgba(37, 211, 102, 0.15)' : 'transparent',
                border: 'none',
                borderLeft: selectedObra?.id === obra.id ? '3px solid #25D366' : '3px solid transparent',
                color: selectedObra?.id === obra.id ? 'white' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: selectedObra?.id === obra.id ? '#25D366' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <HardHat style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>
                  {obra.codigo}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obra.nome}
                </div>
              </div>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#25D366',
                opacity: Math.random() > 0.5 ? 1 : 0 // Simular mensagens não lidas
              }} />
            </button>
          ))}
        </div>
      </div>

      {/* Centro - Chat WhatsApp Style */}
      <div style={{
        display: isMobile && !selectedObra ? 'none' : 'flex',
        flexDirection: 'column',
        background: '#ECE5DD',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cfc4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        position: 'relative',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        {selectedObra ? (
          <>
            {/* Header do chat */}
            <div style={{
              padding: '10px 16px',
              background: '#075E54',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white'
            }}>
              <button
                onClick={() => setSelectedObra(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                title="Voltar"
              >
                <ArrowLeft style={{ width: 20, height: 20 }} />
              </button>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <HardHat style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{selectedObra.nome}</h3>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{selectedObra.codigo} • Manuel Encarregado</p>
              </div>
              <button
                onClick={() => setShowContactModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Gerir contactos"
              >
                <Users style={{ width: 18, height: 18 }} />
                {obraContacts.length > 0 && (
                  <span style={{
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 11
                  }}>
                    {obraContacts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                style={{
                  background: showAIPanel ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13
                }}
              >
                <Bot style={{ width: 18, height: 18 }} />
                <span>IA</span>
                {countPendingSuggestions() > 0 && (
                  <span style={{
                    background: '#FF5722',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600
                  }}>
                    {countPendingSuggestions()}
                  </span>
                )}
              </button>
            </div>

            {/* Mensagens */}
            <div ref={messagesContainerRef} style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
              position: 'relative'
            }}>
              {Object.entries(messagesByDate).map(([date, msgs]) => (
                <div key={date}>
                  {/* Separador de data */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.9)',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#667781',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {formatDate(date)}
                    </span>
                  </div>

                  {/* Mensagens do dia */}
                  {msgs.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.tipo === 'enviada' ? 'flex-end' : 'flex-start',
                        marginBottom: 8
                      }}
                    >
                      <div style={{
                        maxWidth: '65%',
                        background: msg.tipo === 'enviada' ? '#DCF8C6' : 'white',
                        borderRadius: msg.tipo === 'enviada' ? '8px 0 8px 8px' : '0 8px 8px 8px',
                        padding: '8px 12px',
                        boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
                      }}>
                        {msg.tipo === 'recebida' && (
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#075E54',
                            marginBottom: 2
                          }}>
                            {msg.autor}
                          </div>
                        )}
                        {/* Show photo if exists */}
                        {msg.anexos && msg.anexos.length > 0 && msg.anexos[0]?.url && (
                          <img
                            src={msg.anexos[0].url}
                            alt="Foto"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 300,
                              borderRadius: 8,
                              marginBottom: 4,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(msg.anexos[0].url, '_blank')}
                          />
                        )}
                        {msg.conteudo && msg.conteudo !== '📷 Foto' && (
                          <p style={{ margin: 0, fontSize: 14, color: '#303030', lineHeight: 1.4 }}>
                            {msg.conteudo}
                          </p>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4,
                          marginTop: 4
                        }}>
                          <span style={{ fontSize: 11, color: '#667781' }}>{msg.hora}</span>
                          {msg.tipo === 'enviada' && (
                            msg.lida ?
                              <CheckCheck style={{ width: 16, height: 16, color: '#53BDEB' }} /> :
                              <Check style={{ width: 16, height: 16, color: '#667781' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div style={{
              padding: '10px 16px',
              background: '#F0F2F5',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <button style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                color: '#54656F'
              }}>
                <Image style={{ width: 24, height: 24 }} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escreve uma mensagem..."
                style={{
                  flex: 1,
                  background: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                style={{
                  background: '#075E54',
                  border: 'none',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: newMessage.trim() ? 'pointer' : 'default',
                  opacity: newMessage.trim() ? 1 : 0.5
                }}
              >
                <Send style={{ width: 20, height: 20, color: 'white' }} />
              </button>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#667781',
            background: '#F0F2F5'
          }}>
            <div style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <MessageSquare style={{ width: 80, height: 80, color: 'white' }} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 300, color: '#41525D' }}>
              Chat Obras + IA
            </h2>
            <p style={{ margin: 0, fontSize: 14, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
              Seleciona uma obra para ver as mensagens do WhatsApp.<br/>
              A IA analisa automaticamente para detetar requisições de materiais,
              registos de horas, atualizações de trabalhos e mais.
            </p>
          </div>
        )}
      </div>

      {/* Painel direito - IA Insights */}
      {showAIPanel && selectedObra && !isMobile && (
        <div style={{
          background: 'white',
          borderLeft: '1px solid #E5E5E5',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header IA */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #E5E5E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles style={{ width: 16, height: 16, color: 'white' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Análise IA</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#888' }}>
                  {analyzingAI ? 'A analisar...' : `${countPendingSuggestions()} sugestões pendentes`}
                </p>
              </div>
            </div>
            <button
              onClick={triggerAIAnalysis}
              disabled={analyzingAI}
              style={{
                background: '#F5F5F5',
                border: 'none',
                borderRadius: 6,
                padding: 6,
                cursor: 'pointer'
              }}
            >
              <RefreshCw style={{
                width: 16,
                height: 16,
                color: '#666',
                animation: analyzingAI ? 'spin 1s linear infinite' : 'none'
              }} />
            </button>
          </div>

          {/* Sugestões */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {analyzingAI ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 12
              }}>
                <Loader2 style={{ width: 32, height: 32, color: '#667EEA', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#888', fontSize: 13 }}>A analisar mensagens...</p>
              </div>
            ) : aiSuggestions && (
              <>
                {/* Requisições de Materiais */}
                <SuggestionSection
                  title="Requisições de Material"
                  icon={<Package style={{ width: 16, height: 16 }} />}
                  color="#FF9800"
                  items={aiSuggestions.materiais}
                  tipo="materiais"
                  renderItem={(item) => (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.material}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {item.quantidade} {item.unidade}
                        {item.urgente && <span style={{ color: '#F44336', marginLeft: 8 }}>• Urgente</span>}
                      </div>
                    </>
                  )}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  getStatus={getSuggestionStatus}
                />

                {/* Registo de Horas */}
                <SuggestionSection
                  title="Registo de Horas"
                  icon={<Clock style={{ width: 16, height: 16 }} />}
                  color="#2196F3"
                  items={aiSuggestions.horas}
                  tipo="horas"
                  renderItem={(item) => (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {item.pessoas ? `${item.pessoas} pessoas` : item.pessoa}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {item.horasTotal || item.horas}h • {formatDate(item.data)}
                      </div>
                    </>
                  )}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  getStatus={getSuggestionStatus}
                />

                {/* Trabalhos Executados */}
                <SuggestionSection
                  title="Trabalhos Executados"
                  icon={<Wrench style={{ width: 16, height: 16 }} />}
                  color="#4CAF50"
                  items={aiSuggestions.trabalhos}
                  tipo="trabalhos"
                  renderItem={(item) => (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.trabalho}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Progresso: {item.percentagem}%
                      </div>
                      <div style={{
                        height: 4,
                        background: '#E5E5E5',
                        borderRadius: 2,
                        marginTop: 4,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percentagem}%`,
                          background: '#4CAF50',
                          borderRadius: 2
                        }} />
                      </div>
                    </>
                  )}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  getStatus={getSuggestionStatus}
                />

                {/* Novas Tarefas */}
                <SuggestionSection
                  title="Novas Tarefas"
                  icon={<ListTodo style={{ width: 16, height: 16 }} />}
                  color="#9C27B0"
                  items={aiSuggestions.tarefas}
                  tipo="tarefas"
                  renderItem={(item) => (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.tarefa}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Prioridade: <span style={{
                          color: item.prioridade === 'alta' ? '#F44336' :
                                 item.prioridade === 'media' ? '#FF9800' : '#4CAF50'
                        }}>
                          {item.prioridade}
                        </span>
                      </div>
                    </>
                  )}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  getStatus={getSuggestionStatus}
                />

                {/* Não Conformidades */}
                <SuggestionSection
                  title="Não Conformidades"
                  icon={<AlertTriangle style={{ width: 16, height: 16 }} />}
                  color="#F44336"
                  items={aiSuggestions.naoConformidades}
                  tipo="naoConformidades"
                  renderItem={(item) => (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.descricao}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Gravidade: <span style={{
                          color: item.gravidade === 'alta' ? '#F44336' :
                                 item.gravidade === 'media' ? '#FF9800' : '#4CAF50'
                        }}>
                          {item.gravidade}
                        </span>
                      </div>
                    </>
                  )}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  getStatus={getSuggestionStatus}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #E5E5E5',
            background: '#FAFAFA',
            fontSize: 11,
            color: '#888',
            textAlign: 'center'
          }}>
            Análise por IA • Os dados devem ser verificados
          </div>
        </div>
      )}

      {/* Modal de Configuração */}
      {showConfig && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowConfig(false)}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: 480,
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Configuração Twilio WhatsApp</h3>
              <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {whatsappConnected && (
              <div style={{
                padding: 12,
                background: '#E8F5E9',
                borderRadius: 8,
                fontSize: 13,
                color: '#2E7D32',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Wifi style={{ width: 16, height: 16 }} />
                WhatsApp conectado • {twilioConfig.phoneNumber}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Account SID *
                </label>
                <input
                  type="text"
                  value={twilioConfig.accountSid}
                  onChange={(e) => setTwilioConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Auth Token * {whatsappConnected && <span style={{ color: '#888', fontWeight: 400 }}>(deixa vazio para manter)</span>}
                </label>
                <input
                  type="password"
                  value={twilioConfig.authToken}
                  onChange={(e) => setTwilioConfig(prev => ({ ...prev, authToken: e.target.value }))}
                  placeholder={whatsappConnected ? "••••••••••••••••••••••••••••••••" : "Colar Auth Token aqui"}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Número WhatsApp (Twilio) *
                </label>
                <input
                  type="text"
                  value={twilioConfig.phoneNumber}
                  onChange={(e) => setTwilioConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+14155238886"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#888' }}>
                  Formato internacional com + (ex: +14155238886)
                </p>
              </div>

              {configError && (
                <div style={{
                  padding: 12,
                  background: '#FFEBEE',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#C62828',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertCircle style={{ width: 16, height: 16 }} />
                  {configError}
                </div>
              )}

              <div style={{
                padding: 12,
                background: '#F5F5F5',
                borderRadius: 8,
                fontSize: 13,
                color: '#666'
              }}>
                <strong>Como obter credenciais Twilio:</strong>
                <ol style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.6 }}>
                  <li>Acede a <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ color: '#075E54' }}>console.twilio.com</a></li>
                  <li>Copia o Account SID e Auth Token</li>
                  <li>Vai a Messaging → Try it out → Send a WhatsApp message</li>
                  <li>Copia o número do Sandbox (ou ativa WhatsApp Business)</li>
                </ol>
              </div>

              <div style={{
                padding: 12,
                background: '#FFF8E1',
                borderRadius: 8,
                fontSize: 12,
                color: '#F57F17'
              }}>
                <strong>Webhook URL:</strong> Configura este URL no Twilio para receber mensagens:
                <code style={{
                  display: 'block',
                  marginTop: 6,
                  padding: 8,
                  background: 'rgba(0,0,0,0.05)',
                  borderRadius: 4,
                  wordBreak: 'break-all'
                }}>
                  https://vctcppuvqjstscbzdykn.supabase.co/functions/v1/twilio-webhook
                </code>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => {
                    setShowConfig(false)
                    setConfigError('')
                  }}
                  style={{
                    padding: '12px 20px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={testTwilioConnection}
                  disabled={savingConfig}
                  style={{
                    padding: '12px 20px',
                    border: '1px solid #075E54',
                    borderRadius: 8,
                    background: 'white',
                    color: '#075E54',
                    cursor: savingConfig ? 'wait' : 'pointer',
                    fontSize: 14,
                    opacity: savingConfig ? 0.6 : 1
                  }}
                >
                  Testar
                </button>
                <button
                  onClick={saveTwilioConfig}
                  disabled={savingConfig}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#25D366',
                    color: 'white',
                    cursor: savingConfig ? 'wait' : 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: savingConfig ? 0.6 : 1
                  }}
                >
                  {savingConfig ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      A guardar...
                    </>
                  ) : (
                    'Guardar Configuração'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contactos */}
      {showContactModal && selectedObra && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowContactModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: 500,
            maxWidth: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Contactos WhatsApp - {selectedObra.codigo}</h3>
              <button onClick={() => setShowContactModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Adicionar novo contacto */}
            <div style={{
              background: '#F5F5F5',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Adicionar Contacto</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newContact.nome}
                  onChange={(e) => setNewContact(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome"
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
                <input
                  type="text"
                  value={newContact.telefone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="+351 912 345 678"
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  value={newContact.funcao}
                  onChange={(e) => setNewContact(prev => ({ ...prev, funcao: e.target.value }))}
                  placeholder="Função (ex: Encarregado, Cliente...)"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
                <button
                  onClick={saveContact}
                  disabled={savingContact || !newContact.nome || !newContact.telefone}
                  style={{
                    padding: '10px 20px',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: savingContact ? 'wait' : 'pointer',
                    opacity: (!newContact.nome || !newContact.telefone) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Lista de contactos */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#666' }}>
                Contactos ({obraContacts.length})
              </h4>
              {obraContacts.length === 0 ? (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  color: '#888',
                  background: '#FAFAFA',
                  borderRadius: 8
                }}>
                  <Users style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Sem contactos registados para esta obra</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {obraContacts.map(contact => (
                    <div
                      key={contact.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: '#FAFAFA',
                        borderRadius: 8,
                        border: '1px solid #E5E5E5'
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#25D366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 14
                      }}>
                        {contact.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{contact.nome}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>
                          {contact.telefone}
                          {contact.cargo && <span style={{ marginLeft: 8, opacity: 0.7 }}>• {contact.cargo}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          color: '#999',
                          borderRadius: 4
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#F44336'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              marginTop: 20,
              padding: 12,
              background: '#E3F2FD',
              borderRadius: 8,
              fontSize: 12,
              color: '#1565C0'
            }}>
              <strong>Dica:</strong> O primeiro contacto da lista será usado como destinatário por defeito ao enviar mensagens.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Garantir scroll suave em mobile */
        .chat-fullwidth {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }

        /* Prevenir pull-to-refresh no chat */
        .chat-fullwidth > div {
          overscroll-behavior: contain;
        }
      `}</style>
    </div>
  )
}

// Componente para secções de sugestões
function SuggestionSection({ title, icon, color, items, tipo, renderItem, onAccept, onReject, getStatus }) {
  const [expanded, setExpanded] = useState(true)
  const pendingCount = items.filter(item => !getStatus(tipo, item.id)).length

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: `${color}15`,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: expanded ? 8 : 0
        }}
      >
        <div style={{ color }}>{icon}</div>
        <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#333' }}>
          {title}
        </span>
        {pendingCount > 0 && (
          <span style={{
            background: color,
            color: 'white',
            borderRadius: 10,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600
          }}>
            {pendingCount}
          </span>
        )}
        <ChevronRight style={{
          width: 16,
          height: 16,
          color: '#888',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s'
        }} />
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => {
            const status = getStatus(tipo, item.id)
            return (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  background: status === 'accepted' ? '#E8F5E9' :
                              status === 'rejected' ? '#FFEBEE' : '#FAFAFA',
                  borderRadius: 8,
                  border: `1px solid ${status === 'accepted' ? '#C8E6C9' :
                                       status === 'rejected' ? '#FFCDD2' : '#E5E5E5'}`,
                  opacity: status ? 0.7 : 1
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  {renderItem(item)}
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#999',
                  marginBottom: 8,
                  fontStyle: 'italic',
                  padding: '6px 8px',
                  background: 'rgba(0,0,0,0.03)',
                  borderRadius: 4
                }}>
                  "{item.texto}"
                </div>
                {!status && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onAccept(tipo, item.id)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Check style={{ width: 14, height: 14 }} />
                      Criar
                    </button>
                    <button
                      onClick={() => onReject(tipo, item.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#F5F5F5',
                        color: '#666',
                        border: '1px solid #DDD',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                )}
                {status && (
                  <div style={{
                    fontSize: 12,
                    color: status === 'accepted' ? '#4CAF50' : '#F44336',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {status === 'accepted' ? (
                      <><Check style={{ width: 14, height: 14 }} /> Criado</>
                    ) : (
                      <><X style={{ width: 14, height: 14 }} /> Ignorado</>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
