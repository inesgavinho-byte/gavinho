import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { useObraId } from '../hooks/useObraId'
import {
  ArrowLeft, MessageSquare, Mail, Filter, Search, Plus, Clock,
  AlertTriangle, CheckCircle2, Calendar, FileText, Paperclip, Users,
  Building, Truck, Wind, Hammer, Package, Shield, DollarSign, MoreHorizontal,
  Send, ChevronRight, ChevronDown, X, Check, Loader2, RefreshCw,
  Eye, EyeOff, Archive, Star, StarOff, Tag, ExternalLink, Bot, Sparkles,
  ClipboardList, AlertCircle, CircleDot, Hash, Layers
} from 'lucide-react'

// Mapeamento de tipos de canal para ícones e cores
const CANAL_CONFIG = {
  coordenacao_geral: { icon: Users, color: '#3B82F6', label: 'Coordenacao Geral' },
  estruturas: { icon: Building, color: '#EF4444', label: 'Estruturas' },
  avac: { icon: Wind, color: '#10B981', label: 'AVAC' },
  carpintarias: { icon: Hammer, color: '#F59E0B', label: 'Carpintarias' },
  fornecimentos: { icon: Package, color: '#8B5CF6', label: 'Fornecimentos' },
  entregas: { icon: Truck, color: '#EC4899', label: 'Entregas' },
  qualidade: { icon: Shield, color: '#14B8A6', label: 'Qualidade' },
  seguranca: { icon: AlertTriangle, color: '#F97316', label: 'Seguranca' },
  financeiro: { icon: DollarSign, color: '#22C55E', label: 'Financeiro' },
  outro: { icon: Hash, color: '#6B7280', label: 'Outro' }
}

// Mapeamento de tipos de acao
const ACAO_CONFIG = {
  tarefa: { icon: ClipboardList, color: '#8B5CF6', label: 'Tarefa' },
  incidente: { icon: AlertTriangle, color: '#EF4444', label: 'Incidente' },
  confirmacao: { icon: CheckCircle2, color: '#22C55E', label: 'Confirmacao' },
  evento: { icon: Calendar, color: '#3B82F6', label: 'Evento' },
  evidencia: { icon: FileText, color: '#F59E0B', label: 'Evidencia' }
}

// Mapeamento de estados de acao
const ESTADO_CONFIG = {
  pendente: { color: '#F59E0B', label: 'Pendente' },
  em_progresso: { color: '#3B82F6', label: 'Em Progresso' },
  aguarda_validacao: { color: '#8B5CF6', label: 'Aguarda Validacao' },
  concluida: { color: '#22C55E', label: 'Concluida' },
  cancelada: { color: '#6B7280', label: 'Cancelada' },
  adiada: { color: '#F97316', label: 'Adiada' }
}

