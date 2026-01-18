import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Search, Send, Image, X, HardHat, MessageSquare, Loader2, AlertCircle,
  Phone, Settings, Check, CheckCheck, Clock, Package, Users, Wrench,
  AlertTriangle, ListTodo, Sparkles, ChevronRight, RefreshCw, Plus,
  ExternalLink, Wifi, WifiOff, Bot, Eye, EyeOff
} from 'lucide-react'

// Dados mock para demonstrar funcionalidades da IA
const MOCK_AI_SUGGESTIONS = {
  materiais: [
    { id: 1, texto: 'Preciso de 50 sacos de cimento para amanhã', material: 'Cimento', quantidade: 50, unidade: 'sacos', urgente: true, mensagemId: 1 },
    { id: 2, texto: 'Faltam tubos de 110mm, uns 20 metros', material: 'Tubo PVC 110mm', quantidade: 20, unidade: 'm', urgente: false, mensagemId: 3 },
  ],
  horas: [
    { id: 1, texto: 'Hoje estivemos cá das 8h às 17h, 4 pessoas', pessoas: 4, horasTotal: 36, data: '2025-01-17', mensagemId: 2 },
    { id: 2, texto: 'O João saiu mais cedo, só fez 6 horas', pessoa: 'João', horas: 6, data: '2025-01-17', mensagemId: 4 },
  ],
  trabalhos: [
    { id: 1, texto: 'Acabámos de betonar a laje do 1º andar', trabalho: 'Betonagem laje 1º andar', percentagem: 100, mensagemId: 5 },
    { id: 2, texto: 'Estamos a meio das paredes da cozinha', trabalho: 'Alvenaria cozinha', percentagem: 50, mensagemId: 6 },
  ],
  tarefas: [
    { id: 1, texto: 'Amanhã temos de chamar o eletricista para ver o quadro', tarefa: 'Contactar eletricista - verificar quadro', prioridade: 'alta', mensagemId: 7 },
    { id: 2, texto: 'Não esquecer de encomendar as janelas', tarefa: 'Encomendar janelas', prioridade: 'media', mensagemId: 8 },
  ],
  naoConformidades: [
    { id: 1, texto: 'O ferro que chegou está todo oxidado', descricao: 'Ferro oxidado na entrega', gravidade: 'media', mensagemId: 9 },
    { id: 2, texto: 'A parede ficou fora de esquadria, vamos ter de demolir', descricao: 'Parede fora de esquadria - necessita demolição', gravidade: 'alta', mensagemId: 10 },
  ]
}

