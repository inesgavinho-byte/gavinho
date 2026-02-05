// =====================================================
// SCHEDULE MESSAGE MODAL
// Modal for scheduling messages to be sent at a future time
// =====================================================

import { useState, useEffect } from 'react'
import {
  X, Clock, CalendarDays, Send, AlertCircle
} from 'lucide-react'

// Quick schedule options
const SCHEDULE_OPTIONS = [
  { id: 'in1h', label: 'Daqui a 1 hora', getDate: () => new Date(Date.now() + 60 * 60 * 1000) },
  { id: 'in2h', label: 'Daqui a 2 horas', getDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  { id: 'tomorrow9', label: 'Amanhã às 9:00', getDate: () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }},
  { id: 'tomorrow14', label: 'Amanhã às 14:00', getDate: () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
    return d
  }},
  { id: 'monday9', label: 'Próxima segunda às 9:00', getDate: () => {
    const d = new Date()
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
    d.setHours(9, 0, 0, 0)
    return d
  }}
]

export default function ScheduleMessageModal({
  isOpen,
  onClose,
  onSchedule,
  channelInfo
}) {
  const [message, setMessage] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Set default to 1 hour from now
      const defaultDate = new Date(Date.now() + 60 * 60 * 1000)
      setScheduledDate(formatDateTimeLocal(defaultDate))
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleQuickSelect = (option) => {
    const date = option.getDate()
    setScheduledDate(formatDateTimeLocal(date))
  }

  const handleSchedule = () => {
    setError('')

    if (!message.trim()) {
      setError('Escreva uma mensagem')
      return
    }

    if (!scheduledDate) {
      setError('Selecione uma data e hora')
      return
    }

    const scheduleTime = new Date(scheduledDate)
    if (scheduleTime <= new Date()) {
      setError('A data deve ser no futuro')
      return
    }

    onSchedule({
      message: message.trim(),
      scheduledFor: scheduleTime.toISOString(),
      channelId: channelInfo?.id
    })

    handleClose()
  }

  const handleClose = () => {
    setMessage('')
    setScheduledDate('')
    setError('')
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--accent-olive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <h2
                id="schedule-modal-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--brown)'
                }}
              >
                Agendar Mensagem
              </h2>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--brown-light)'
              }}>
                {channelInfo?.codigo} - Enviar mais tarde
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brown-light)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 180px)' }}>
          {/* Message Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '8px'
            }}>
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Quick Select */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '12px'
            }}>
              Enviar em
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {SCHEDULE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleQuickSelect(option)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: '1px solid var(--stone)',
                    background: 'var(--white)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--brown)',
                    transition: 'all 0.15s'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '8px'
            }}>
              <CalendarDays size={16} />
              Data e hora
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={formatDateTimeLocal(new Date())}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Preview */}
          {scheduledDate && message && (
            <div style={{
              padding: '14px 16px',
              background: 'var(--cream)',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'var(--brown-light)',
                marginBottom: '8px'
              }}>
                Pré-visualização
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--brown)',
                marginBottom: '8px'
              }}>
                "{message.length > 100 ? message.substring(0, 100) + '...' : message}"
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--accent-olive)',
                fontWeight: 500
              }}>
                Será enviada: {formatDisplayDate(scheduledDate)}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(231, 76, 60, 0.1)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--cream)',
              border: '1px solid var(--stone)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--brown)'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSchedule}
            disabled={!message.trim() || !scheduledDate}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: message.trim() && scheduledDate ? 'var(--accent-olive)' : 'var(--stone)',
              border: 'none',
              cursor: message.trim() && scheduledDate ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Send size={16} />
            Agendar
          </button>
        </div>
      </div>
    </div>
  )
}