export default function ObraComunicacoes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { obraUuid, obra: obraResolved, loading: obraLoading } = useObraId(id)

  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Timeline
  const [timeline, setTimeline] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  // Canais
  const [canais, setCanais] = useState([])
  const [selectedCanal, setSelectedCanal] = useState(null)

  // Acoes
  const [acoes, setAcoes] = useState([])
  const [acoesStats, setAcoesStats] = useState(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') || 'todos')
  const [filtroCanal, setFiltroCanal] = useState(searchParams.get('canal') || 'todos')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') || 'todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'timeline')

  // Modais
  const [showNovaAcao, setShowNovaAcao] = useState(false)
  const [showNovoCanal, setShowNovoCanal] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState(null)

  // Mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // When the hook resolves the obra, set it and load data using the UUID
  useEffect(() => {
    if (obraResolved && obraUuid) {
      setObra(obraResolved)
      setLoading(false)
      loadCanais()
      loadTimeline()
      loadAcoes()
    } else if (!obraLoading && !obraResolved) {
      setError('Erro ao carregar obra')
      setLoading(false)
    }
  }, [obraUuid, obraResolved, obraLoading])

  useEffect(() => {
    // Atualizar URL com filtros
    const params = new URLSearchParams()
    if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    if (filtroCanal !== 'todos') params.set('canal', filtroCanal)
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    if (viewMode !== 'timeline') params.set('view', viewMode)
    setSearchParams(params)
  }, [filtroTipo, filtroCanal, filtroEstado, viewMode])

  useEffect(() => {
    loadTimeline()
  }, [filtroTipo, filtroCanal, searchTerm])

  useEffect(() => {
    loadAcoes()
  }, [filtroEstado])

  const loadCanais = async () => {
    if (!obraUuid) return
    try {
      const { data, error } = await supabase
        .from('obra_canais')
        .select('*')
        .eq('obra_id', obraUuid)
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (error) throw error
      setCanais(data || [])

      // Se nao houver canais, criar os padrao
      if (!data || data.length === 0) {
        await criarCanaisPadrao()
      }
    } catch (err) {
      console.error('Erro ao carregar canais:', err)
    }
  }

  const criarCanaisPadrao = async () => {
    try {
      const { error } = await supabase.rpc('criar_canais_padrao_obra', { p_obra_id: obraUuid })
      if (!error) {
        loadCanais()
      }
    } catch (err) {
      console.error('Erro ao criar canais padrao:', err)
    }
  }

  const loadTimeline = async () => {
    if (!obraUuid) return
    setTimelineLoading(true)
    try {
      let query = supabase
        .from('obra_timeline')
        .select('*')
        .eq('obra_id', obraUuid)
        .order('data_evento', { ascending: false })
        .limit(100)

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo_item', filtroTipo)
      }

      if (filtroCanal !== 'todos') {
        query = query.eq('canal_id', filtroCanal)
      }

      const { data, error } = await query

      if (error) throw error

      setTimeline(data || [])
    } catch (err) {
      console.error('Erro ao carregar timeline:', err)
      setTimeline([])
    } finally {
      setTimelineLoading(false)
    }
  }

  const loadAcoes = async () => {
    if (!obraUuid) return
    try {
      let query = supabase
        .from('obra_acoes')
        .select('*')
        .eq('obra_id', obraUuid)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado)
      }

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        setAcoes([])
        setAcoesStats({ total_pendentes: 0, por_tipo: {}, atrasadas: 0 })
      } else {
        setAcoes(data)
        // Calcular stats
        const stats = {
          total_pendentes: data.filter(a => a.estado === 'pendente').length,
          por_tipo: {},
          atrasadas: data.filter(a => a.prazo && new Date(a.prazo) < new Date() && a.estado !== 'concluida').length
        }
        data.forEach(a => {
          stats.por_tipo[a.tipo_acao] = (stats.por_tipo[a.tipo_acao] || 0) + 1
        })
        setAcoesStats(stats)
      }
    } catch (err) {
      console.error('Erro ao carregar acoes:', err)
      setAcoes([])
      setAcoesStats({ total_pendentes: 0, por_tipo: {}, atrasadas: 0 })
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `ha ${diffMins} min`
    if (diffHours < 24) return `ha ${diffHours}h`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `ha ${diffDays} dias`
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  const getItemIcon = (tipo) => {
    switch (tipo) {
      case 'email': return Mail
      case 'acao_tarefa': return ClipboardList
      case 'acao_incidente': return AlertTriangle
      case 'acao_confirmacao': return CheckCircle2
      case 'acao_evento': return Calendar
      case 'acao_evidencia': return FileText
      case 'nota_interna': return MessageSquare
      default: return CircleDot
    }
  }

  const getItemColor = (tipo) => {
    switch (tipo) {
      case 'email': return '#3B82F6'
      case 'acao_tarefa': return '#8B5CF6'
      case 'acao_incidente': return '#EF4444'
      case 'acao_confirmacao': return '#22C55E'
      case 'acao_evento': return '#F59E0B'
      case 'acao_evidencia': return '#14B8A6'
      default: return '#6B7280'
    }
  }

  const filteredTimeline = timeline.filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        item.titulo?.toLowerCase().includes(search) ||
        item.resumo?.toLowerCase().includes(search) ||
        item.autor_nome?.toLowerCase().includes(search)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (error || !obra) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: '#EF4444' }} />
        <p>{error || 'Obra nao encontrada'}</p>
        <button onClick={() => navigate('/obras')} style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Voltar a Obras
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button
          onClick={() => navigate(`/obras/${id}`)}
          style={{
            background: '#F3F4F6',
            border: 'none',
            borderRadius: 8,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: '#DBEAFE',
              color: '#1D4ED8',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600
            }}>
              {obra.codigo_canonico || obra.codigo}
            </span>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Comunicacoes</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>{obra.nome}</p>
        </div>

        {/* Stats rapidos */}
        {acoesStats && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>{acoesStats.total_pendentes}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Pendentes</div>
            </div>
            {acoesStats.atrasadas > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444' }}>{acoesStats.atrasadas}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Atrasadas</div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowNovaAcao(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 14
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
          Nova Acao
        </button>
      </div>

      {/* Toolbar de filtros */}
      <div style={{
        padding: '12px 24px',
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        {/* View Mode */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
          {['timeline', 'acoes'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: 6,
                background: viewMode === mode ? 'white' : 'transparent',
                color: viewMode === mode ? '#1F2937' : '#6B7280',
                fontWeight: viewMode === mode ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: viewMode === mode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {mode === 'timeline' ? 'Timeline' : 'Acoes'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#F3F4F6',
          borderRadius: 8,
          padding: '6px 12px',
          flex: 1,
          maxWidth: 300
        }}>
          <Search style={{ width: 16, height: 16, color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13
            }}
          />
        </div>

        {/* Filtro de tipo */}
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: 'white',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <option value="todos">Todos os tipos</option>
          <option value="email">Email</option>
          <option value="acao_tarefa">Tarefas</option>
          <option value="acao_incidente">Incidentes</option>
          <option value="acao_confirmacao">Confirmacoes</option>
        </select>

        {/* Filtro de canal */}
        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: 'white',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <option value="todos">Todos os canais</option>
          {canais.map(canal => (
            <option key={canal.id} value={canal.id}>{canal.nome}</option>
          ))}
        </select>

        {viewMode === 'acoes' && (
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              background: 'white',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos os estados</option>
            {Object.entries(ESTADO_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        )}

        <button
          onClick={loadTimeline}
          style={{
            padding: 8,
            background: '#F3F4F6',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <RefreshCw style={{ width: 16, height: 16, animation: timelineLoading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar de Canais (desktop) */}
        {!isMobile && (
          <div style={{
            width: 240,
            background: 'white',
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Canais</span>
              <button
                onClick={() => setShowNovoCanal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <Plus style={{ width: 16, height: 16, color: '#6B7280' }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              <button
                onClick={() => setSelectedCanal(null)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: selectedCanal === null ? '#EFF6FF' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${selectedCanal === null ? '#3B82F6' : 'transparent'}`,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Layers style={{ width: 18, height: 18, color: '#3B82F6' }} />
                <span style={{ fontSize: 13, fontWeight: selectedCanal === null ? 600 : 400 }}>Todos os Canais</span>
              </button>
              {canais.map(canal => {
                const config = CANAL_CONFIG[canal.tipo] || CANAL_CONFIG.outro
                const Icon = config.icon
                return (
                  <button
                    key={canal.id}
                    onClick={() => {
                      setSelectedCanal(canal.id)
                      setFiltroCanal(canal.id)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      background: selectedCanal === canal.id ? `${config.color}10` : 'transparent',
                      border: 'none',
                      borderLeft: `3px solid ${selectedCanal === canal.id ? config.color : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${config.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon style={{ width: 14, height: 14, color: config.color }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: selectedCanal === canal.id ? 600 : 400, color: '#374151' }}>
                      {canal.nome}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {viewMode === 'timeline' ? (
            // Timeline View
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {timelineLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                  <MessageSquare style={{ width: 48, height: 48, opacity: 0.3, marginBottom: 16 }} />
                  <p>Nenhuma comunicacao encontrada</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredTimeline.map((item, index) => {
                    const Icon = getItemIcon(item.tipo_item)
                    const color = getItemColor(item.tipo_item)
                    return (
                      <div
                        key={item.id}
                        onClick={() => setItemSelecionado(item)}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: 16,
                          background: 'white',
                          borderRadius: 12,
                          border: `1px solid ${item.importante ? '#FEE2E2' : '#E5E7EB'}`,
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                          opacity: item.lido === false ? 1 : 0.85
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: `${color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon style={{ width: 18, height: 18, color }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <h4 style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: item.lido === false ? 600 : 500,
                                color: '#1F2937',
                                marginBottom: 2
                              }}>
                                {item.titulo}
                              </h4>
                              <span style={{ fontSize: 12, color: '#6B7280' }}>
                                {item.autor_nome}
                                {item.autor_contacto && ` • ${item.autor_contacto}`}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {item.importante && (
                                <Star style={{ width: 14, height: 14, color: '#F59E0B', fill: '#F59E0B' }} />
                              )}
                              <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                {formatDate(item.data_evento)}
                              </span>
                            </div>
                          </div>

                          {item.resumo && (
                            <p style={{
                              margin: '8px 0 0',
                              fontSize: 13,
                              color: '#4B5563',
                              lineHeight: 1.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {item.resumo}
                            </p>
                          )}

                          {/* Footer */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                            {item.tem_anexos && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
                                <Paperclip style={{ width: 12, height: 12 }} />
                                {item.anexos_count || 1} anexo{(item.anexos_count || 1) > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.tem_accoes && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8B5CF6' }}>
                                <ClipboardList style={{ width: 12, height: 12 }} />
                                Tem acao associada
                              </span>
                            )}
                            {item.metadados?.estado && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `${ESTADO_CONFIG[item.metadados.estado]?.color}15`,
                                color: ESTADO_CONFIG[item.metadados.estado]?.color
                              }}>
                                {ESTADO_CONFIG[item.metadados.estado]?.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            // Acoes View
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              {acoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                  <ClipboardList style={{ width: 48, height: 48, opacity: 0.3, marginBottom: 16 }} />
                  <p>Nenhuma acao encontrada</p>
                  <button
                    onClick={() => setShowNovaAcao(true)}
                    style={{
                      marginTop: 16,
                      padding: '8px 16px',
                      background: '#3B82F6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    Criar Nova Acao
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {acoes.map(acao => {
                    const tipoConfig = ACAO_CONFIG[acao.tipo_acao] || {}
                    const TipoIcon = tipoConfig.icon || CircleDot
                    const estadoConfig = ESTADO_CONFIG[acao.estado] || {}
                    const isAtrasada = acao.prazo && new Date(acao.prazo) < new Date() && acao.estado !== 'concluida'

                    return (
                      <div
                        key={acao.id}
                        onClick={() => setItemSelecionado(acao)}
                        style={{
                          display: 'flex',
                          gap: 16,
                          padding: 16,
                          background: 'white',
                          borderRadius: 12,
                          border: `1px solid ${isAtrasada ? '#FEE2E2' : '#E5E7EB'}`,
                          cursor: 'pointer'
                        }}
                      >
                        {/* Tipo Icon */}
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: `${tipoConfig.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <TipoIcon style={{ width: 20, height: 20, color: tipoConfig.color }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
                                {acao.titulo}
                              </h4>
                              {acao.descricao && (
                                <p style={{
                                  margin: '4px 0 0',
                                  fontSize: 13,
                                  color: '#6B7280',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {acao.descricao}
                                </p>
                              )}
                            </div>

                            {/* Estado badge */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: `${estadoConfig.color}15`,
                              color: estadoConfig.color,
                              whiteSpace: 'nowrap'
                            }}>
                              {estadoConfig.label}
                            </span>
                          </div>

                          {/* Meta info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                            {acao.responsavel_nome && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280' }}>
                                <Users style={{ width: 14, height: 14 }} />
                                {acao.responsavel_nome}
                              </span>
                            )}
                            {acao.prazo && (
                              <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                color: isAtrasada ? '#EF4444' : '#6B7280'
                              }}>
                                <Clock style={{ width: 14, height: 14 }} />
                                {isAtrasada ? 'Atrasada - ' : ''}
                                {new Date(acao.prazo).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            {acao.prioridade && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: acao.prioridade === 'urgente' ? '#FEE2E2' :
                                           acao.prioridade === 'alta' ? '#FEF3C7' :
                                           acao.prioridade === 'media' ? '#DBEAFE' : '#F3F4F6',
                                color: acao.prioridade === 'urgente' ? '#DC2626' :
                                      acao.prioridade === 'alta' ? '#D97706' :
                                      acao.prioridade === 'media' ? '#2563EB' : '#6B7280'
                              }}>
                                {acao.prioridade.toUpperCase()}
                              </span>
                            )}
                            {acao.origem_tipo && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF' }}>
                                {acao.origem_tipo === 'email' && <Mail style={{ width: 12, height: 12 }} />}
                                {acao.origem_tipo === 'ia_sugestao' && <Bot style={{ width: 12, height: 12 }} />}
                                {acao.origem_tipo === 'manual' && <Users style={{ width: 12, height: 12 }} />}
                                Via {acao.origem_tipo === 'ia_sugestao' ? 'IA' : acao.origem_tipo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Acao */}
      {showNovaAcao && (
        <ModalNovaAcao
          obraId={obraUuid}
          canais={canais}
          onClose={() => setShowNovaAcao(false)}
          onSave={() => {
            setShowNovaAcao(false)
            loadAcoes()
            loadTimeline()
          }}
        />
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

// Modal para criar nova acao
function ModalNovaAcao({ obraId, canais, onClose, onSave }) {
  const toast = useToast()
  const [formData, setFormData] = useState({
    tipo_acao: 'tarefa',
    titulo: '',
    descricao: '',
    responsavel_nome: '',
    prazo: '',
    prioridade: 'media',
    severidade: '',
    canal_id: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!formData.titulo) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('obra_acoes')
        .insert({
          obra_id: obraId,
          ...formData,
          origem_tipo: 'manual',
          estado: 'pendente',
          prazo: formData.prazo || null,
          canal_id: formData.canal_id || null,
          severidade: formData.tipo_acao === 'incidente' ? formData.severidade || null : null
        })

      if (error) throw error
      onSave()
    } catch (err) {
      console.error('Erro ao criar acao:', err)
      toast.error('Erro', 'Erro ao criar ação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        width: 500,
        maxWidth: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Nova Acao</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(ACAO_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, tipo_acao: key })}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: `2px solid ${formData.tipo_acao === key ? config.color : '#E5E7EB'}`,
                      borderRadius: 8,
                      background: formData.tipo_acao === key ? `${config.color}10` : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: config.color }} />
                    <span style={{ fontSize: 11, color: formData.tipo_acao === key ? config.color : '#6B7280' }}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Titulo */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Titulo *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Contactar fornecedor sobre materiais"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                fontSize: 14
              }}
            />
          </div>

          {/* Descricao */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Descricao</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes adicionais..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Responsavel e Prazo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Responsavel</label>
              <input
                type="text"
                value={formData.responsavel_nome}
                onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                placeholder="Nome do responsavel"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Prazo</label>
              <input
                type="date"
                value={formData.prazo}
                onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {/* Prioridade e Canal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Prioridade</label>
              <select
                value={formData.prioridade}
                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Canal</label>
              <select
                value={formData.canal_id}
                onChange={(e) => setFormData({ ...formData, canal_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                <option value="">Nenhum</option>
                {canais.map(canal => (
                  <option key={canal.id} value={canal.id}>{canal.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Severidade (apenas para incidentes) */}
          {formData.tipo_acao === 'incidente' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Severidade</label>
              <select
                value={formData.severidade}
                onChange={(e) => setFormData({ ...formData, severidade: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                <option value="">Selecionar...</option>
                <option value="menor">Menor</option>
                <option value="maior">Maior</option>
                <option value="critica">Critica</option>
              </select>
            </div>
          )}
        </div>

        {/* Botoes */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              background: 'white',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.titulo || saving}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: 8,
              background: '#3B82F6',
              color: 'white',
              cursor: formData.titulo && !saving ? 'pointer' : 'not-allowed',
              opacity: formData.titulo && !saving ? 1 : 0.5,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 16, height: 16 }} />}
            {saving ? 'A criar...' : 'Criar Acao'}
          </button>
        </div>
      </div>
    </div>
  )
}
