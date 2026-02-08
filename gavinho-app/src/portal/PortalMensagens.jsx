import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, Send, MessageSquare } from 'lucide-react'

export default function PortalMensagens() {
  const { config, t } = usePortal()
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEnd = useRef(null)

  useEffect(() => {
    loadMensagens()
  }, [config])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  // Realtime subscription
  useEffect(() => {
    if (!config?.projeto_id) return

    const channel = supabase
      .channel('portal-msgs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'portal_mensagens',
        filter: `projeto_id=eq.${config.projeto_id}`,
      }, (payload) => {
        setMensagens(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [config?.projeto_id])

  const loadMensagens = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const { data, error } = await supabase
        .from('portal_mensagens')
        .select('*')
        .eq('projeto_id', config.projeto_id)
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === '42P01') { setLoading(false); return }
        throw error
      }

      setMensagens(data || [])

      // Mark unread messages as read by client
      const unread = (data || []).filter(m => m.autor_tipo === 'equipa' && !m.lida_por_cliente)
      if (unread.length > 0) {
        await supabase
          .from('portal_mensagens')
          .update({ lida_por_cliente: true, lida_por_cliente_em: new Date().toISOString() })
          .in('id', unread.map(m => m.id))
      }
    } catch (err) {
      console.error('Messages error:', err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)

    try {
      const { error } = await supabase
        .from('portal_mensagens')
        .insert({
          projeto_id: config.projeto_id,
          autor_tipo: 'cliente',
          autor_nome: config.cliente_nome || config.cliente_email,
          autor_email: config.cliente_email,
          mensagem: newMsg.trim(),
        })

      if (error) throw error
      setNewMsg('')
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

    if (isToday) return time
    if (isYesterday) return `Ontem ${time}`
    return `${d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} ${time}`
  }

  // Group messages by date
  const groupedByDate = mensagens.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
      </div>
    )
  }

  return (
    <div style={S.wrapper}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={S.h1}>{t('messages')}</h1>
      </div>

      {/* Messages Area */}
      <div style={S.messagesContainer}>
        {mensagens.length === 0 ? (
          <div style={S.empty}>
            <MessageSquare size={32} style={{ color: '#D4D1C7', marginBottom: '12px' }} />
            <p style={{ color: '#8B8670', fontSize: '14px', margin: 0 }}>
              Ainda não existem mensagens. Envie a primeira!
            </p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, msgs]) => (
            <div key={date}>
              <div style={S.dateDivider}>
                <span style={S.dateLabel}>{date}</span>
              </div>
              {msgs.map(msg => {
                const isClient = msg.autor_tipo === 'cliente'
                return (
                  <div key={msg.id} style={{
                    ...S.msgRow,
                    justifyContent: isClient ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      ...S.bubble,
                      background: isClient ? '#2D2B28' : '#FFFFFF',
                      color: isClient ? '#FFFFFF' : '#2D2B28',
                      borderBottomRightRadius: isClient ? '4px' : '16px',
                      borderBottomLeftRadius: isClient ? '16px' : '4px',
                      border: isClient ? 'none' : '1px solid #E8E6DF',
                    }}>
                      {!isClient && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#ADAA96', marginBottom: '4px' }}>
                          {msg.autor_nome}
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {msg.mensagem}
                      </p>
                      <div style={{
                        fontSize: '10px',
                        color: isClient ? 'rgba(255,255,255,0.5)' : '#ADAA96',
                        textAlign: 'right',
                        marginTop: '4px',
                      }}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem..."
          style={S.textarea}
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={!newMsg.trim() || sending}
          style={{
            ...S.sendBtn,
            opacity: !newMsg.trim() || sending ? 0.4 : 1,
          }}
        >
          {sending ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const S = {
  wrapper: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 200px)',
  },
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 500,
    color: '#2D2B28',
    margin: 0,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  dateDivider: {
    textAlign: 'center',
    margin: '16px 0',
  },
  dateLabel: {
    fontSize: '11px',
    color: '#ADAA96',
    background: '#F5F3EB',
    padding: '4px 12px',
    borderRadius: '10px',
  },
  msgRow: {
    display: 'flex',
    marginBottom: '8px',
    padding: '0 4px',
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '16px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 0',
    borderTop: '1px solid #E8E6DF',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #E8E6DF',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#2D2B28',
    resize: 'none',
    outline: 'none',
    fontFamily: "'Quattrocento Sans', sans-serif",
    lineHeight: '1.5',
    maxHeight: '100px',
    overflow: 'auto',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#2D2B28',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
