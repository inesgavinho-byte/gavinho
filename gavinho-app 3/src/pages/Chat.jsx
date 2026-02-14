import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Search, Send, Image, X, ChevronDown, ChevronRight, Plus, 
  Building2, HardHat, MessageSquare, Loader2, AlertCircle,
  FileText, PencilRuler, Layout, Stamp, Lock, Pin, 
  MessageCircle, ArrowLeft, Hash, CheckSquare, MoreVertical,
  Bell, ExternalLink, Calendar
} from 'lucide-react'

// Mapeamento de ícones por categoria
const CANAL_ICONS = {
  'escopo': FileText,
  'estudo_previo': PencilRuler,
  'projeto_base': Layout,
  'archviz': Image,
  'licenciamento': Stamp,
  'default': Hash
}

// Padrões para detectar tarefas automaticamente
const TASK_PATTERNS = [
  /\b(temos de|temos que|precisamos de|precisamos|é preciso|é necessário)\b/i,
  /\b(tens de|tens que|preciso que|podes|podem|consegues)\b/i,
  /\b(fazer|enviar|confirmar|verificar|contactar|ligar|agendar|marcar|preparar|finalizar|concluir|entregar|rever|atualizar)\b/i,
  /\b(até dia|prazo|deadline|urgente|asap|logo que possível)\b/i,
  /\b(tarefa|to.?do|action item|ação|pendente)\b/i,
  /\b(não esquecer|lembrar de|importante)\b/i
]

// Detectar se mensagem parece uma tarefa
const detectsTask = (text) => {
  if (!text || text.length < 10) return false
  return TASK_PATTERNS.some(pattern => pattern.test(text))
}

// Extrair título da tarefa do texto
const extractTaskTitle = (text) => {
  // Limitar a 100 caracteres e limpar
  let title = text.trim()
  if (title.length > 100) {
    title = title.substring(0, 97) + '...'
  }
  return title
}

