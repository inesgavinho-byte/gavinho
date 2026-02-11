import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import {
  Mail, Star, Search, RefreshCw, Paperclip, ChevronRight,
  Reply, Forward, Trash2, Archive, Sparkles, Plus, Loader2,
  ClipboardCheck, CheckCircle2, AlertCircle, FileText, ListTodo,
  Bot, ChevronUp, ChevronDown, Check, X, Undo2, Zap, Clock, Eye,
  Brain, Shield, Send, UserPlus
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
  onAssociateProject,
  processando,
  loadingSuggestion,
  processResult,
  obrasDisponiveis,
  associating
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

      {/* Manual Project Association */}
      {!email.projeto_id && !email.obra_id && (
        <div style={{
          padding: '10px 24px',
          borderBottom: `1px solid ${functional.border}`,
          backgroundColor: '#FFFBEB',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <AlertCircle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#92400E',
            fontFamily: "'Quattrocento Sans', sans-serif"
          }}>
            Sem projeto associado
          </span>
          <select
            onChange={(e) => {
              if (e.target.value) onAssociateProject(email, e.target.value)
            }}
            disabled={associating}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              color: brand.brown,
              backgroundColor: brand.white,
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '6px',
              cursor: 'pointer',
              minWidth: '220px',
              fontFamily: "'Quattrocento Sans', sans-serif"
            }}
            defaultValue=""
          >
            <option value="" disabled>Associar a projeto/obra...</option>
            {(obrasDisponiveis || []).map(o => (
              <option key={o.id} value={`${o.tipo}:${o.id}`}>{o.label}</option>
            ))}
          </select>
          {associating && <Loader2 size={14} className="spin" style={{ color: '#D97706' }} />}
        </div>
      )}

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
// REPLY MODAL COMPONENT
// ============================================
const ReplyModal = ({ email, onClose, onSent, suggestedReply }) => {
  const [replyText, setReplyText] = useState(suggestedReply || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const handleSend = async () => {
    if (!replyText.trim()) {
      setError('Escreve uma resposta')
      return
    }

    setSending(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            to: [email.de_email],
            subject: email.assunto?.startsWith('Re:') ? email.assunto : `Re: ${email.assunto}`,
            body_text: replyText,
            body_html: `<div style="font-family: Arial, sans-serif;">${replyText.replace(/\n/g, '<br>')}</div>
              <br><hr style="border: none; border-top: 1px solid #ccc;">
              <p style="color: #666; font-size: 12px;">Em ${new Date(email.data_recebido).toLocaleString('pt-PT')}, ${email.de_nome || email.de_email} escreveu:</p>
              <blockquote style="margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; color: #555;">
                ${email.corpo_texto?.replace(/\n/g, '<br>') || ''}
              </blockquote>`,
            obra_id: email.obra_id,
            reply_to_message_id: email.id
          })
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar email')
      }

      onSent && onSent(result)
      onClose()
    } catch (err) {
      console.error('Erro ao enviar resposta:', err)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: brand.white,
        borderRadius: '12px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${brand.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Reply size={20} style={{ color: brand.oliveGray }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Responder</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} style={{ color: brand.brown }} />
          </button>
        </div>

        {/* Recipients */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${brand.borderLight}`,
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: functional.textTertiary, width: '40px' }}>Para:</span>
            <span style={{ color: functional.textPrimary }}>{email.de_nome || email.de_email}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ color: functional.textTertiary, width: '40px' }}>Assunto:</span>
            <span style={{ color: functional.textPrimary }}>
              {email.assunto?.startsWith('Re:') ? email.assunto : `Re: ${email.assunto}`}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreve a tua resposta..."
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '12px',
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: "'Quattrocento Sans', sans-serif",
              resize: 'vertical',
              outline: 'none'
            }}
          />

          {/* Original message preview */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            borderLeft: '3px solid #ccc'
          }}>
            <div style={{ fontSize: '11px', color: functional.textTertiary, marginBottom: '8px' }}>
              Em {new Date(email.data_recebido).toLocaleString('pt-PT')}, {email.de_nome || email.de_email} escreveu:
            </div>
            <div style={{
              fontSize: '12px',
              color: functional.textSecondary,
              maxHeight: '100px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {email.corpo_texto?.substring(0, 500)}
              {email.corpo_texto?.length > 500 ? '...' : ''}
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: functional.urgentRedBg,
              color: functional.urgentRed,
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${brand.borderLight}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: brand.white,
              color: brand.brown,
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 24px',
              backgroundColor: brand.oliveGray,
              color: brand.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: sending ? 'wait' : 'pointer',
              opacity: sending ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FORWARD MODAL COMPONENT
// ============================================
const ForwardModal = ({ email, onClose, onSent }) => {
  const [toEmail, setToEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const handleSend = async () => {
    if (!toEmail.trim()) {
      setError('Introduz um email de destino')
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(toEmail)) {
      setError('Email invalido')
      return
    }

    setSending(true)
    setError(null)

    try {
      const forwardBody = message
        ? `${message}\n\n---------- Mensagem encaminhada ----------\nDe: ${email.de_nome || email.de_email}\nData: ${new Date(email.data_recebido).toLocaleString('pt-PT')}\nAssunto: ${email.assunto}\n\n${email.corpo_texto}`
        : `---------- Mensagem encaminhada ----------\nDe: ${email.de_nome || email.de_email}\nData: ${new Date(email.data_recebido).toLocaleString('pt-PT')}\nAssunto: ${email.assunto}\n\n${email.corpo_texto}`

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            to: [toEmail],
            subject: `Fwd: ${email.assunto}`,
            body_text: forwardBody,
            body_html: `<div style="font-family: Arial, sans-serif;">
              ${message ? `<p>${message.replace(/\n/g, '<br>')}</p><br>` : ''}
              <hr style="border: none; border-top: 1px solid #ccc;">
              <p style="color: #666; font-size: 12px;"><strong>---------- Mensagem encaminhada ----------</strong></p>
              <p style="color: #666; font-size: 12px;">
                <strong>De:</strong> ${email.de_nome || email.de_email}<br>
                <strong>Data:</strong> ${new Date(email.data_recebido).toLocaleString('pt-PT')}<br>
                <strong>Assunto:</strong> ${email.assunto}
              </p>
              <div style="padding: 10px; background: #f9f9f9; border-radius: 8px; margin-top: 10px;">
                ${email.corpo_texto?.replace(/\n/g, '<br>') || email.corpo_html || ''}
              </div>
            </div>`,
            obra_id: email.obra_id
          })
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao encaminhar email')
      }

      onSent && onSent(result)
      onClose()
    } catch (err) {
      console.error('Erro ao encaminhar:', err)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: brand.white,
        borderRadius: '12px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${brand.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Forward size={20} style={{ color: brand.oliveGray }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Encaminhar</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} style={{ color: brand.brown }} />
          </button>
        </div>

        {/* Recipients */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${brand.borderLight}`,
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: functional.textTertiary, width: '40px' }}>Para:</span>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="email@exemplo.com"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: `1px solid ${brand.borderSubtle}`,
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <span style={{ color: functional.textTertiary, width: '40px' }}>Assunto:</span>
            <span style={{ color: functional.textPrimary }}>Fwd: {email.assunto}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Adiciona uma mensagem (opcional)..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: "'Quattrocento Sans', sans-serif",
              resize: 'vertical',
              outline: 'none'
            }}
          />

          {/* Original message preview */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: `1px solid ${brand.borderLight}`
          }}>
            <div style={{ fontSize: '11px', color: functional.textTertiary, marginBottom: '8px' }}>
              <strong>---------- Mensagem encaminhada ----------</strong><br />
              <strong>De:</strong> {email.de_nome || email.de_email}<br />
              <strong>Data:</strong> {new Date(email.data_recebido).toLocaleString('pt-PT')}<br />
              <strong>Assunto:</strong> {email.assunto}
            </div>
            <div style={{
              fontSize: '12px',
              color: functional.textSecondary,
              maxHeight: '150px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {email.corpo_texto?.substring(0, 800)}
              {email.corpo_texto?.length > 800 ? '...' : ''}
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: functional.urgentRedBg,
              color: functional.urgentRed,
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${brand.borderLight}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: brand.white,
              color: brand.brown,
              border: `1px solid ${brand.borderSubtle}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 24px',
              backgroundColor: brand.oliveGray,
              color: brand.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: sending ? 'wait' : 'pointer',
              opacity: sending ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Forward size={16} />}
            Encaminhar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN EMAILS PAGE
// ============================================
export default function Emails() {
  const toast = useToast()
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
  const [associating, setAssociating] = useState(false)

  // Agent states
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [agentActions, setAgentActions] = useState([])
  const [agentQueue, setAgentQueue] = useState([])
  const [agentLoading, setAgentLoading] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, naoLidos: 0, urgentes: 0 })

  // Modal states
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [emailToReply, setEmailToReply] = useState(null)
  const [suggestedReply, setSuggestedReply] = useState('')

  useEffect(() => {
    loadEmails()
    loadObras()
    loadAgentData()
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

  const loadAgentData = async () => {
    try {
      setAgentLoading(true)
      const [actionsRes, queueRes] = await Promise.all([
        supabase
          .from('agent_actions')
          .select('*, email:email_id(subject, from_address, category, summary_pt)')
          .in('status', ['pending', 'approved', 'executed'])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('email_processing_queue')
          .select('id, subject, from_address, status, category, confidence, summary_pt, urgency, created_at')
          .in('status', ['pending', 'fetching', 'classifying', 'routing', 'completed', 'needs_review'])
          .order('created_at', { ascending: false })
          .limit(30)
      ])

      if (actionsRes.data) setAgentActions(actionsRes.data)
      if (queueRes.data) setAgentQueue(queueRes.data)
    } catch (err) {
      // Tables may not exist yet — graceful degradation
      if (err?.code !== '42P01') {
        console.error('Erro ao carregar dados do agente:', err)
      }
    } finally {
      setAgentLoading(false)
    }
  }

  const handleApproveAction = async (actionId) => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', actionId)
      if (error) throw error

      // Execute via edge function
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ action_id: actionId })
        }
      )

      toast.success('Aprovado', 'Ação aprovada e executada')
      loadAgentData()
    } catch (err) {
      toast.error('Erro', err.message)
    }
  }

  const handleRejectAction = async (actionId) => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: 'rejected', rejection_reason: 'Rejeitado pelo utilizador' })
        .eq('id', actionId)
      if (error) throw error
      toast.info('Rejeitado', 'Ação rejeitada')
      loadAgentData()
    } catch (err) {
      toast.error('Erro', err.message)
    }
  }

  const handleRollbackAction = async (actionId) => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ rollback_action_id: actionId })
        }
      )
      toast.success('Revertido', 'Ação revertida com sucesso')
      loadAgentData()
    } catch (err) {
      toast.error('Erro', err.message)
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
    setEmailToReply(email)
    setSuggestedReply('')
    setShowReplyModal(true)
  }

  const handleForward = (email) => {
    setEmailToReply(email)
    setShowForwardModal(true)
  }

  const handleEmailSent = (result) => {
    // Recarregar emails para mostrar o enviado
    loadEmails()
    setSelectedEmail(null)
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
        // Abrir modal de reply com a sugestão pre-preenchida
        setEmailToReply(email)
        setSuggestedReply(data.resposta)
        setShowReplyModal(true)
      } else {
        toast.warning('Aviso', 'Não foi possível gerar uma sugestão.')
      }
    } catch (err) {
      console.error('Erro ao obter sugestão:', err)
      toast.error('Erro', 'Erro ao gerar sugestão: ' + err.message)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const handleAssociateProject = async (email, value) => {
    if (!email || !value) return
    setAssociating(true)
    try {
      const [tipo, id] = value.split(':')
      const update = tipo === 'projeto'
        ? { projeto_id: id, obra_id: null }
        : { obra_id: id, projeto_id: null }

      const { error } = await supabase
        .from('obra_emails')
        .update(update)
        .eq('id', email.id)

      if (error) throw error

      // Update local state
      setEmails(prev => prev.map(e =>
        e.id === email.id ? { ...e, ...update } : e
      ))
      setSelectedEmail(prev => prev?.id === email.id ? { ...prev, ...update } : prev)
      toast.success('Associado', 'Email associado ao projeto/obra com sucesso')
    } catch (err) {
      console.error('Erro ao associar:', err)
      toast.error('Erro', 'Erro ao associar email: ' + err.message)
    } finally {
      setAssociating(false)
    }
  }

  const handleProcessEmail = async (email) => {
    if (!email) return

    const projetoId = email.projeto_id || email.obra_id
    if (!projetoId) {
      toast.warning('Aviso', 'Este email não está associado a nenhum projeto ou obra. Para processar o email, precisa estar associado a um projeto.')
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
            onAssociateProject={handleAssociateProject}
            processando={processando}
            processResult={processResult}
            loadingSuggestion={loadingSuggestion}
            obrasDisponiveis={obras}
            associating={associating}
          />
        )}
      </div>

      {/* Agent Activity Panel */}
      <div style={{
        borderTop: `2px solid ${brand.oliveGray}`,
        backgroundColor: brand.white,
        transition: 'max-height 0.3s ease',
        maxHeight: agentPanelOpen ? '360px' : '44px',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Toggle Header */}
        <button
          onClick={() => {
            setAgentPanelOpen(!agentPanelOpen)
            if (!agentPanelOpen) loadAgentData()
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Quattrocento Sans', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={18} stroke={brand.oliveGray} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: brand.brown }}>
              Agentes IA
            </span>
            {agentActions.filter(a => a.status === 'pending').length > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#fff',
                backgroundColor: '#EF4444',
                padding: '2px 8px',
                borderRadius: '10px',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {agentActions.filter(a => a.status === 'pending').length}
              </span>
            )}
            {agentQueue.filter(q => q.status === 'completed').length > 0 && (
              <span style={{
                fontSize: '11px',
                color: brand.oliveGray,
                backgroundColor: '#F0F0F0',
                padding: '2px 8px',
                borderRadius: '10px',
              }}>
                {agentQueue.filter(q => q.status === 'completed').length} classificados
              </span>
            )}
          </div>
          {agentPanelOpen ? <ChevronDown size={16} stroke={brand.brown} /> : <ChevronUp size={16} stroke={brand.brown} />}
        </button>

        {/* Panel Content */}
        {agentPanelOpen && (
          <div style={{ padding: '0 24px 16px', overflowY: 'auto', maxHeight: '300px' }}>
            {agentLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: functional.textTertiary, fontSize: '13px' }}>
                <Loader2 size={16} className="spin" /> A carregar atividade dos agentes...
              </div>
            ) : (
              <>
                {/* Pending Actions */}
                {agentActions.filter(a => a.status === 'pending').length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: brand.oliveGray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Ações Pendentes de Aprovação
                    </div>
                    {agentActions.filter(a => a.status === 'pending').map(action => (
                      <div key={action.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        gap: '12px'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <Zap size={13} style={{ color: '#D97706', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {action.action_description || action.action_type}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#A16207' }}>
                            {action.email?.subject ? `Email: ${action.email.subject.substring(0, 60)}...` : ''} — Confiança: {((action.confidence || 0) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveAction(action.id) }}
                            style={{ padding: '4px 8px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }}
                            title="Aprovar"
                          >
                            <Check size={12} /> Aprovar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectAction(action.id) }}
                            style={{ padding: '4px 8px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }}
                            title="Rejeitar"
                          >
                            <X size={12} /> Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recently Executed */}
                {agentActions.filter(a => a.status === 'executed').length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: brand.oliveGray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Executadas Recentemente
                    </div>
                    {agentActions.filter(a => a.status === 'executed').slice(0, 5).map(action => (
                      <div key={action.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        marginBottom: '4px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                          <CheckCircle2 size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {action.action_description || action.action_type}
                          </span>
                        </div>
                        {action.is_reversible && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRollbackAction(action.id) }}
                            style={{ padding: '3px 6px', backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}
                            title="Reverter"
                          >
                            <Undo2 size={10} /> Reverter
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Processing Queue */}
                {agentQueue.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: brand.oliveGray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Fila de Processamento
                    </div>
                    {agentQueue.slice(0, 8).map(item => {
                      const statusColors = {
                        pending: { bg: '#F3F4F6', border: '#D1D5DB', color: '#6B7280', icon: Clock },
                        fetching: { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', icon: Loader2 },
                        classifying: { bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C', icon: Brain },
                        routing: { bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C', icon: Zap },
                        completed: { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', icon: CheckCircle2 },
                        needs_review: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: Eye },
                      }
                      const s = statusColors[item.status] || statusColors.pending
                      const StatusIcon = s.icon
                      return (
                        <div key={item.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          backgroundColor: s.bg,
                          border: `1px solid ${s.border}`,
                          borderRadius: '6px',
                          marginBottom: '3px',
                        }}>
                          <StatusIcon size={12} style={{ color: s.color, flexShrink: 0 }} className={item.status === 'fetching' || item.status === 'classifying' ? 'spin' : ''} />
                          <span style={{ fontSize: '11px', color: s.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.subject || item.from_address || 'Email em processamento'}
                          </span>
                          {item.category && (
                            <span style={{ fontSize: '10px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
                              {item.category}
                            </span>
                          )}
                          {item.confidence != null && (
                            <span style={{ fontSize: '10px', color: s.color, fontWeight: '600', flexShrink: 0 }}>
                              {(item.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {agentActions.length === 0 && agentQueue.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: functional.textTertiary }}>
                    <Bot size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>Nenhuma atividade de agentes</p>
                    <p style={{ fontSize: '11px', margin: '4px 0 0', color: '#9CA3AF' }}>
                      Configure as subscrições do Microsoft Graph para ativar o processamento automático
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && emailToReply && (
        <ReplyModal
          email={emailToReply}
          onClose={() => {
            setShowReplyModal(false)
            setEmailToReply(null)
            setSuggestedReply('')
          }}
          onSent={handleEmailSent}
          suggestedReply={suggestedReply}
        />
      )}

      {/* Forward Modal */}
      {showForwardModal && emailToReply && (
        <ForwardModal
          email={emailToReply}
          onClose={() => {
            setShowForwardModal(false)
            setEmailToReply(null)
          }}
          onSent={handleEmailSent}
        />
      )}

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
