import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Mail, Star, Search, RefreshCw, Paperclip, ChevronRight,
  Reply, Forward, Trash2, Archive, Sparkles, Plus, Loader2,
  ClipboardCheck, CheckCircle2, AlertCircle, FileText, ListTodo
} from 'lucide-react'

// ============================================
// GAVINHO Platform — Emails Module (Redesigned)
// ============================================
// Brand colors: sidebar, header, buttons
// Functional colors: email list content area only

// Brand colors (for chrome: header, buttons)
const brand = {
  warmBeige: '#ADAA96',
  softCream: '#F2F0E7',
  oliveGray: '#8B8670',
  sandyBeach: '#EEEAE5',
  blush: '#C3BAAF',
  brown: '#5F5C59',
  black: '#000000',
  white: '#FFFFFF',
  borderLight: '#E5E5E5',
  borderSubtle: '#E0DED8',
  statusApproved: '#10B981',
  statusNeedsChanges: '#EF4444'
}

// Functional colors (for email content area only)
const functional = {
  unreadBlue: '#0078D4',
  unreadBlueBg: '#E8F4FD',
  urgentRed: '#C42B1C',
  urgentRedBg: '#FDE7E9',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textTertiary: '#8A8A8A',
  bgWhite: '#FFFFFF',
  bgHover: '#F5F5F5',
  border: '#E5E5E5'
}