export default function Chat() {
  const [activeMode, setActiveMode] = useState('project')
  const [activeTab, setActiveTab] = useState('chat') // 'chat' ou 'pinned'
  const [projetos, setProjetos] = useState([])
  const [selectedProjeto, setSelectedProjeto] = useState(null)
  const [expandedProjetos, setExpandedProjetos] = useState({})
  const [canais, setCanais] = useState([])
  const [selectedCanal, setSelectedCanal] = useState(null)
  const [topicos, setTopicos] = useState([])
  const [selectedTopico, setSelectedTopico] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [mensagensFixadas, setMensagensFixadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [showNovoTopico, setShowNovoTopico] = useState(false)
  const [novoTopicoTitulo, setNovoTopicoTitulo] = useState('')
  const [novoTopicoDescricao, setNovoTopicoDescricao] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFotos, setSelectedFotos] = useState([])
  
  // Estados para tarefas e notificações
  const [notifications, setNotifications] = useState([])
  const [showMsgMenu, setShowMsgMenu] = useState(null)
  const [showCriarTarefa, setShowCriarTarefa] = useState(null)
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('')
  const [novaTarefaData, setNovaTarefaData] = useState('')

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const fileInputRefSite = useRef(null)
  let currentSubscription = null

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  // Limpar notificações após 5 segundos
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  useEffect(() => {
    if (activeMode === 'project') {
      loadProjetos()
    } else {
      loadObras()
    }
    setSelectedProjeto(null)
    setSelectedCanal(null)
    setSelectedTopico(null)
    setCanais([])
    setTopicos([])
    setMensagens([])
    setMensagensFixadas([])
    setActiveTab('chat')
  }, [activeMode])

  useEffect(() => {
    if (selectedProjeto && activeMode === 'project') {
      loadCanaisProjeto(selectedProjeto.id)
      loadMensagensFixadasProjeto(selectedProjeto.id)
    }
  }, [selectedProjeto])

  useEffect(() => {
    if (selectedCanal && activeMode === 'project') {
      loadTopicos(selectedCanal.id)
    } else if (selectedCanal && activeMode === 'site') {
      loadMensagensFixadasCanal(selectedCanal.id)
    }
  }, [selectedCanal])

  useEffect(() => {
    if (selectedTopico) {
      loadMensagensTopico(selectedTopico.id)
      subscribeToTopico(selectedTopico.id)
    } else if (selectedCanal && activeMode === 'site') {
      loadMensagensCanal(selectedCanal.id)
      subscribeToCanal(selectedCanal.id)
    }
    return () => {
      if (currentSubscription) currentSubscription.unsubscribe()
    }
  }, [selectedTopico, selectedCanal, activeMode])

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMsgMenu && !e.target.closest('.chat-msg-menu') && !e.target.closest('.chat-msg-action-btn')) {
        setShowMsgMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMsgMenu])

  // Adicionar notificação
  const addNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
  }

  // Data Loading Functions
  const loadProjetos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projetos')
        .select('id, codigo, nome, fase, status')
        .order('codigo', { ascending: false })
      
      if (error) throw error
      setProjetos(data || [])
    } catch (err) {
      setError('Erro ao carregar projetos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadObras = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_canais')
        .select(`
          id, nome, tipo, obra_id,
          obra:obras(id, codigo, nome, status)
        `)
        .eq('tipo', 'obra')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCanais(data || [])
    } catch (err) {
      setError('Erro ao carregar obras')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCanaisProjeto = async (projetoId) => {
    try {
      const { data, error } = await supabase
        .from('chat_canais')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('tipo', 'projeto')
        .order('ordem', { ascending: true })
      
      if (error) throw error
      setCanais(data || [])
    } catch (err) {
      console.error('Erro ao carregar canais:', err)
    }
  }

  const loadTopicos = async (canalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_topicos')
        .select('*')
        .eq('canal_id', canalId)
        .order('fixado', { ascending: false })
        .order('ultima_resposta_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTopicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar tópicos:', err)
    }
  }

  const loadMensagensTopico = async (topicoId) => {
    try {
      setLoadingMensagens(true)
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('topico_id', topicoId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMensagens(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoadingMensagens(false)
    }
  }

  const loadMensagensCanal = async (canalId) => {
    try {
      setLoadingMensagens(true)
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('canal_id', canalId)
        .is('topico_id', null)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMensagens(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoadingMensagens(false)
    }
  }

  const loadMensagensFixadasProjeto = async (projetoId) => {
    try {
      // Primeiro buscar canais do projeto
      const { data: canais, error: canaisError } = await supabase
        .from('chat_canais')
        .select('id')
        .eq('projeto_id', projetoId)
      
      if (canaisError) throw canaisError
      if (!canais || canais.length === 0) {
        setMensagensFixadas([])
        return
      }
      
      const canalIds = canais.map(c => c.id)
      
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .in('canal_id', canalIds)
        .eq('fixada', true)
        .order('fixada_at', { ascending: false })
      
      if (error) throw error
      setMensagensFixadas(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens fixadas:', err)
      setMensagensFixadas([])
    }
  }

  const loadMensagensFixadasCanal = async (canalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('canal_id', canalId)
        .eq('fixada', true)
        .order('fixada_at', { ascending: false })
      
      if (error) throw error
      setMensagensFixadas(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens fixadas:', err)
      setMensagensFixadas([])
    }
  }

  const subscribeToTopico = (topicoId) => {
    if (currentSubscription) currentSubscription.unsubscribe()
    
    currentSubscription = supabase
      .channel(`topico-${topicoId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `topico_id=eq.${topicoId}` },
        payload => {
          setMensagens(prev => [...prev, payload.new])
          // Verificar se é tarefa automática
          if (detectsTask(payload.new.conteudo)) {
            handleAutoCreateTask(payload.new)
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_mensagens', filter: `topico_id=eq.${topicoId}` },
        payload => {
          setMensagens(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
        }
      )
      .subscribe()
  }

  const subscribeToCanal = (canalId) => {
    if (currentSubscription) currentSubscription.unsubscribe()
    
    currentSubscription = supabase
      .channel(`canal-${canalId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${canalId}` },
        payload => {
          if (!payload.new.topico_id) {
            setMensagens(prev => [...prev, payload.new])
            // Verificar se é tarefa automática
            if (detectsTask(payload.new.conteudo)) {
              handleAutoCreateTask(payload.new)
            }
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${canalId}` },
        payload => {
          if (!payload.new.topico_id) {
            setMensagens(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          }
        }
      )
      .subscribe()
  }

  // PIN Functions
  const handlePinMessage = async (mensagem) => {
    try {
      const newPinState = !mensagem.fixada
      const { error } = await supabase
        .from('chat_mensagens')
        .update({
          fixada: newPinState,
          fixada_por: newPinState ? 'Inês Gavinho' : null,
          fixada_at: newPinState ? new Date().toISOString() : null
        })
        .eq('id', mensagem.id)
      
      if (error) throw error
      
      // Atualizar estado local
      setMensagens(prev => prev.map(m => 
        m.id === mensagem.id 
          ? { ...m, fixada: newPinState, fixada_por: newPinState ? 'Inês Gavinho' : null }
          : m
      ))
      
      if (newPinState) {
        setMensagensFixadas(prev => [{ ...mensagem, fixada: true, fixada_por: 'Inês Gavinho', fixada_at: new Date().toISOString() }, ...prev])
        addNotification('Mensagem fixada')
      } else {
        setMensagensFixadas(prev => prev.filter(m => m.id !== mensagem.id))
        addNotification('Mensagem desafixada')
      }
      
      setShowMsgMenu(null)
    } catch (err) {
      console.error('Erro ao fixar mensagem:', err)
      addNotification('Erro ao fixar mensagem', 'error')
    }
  }

  // TASK Functions
  const handleAutoCreateTask = async (mensagem) => {
    // Não criar se já tem tarefa
    if (mensagem.tarefa_criada) return
    
    try {
      const titulo = extractTaskTitle(mensagem.conteudo)
      
      // Criar tarefa
      const { data: tarefa, error: tarefaError } = await supabase
        .from('tarefas')
        .insert({
          titulo,
          projeto_id: selectedProjeto?.id || null,
          obra_id: selectedCanal?.obra_id || null,
          status: 'pendente',
          prioridade: 'Media',
          mensagem_origem_id: mensagem.id,
          criada_automaticamente: true
        })
        .select()
        .single()
      
      if (tarefaError) throw tarefaError
      
      // Atualizar mensagem
      const { error: msgError } = await supabase
        .from('chat_mensagens')
        .update({
          tarefa_criada: true,
          tarefa_id: tarefa.id
        })
        .eq('id', mensagem.id)
      
      if (msgError) throw msgError
      
      // Atualizar estado local
      setMensagens(prev => prev.map(m => 
        m.id === mensagem.id 
          ? { ...m, tarefa_criada: true, tarefa_id: tarefa.id, tarefa }
          : m
      ))
      
      addNotification(`Tarefa criada: ${tarefa.codigo}`)
    } catch (err) {
      console.error('Erro ao criar tarefa automática:', err)
    }
  }

  const handleManualCreateTask = async () => {
    if (!showCriarTarefa || !novaTarefaTitulo.trim()) return
    
    try {
      const mensagem = showCriarTarefa
      
      // Criar tarefa (codigo é gerado automaticamente pelo trigger)
      const { data: tarefa, error: tarefaError } = await supabase
        .from('tarefas')
        .insert({
          titulo: novaTarefaTitulo.trim(),
          projeto_id: selectedProjeto?.id || null,
          obra_id: selectedCanal?.obra_id || null,
          data_limite: novaTarefaData || null,
          status: 'todo',
          prioridade: 'media'
        })
        .select()
        .single()
      
      if (tarefaError) throw tarefaError
      
      // Atualizar mensagem
      const { error: msgError } = await supabase
        .from('chat_mensagens')
        .update({
          tarefa_criada: true,
          tarefa_id: tarefa.id
        })
        .eq('id', mensagem.id)
      
      if (msgError) throw msgError
      
      // Atualizar estado local
      setMensagens(prev => prev.map(m => 
        m.id === mensagem.id 
          ? { ...m, tarefa_criada: true, tarefa_id: tarefa.id, tarefa }
          : m
      ))
      
      addNotification(`Tarefa criada: ${tarefa.codigo}`)
      setShowCriarTarefa(null)
      setNovaTarefaTitulo('')
      setNovaTarefaData('')
    } catch (err) {
      console.error('Erro ao criar tarefa:', err)
      addNotification('Erro ao criar tarefa', 'error')
    }
  }

  const openCriarTarefa = (mensagem) => {
    setShowCriarTarefa(mensagem)
    setNovaTarefaTitulo(extractTaskTitle(mensagem.conteudo))
    setNovaTarefaData('')
    setShowMsgMenu(null)
  }

  // Action Handlers
  const handleSelectProjeto = (projeto) => {
    if (selectedProjeto?.id !== projeto.id) {
      setSelectedProjeto(projeto)
      setSelectedCanal(null)
      setSelectedTopico(null)
      setTopicos([])
      setMensagens([])
      setActiveTab('chat')
    }
  }

  const handleSelectCanal = (canal) => {
    if (selectedCanal?.id !== canal.id) {
      setSelectedCanal(canal)
      setSelectedTopico(null)
      setMensagens([])
    }
  }

  const handleSelectTopico = (topico) => {
    setSelectedTopico(topico)
  }

  const handleBackToTopicos = () => {
    setSelectedTopico(null)
    setMensagens([])
  }

  const toggleProjetoExpand = (projetoId) => {
    setExpandedProjetos(prev => ({ ...prev, [projetoId]: !prev[projetoId] }))
  }

  const handleCriarTopico = async () => {
    if (!novoTopicoTitulo.trim() || !selectedCanal) return
    
    try {
      const { data, error } = await supabase
        .from('chat_topicos')
        .insert({
          canal_id: selectedCanal.id,
          titulo: novoTopicoTitulo.trim(),
          descricao: novoTopicoDescricao.trim() || null,
          status: 'aberto',
          criado_por_nome: 'Inês Gavinho'
        })
        .select()
        .single()
      
      if (error) throw error
      
      setTopicos(prev => [data, ...prev])
      setShowNovoTopico(false)
      setNovoTopicoTitulo('')
      setNovoTopicoDescricao('')
      setSelectedTopico(data)
    } catch (err) {
      console.error('Erro ao criar tópico:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFotos.length === 0) {
      return
    }
    if (activeMode === 'project' && !selectedTopico) {
      return
    }
    if (activeMode === 'site' && !selectedCanal) {
      return
    }
    
    setSending(true)
    try {
      // Upload fotos se existirem
      let anexos = []
      if (selectedFotos.length > 0) {
        for (const foto of selectedFotos) {
          const timestamp = Date.now()
          const random = Math.random().toString(36).substring(7)
          const ext = foto.name.split('.').pop()
          const filePath = `chat/${selectedCanal.id}/${timestamp}_${random}.${ext}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('obra-fotos')
            .upload(filePath, foto)
          
          if (uploadError) {
            console.error('Erro upload foto:', uploadError)
            continue
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('obra-fotos')
            .getPublicUrl(filePath)
          
          anexos.push({
            url: publicUrl,
            nome: foto.name,
            tipo: foto.type,
            tamanho: foto.size
          })
        }
      }
      
      const mensagemData = {
        canal_id: selectedCanal.id,
        topico_id: activeMode === 'project' ? selectedTopico.id : null,
        conteudo: newMessage.trim(),
        autor_nome: 'Inês Gavinho',
        tipo: anexos.length > 0 ? 'imagem' : 'texto',
        anexos: anexos.length > 0 ? anexos : null
      }
      
      const { data: novaMensagem, error } = await supabase
        .from('chat_mensagens')
        .insert(mensagemData)
        .select()
        .single()
      
      if (error) throw error
      
      // Verificar se parece tarefa e criar automaticamente
      if (detectsTask(newMessage.trim())) {
        handleAutoCreateTask(novaMensagem)
      }
      
      if (activeMode === 'project' && selectedTopico) {
        await supabase
          .from('chat_topicos')
          .update({ 
            ultima_resposta_at: new Date().toISOString(),
            ultima_resposta_por: 'Inês Gavinho',
            total_mensagens: (selectedTopico.total_mensagens || 0) + 1
          })
          .eq('id', selectedTopico.id)
      }
      
      setNewMessage('')
      setSelectedFotos([])
    } catch (err) {
      console.error('Erro ao enviar:', err)
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

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return 'Agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const getCanalIcon = (canal) => {
    return CANAL_ICONS[canal?.categoria] || CANAL_ICONS.default
  }

  // Render message with actions
  const renderMessage = (msg, index, showAvatar) => {
    return (
      <div key={msg.id} className={`chat-message ${showAvatar ? '' : 'grouped'}`}>
        {showAvatar && (
          <div className="chat-message-avatar">
            {msg.autor_nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div className="chat-message-content">
          {showAvatar && (
            <div className="chat-message-header">
              <span className="chat-message-author">{msg.autor_nome}</span>
              <span className="chat-message-time">{formatDate(msg.created_at)}</span>
              {msg.fixada && <Pin style={{ width: 12, height: 12, color: 'var(--warning)' }} />}
              {msg.tarefa_criada && (
                <span className="chat-task-badge">
                  <CheckSquare style={{ width: 12, height: 12 }} />
                  {msg.tarefa?.codigo}
                </span>
              )}
            </div>
          )}
          <p className="chat-message-text">{msg.conteudo}</p>
          
          {/* Fotos/Anexos */}
          {msg.anexos && msg.anexos.length > 0 && (
            <div className="chat-message-fotos">
              {msg.anexos.map((anexo, i) => (
                <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer" className="chat-message-foto">
                  <img src={anexo.url} alt={anexo.nome || 'Foto'} />
                </a>
              ))}
            </div>
          )}
          
          {/* Botão de menu */}
          <div className="chat-message-actions">
            <button 
              className="chat-msg-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMsgMenu(showMsgMenu === msg.id ? null : msg.id);
              }}
            >
              <MoreVertical style={{ width: 16, height: 16 }} />
            </button>
            
            {showMsgMenu === msg.id && (
              <div className="chat-msg-menu">
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation();
                    const mensagem = msg;
                    setShowMsgMenu(null);
                    setTimeout(() => handlePinMessage(mensagem), 10);
                  }}
                >
                  <Pin style={{ width: 14, height: 14 }} />
                  {msg.fixada ? 'Desafixar' : 'Fixar'}
                </button>
                {!msg.tarefa_criada && (
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation();
                      const mensagem = msg;
                      setShowMsgMenu(null);
                      setTimeout(() => openCriarTarefa(mensagem), 10);
                    }}
                  >
                    <CheckSquare style={{ width: 14, height: 14 }} />
                    Criar Tarefa
                  </button>
                )}
                {msg.tarefa && (
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation();
                      setShowMsgMenu(null);
                      window.open(`/equipa?tarefa=${msg.tarefa.id}`, '_blank'); 
                    }}
                  >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    Ver Tarefa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="chat-container chat-loading">
        <Loader2 className="chat-spinner" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="chat-container chat-error">
        <AlertCircle style={{ width: 48, height: 48, color: 'var(--error)' }} />
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="chat-container">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="chat-notifications">
          {notifications.map(notif => (
            <div key={notif.id} className={`chat-notification ${notif.type}`}>
              {notif.type === 'success' ? (
                <CheckSquare style={{ width: 16, height: 16 }} />
              ) : (
                <AlertCircle style={{ width: 16, height: 16 }} />
              )}
              {notif.message}
            </div>
          ))}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="chat-mode-bar">
        <button
          className={`chat-mode-btn ${activeMode === 'project' ? 'active' : ''}`}
          onClick={() => setActiveMode('project')}
        >
          <Building2 style={{ width: 16, height: 16 }} />
          <span>ProjectChat</span>
        </button>
        <button
          className={`chat-mode-btn ${activeMode === 'site' ? 'active' : ''}`}
          onClick={() => setActiveMode('site')}
        >
          <HardHat style={{ width: 16, height: 16 }} />
          <span>SiteChat</span>
        </button>
        
        {/* Tab Fixadas */}
        {(selectedProjeto || (activeMode === 'site' && selectedCanal)) && (
          <div className="chat-tabs-divider" />
        )}
        {(selectedProjeto || (activeMode === 'site' && selectedCanal)) && (
          <>
            <button
              className={`chat-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare style={{ width: 16, height: 16 }} />
              <span>Chat</span>
            </button>
            <button
              className={`chat-tab-btn ${activeTab === 'pinned' ? 'active' : ''}`}
              onClick={() => setActiveTab('pinned')}
            >
              <Pin style={{ width: 16, height: 16 }} />
              <span>Fixadas</span>
              {mensagensFixadas.length > 0 && (
                <span className="chat-tab-badge">{mensagensFixadas.length}</span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="chat-main">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-search">
            <Search className="chat-search-icon" />
            <input
              type="text"
              placeholder={activeMode === 'project' ? 'Pesquisar projetos...' : 'Pesquisar obras...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="chat-search-input"
            />
          </div>

          <div className="chat-list">
            {activeMode === 'site' ? (
              canais.filter(c => !searchTerm || c.obra?.nome?.toLowerCase().includes(searchTerm.toLowerCase())).map(canal => (
                <div
                  key={canal.id}
                  className={`chat-list-item ${selectedCanal?.id === canal.id ? 'active' : ''}`}
                  onClick={() => handleSelectCanal(canal)}
                >
                  <div className="chat-avatar obra">
                    <HardHat style={{ width: 20, height: 20 }} />
                  </div>
                  <div className="chat-item-info">
                    <p className="chat-item-name">{canal.obra?.nome || canal.nome}</p>
                    <p className="chat-item-meta">{canal.obra?.codigo}</p>
                  </div>
                </div>
              ))
            ) : (
              projetos.filter(p => !searchTerm || p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())).map(projeto => (
                <div key={projeto.id}>
                  <div
                    className={`chat-projeto-item ${selectedProjeto?.id === projeto.id ? 'active' : ''}`}
                    onClick={() => { handleSelectProjeto(projeto); toggleProjetoExpand(projeto.id) }}
                  >
                    <button 
                      className="chat-expand-btn"
                      onClick={(e) => { e.stopPropagation(); toggleProjetoExpand(projeto.id) }}
                    >
                      {expandedProjetos[projeto.id] 
                        ? <ChevronDown style={{ width: 16, height: 16 }} /> 
                        : <ChevronRight style={{ width: 16, height: 16 }} />
                      }
                    </button>
                    <div className="chat-avatar projeto">
                      <Building2 style={{ width: 16, height: 16 }} />
                    </div>
                    <div className="chat-item-info">
                      <p className="chat-item-name">{projeto.nome}</p>
                      <p className="chat-item-meta">{projeto.codigo}</p>
                    </div>
                  </div>
                  
                  {expandedProjetos[projeto.id] && selectedProjeto?.id === projeto.id && (
                    <div className="chat-canais-list">
                      {canais.map(canal => {
                        const Icon = getCanalIcon(canal)
                        return (
                          <div
                            key={canal.id}
                            className={`chat-canal-item ${selectedCanal?.id === canal.id ? 'active' : ''}`}
                            onClick={() => handleSelectCanal(canal)}
                          >
                            <Icon style={{ width: 16, height: 16 }} />
                            <span>{canal.nome}</span>
                            {canal.privado && <Lock style={{ width: 12, height: 12, marginLeft: 'auto' }} />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel */}
        <div className="chat-center">
          {activeTab === 'pinned' ? (
            // Tab Fixadas
            <div className="chat-pinned-view">
              <div className="chat-header">
                <div className="chat-header-info">
                  <Pin style={{ width: 20, height: 20, color: 'var(--warning)' }} />
                  <div>
                    <h3>Mensagens Fixadas</h3>
                    <p>{mensagensFixadas.length} {mensagensFixadas.length === 1 ? 'mensagem' : 'mensagens'}</p>
                  </div>
                </div>
              </div>
              
              <div className="chat-pinned-list">
                {mensagensFixadas.length === 0 ? (
                  <div className="chat-empty-state">
                    <Pin style={{ width: 48, height: 48, color: 'var(--stone-dark)' }} />
                    <p>Nenhuma mensagem fixada</p>
                    <span>Fixa mensagens importantes para acesso rápido</span>
                  </div>
                ) : (
                  mensagensFixadas.map(msg => (
                    <div key={msg.id} className="chat-pinned-card card">
                      <div className="chat-pinned-header">
                        <div className="chat-message-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                          {msg.autor_nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <span className="chat-message-author">{msg.autor_nome}</span>
                          <span className="chat-message-time">{formatDate(msg.created_at)}</span>
                        </div>
                        <button 
                          className="chat-unpin-btn"
                          onClick={() => handlePinMessage(msg)}
                          title="Desafixar"
                        >
                          <X style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                      <p className="chat-pinned-content">{msg.conteudo}</p>
                      {msg.tarefa_criada && msg.tarefa && (
                        <div className="chat-pinned-task">
                          <CheckSquare style={{ width: 14, height: 14 }} />
                          <span>{msg.tarefa.codigo}: {msg.tarefa.titulo}</span>
                          <span className={`chat-badge ${msg.tarefa.status}`}>{msg.tarefa.status}</span>
                        </div>
                      )}
                      {msg.canal && (
                        <div className="chat-pinned-source">
                          #{msg.canal.nome}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeMode === 'site' ? (
            // SiteChat
            selectedCanal ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-avatar obra">
                      <HardHat style={{ width: 20, height: 20 }} />
                    </div>
                    <div>
                      <h3>{selectedCanal.obra?.nome || selectedCanal.nome}</h3>
                      <p>{selectedCanal.obra?.codigo}</p>
                    </div>
                  </div>
                </div>
                <div className="chat-messages">
                  {loadingMensagens ? (
                    <div className="chat-messages-loading">
                      <Loader2 className="chat-spinner" />
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="chat-messages-empty">
                      <div className="chat-empty-icon">
                        <MessageSquare style={{ width: 24, height: 24 }} />
                      </div>
                      <p>Sem mensagens</p>
                    </div>
                  ) : (
                    <div className="chat-messages-list">
                      {mensagens.map((msg, index) => {
                        const showAvatar = index === 0 || mensagens[index - 1]?.autor_nome !== msg.autor_nome ||
                          new Date(msg.created_at) - new Date(mensagens[index - 1]?.created_at) > 300000
                        return renderMessage(msg, index, showAvatar)
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="chat-input-area">
                  {/* Preview de fotos selecionadas */}
                  {selectedFotos.length > 0 && (
                    <div className="chat-fotos-preview">
                      {selectedFotos.map((foto, i) => (
                        <div key={i} className="chat-foto-preview-item">
                          <img src={URL.createObjectURL(foto)} alt={foto.name} />
                          <button 
                            className="chat-foto-remove"
                            onClick={() => setSelectedFotos(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="chat-input-wrapper">
                    <button className="chat-input-btn" onClick={() => fileInputRefSite.current?.click()}>
                      <Image style={{ width: 20, height: 20 }} />
                    </button>
                    <input ref={fileInputRefSite} type="file" accept="image/*" multiple hidden onChange={(e) => setSelectedFotos(prev => [...prev, ...Array.from(e.target.files)])} />
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escreve uma mensagem..."
                      rows={1}
                      className="chat-input"
                    />
                    <button
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      disabled={sending || (!newMessage.trim() && selectedFotos.length === 0)}
                    >
                      {sending ? <Loader2 className="chat-spinner-sm" /> : <Send style={{ width: 18, height: 18 }} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="chat-empty-state">
                <MessageSquare style={{ width: 64, height: 64, color: 'var(--stone-dark)' }} />
                <p>Seleciona uma obra para ver o chat</p>
              </div>
            )
          ) : (
            // ProjectChat
            !selectedCanal ? (
              <div className="chat-empty-state">
                <MessageSquare style={{ width: 64, height: 64, color: 'var(--stone-dark)' }} />
                <p>Seleciona um projeto e canal</p>
              </div>
            ) : selectedTopico ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <button className="chat-back-btn" onClick={handleBackToTopicos}>
                      <ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div>
                      <div className="chat-topico-title">
                        <h3>{selectedTopico.titulo}</h3>
                        {selectedTopico.fixado && <Pin style={{ width: 16, height: 16, color: 'var(--warning)' }} />}
                        {selectedTopico.privado && <Lock style={{ width: 16, height: 16 }} />}
                        <span className={`chat-badge ${selectedTopico.status}`}>{selectedTopico.status}</span>
                      </div>
                      {selectedTopico.descricao && <p className="chat-topico-desc">{selectedTopico.descricao}</p>}
                    </div>
                  </div>
                  <div className="chat-header-meta">
                    <MessageCircle style={{ width: 16, height: 16 }} />
                    <span>{selectedTopico.total_mensagens || 0}</span>
                  </div>
                </div>
                <div className="chat-messages">
                  {loadingMensagens ? (
                    <div className="chat-messages-loading">
                      <Loader2 className="chat-spinner" />
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="chat-messages-empty">
                      <div className="chat-empty-icon">
                        <MessageSquare style={{ width: 24, height: 24 }} />
                      </div>
                      <p>Sê o primeiro a responder</p>
                    </div>
                  ) : (
                    <div className="chat-messages-list">
                      {mensagens.map((msg, index) => {
                        const showAvatar = index === 0 || mensagens[index - 1]?.autor_nome !== msg.autor_nome ||
                          new Date(msg.created_at) - new Date(mensagens[index - 1]?.created_at) > 300000
                        return renderMessage(msg, index, showAvatar)
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="chat-input-area">
                  {/* Preview de fotos selecionadas */}
                  {selectedFotos.length > 0 && (
                    <div className="chat-fotos-preview">
                      {selectedFotos.map((foto, i) => (
                        <div key={i} className="chat-foto-preview-item">
                          <img src={URL.createObjectURL(foto)} alt={foto.name} />
                          <button 
                            className="chat-foto-remove"
                            onClick={() => setSelectedFotos(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="chat-input-wrapper">
                    <button className="chat-input-btn" onClick={() => fileInputRef.current?.click()}>
                      <Image style={{ width: 20, height: 20 }} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => setSelectedFotos(prev => [...prev, ...Array.from(e.target.files)])} />
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escreve uma resposta..."
                      rows={1}
                      className="chat-input"
                    />
                    <button
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      disabled={sending || (!newMessage.trim() && selectedFotos.length === 0)}
                    >
                      {sending ? <Loader2 className="chat-spinner-sm" /> : <Send style={{ width: 18, height: 18 }} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    {(() => {
                      const Icon = getCanalIcon(selectedCanal)
                      return (
                        <>
                          <div className="chat-canal-icon">
                            <Icon style={{ width: 20, height: 20 }} />
                          </div>
                          <div>
                            <h3>{selectedCanal.nome}</h3>
                            {selectedCanal.descricao && <p>{selectedCanal.descricao}</p>}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNovoTopico(true)}>
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>Novo Tópico</span>
                  </button>
                </div>
                
                <div className="chat-topicos">
                  {topicos.length === 0 ? (
                    <div className="chat-topicos-empty">
                      <div className="chat-empty-icon-lg">
                        <MessageSquare style={{ width: 32, height: 32 }} />
                      </div>
                      <p>Nenhum tópico neste canal</p>
                      <button className="btn btn-secondary" onClick={() => setShowNovoTopico(true)}>
                        Criar primeiro tópico
                      </button>
                    </div>
                  ) : (
                    <div className="chat-topicos-list">
                      {topicos.map(topico => (
                        <div key={topico.id} className="chat-topico-card card" onClick={() => handleSelectTopico(topico)}>
                          <div className="chat-topico-avatar">
                            {topico.criado_por_nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="chat-topico-info">
                            <div className="chat-topico-header">
                              {topico.fixado && <Pin style={{ width: 14, height: 14, color: 'var(--warning)' }} />}
                              <h4>{topico.titulo}</h4>
                              {topico.privado && <Lock style={{ width: 14, height: 14 }} />}
                            </div>
                            {topico.descricao && <p className="chat-topico-preview">{topico.descricao}</p>}
                            <div className="chat-topico-meta">
                              <span>
                                <MessageCircle style={{ width: 14, height: 14 }} />
                                {topico.total_mensagens || 0} {topico.total_mensagens === 1 ? 'resposta' : 'respostas'}
                              </span>
                              {topico.ultima_resposta_at ? (
                                <span>ÃƒÅ¡ltima: {formatDate(topico.ultima_resposta_at)} por {topico.ultima_resposta_por}</span>
                              ) : (
                                <span>Criado {formatDate(topico.created_at)} por {topico.criado_por_nome}</span>
                              )}
                            </div>
                          </div>
                          <span className={`chat-badge ${topico.status}`}>{topico.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Modal Novo Tópico */}
      {showNovoTopico && (
        <div className="chat-modal-overlay" onClick={() => setShowNovoTopico(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div>
                <h3>Novo Tópico</h3>
                {selectedCanal && <p>em #{selectedCanal.nome}</p>}
              </div>
              <button className="chat-modal-close" onClick={() => setShowNovoTopico(false)}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            
            <div className="chat-modal-body">
              <div className="chat-form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={novoTopicoTitulo}
                  onChange={(e) => setNovoTopicoTitulo(e.target.value)}
                  placeholder="Ex: Dúvida sobre materiais da cozinha"
                  className="chat-form-input"
                />
              </div>
              <div className="chat-form-group">
                <label>Descrição (opcional)</label>
                <textarea
                  value={novoTopicoDescricao}
                  onChange={(e) => setNovoTopicoDescricao(e.target.value)}
                  placeholder="Adiciona mais contexto ao tópico..."
                  rows={3}
                  className="chat-form-textarea"
                />
              </div>
            </div>
            
            <div className="chat-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowNovoTopico(false); setNovoTopicoTitulo(''); setNovoTopicoDescricao('') }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCriarTopico} disabled={!novoTopicoTitulo.trim()}>
                Criar Tópico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Tarefa */}
      {showCriarTarefa && (
        <div className="chat-modal-overlay" onClick={() => setShowCriarTarefa(null)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div>
                <h3>Criar Tarefa</h3>
                <p>A partir da mensagem</p>
              </div>
              <button className="chat-modal-close" onClick={() => setShowCriarTarefa(null)}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            
            <div className="chat-modal-body">
              <div className="chat-task-origin">
                <p>"{showCriarTarefa.conteudo}"</p>
                <span>"" {showCriarTarefa.autor_nome}</span>
              </div>
              
              <div className="chat-form-group">
                <label>Título da Tarefa *</label>
                <input
                  type="text"
                  value={novaTarefaTitulo}
                  onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                  placeholder="Descreve a tarefa..."
                  className="chat-form-input"
                />
              </div>
              <div className="chat-form-group">
                <label>Data Limite (opcional)</label>
                <input
                  type="date"
                  value={novaTarefaData}
                  onChange={(e) => setNovaTarefaData(e.target.value)}
                  className="chat-form-input"
                />
              </div>
            </div>
            
            <div className="chat-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowCriarTarefa(null); setNovaTarefaTitulo(''); setNovaTarefaData('') }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleManualCreateTask} disabled={!novaTarefaTitulo.trim()}>
                <CheckSquare style={{ width: 16, height: 16 }} />
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
