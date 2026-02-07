// =====================================================
// G.A.R.V.I.S. PANEL - Painel lateral inteligente
// Alertas, Deal Rooms ativos, Chat de procurement
// =====================================================

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  AlertCircle, MessageSquare, Clock, ChevronRight, Send,
  FileText, X, Bell, Sparkles, History, TrendingUp
} from 'lucide-react'

const GARVIS_SUGGESTIONS = [
  'Quem tem melhor preço para Lioz?',
  'Analisa último orçamento',
  'Sugere fornecedor para serralharia'
]

export default function GarvisPanel({ alertas = [], dealRooms = [], onClose }) {
  const [activeTab, setActiveTab] = useState('alertas')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])

  const tabs = [
    { id: 'alertas', label: 'Alertas', icon: Bell },
    { id: 'sugestoes', label: 'Sugestões', icon: Sparkles },
    { id: 'historico', label: 'Histórico', icon: History }
  ]

  const unreadCount = alertas.filter(a => !a.lido).length

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }])
    setChatInput('')
    // Placeholder - will integrate with Claude API later
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'garvis',
        content: 'Funcionalidade em desenvolvimento. O G.A.R.V.I.S. estará disponível em breve para responder a questões de procurement.'
      }])
    }, 800)
  }

  return (
    <div style={{
      width: '340px',
      background: 'var(--cream)',
      borderLeft: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0
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
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Alertas Tab */}
        {activeTab === 'alertas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alertas.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>
                <Bell size={20} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                Sem alertas ativos
              </div>
            ) : (
              alertas.map((alerta, i) => (
                <AlertCard key={alerta.id || i} alerta={alerta} />
              ))
            )}
          </div>
        )}

        {/* Sugestões Tab */}
        {activeTab === 'sugestoes' && (
          <div style={{ padding: '8px 0', color: 'var(--brown-light)', fontSize: '12px', textAlign: 'center' }}>
            <Sparkles size={20} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
            Sugestões de procurement aparecerão aqui baseadas nos seus projetos ativos.
          </div>
        )}

        {/* Histórico Tab */}
        {activeTab === 'historico' && (
          <div style={{ padding: '8px 0', color: 'var(--brown-light)', fontSize: '12px', textAlign: 'center' }}>
            <History size={20} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
            Histórico de recomendações e decisões.
          </div>
        )}
      </div>

      {/* Deal Rooms Section */}
      <div style={{
        borderTop: '1px solid var(--stone)',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--brown-light)',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          DEAL ROOMS ATIVOS
        </div>
        {dealRooms.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', padding: '4px 0' }}>
            Sem deal rooms ativos
          </div>
        ) : (
          dealRooms.map((deal, i) => (
            <DealRoomCard key={deal.id || i} deal={deal} />
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
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--brown-light)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <MessageSquare size={12} />
          PERGUNTE AO G.A.R.V.I.S.
        </div>

        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                fontSize: '12px',
                padding: '6px 8px',
                marginBottom: '4px',
                borderRadius: '6px',
                background: msg.role === 'user' ? 'var(--brown)' : 'var(--white)',
                color: msg.role === 'user' ? 'white' : 'var(--brown)',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {msg.content}
              </div>
            ))}
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
            style={{
              flex: 1,
              padding: '8px 10px',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              fontSize: '11px',
              background: 'var(--white)',
              color: 'var(--brown)',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSendChat}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              background: 'var(--brown)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Send size={14} />
          </button>
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          {GARVIS_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              onClick={() => setChatInput(sug)}
              style={{
                padding: '4px 10px',
                fontSize: '10px',
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
      </div>
    </div>
  )
}

function AlertCard({ alerta }) {
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
      border: '1px solid var(--stone)'
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
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            {alerta.titulo}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', lineHeight: 1.4 }}>
            {alerta.mensagem}
          </div>
          {alerta.acao_label && (
            <button style={{
              marginTop: '6px',
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
        </div>
        <span style={{ fontSize: '10px', color: 'var(--brown-light)', flexShrink: 0 }}>
          {alerta.tempo || 'Agora'}
        </span>
      </div>
    </div>
  )
}

function DealRoomCard({ deal }) {
  return (
    <div style={{
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
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>{deal.titulo}</div>
        <div style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
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