// ============================================
// EMAIL LIST ITEM COMPONENT
// ============================================
const EmailItem = ({ email, isSelected, onClick }) => {
  const isUnread = !email.lido
  const isUrgent = email.urgencia === 'urgente' || email.urgencia === 'alta'

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

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: `1px solid ${functional.border}`,
        cursor: 'pointer',
        backgroundColor: isSelected
          ? functional.unreadBlueBg
          : (isUnread ? '#FAFAFA' : functional.bgWhite),
        transition: 'background-color 0.1s ease'
      }}
    >
      {/* Left indicator bar */}
      <div style={{
        width: '4px',
        backgroundColor: isUrgent
          ? functional.urgentRed
          : (isUnread ? functional.unreadBlue : 'transparent'),
        flexShrink: 0
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '12px 12px 12px 8px',
        gap: '10px',
        flex: 1,
        minWidth: 0
      }}>
        {/* Star + Unread indicator */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          paddingTop: '2px'
        }}>
          <Star
            size={16}
            fill={email.importante ? '#F59E0B' : 'none'}
            stroke={email.importante ? '#F59E0B' : '#D0D0D0'}
            strokeWidth={2}
          />
          {isUnread && (
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: functional.unreadBlue,
              flexShrink: 0
            }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: Sender + Time */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '3px',
            gap: '12px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: isUnread ? '600' : '400',
              color: isUnread ? functional.textPrimary : functional.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {email.de_nome || email.de_email}
            </span>
            <span style={{
              fontSize: '12px',
              color: isUnread ? functional.textSecondary : functional.textTertiary,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {formatDate(email.data_recebido)}
            </span>
          </div>

          {/* Row 2: Subject */}
          <div style={{
            fontSize: '13px',
            fontWeight: isUnread ? '600' : '400',
            color: isUnread ? functional.textPrimary : functional.textSecondary,
            marginBottom: '3px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {email.assunto}
          </div>

          {/* Row 3: Preview */}
          <div style={{
            fontSize: '12px',
            color: functional.textTertiary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {email.corpo_texto?.substring(0, 100) || ''}
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {isUrgent && (
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: '600',
                color: functional.urgentRed,
                backgroundColor: functional.urgentRedBg,
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.3px',
                fontFamily: "'Quattrocento Sans', sans-serif"
              }}>
                {email.urgencia === 'urgente' ? 'Urgente' : 'Alta'}
              </span>
            )}
            {(email.codigo_obra_detectado || email.obras?.codigo || email.projetos?.codigo) && (
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: '500',
                color: brand.oliveGray,
                backgroundColor: brand.softCream,
                padding: '3px 8px',
                borderRadius: '4px',
                fontFamily: "'Quattrocento Sans', sans-serif"
              }}>
                {email.codigo_obra_detectado || email.obras?.codigo || email.projetos?.codigo}
              </span>
            )}
            {email.tem_anexos && (
              <Paperclip size={12} style={{ color: functional.textTertiary }} />
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={16}
          stroke="#D0D0D0"
          strokeWidth={2}
          style={{ alignSelf: 'center', flexShrink: 0 }}
        />
      </div>
    </div>
  )
}

// ============================================
// EMAIL DETAIL PANEL
// ============================================
const EmailDetail = ({
  email,
  onReply,
  onForward,
  onArchive,
  onProcessEmail,
  onSuggestReply,
  processando,
  loadingSuggestion,
  processResult
}) => {
  if (!email) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: functional.textTertiary,
        fontSize: '14px',
        backgroundColor: '#FAFAFA',
        fontFamily: "'Quattrocento Sans', sans-serif"
      }}>
        Seleciona um email para ver os detalhes
      </div>
    )
  }

  const isUrgent = email.urgencia === 'urgente' || email.urgencia === 'alta'
  const formatFullDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{
      flex: 1,
      backgroundColor: functional.bgWhite,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Subject header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${functional.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <h1 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: functional.textPrimary,
            margin: 0,
            lineHeight: '1.4',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {email.assunto}
          </h1>
          {isUrgent && (
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: functional.urgentRed,
              backgroundColor: functional.urgentRedBg,
              padding: '4px 10px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {email.urgencia === 'urgente' ? 'Urgente' : 'Alta Prioridade'}
            </span>
          )}
        </div>
      </div>

      {/* Sender info */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${functional.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: functional.unreadBlueBg,
          color: functional.unreadBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          fontWeight: '600',
          fontFamily: "'Quattrocento Sans', sans-serif"
        }}>
          {(email.de_nome || email.de_email || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: functional.textPrimary,
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {email.de_nome || email.de_email}
          </div>
          <div style={{
            fontSize: '12px',
            color: functional.textTertiary,
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            Para: {email.para_emails?.map(p => p.email || p).join(', ') || 'desconhecido'}
            {email.cc_emails?.length > 0 && ` | CC: ${email.cc_emails.map(c => c.email || c).join(', ')}`}
          </div>
          <div style={{
            fontSize: '11px',
            color: functional.textTertiary,
            marginTop: '2px',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {formatFullDate(email.data_recebido)}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '12px 24px',
        borderBottom: `1px solid ${functional.border}`,
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Primary actions */}
        <button
          onClick={() => onReply(email)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: brand.oliveGray,
            color: brand.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}
        >
          <Reply size={16} />
          Responder
        </button>
        <button
          onClick={() => onForward(email)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: brand.white,
            color: brand.brown,
            border: `1px solid ${brand.borderSubtle}`,
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}
        >
          <Forward size={16} />
          Encaminhar
        </button>

        {/* AI actions */}
        <button
          onClick={() => onSuggestReply(email)}
          disabled={loadingSuggestion}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: brand.statusApproved,
            color: brand.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: loadingSuggestion ? 'wait' : 'pointer',
            opacity: loadingSuggestion ? 0.7 : 1,
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}
        >
          {loadingSuggestion ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          Sugerir Resposta
        </button>
        <button
          onClick={() => onProcessEmail(email)}
          disabled={processando}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#7C3AED',
            color: brand.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: processando ? 'wait' : 'pointer',
            opacity: processando ? 0.7 : 1,
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}
        >
          {processando ? <Loader2 size={16} className="spin" /> : <ClipboardCheck size={16} />}
          Processar Email
        </button>

        {/* Icon actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onArchive(email)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: brand.brown,
              opacity: 0.6
            }}
            title="Arquivar"
          >
            <Archive size={18} />
          </button>
          <button style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: brand.brown,
            opacity: 0.6
          }}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Process Result Panel */}
      {processResult && (
        <div style={{
          padding: '12px 24px',
          backgroundColor: processResult.success ? '#F0FDF4' : '#FEF2F2',
          borderBottom: `1px solid ${processResult.success ? '#BBF7D0' : '#FECACA'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: processResult.success ? '#166534' : '#991B1B',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            {processResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {processResult.success ? 'Email processado com sucesso' : 'Erro ao processar'}
          </div>

          {processResult.success && (
            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: '#374151',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {/* Classification */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#E0E7FF',
                borderRadius: '4px'
              }}>
                <Mail size={12} />
                <span style={{ fontWeight: '500' }}>
                  {processResult.classificacao?.tipo?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Diary entry */}
              {processResult.diario?.criado && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#DBEAFE',
                  borderRadius: '4px'
                }}>
                  <FileText size={12} />
                  <span>Registado no Diário</span>
                </div>
              )}

              {/* Task created */}
              {processResult.tarefa?.criada && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '4px'
                }}>
                  <ListTodo size={12} />
                  <span>Tarefa criada: {processResult.tarefa.titulo?.substring(0, 30)}...</span>
                  <span style={{ color: '#92400E', fontWeight: '500' }}>
                    (até {new Date(processResult.tarefa.data_limite).toLocaleDateString('pt-PT')})
                  </span>
                </div>
              )}

              {/* Decisions */}
              {processResult.decisoes?.criadas > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#D1FAE5',
                  borderRadius: '4px'
                }}>
                  <CheckCircle2 size={12} />
                  <span>{processResult.decisoes.criadas} decisão(ões) detectada(s)</span>
                </div>
              )}
            </div>
          )}

          {processResult.classificacao?.resumo && (
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              fontStyle: 'italic',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {processResult.classificacao.resumo}
            </div>
          )}

          {!processResult.success && (
            <div style={{
              fontSize: '12px',
              color: '#991B1B',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}>
              {processResult.error}
            </div>
          )}
        </div>
      )}

      {/* Email body */}
      <div style={{
        flex: 1,
        padding: '20px 24px',
        overflowY: 'auto',
        fontSize: '14px',
        color: functional.textSecondary,
        lineHeight: '1.7',
        fontFamily: "'Quattrocento Sans', sans-serif",
        whiteSpace: 'pre-wrap'
      }}>
        {email.corpo_texto || email.corpo_html?.replace(/<[^>]*>/g, '') || 'Sem conteúdo'}
      </div>

      {/* Attachments */}
      {email.tem_anexos && (
        <div style={{
          padding: '12px 24px',
          borderTop: `1px solid ${functional.border}`,
          backgroundColor: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Paperclip size={14} style={{ color: functional.textTertiary }} />
          <span style={{ fontSize: '12px', color: functional.textTertiary }}>
            Este email tem anexos
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN EMAILS PAGE
// ============================================
export default function Emails() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)

  // Filters
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') || 'todos')
  const [filtroObra, setFiltroObra] = useState(searchParams.get('obra') || 'todos')
  const [filtroUrgencia, setFiltroUrgencia] = useState(searchParams.get('urgencia') || 'todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Obras/Projetos para filtro
  const [obras, setObras] = useState([])

  // AI states
  const [processando, setProcessando] = useState(false)
  const [processResult, setProcessResult] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, naoLidos: 0, urgentes: 0 })

  useEffect(() => {
    loadEmails()
    loadObras()
  }, [])

  useEffect(() => {
    loadEmails()
  }, [filtroTipo, filtroObra, filtroUrgencia, searchTerm])

  const loadEmails = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('obra_emails')
        .select(`
          *,
          obras:obra_id (id, codigo, nome),
          projetos:projeto_id (id, codigo, nome)
        `)
        .order('data_recebido', { ascending: false })
        .limit(100)

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }

      if (filtroObra !== 'todos') {
        query = query.or(`obra_id.eq.${filtroObra},projeto_id.eq.${filtroObra}`)
      }

      if (filtroUrgencia !== 'todos') {
        query = query.eq('urgencia', filtroUrgencia)
      }

      if (searchTerm) {
        query = query.or(`assunto.ilike.%${searchTerm}%,de_email.ilike.%${searchTerm}%,corpo_texto.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setEmails(data || [])

      // Stats
      const naoLidos = (data || []).filter(e => !e.lido).length
      const urgentes = (data || []).filter(e => e.urgencia === 'urgente' || e.urgencia === 'alta').length
      setStats({ total: data?.length || 0, naoLidos, urgentes })

    } catch (err) {
      console.error('Erro ao carregar emails:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadObras = async () => {
    try {
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

      const projetos = (projetosRes.data || []).map(p => ({
        ...p,
        tipo: 'projeto',
        label: `${p.codigo} - ${p.nome}`
      }))

      const obrasData = (obrasRes.data || []).map(o => ({
        ...o,
        tipo: 'obra',
        label: `${o.codigo} - ${o.nome}`
      }))

      setObras([...projetos, ...obrasData])
    } catch (err) {
      console.error('Erro ao carregar projetos/obras:', err)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
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
    setProcessResult(null) // Clear previous process result

    // Mark as read
    if (!email.lido) {
      await supabase
        .from('obra_emails')
        .update({ lido: true })
        .eq('id', email.id)

      setEmails(prev => prev.map(e =>
        e.id === email.id ? { ...e, lido: true } : e
      ))
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

  const handleReply = (email) => {
    alert('Funcionalidade de resposta em desenvolvimento')
  }

  const handleForward = (email) => {
    alert('Funcionalidade de encaminhar em desenvolvimento')
  }

  const handleSuggestReply = async (email) => {
    if (!email) return
    setLoadingSuggestion(true)

    try {
      const { data, error } = await supabase.functions.invoke('email-suggest-reply', {
        body: {
          email_id: email.id,
          assunto: email.assunto,
          corpo: email.corpo_texto,
          de_nome: email.de_nome,
          de_email: email.de_email,
          obra_id: email.obra_id || email.projeto_id
        }
      })

      if (error) throw error

      if (data?.resposta) {
        alert(`Sugestão de resposta:\n\n${data.resposta}`)
      } else {
        alert('Não foi possível gerar uma sugestão.')
      }
    } catch (err) {
      console.error('Erro ao obter sugestão:', err)
      alert('Erro ao gerar sugestão: ' + err.message)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const handleProcessEmail = async (email) => {
    if (!email) return

    const projetoId = email.projeto_id || email.obra_id
    if (!projetoId) {
      alert('Este email não está associado a nenhum projeto ou obra.\n\nPara processar o email, precisa estar associado a um projeto.')
      return
    }

    setProcessando(true)
    setProcessResult(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-processar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email_id: email.id
          })
        }
      )

      const result = await response.json()
      setProcessResult(result)

      // Marcar email como processado na lista local
      if (result.success) {
        setEmails(prev => prev.map(e =>
          e.id === email.id ? { ...e, processado_ia: true, classificacao_ia: result.classificacao?.tipo } : e
        ))
      }

    } catch (error) {
      console.error('Erro ao processar email:', error)
      setProcessResult({
        success: false,
        error: error.message
      })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div style={{
      fontFamily: "'Quattrocento Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: brand.sandyBeach,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: brand.white,
        borderBottom: `1px solid ${brand.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={24} stroke={brand.brown} strokeWidth={1.5} />
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: brand.black,
            margin: 0,
            fontFamily: "'Cormorant Garamond', serif"
          }}>
            Emails
          </h1>
          {/* Badges */}
          <span style={{
            fontSize: '12px',
            color: functional.textTertiary,
            backgroundColor: '#F0F0F0',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {stats.total} total
          </span>
          {stats.naoLidos > 0 && (
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: functional.unreadBlue,
              backgroundColor: functional.unreadBlueBg,
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {stats.naoLidos} não lidos
            </span>
          )}
          {stats.urgentes > 0 && (
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: functional.urgentRed,
              backgroundColor: functional.urgentRedBg,
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {stats.urgentes} urgentes
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: brand.softCream,
            borderRadius: '8px',
            width: '200px'
          }}>
            <Search size={16} stroke={brand.warmBeige} strokeWidth={2} />
            <input
              type="text"
              placeholder="Pesquisar emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: brand.brown,
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '8px',
              backgroundColor: brand.white,
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '8px',
              cursor: refreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Sincronizar Outlook"
          >
            <RefreshCw
              size={18}
              stroke={brand.brown}
              strokeWidth={2}
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
            />
          </button>

          {/* New email button */}
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: brand.oliveGray,
            color: brand.white,
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <Plus size={16} />
            Novo Email
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: brand.white,
        borderBottom: `1px solid ${brand.borderLight}`,
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: brand.brown,
            backgroundColor: brand.white,
            border: `1px solid ${brand.borderSubtle}`,
            borderRadius: '6px',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="todos">Todos</option>
          <option value="recebido">Recebidos</option>
          <option value="enviado">Enviados</option>
        </select>

        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: brand.brown,
            backgroundColor: brand.white,
            border: `1px solid ${brand.borderSubtle}`,
            borderRadius: '6px',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          <option value="todos">Todos Projetos/Obras</option>
          {obras.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        <select
          value={filtroUrgencia}
          onChange={(e) => setFiltroUrgencia(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            color: brand.brown,
            backgroundColor: brand.white,
            border: `1px solid ${brand.borderSubtle}`,
            borderRadius: '6px',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          <option value="todos">Todas Urgências</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Email list */}
        <div style={{
          width: selectedEmail ? '420px' : '100%',
          backgroundColor: functional.bgWhite,
          borderRight: selectedEmail ? `1px solid ${functional.border}` : 'none',
          overflowY: 'auto',
          flexShrink: 0,
          transition: 'width 0.2s ease'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: functional.textTertiary
            }}>
              <Loader2 size={24} className="spin" style={{ marginRight: '8px' }} />
              A carregar emails...
            </div>
          ) : emails.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: functional.textTertiary,
              textAlign: 'center'
            }}>
              <Mail size={48} stroke={brand.warmBeige} strokeWidth={1} style={{ marginBottom: '16px' }} />
              <p style={{ margin: 0 }}>Nenhum email encontrado</p>
              <button
                onClick={handleRefresh}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: brand.oliveGray,
                  color: brand.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Sincronizar Outlook
              </button>
            </div>
          ) : (
            emails.map(email => (
              <EmailItem
                key={email.id}
                email={email}
                isSelected={selectedEmail?.id === email.id}
                onClick={() => handleSelectEmail(email)}
              />
            ))
          )}
        </div>

        {/* Email detail */}
        {selectedEmail && (
          <EmailDetail
            email={selectedEmail}
            onReply={handleReply}
            onForward={handleForward}
            onArchive={handleArchive}
            onProcessEmail={handleProcessEmail}
            onSuggestReply={handleSuggestReply}
            processando={processando}
            processResult={processResult}
            loadingSuggestion={loadingSuggestion}
          />
        )}
      </div>

      {/* CSS for spin animation */}
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
