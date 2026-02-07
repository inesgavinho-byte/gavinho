// =====================================================
// REMINDER MODAL
// Modal para definir lembretes de mensagens
// =====================================================

import { AlarmClock, X, Clock, CalendarDays } from 'lucide-react'
import { REMINDER_OPTIONS } from '../../utils/constants'

export default function ReminderModal({
  isOpen,
  onClose,
  message,
  customReminderDate,
  setCustomReminderDate,
  onSetReminder
}) {
  if (!isOpen || !message) return null

  const handleReminderClick = (option) => {
    onSetReminder(message, option)
    onClose()
  }

  const handleCustomReminder = () => {
    if (customReminderDate) {
      onSetReminder(message, { id: 'custom', value: customReminderDate })
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          padding: '24px',
          width: '380px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--brown)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlarmClock size={20} style={{ color: 'var(--accent-olive)' }} />
            Definir Lembrete
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div style={{
          padding: '12px',
          background: 'var(--cream)',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '3px solid var(--accent-olive)'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'var(--brown-light)',
            marginBottom: '4px'
          }}>
            Mensagem de {message.autor?.nome}
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--brown)'
          }}>
            {message.conteudo?.substring(0, 100)}{message.conteudo?.length > 100 ? '...' : ''}
          </p>
        </div>

        {/* Quick Options */}
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--brown-light)',
          marginBottom: '12px'
        }}>
          Lembrar-me
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px'
        }}>
          {REMINDER_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => handleReminderClick(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                background: 'var(--off-white)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--cream)'
                e.currentTarget.style.borderColor = 'var(--accent-olive)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--off-white)'
                e.currentTarget.style.borderColor = 'var(--stone)'
              }}
            >
              <Clock size={16} style={{ color: 'var(--accent-olive)' }} />
              <span style={{ fontSize: '14px', color: 'var(--brown)' }}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Date/Time */}
        <div style={{
          borderTop: '1px solid var(--stone)',
          paddingTop: '16px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--brown-light)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CalendarDays size={14} />
            Data personalizada
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="datetime-local"
              value={customReminderDate}
              onChange={e => setCustomReminderDate(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleCustomReminder}
              disabled={!customReminderDate}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: customReminderDate ? 'var(--accent-olive)' : 'var(--stone)',
                border: 'none',
                cursor: customReminderDate ? 'pointer' : 'not-allowed',
                color: 'white',
                fontWeight: 500
              }}
            >
              Definir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
