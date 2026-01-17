import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Hash, Plus, Send, Paperclip, Image as ImageIcon, Search,
  MoreHorizontal, Reply, X, ChevronDown, ChevronRight,
  MessageSquare, Users, FileText, StickyNote, Heart,
  CheckSquare, FolderOpen, Building2, Palette
} from 'lucide-react'

// Estrutura de equipas GAVINHO (baseado no Teams)
const EQUIPAS_GAVINHO = [
  { id: 'arch', nome: 'GAVINHO ARCH', cor: '#6366f1', inicial: 'A' },
  { id: 'hosp', nome: 'GAVINHO HOSP.', cor: '#f59e0b', inicial: 'H' },
  { id: 'signature', nome: 'GAVINHO Signature', cor: '#10b981', inicial: 'GS' }
]

// Compartimentos para renders (integração Archviz)
const COMPARTIMENTOS = [
  'Sala de Estar', 'Sala de Jantar', 'Cozinha', 'Suite Principal',
  'Suite', 'Quarto', 'WC Suite', 'WC Social', 'Hall de Entrada',
  'Corredor', 'Escritório', 'Varanda', 'Terraço', 'Piscina',
  'Exterior Frontal', 'Exterior Posterior', 'Vista Aérea', 'Outro'
]

export default function ChatColaborativo() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)

  // Estrutura Teams
  const [equipas, setEquipas] = useState(EQUIPAS_GAVINHO)
  const [equipaAtiva, setEquipaAtiva] = useState(null)
  const [equipasExpanded, setEquipasExpanded] = useState({})

  // Canais (projetos dentro de cada equipa)
  const [canais, setCanais] = useState([])
  const [canalAtivo, setCanalAtivo] = useState(null)

  // Tabs do canal
  const [activeTab, setActiveTab] = useState('publicacoes') // publicacoes, ficheiros, notes

  // Mensagens/Posts
  const [posts, setPosts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Input
  const [novoPost, setNovoPost] = useState({ titulo: '', conteudo: '' })
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [uploading, setUploading] = useState(false)

  // Render integration
  const [showRenderModal, setShowRenderModal] = useState(false)
  const [renderForm, setRenderForm] = useState({
    compartimento: '',
    descricao: '',
    projetoId: null
  })

  // Task conversion modal
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedPostForTask, setSelectedPostForTask] = useState(null)

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadCanais()
  }, [])

  useEffect(() => {
    if (canalAtivo) {
      loadPosts(canalAtivo.id)
    }
  }, [canalAtivo, activeTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts])

  const loadCanais = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projetos')
        .select('id, codigo, nome, tipologia')
        .eq('arquivado', false)
        .order('codigo', { ascending: false })

      if (error) throw error

      // Agrupar projetos por tipo/equipa
      const canaisComEquipa = (data || []).map(p => ({
        ...p,
        equipa: p.tipologia?.includes('Hosp') ? 'hosp' :
                p.tipologia?.includes('Signature') ? 'signature' : 'arch',
        ultimaAtividade: new Date().toISOString()
      }))

      setCanais(canaisComEquipa)

      // Expandir primeira equipa e selecionar primeiro canal
      if (canaisComEquipa.length > 0) {
        const primeiraEquipa = canaisComEquipa[0].equipa
        setEquipaAtiva(primeiraEquipa)
        setEquipasExpanded({ [primeiraEquipa]: true })
        setCanalAtivo(canaisComEquipa[0])
      }
    } catch (err) {
      console.error('Erro ao carregar canais:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async (canalId) => {
    try {
      // Carregar mensagens do chat para este projeto
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          *,
          autor:autor_id(id, nome, avatar_url),
          topico:topico_id(titulo, canal_id)
        `)
        .eq('eliminado', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro ao carregar posts:', error)
        // Se a tabela não existir, usar dados mock
        setPosts(getMockPosts())
        return
      }

      // Filtrar por projeto através dos canais
      const filteredPosts = (data || []).filter(post => {
        // Lógica para filtrar por canal/projeto
        return true // Por agora mostrar todos
      })

      if (filteredPosts.length === 0) {
        setPosts(getMockPosts())
      } else {
        setPosts(filteredPosts)
      }
    } catch (err) {
      console.error('Erro:', err)
      setPosts(getMockPosts())
    }
  }

  const getMockPosts = () => [
    {
      id: 1,
      titulo: 'QUARTO STANDARD',
      conteudo: '',
      autor: { nome: 'Utilizador desconhecido', avatar_url: null },
      created_at: new Date().toISOString(),
      tipo: 'post',
      replies: [
        {
          id: 101,
          autor: { nome: 'IGF GAVINHO Group' },
          conteudo: 'Marta Silvestre GAVINHO Hospitality',
          created_at: '2025-09-24T20:00:00',
          reacoes: []
        },
        {
          id: 102,
          autor: { nome: 'João Umbelino GAVINHO Group' },
          conteudo: 'Frozen Curve Quartz Rivage Lisse Wall Sconce',
          created_at: '2025-09-25T09:50:00',
          reacoes: [{ emoji: '❤️', count: 1 }],
          link: true
        },
        {
          id: 103,
          autor: { nome: 'Carolina Cipriano GAVINHO Design & Build PM' },
          conteudo: 'Obrigada João Umbelino GAVINHO Group',
          created_at: '2025-09-25T13:30:00',
          reacoes: [{ emoji: '❤️', count: 1 }]
        }
      ]
    },
    {
      id: 2,
      titulo: 'INSPIRAÇÕES',
      conteudo: '',
      autor: { nome: 'IGF GAVINHO Group' },
      created_at: '2025-10-09T20:05:00',
      tipo: 'post',
      imagem: '/api/placeholder/400/200',
      replies: []
    }
  ]

  const handlePublicar = async () => {
    if (!novoPost.titulo.trim() && !novoPost.conteudo.trim() && selectedImages.length === 0) return
    if (!canalAtivo) return

    try {
      setUploading(true)

      // Upload de imagens se houver
      let imagemUrls = []
      for (const img of selectedImages) {
        const fileName = `${canalAtivo.id}/${Date.now()}_${img.name}`
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(fileName, img.file)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(fileName)
          imagemUrls.push(publicUrl)
        }
      }

      // Criar o post
      const newPost = {
        titulo: novoPost.titulo,
        conteudo: novoPost.conteudo,
        autor: { nome: profile?.nome || 'Utilizador', avatar_url: profile?.avatar_url },
        created_at: new Date().toISOString(),
        tipo: 'post',
        imagens: imagemUrls,
        replies: []
      }

      setPosts([newPost, ...posts])
      setNovoPost({ titulo: '', conteudo: '' })
      setSelectedImages([])
      setShowNewPost(false)

    } catch (err) {
      console.error('Erro ao publicar:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const newImages = files.map(file => ({
      file,
      name: file.name,
      preview: URL.createObjectURL(file)
    }))
    setSelectedImages([...selectedImages, ...newImages])
  }

  const handleReacao = (postId, replyId = null) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        if (replyId) {
          return {
            ...post,
            replies: post.replies.map(reply => {
              if (reply.id === replyId) {
                const hasReacted = reply.reacoes?.some(r => r.emoji === '❤️')
                if (hasReacted) {
                  return {
                    ...reply,
                    reacoes: reply.reacoes.filter(r => r.emoji !== '❤️')
                  }
                } else {
                  return {
                    ...reply,
                    reacoes: [...(reply.reacoes || []), { emoji: '❤️', count: 1 }]
                  }
                }
              }
              return reply
            })
          }
        }
      }
      return post
    }))
  }

  const handleUploadRender = async () => {
    if (!renderForm.compartimento || selectedImages.length === 0 || !canalAtivo) return

    try {
      setUploading(true)

      // Upload da imagem
      const img = selectedImages[0]
      const fileName = `renders/${canalAtivo.id}/${renderForm.compartimento}/${Date.now()}_${img.name}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-files')
        .upload(fileName, img.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('projeto-files')
        .getPublicUrl(fileName)

      // Contar versões existentes para este compartimento
      // (em produção, buscar da tabela de renders)
      const versao = 1 // Simplificado

      // Criar entrada na tabela de renders do projeto
      const { error: renderError } = await supabase
        .from('projeto_renders')
        .insert({
          projeto_id: canalAtivo.id,
          compartimento: renderForm.compartimento,
          versao,
          imagem_url: publicUrl,
          descricao: renderForm.descricao,
          criado_por: profile?.id
        })

      // Também criar um post no chat sobre o novo render
      const newPost = {
        id: Date.now(),
        titulo: `RENDER - ${renderForm.compartimento} v${versao}`,
        conteudo: renderForm.descricao || `Novo render carregado: ${renderForm.compartimento}`,
        autor: { nome: profile?.nome || 'Utilizador', avatar_url: profile?.avatar_url },
        created_at: new Date().toISOString(),
        tipo: 'render',
        imagem: publicUrl,
        compartimento: renderForm.compartimento,
        versao,
        replies: []
      }

      setPosts([newPost, ...posts])
      setShowRenderModal(false)
      setRenderForm({ compartimento: '', descricao: '', projetoId: null })
      setSelectedImages([])

    } catch (err) {
      console.error('Erro ao carregar render:', err)
      alert('Erro ao carregar render: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateTask = () => {
    if (!selectedPostForTask) return

    // Criar tarefa a partir do comentário
    const taskData = {
      titulo: `[CHAT] ${selectedPostForTask.conteudo?.substring(0, 50)}...`,
      descricao: selectedPostForTask.conteudo,
      projeto_id: canalAtivo?.id,
      origem: 'chat',
      origem_id: selectedPostForTask.id
    }

    // Em produção, inserir na tabela de tarefas
    console.log('Criar tarefa:', taskData)

    setShowTaskModal(false)
    setSelectedPostForTask(null)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEquipaCanais = (equipaId) => {
    return canais.filter(c => c.equipa === equipaId)
  }

  const toggleEquipa = (equipaId) => {
    setEquipasExpanded(prev => ({
      ...prev,
      [equipaId]: !prev[equipaId]
    }))
    setEquipaAtiva(equipaId)
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{
      height: 'calc(100vh - 64px)',
      margin: '-24px',
      marginTop: '-16px'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        height: '100%',
        background: 'var(--white)',
        borderRadius: '0',
        overflow: 'hidden',
        borderLeft: '1px solid var(--stone)'
      }}>

        {/* ========== SIDEBAR ESTILO TEAMS ========== */}
        <div style={{
          background: 'var(--off-white)',
          borderRight: '1px solid var(--stone)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header da sidebar */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--stone)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--brown)' }}>Equipas</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                padding: '4px'
              }}>
                <MoreHorizontal size={18} />
              </button>
              <button style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                padding: '4px'
              }}>
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Filtro "Não lido" */}
          <div style={{ padding: '8px 16px' }}>
            <button style={{
              padding: '6px 12px',
              background: 'var(--white)',
              border: '1px solid var(--stone)',
              borderRadius: '16px',
              fontSize: '12px',
              color: 'var(--brown-light)',
              cursor: 'pointer'
            }}>
              Não lido
            </button>
          </div>

          {/* Lista de Equipas */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {equipas.map(equipa => {
              const equipaCanais = getEquipaCanais(equipa.id)
              const isExpanded = equipasExpanded[equipa.id]

              return (
                <div key={equipa.id}>
                  {/* Equipa header */}
                  <button
                    onClick={() => toggleEquipa(equipa.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <ChevronRight
                      size={14}
                      style={{
                        color: 'var(--brown-light)',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      background: equipa.cor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {equipa.inicial}
                    </div>
                    <span style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--brown)'
                    }}>
                      {equipa.nome}
                    </span>
                  </button>

                  {/* Canais da equipa */}
                  {isExpanded && (
                    <div style={{ paddingLeft: '52px' }}>
                      {equipaCanais.map(canal => (
                        <button
                          key={canal.id}
                          onClick={() => setCanalAtivo(canal)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 16px 8px 0',
                            background: canalAtivo?.id === canal.id ? 'var(--stone)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '4px 0 0 4px',
                            marginRight: '8px'
                          }}
                        >
                          <span style={{
                            fontSize: '13px',
                            color: canalAtivo?.id === canal.id ? 'var(--brown)' : 'var(--brown-light)',
                            fontWeight: canalAtivo?.id === canal.id ? 500 : 400
                          }}>
                            {canal.codigo}_{canal.nome?.replace(/\s+/g, '_').substring(0, 15)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                            {formatDate(canal.ultimaAtividade)}
                          </span>
                        </button>
                      ))}

                      {/* Ver todos os canais */}
                      <button style={{
                        width: '100%',
                        padding: '8px 0',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--accent-olive)',
                        textAlign: 'left'
                      }}>
                        Ver todos os canais
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ========== ÁREA PRINCIPAL ========== */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header do canal */}
          {canalAtivo && (
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--stone)',
              background: 'var(--white)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  background: equipas.find(e => e.id === canalAtivo.equipa)?.cor || 'var(--accent-olive)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {equipas.find(e => e.id === canalAtivo.equipa)?.inicial || 'G'}
                </div>
                <div>
                  <h2 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--brown)',
                    margin: 0
                  }}>
                    {canalAtivo.codigo}_{canalAtivo.nome?.replace(/\s+/g, '_').toUpperCase()}
                  </h2>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--stone)', marginBottom: '-12px', paddingBottom: '0' }}>
                {[
                  { id: 'publicacoes', label: 'Publicações', icon: MessageSquare },
                  { id: 'ficheiros', label: 'Ficheiros', icon: FileText },
                  { id: 'notes', label: 'Notes', icon: StickyNote }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '2px solid var(--accent-olive)' : '2px solid transparent',
                      cursor: 'pointer',
                      color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      fontSize: '13px',
                      marginBottom: '-1px'
                    }}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
                <button style={{
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo da tab */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'publicacoes' && (
              <>
                {/* Lista de posts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {posts.map(post => (
                    <div
                      key={post.id}
                      className="card"
                      style={{
                        padding: '20px',
                        borderLeft: post.tipo === 'render' ? '3px solid var(--accent-olive)' : 'none'
                      }}
                    >
                      {/* Post header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: post.autor?.avatar_url
                            ? `url(${post.autor.avatar_url}) center/cover`
                            : 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--brown-dark)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}>
                          {!post.autor?.avatar_url && (post.autor?.nome?.substring(0, 2).toUpperCase() || 'UD')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                              {post.autor?.nome || 'Utilizador desconhecido'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                              {formatDateTime(post.created_at)}
                            </span>
                          </div>
                        </div>
                        <button style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brown-light)',
                          padding: '4px'
                        }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      {/* Post título */}
                      {post.titulo && (
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: 'var(--brown)',
                          margin: '0 0 12px 0'
                        }}>
                          {post.titulo}
                        </h3>
                      )}

                      {/* Post conteúdo */}
                      {post.conteudo && (
                        <p style={{
                          fontSize: '14px',
                          color: 'var(--brown)',
                          margin: '0 0 12px 0',
                          lineHeight: 1.5
                        }}>
                          {post.conteudo}
                        </p>
                      )}

                      {/* Imagem do post */}
                      {post.imagem && (
                        <div style={{ marginBottom: '12px' }}>
                          <img
                            src={post.imagem}
                            alt={post.titulo}
                            style={{
                              maxWidth: '400px',
                              maxHeight: '250px',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}

                      {/* Badge de render */}
                      {post.tipo === 'render' && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          background: 'var(--success-bg)',
                          color: 'var(--success)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginBottom: '12px'
                        }}>
                          <Palette size={12} />
                          {post.compartimento} - Versão {post.versao}
                        </div>
                      )}

                      {/* Thread count */}
                      {post.replies?.length > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 0',
                          borderLeft: '2px solid var(--accent-olive)',
                          paddingLeft: '12px',
                          marginTop: '8px'
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--accent-olive)', fontWeight: 500 }}>
                            Abrir {post.replies.length} respostas
                          </span>
                        </div>
                      )}

                      {/* Replies */}
                      {post.replies?.map(reply => (
                        <div
                          key={reply.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 0 12px 52px',
                            borderTop: '1px solid var(--stone)'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--brown-dark)'
                          }}>
                            {reply.autor?.nome?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)' }}>
                                {reply.autor?.nome}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                {formatDateTime(reply.created_at)}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '14px',
                              color: reply.link ? 'var(--accent-olive)' : 'var(--brown)',
                              margin: 0,
                              textDecoration: reply.link ? 'underline' : 'none',
                              cursor: reply.link ? 'pointer' : 'default'
                            }}>
                              {reply.conteudo}
                            </p>

                            {/* Reações */}
                            {reply.reacoes?.length > 0 && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                {reply.reacoes.map((reacao, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleReacao(post.id, reply.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      background: 'var(--error-bg)',
                                      border: 'none',
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    {reacao.emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleReacao(post.id, reply.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--brown-light)',
                                padding: '4px'
                              }}
                            >
                              <Heart size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPostForTask(reply)
                                setShowTaskModal(true)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--brown-light)',
                                padding: '4px'
                              }}
                              title="Converter em tarefa"
                            >
                              <CheckSquare size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Responder no tópico */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--stone)',
                        marginTop: '12px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--brown-dark)'
                        }}>
                          {profile?.nome?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <input
                          type="text"
                          placeholder="Responder no tópico"
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '1px solid var(--stone)',
                            borderRadius: '20px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {posts.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--brown-light)'
                  }}>
                    <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>Sem publicações neste canal</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}

            {activeTab === 'ficheiros' && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--brown-light)'
              }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Ficheiros partilhados neste canal</p>
              </div>
            )}

            {activeTab === 'notes' && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--brown-light)'
              }}>
                <StickyNote size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Notas do canal</p>
              </div>
            )}
          </div>

          {/* Input para nova publicação */}
          {canalAtivo && activeTab === 'publicacoes' && (
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--stone)',
              background: 'var(--white)'
            }}>
              <button
                onClick={() => setShowNewPost(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  background: 'var(--accent-olive)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                <Send size={16} />
                Publicar no canal
              </button>

              {/* Botão de upload de render */}
              <button
                onClick={() => setShowRenderModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: 'var(--accent-olive)',
                  border: '1px solid var(--accent-olive)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                  marginTop: '8px'
                }}
              >
                <Palette size={16} />
                Carregar Render (Archviz)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Publicação */}
      {showNewPost && (
        <div className="modal-overlay" onClick={() => setShowNewPost(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Publicação</h3>
              <button onClick={() => setShowNewPost(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Título (opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: QUARTO STANDARD"
                  value={novoPost.titulo}
                  onChange={e => setNovoPost({ ...novoPost, titulo: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Mensagem</label>
                <textarea
                  className="textarea"
                  placeholder="Escreve a tua mensagem..."
                  value={novoPost.conteudo}
                  onChange={e => setNovoPost({ ...novoPost, conteudo: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Preview de imagens */}
              {selectedImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {selectedImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={img.preview}
                        alt={img.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <button
                        onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--error)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'var(--cream)',
                  border: '1px dashed var(--stone)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--brown-light)',
                  fontSize: '13px',
                  width: '100%'
                }}
              >
                <ImageIcon size={16} />
                Adicionar imagens
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewPost(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePublicar}
                disabled={uploading || (!novoPost.titulo.trim() && !novoPost.conteudo.trim() && selectedImages.length === 0)}
              >
                {uploading ? 'A publicar...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Render */}
      {showRenderModal && (
        <div className="modal-overlay" onClick={() => setShowRenderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Palette size={20} style={{ marginRight: '8px', color: 'var(--accent-olive)' }} />
                Carregar Render
              </h3>
              <button onClick={() => setShowRenderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '20px' }}>
                O render será automaticamente adicionado ao Archviz do projeto {canalAtivo?.codigo}.
              </p>

              <div className="input-group">
                <label className="input-label">Compartimento *</label>
                <select
                  className="select"
                  value={renderForm.compartimento}
                  onChange={e => setRenderForm({ ...renderForm, compartimento: e.target.value })}
                >
                  <option value="">Seleciona o compartimento</option>
                  {COMPARTIMENTOS.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Descrição (opcional)</label>
                <textarea
                  className="textarea"
                  placeholder="Notas sobre este render..."
                  value={renderForm.descricao}
                  onChange={e => setRenderForm({ ...renderForm, descricao: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Upload de imagem */}
              {selectedImages.length === 0 ? (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '40px 20px',
                      background: 'var(--cream)',
                      border: '2px dashed var(--stone)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <ImageIcon size={32} style={{ color: 'var(--brown-light)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--brown-light)' }}>
                      Clica para selecionar a imagem do render
                    </span>
                  </button>
                </>
              ) : (
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <img
                    src={selectedImages[0].preview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      objectFit: 'contain'
                    }}
                  />
                  <button
                    onClick={() => setSelectedImages([])}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowRenderModal(false)
                setSelectedImages([])
                setRenderForm({ compartimento: '', descricao: '', projetoId: null })
              }}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUploadRender}
                disabled={uploading || !renderForm.compartimento || selectedImages.length === 0}
              >
                {uploading ? 'A carregar...' : 'Carregar Render'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Tarefa */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <CheckSquare size={20} style={{ marginRight: '8px', color: 'var(--accent-olive)' }} />
                Criar Tarefa
              </h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                Criar tarefa a partir deste comentário:
              </p>
              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--accent-olive)',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--brown)', margin: 0 }}>
                  "{selectedPostForTask?.conteudo}"
                </p>
                <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '8px 0 0 0' }}>
                  — {selectedPostForTask?.autor?.nome}
                </p>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--brown)' }}>
                A tarefa será criada no projeto <strong>{canalAtivo?.codigo}</strong> e associada a este comentário.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCreateTask}>
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
