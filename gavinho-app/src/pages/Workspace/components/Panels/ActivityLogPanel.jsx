// =====================================================
// ACTIVITY LOG PANEL
// Painel de registro de atividade do workspace
// =====================================================

import { Bell, X, AtSign } from 'lucide-react'
import { getInitials, formatDateTime } from '../../utils/formatters'

// Activity filter options
const ACTIVITY_FILTERS = [
  { id: 'all', label: 'Nao lido' },
  { id: 'mentions', label: '@Mencoes' },
  { id: 'unread', label: 'Mencoes de etiqueta' }
]

export default function ActivityLogPanel({
  isOpen,
  activityLog = [],
  activityFilter = 'all',
  setActivityFilter,
  onClose,
  onNavigateToActivity,
  onMarkAllAsRead
}) {
  if (!isOpen) return null

  // Filter activity log based on current filter
  const getFilteredActivity = () => {
    switch (activityFilter) {
      case 'mentions':
        return activityLog.filter(a => a.type === 'mention')
      case 'unread':
        return activityLog.filter(a => a.unread)
      default:
        return activityLog
    }
  }

  // Get unread activity count
  const getUnreadActivityCount = () => {
    return activityLog.filter(a => a.unread).length
  }

  const filteredActivity = getFilteredActivity()

  return (
    <div style={{
      width: '360px',
      background: 'var(--white)',
      borderRight: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Activity Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={20} style={{ color: 'var(--accent-olive)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
            Atividade
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getUnreadActivityCount() > 0 && (
            <button
              onClick={onMarkAllAsRead}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'var(--cream)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'var(--brown-light)'
              }}
            >
              Marcar como lido
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Activity Filters */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--stone)'
      }}>
        {ACTIVITY_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActivityFilter(filter.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '14px',
              background: activityFilter === filter.id ? 'var(--brown)' : 'var(--cream)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: activityFilter === filter.id ? 600 : 400,
              color: activityFilter === filter.id ? 'white' : 'var(--brown)'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredActivity.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--brown-light)'
          }}>
            <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              Sem notificacoes
            </p>
          </div>
        ) : (
          filteredActivity.map(activity => (
            <div
              key={activity.id}
              onClick={() => onNavigateToActivity(activity)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--stone)',
                background: activity.unread
                  ? activity.type === 'mention'
                    ? 'rgba(139, 155, 123, 0.12)'
                    : 'var(--cream)'
                  : 'transparent',
                borderLeft: activity.type === 'mention' && activity.unread
                  ? '3px solid var(--accent-olive)'
                  : '3px solid transparent'
              }}
            >
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--brown-dark)'
                }}>
                  {getInitials(activity.autor?.nome)}
                </div>
                {activity.type === 'mention' && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--error)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--white)'
                  }}>
                    <AtSign size={10} style={{ color: 'white' }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: activity.unread ? 700 : 500,
                      color: 'var(--brown)',
                      marginBottom: '2px'
                    }}>
                      {activity.autor?.nome}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)',
                      marginBottom: '4px'
                    }}>
                      {activity.preview}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--brown-light)',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatDateTime(activity.created_at).split(' ')[0]}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 6px 0',
                  fontSize: '12px',
                  color: activity.unread ? 'var(--brown)' : 'var(--brown-light)',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {activity.conteudo}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--brown-light)'
                }}>
                  <span style={{ opacity: 0.7 }}>{activity.equipa}</span>
                  <span style={{ opacity: 0.5 }}>›</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>
                    {activity.canal?.codigo}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