// Mensagens mock estilo WhatsApp
const MOCK_WHATSAPP_MESSAGES = [
  { id: 1, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Bom dia! Preciso de 50 sacos de cimento para amanhã, conseguem enviar?', hora: '08:32', data: '2025-01-17' },
  { id: 2, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Hoje estivemos cá das 8h às 17h, 4 pessoas a trabalhar na estrutura', hora: '17:45', data: '2025-01-17' },
  { id: 3, tipo: 'enviada', autor: 'Gavinho', conteudo: 'Boa tarde Manuel! Vou verificar o stock e já digo algo.', hora: '18:02', data: '2025-01-17', lida: true },
  { id: 4, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'O João saiu mais cedo hoje, só fez 6 horas. Tinha consulta médica.', hora: '18:15', data: '2025-01-17' },
  { id: 5, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Acabámos de betonar a laje do 1º andar! Correu tudo bem 💪', hora: '16:30', data: '2025-01-18' },
  { id: 6, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Estamos a meio das paredes da cozinha, amanhã devemos acabar', hora: '17:00', data: '2025-01-18' },
  { id: 7, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Amanhã temos de chamar o eletricista para ver o quadro, está a dar problemas', hora: '17:15', data: '2025-01-18' },
  { id: 8, tipo: 'enviada', autor: 'Gavinho', conteudo: 'Ok, vou contactar o Sr. António amanhã de manhã.', hora: '17:20', data: '2025-01-18', lida: true },
  { id: 9, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'Atenção que o ferro que chegou hoje está todo oxidado, não podemos usar', hora: '09:00', data: '2025-01-18', imagem: null },
  { id: 10, tipo: 'recebida', autor: 'Manuel Encarregado', telefone: '+351912345678', conteudo: 'A parede da suite ficou fora de esquadria, vamos ter de demolir e refazer 😔', hora: '11:30', data: '2025-01-18' },
]

export default function ChatObras() {
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Estados WhatsApp
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [mensagens, setMensagens] = useState([])

  // Estados IA
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [processedSuggestions, setProcessedSuggestions] = useState({})

  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      loadMensagens()
      loadAISugestoes()
      // Subscrever a novas mensagens em tempo real
      const channel = supabase
        .channel(`whatsapp_${selectedObra.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `obra_id=eq.${selectedObra.id}`
        }, () => {
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
      const { data } = await supabase
        .from('whatsapp_config')
        .select('ativo')
        .eq('ativo', true)
        .single()
      setWhatsappConnected(!!data)
    } catch {
      setWhatsappConnected(false)
    }
  }

  // Carregar mensagens WhatsApp da obra
  const loadMensagens = async () => {
    if (!selectedObra) return

    try {
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('obra_id', selectedObra.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Se houver mensagens reais, usar; senão, usar mock
      if (data && data.length > 0) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          tipo: msg.tipo,
          autor: msg.autor_nome || msg.telefone_origem,
          telefone: msg.telefone_origem,
          conteudo: msg.conteudo,
          hora: new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          data: msg.created_at.split('T')[0],
          lida: msg.lida,
          anexos: msg.anexos
        }))
        setMensagens(formattedMessages)
      } else {
        // Usar dados mock para demonstração
        setMensagens(MOCK_WHATSAPP_MESSAGES)
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
      // Fallback para mock
      setMensagens(MOCK_WHATSAPP_MESSAGES)
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
        // Usar dados mock para demonstração
        setAiSuggestions(MOCK_AI_SUGGESTIONS)
      }
    } catch (err) {
      console.error('Erro ao carregar sugestões IA:', err)
      // Fallback para mock
      setAiSuggestions(MOCK_AI_SUGGESTIONS)
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
    try {
      // Adicionar mensagem localmente primeiro (optimistic update)
      const novaMensagem = {
        id: Date.now(),
        tipo: 'enviada',
        autor: 'Gavinho',
        conteudo: newMessage.trim(),
        hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        data: new Date().toISOString().split('T')[0],
        lida: false
      }
      setMensagens(prev => [...prev, novaMensagem])
      const messageContent = newMessage.trim()
      setNewMessage('')

      // Se WhatsApp estiver configurado, enviar via Twilio
      if (whatsappConnected) {
        // Obter contacto principal da obra
        const { data: contacto } = await supabase
          .from('whatsapp_contactos')
          .select('telefone')
          .eq('obra_id', selectedObra.id)
          .limit(1)
          .single()

        if (contacto) {
          await supabase.functions.invoke('twilio-send', {
            body: {
              to: contacto.telefone,
              body: messageContent,
              obra_id: selectedObra.id
            }
          })
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
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

      // TODO: Criar entidade correspondente (requisição, tarefa, etc.)
      // Dependendo do tipo, criar na tabela apropriada
    } catch (err) {
      console.error('Erro ao aceitar sugestão:', err)
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

  return (
    <div className="chat-fullwidth" style={{
      display: 'grid',
      gridTemplateColumns: showAIPanel ? '260px 1fr 340px' : '260px 1fr',
      height: '100vh',
      background: 'var(--cream)',
      overflow: 'hidden',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      {/* Sidebar - Lista de Obras */}
      <div style={{
        background: '#1e1e2d',
        color: 'white',
        display: 'flex',
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
        display: 'flex',
        flexDirection: 'column',
        background: '#ECE5DD',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cfc4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        position: 'relative'
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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
                        <p style={{ margin: 0, fontSize: 14, color: '#303030', lineHeight: 1.4 }}>
                          {msg.conteudo}
                        </p>
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
      {showAIPanel && selectedObra && (
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
            width: 450,
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Configuração Twilio WhatsApp</h3>
              <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Account SID
                </label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Auth Token
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Número WhatsApp (Twilio)
                </label>
                <input
                  type="text"
                  placeholder="+1 415 XXX XXXX"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DDD',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{
                padding: 12,
                background: '#FFF3E0',
                borderRadius: 8,
                fontSize: 13,
                color: '#E65100'
              }}>
                <strong>Nota:</strong> Precisas de uma conta Twilio com WhatsApp Business API ativada.
                <a href="https://www.twilio.com/whatsapp" target="_blank" rel="noopener noreferrer" style={{ color: '#E65100', marginLeft: 4 }}>
                  Saber mais
                </a>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setShowConfig(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
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
                  onClick={() => {
                    setWhatsappConnected(true)
                    setShowConfig(false)
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#25D366',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  Conectar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
    </div>
  )
}
