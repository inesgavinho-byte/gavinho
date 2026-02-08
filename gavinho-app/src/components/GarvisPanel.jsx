// =====================================================
// G.A.R.V.I.S. PANEL - Painel lateral inteligente
// Alertas reais, Deal Rooms reais, Chat Claude AI
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGarvisAlerts } from '../hooks/useGarvisAlerts'
import { useDealRooms } from '../hooks/useDealRooms'
import { sendGarvisMessage, getGarvisChatHistory } from '../services/garvisChat'
import {
  AlertCircle, MessageSquare, Clock, ChevronRight, Send,
  FileText, X, Bell, Sparkles, History, TrendingUp,
  Check, CheckCheck, Archive, Loader2, Eye
} from 'lucide-react'

const GARVIS_SUGGESTIONS = [
  '/recomendar caixilharia',
  '/status',
  '/ajuda',
  'Sugere fornecedor para serralharia',
  'Quem tem melhor preço para Lioz?'
]

export default function GarvisPanel({ onClose, fornecedores = [], kpis = null, onOpenDealRoom = null }) {
  const [activeTab, setActiveTab] = useState('alertas')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const chatEndRef = useRef(null)

  // Real data hooks
  const {
    alertas, unreadCount, criticalCount, loading: alertasLoading,
    markRead, markAllRead, archiveAlert
  } = useGarvisAlerts({ autoGenerate: true })

  const { activeDealRooms, loading: dealRoomsLoading } = useDealRooms()

  const tabs = [
    { id: 'alertas', label: 'Alertas', icon: Bell, badge: unreadCount },
    { id: 'sugestoes', label: 'Sugestões', icon: Sparkles },
    { id: 'historico', label: 'Histórico', icon: History }
  ]

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Load chat history when history tab is selected
  useEffect(() => {
    if (activeTab === 'historico' && !historyLoaded) {
      loadHistory()
    }
  }, [activeTab, historyLoaded])

  const loadHistory = async () => {
    const history = await getGarvisChatHistory(30)
    setHistoryLoaded(true)
    // History is stored separately, shown in the history tab
    setChatMessages(prev => {
      if (prev.length === 0 && history.length > 0) {
        return history.flatMap(h => [
          { role: 'user', content: h.prompt_usuario, timestamp: h.created_at },
          { role: 'garvis', content: h.resposta_gerada, timestamp: h.created_at, tempo: h.tempo_resposta_ms }
        ])
      }
      return prev
    })
  }

  // Send chat message to Claude
  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    // Build context for GARVIS
    const context = {
      fornecedores,
      dealRooms: activeDealRooms,
      alertas,
      kpis,
      history: chatMessages.slice(-6).map(m => ({
        role: m.role === 'garvis' ? 'assistant' : 'user',
        content: m.content
      }))
    }

    const result = await sendGarvisMessage(userMessage, context)

    setChatMessages(prev => [...prev, {
      role: 'garvis',
      content: result.response,
      tempo: result.tempo_ms,
      error: !result.success
    }])
    setChatLoading(false)
  }, [chatInput, chatLoading, fornecedores, activeDealRooms, alertas, kpis, chatMessages])

  // Format time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Agora'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Agora'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 90
        }}
      />
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '400px',
        maxWidth: '90vw',
        background: 'var(--cream)',
        borderLeft: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 91,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)'
      }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '36px', height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--brown-dark)'
        }}>
          G
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--brown)',
            letterSpacing: '1px'
          }}>
            G.A.R.V.I.S.
          </div>
        </div>
        {unreadCount > 0 && (
          <div style={{
            background: 'var(--error)',
            color: 'white',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {unreadCount}
          </div>
        )}
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--brown-light)', padding: '4px'
          }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--stone)',
        background: 'var(--cream)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--brown)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                borderRadius: '8px',
                padding: '1px 5px',
                fontSize: '9px',
                fontWeight: 700
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Alertas Tab */}
        {activeTab === 'alertas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alertasLoading ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Loader2 size={20} className="spin" style={{ color: 'var(--brown-light)' }} />
              </div>
            ) : alertas.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                <Bell size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                Sem alertas ativos
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                  Os alertas serão gerados automaticamente com base nas certificações e orçamentos.
                </div>
              </div>
            ) : (
              <>
                {unreadCount > 1 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      fontSize: '11px', color: 'var(--accent-olive)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '0 0 4px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-end'
                    }}
                  >
                    <CheckCheck size={12} /> Marcar todos como lidos
                  </button>
                )}
                {alertas.map(alerta => (
                  <AlertCard
                    key={alerta.id}
                    alerta={alerta}
                    onMarkRead={() => markRead(alerta.id)}
                    onArchive={() => archiveAlert(alerta.id)}
                    timeAgo={timeAgo}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Sugestões Tab */}
        {activeTab === 'sugestoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {criticalCount > 0 && (
              <SuggestionCard
                icon="🚨"
                title={`${criticalCount} alerta${criticalCount > 1 ? 's' : ''} crítico${criticalCount > 1 ? 's' : ''}`}
                text="Existem alertas que requerem atenção imediata. Reveja a tab Alertas."
                action={() => setActiveTab('alertas')}
                actionLabel="Ver alertas"
              />
            )}
            {activeDealRooms.length > 0 && (
              <SuggestionCard
                icon="🏗️"
                title="Deal Rooms ativos"
                text={`Tem ${activeDealRooms.length} deal room${activeDealRooms.length > 1 ? 's' : ''} em curso. Verifique se há orçamentos por analisar.`}
                actionLabel="Ver deal rooms"
                action={() => {
                  if (onOpenDealRoom && activeDealRooms[0]) onOpenDealRoom(activeDealRooms[0])
                }}
              />
            )}
            {fornecedores.length > 0 && (
              <SuggestionCard
                icon="🔍"
                title="Comandos rápidos"
                text="Use /recomendar [especialidade] para encontrar o melhor fornecedor, /comparar para comparar, ou /status para um resumo."
                actionLabel="Ver comandos"
                action={() => setChatInput('/ajuda')}
              />
            )}
            <SuggestionCard
              icon="💡"
              title="Dica do G.A.R.V.I.S."
              text="Use o chat abaixo para perguntar sobre fornecedores, comparar orçamentos ou pedir recomendações."
            />
          </div>
        )}

        {/* Histórico Tab */}
        {activeTab === 'historico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatMessages.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                <History size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                Sem histórico de conversas.
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                  As interações com o G.A.R.V.I.S. aparecerão aqui.
                </div>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{
                  fontSize: '13px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: msg.role === 'user' ? 'var(--brown)' : msg.error ? 'rgba(220, 38, 38, 0.06)' : 'var(--white)',
                  color: msg.role === 'user' ? 'white' : msg.error ? 'var(--error)' : 'var(--brown)',
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                  lineHeight: 1.5,
                  border: msg.role !== 'user' ? '1px solid var(--stone)' : 'none'
                }}>
                  {msg.content}
                  {msg.tempo && (
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
                      {(msg.tempo / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Deal Rooms Section */}
      <div style={{
        borderTop: '1px solid var(--stone)',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--brown-light)',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          DEAL ROOMS ATIVOS
        </div>
        {dealRoomsLoading ? (
          <div style={{ padding: '8px', textAlign: 'center' }}>
            <Loader2 size={14} className="spin" style={{ color: 'var(--brown-light)' }} />
          </div>
        ) : activeDealRooms.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--brown-light)', padding: '4px 0' }}>
            Sem deal rooms ativos
          </div>
        ) : (
          activeDealRooms.slice(0, 4).map(deal => (
            <DealRoomCard key={deal.id} deal={deal} onClick={() => onOpenDealRoom && onOpenDealRoom(deal)} />
          ))
        )}
      </div>

      {/* Chat Section */}
      <div style={{
        borderTop: '1px solid var(--stone)',
        padding: '12px',
        background: 'rgba(255,255,255,0.5)'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--brown-light)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <MessageSquare size={13} />
          PERGUNTE AO G.A.R.V.I.S.
        </div>

        {/* Recent chat messages (last 4) */}
        {chatMessages.length > 0 && (
          <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
            {chatMessages.slice(-4).map((msg, i) => (
              <div key={i} style={{
                fontSize: '13px',
                padding: '8px 10px',
                marginBottom: '4px',
                borderRadius: '6px',
                background: msg.role === 'user' ? 'var(--brown)' : msg.error ? 'rgba(220, 38, 38, 0.06)' : 'var(--white)',
                color: msg.role === 'user' ? 'white' : msg.error ? 'var(--error)' : 'var(--brown)',
                textAlign: msg.role === 'user' ? 'right' : 'left',
                lineHeight: 1.5
              }}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div style={{
                fontSize: '13px', padding: '8px 10px', borderRadius: '6px',
                background: 'var(--white)', color: 'var(--brown-light)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <Loader2 size={14} className="spin" /> A pensar...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Ex: Preciso de um serralheiro para ferro forj..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
            disabled={chatLoading}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'var(--white)',
              color: 'var(--brown)',
              outline: 'none',
              opacity: chatLoading ? 0.6 : 1
            }}
          />
          <button
            onClick={handleSendChat}
            disabled={chatLoading || !chatInput.trim()}
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              background: chatLoading ? 'var(--brown-light)' : 'var(--brown)',
              color: 'white',
              border: 'none',
              cursor: chatLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {chatLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          </button>
        </div>

        {/* Suggestion chips */}
        {chatMessages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
            {GARVIS_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => setChatInput(sug)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '12px',
                  background: 'var(--white)',
                  color: 'var(--brown-light)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

function AlertCard({ alerta, onMarkRead, onArchive, timeAgo }) {
  const prioridadeColors = {
    critico: { dot: '#dc2626', bg: 'rgba(220, 38, 38, 0.06)' },
    importante: { dot: 'var(--warning)', bg: 'rgba(201, 168, 108, 0.08)' },
    normal: { dot: 'var(--info)', bg: 'rgba(122, 139, 158, 0.06)' },
    info: { dot: 'var(--success)', bg: 'rgba(122, 139, 110, 0.06)' }
  }

  const prio = prioridadeColors[alerta.prioridade] || prioridadeColors.normal

  return (
    <div style={{
      padding: '12px',
      background: prio.bg,
      borderRadius: '10px',
      border: `1px solid ${alerta.lido ? 'var(--stone)' : 'rgba(61, 61, 61, 0.15)'}`,
      opacity: alerta.lido ? 0.7 : 1,
      transition: 'opacity 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: prio.dot,
          marginTop: '4px',
          flexShrink: 0
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            {alerta.titulo}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', lineHeight: 1.5 }}>
            {alerta.mensagem}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
            {alerta.acao_label && (
              <button style={{
                fontSize: '11px',
                color: 'var(--accent-olive)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {alerta.acao_label} <ChevronRight size={12} />
              </button>
            )}
            {!alerta.lido && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead() }}
                style={{
                  fontSize: '10px', color: 'var(--brown-light)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '2px'
                }}
                title="Marcar como lido"
              >
                <Check size={10} /> Lido
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onArchive() }}
              style={{
                fontSize: '10px', color: 'var(--brown-light)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: '2px'
              }}
              title="Arquivar"
            >
              <Archive size={10} />
            </button>
          </div>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--brown-light)', flexShrink: 0 }}>
          {timeAgo(alerta.created_at)}
        </span>
      </div>
    </div>
  )
}

function DealRoomCard({ deal, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px',
      borderRadius: '8px',
      background: 'var(--white)',
      marginBottom: '4px',
      cursor: 'pointer',
      border: '1px solid var(--stone)',
      transition: 'all 0.15s'
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>{deal.titulo}</div>
        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
          {deal.codigo} · {deal.detalhe || 'Em curso'}
        </div>
      </div>
      {deal.badge && (
        <span style={{
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '8px',
          background: deal.badgeColor === 'olive' ? 'var(--success-bg)' : 'var(--warning-bg)',
          color: deal.badgeColor === 'olive' ? 'var(--success)' : 'var(--warning)',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          {deal.badge}
        </span>
      )}
    </div>
  )
}

function SuggestionCard({ icon, title, text, action, actionLabel }) {
  return (
    <div style={{
      padding: '12px',
      background: 'var(--white)',
      borderRadius: '10px',
      border: '1px solid var(--stone)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', lineHeight: 1.5 }}>
            {text}
          </div>
          {actionLabel && action && (
            <button
              onClick={action}
              style={{
                marginTop: '6px', fontSize: '11px', color: 'var(--accent-olive)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {actionLabel} <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
