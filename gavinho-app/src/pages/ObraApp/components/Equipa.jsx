// =====================================================
// EQUIPA COMPONENT
// Displays team members assigned to the obra
// Features: Click-to-call, Online status indicator
// =====================================================

import { useState, useEffect } from 'react'
import { Users, Loader2, Phone, MessageCircle, Circle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { styles } from '../styles'
import { getInitials } from '../utils'

// Component-specific styles
const equipaStyles = {
  container: {
    padding: 16
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  onlineCount: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: '#dcfce7',
    color: '#15803d',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    marginLeft: 'auto'
  },
  memberCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background: 'white',
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#3d4349',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 600
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid white',
    background: '#22c55e'
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid white',
    background: '#9ca3af'
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 2
  },
  memberRole: {
    fontSize: 13,
    color: '#6b7280'
  },
  memberStatus: {
    fontSize: 11,
    color: '#22c55e',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  memberStatusOffline: {
    color: '#9ca3af'
  },
  actions: {
    display: 'flex',
    gap: 8
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  callButton: {
    background: '#dcfce7',
    color: '#15803d'
  },
  messageButton: {
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#6b7280'
  }
}

export default function Equipa({ obra, user }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  useEffect(() => {
    loadMembros()
  }, [obra])

  // Track online presence
  useEffect(() => {
    if (!obra || !user) return

    const presenceChannel = supabase.channel(`equipa_presence_${obra.id}`)

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const online = new Set()
        Object.values(state).flat().forEach(u => {
          if (u.user_id) online.add(u.user_id)
        })
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({
            user_id: user.id,
            nome: user.nome,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [obra, user])

  const loadMembros = async () => {
    try {
      const { data } = await supabase
        .from('obra_membros')
        .select('*')
        .eq('obra_id', obra.id)
        .eq('ativo', true)

      setMembros(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCall = (telefone) => {
    if (telefone) {
      window.location.href = `tel:${telefone}`
    }
  }

  const handleMessage = (telefone) => {
    if (telefone) {
      // Try SMS, fallback to WhatsApp
      window.location.href = `sms:${telefone}`
    }
  }

  const onlineCount = membros.filter(m => onlineUsers.has(m.user_id)).length

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={equipaStyles.container}>
      <div style={equipaStyles.header}>
        <h2 style={equipaStyles.title}>
          <Users size={24} /> Equipa da Obra
        </h2>
        {onlineCount > 0 && (
          <div style={equipaStyles.onlineCount}>
            <Circle size={8} fill="#22c55e" />
            {onlineCount} online
          </div>
        )}
      </div>

      {membros.length === 0 ? (
        <div style={equipaStyles.empty}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Sem membros registados</p>
        </div>
      ) : (
        <div>
          {membros.map(m => {
            const isOnline = onlineUsers.has(m.user_id)

            return (
              <div key={m.id} style={equipaStyles.memberCard}>
                <div style={equipaStyles.avatarContainer}>
                  <div style={equipaStyles.avatar}>
                    {getInitials(m.nome)}
                  </div>
                  <div style={isOnline ? equipaStyles.onlineIndicator : equipaStyles.offlineIndicator} />
                </div>

                <div style={equipaStyles.memberInfo}>
                  <div style={equipaStyles.memberName}>{m.nome}</div>
                  <div style={equipaStyles.memberRole}>{m.cargo || 'Equipa'}</div>
                  <div style={{
                    ...equipaStyles.memberStatus,
                    ...(isOnline ? {} : equipaStyles.memberStatusOffline)
                  }}>
                    <Circle size={6} fill={isOnline ? '#22c55e' : '#9ca3af'} />
                    {isOnline ? 'Online agora' : 'Offline'}
                  </div>
                </div>

                {m.telefone && (
                  <div style={equipaStyles.actions}>
                    <button
                      style={{ ...equipaStyles.actionButton, ...equipaStyles.callButton }}
                      onClick={() => handleCall(m.telefone)}
                      title={`Ligar para ${m.telefone}`}
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      style={{ ...equipaStyles.actionButton, ...equipaStyles.messageButton }}
                      onClick={() => handleMessage(m.telefone)}
                      title="Enviar mensagem"
                    >
                      <MessageCircle size={18} />
                    </button>
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
