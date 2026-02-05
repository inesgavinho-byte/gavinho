// =====================================================
// EMAIL SETTINGS MODAL
// Modal for configuring email sync and digest settings
// =====================================================

import { useState } from 'react'
import {
  X, Mail, Bell, Clock, Calendar, Check, AlertCircle, Inbox
} from 'lucide-react'

// Digest frequency options
const FREQUENCY_OPTIONS = [
  { id: 'realtime', label: 'Tempo real', description: 'Receber notificações imediatamente', icon: Bell },
  { id: 'hourly', label: 'Por hora', description: 'Resumo a cada hora', icon: Clock },
  { id: 'daily', label: 'Diário', description: 'Resumo diário às 9:00', icon: Calendar },
  { id: 'weekly', label: 'Semanal', description: 'Resumo às segundas às 9:00', icon: Inbox }
]

// Notification types
const NOTIFICATION_TYPES = [
  { id: 'mentions', label: 'Menções', description: 'Quando alguém te menciona' },
  { id: 'replies', label: 'Respostas', description: 'Quando respondem às tuas mensagens' },
  { id: 'channels', label: 'Novos canais', description: 'Quando és adicionado a canais' },
  { id: 'tasks', label: 'Tarefas', description: 'Quando te atribuem tarefas' },
  { id: 'reminders', label: 'Lembretes', description: 'Lembretes agendados' }
]

export default function EmailSettingsModal({
  isOpen,
  onClose,
  emailSyncEnabled,
  onToggleEmailSync,
  emailDigestFrequency,
  onSetDigestFrequency,
  email
}) {
  const [selectedTypes, setSelectedTypes] = useState(['mentions', 'replies', 'tasks', 'reminders'])
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isOpen) return null

  const toggleNotificationType = (typeId) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(t => t !== typeId)
      }
      return [...prev, typeId]
    })
  }

  const handleSave = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 1500)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-settings-title"
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
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
              <Mail size={20} />
            </div>
            <div>
              <h2
                id="email-settings-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--brown)'
                }}
              >
                Definições de Email
              </h2>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--brown-light)'
              }}>
                Configura as notificações por email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
          {/* Email Sync Toggle */}
          <div style={{
            padding: '16px',
            background: emailSyncEnabled ? 'rgba(128, 128, 90, 0.1)' : 'var(--cream)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={20} style={{ color: 'var(--accent-olive)' }} />
                <span style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--brown)'
                }}>
                  Ativar resumos por email
                </span>
              </div>
              <button
                onClick={onToggleEmailSync}
                style={{
                  width: '48px',
                  height: '26px',
                  borderRadius: '13px',
                  background: emailSyncEnabled ? 'var(--accent-olive)' : 'var(--stone)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: emailSyncEnabled ? '24px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
            {email && (
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--brown-light)'
              }}>
                Os resumos serão enviados para {email}
              </p>
            )}
          </div>

          {emailSyncEnabled && (
            <>
              {/* Frequency Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brown)',
                  marginBottom: '12px'
                }}>
                  Frequência dos resumos
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px'
                }}>
                  {FREQUENCY_OPTIONS.map(freq => (
                    <button
                      key={freq.id}
                      onClick={() => onSetDigestFrequency(freq.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: emailDigestFrequency === freq.id
                          ? '2px solid var(--accent-olive)'
                          : '1px solid var(--stone)',
                        background: emailDigestFrequency === freq.id
                          ? 'rgba(128, 128, 90, 0.08)'
                          : 'var(--white)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <freq.icon size={16} style={{ color: 'var(--accent-olive)' }} />
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--brown)'
                        }}>
                          {freq.label}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '11px',
                        color: 'var(--brown-light)'
                      }}>
                        {freq.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Types */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brown)',
                  marginBottom: '12px'
                }}>
                  Receber notificações para
                </label>
                <div style={{
                  border: '1px solid var(--stone)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  {NOTIFICATION_TYPES.map((type, index) => (
                    <button
                      key={type.id}
                      onClick={() => toggleNotificationType(type.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: index < NOTIFICATION_TYPES.length - 1
                          ? '1px solid var(--stone)'
                          : 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--brown)',
                          marginBottom: '2px'
                        }}>
                          {type.label}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--brown-light)'
                        }}>
                          {type.description}
                        </div>
                      </div>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: selectedTypes.includes(type.id) ? 'none' : '2px solid var(--stone)',
                        background: selectedTypes.includes(type.id) ? 'var(--accent-olive)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selectedTypes.includes(type.id) && (
                          <Check size={14} style={{ color: 'white' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Info */}
          {!emailSyncEnabled && (
            <div style={{
              padding: '14px 16px',
              background: 'var(--cream)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertCircle size={18} style={{ color: 'var(--brown-light)', marginTop: '2px' }} />
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  Mantém-te atualizado
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--brown-light)'
                }}>
                  Ativa os resumos por email para receber atualizações importantes
                  mesmo quando não estás na plataforma.
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              background: 'rgba(39, 174, 96, 0.1)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Check size={18} style={{ color: 'var(--success)' }} />
              <span style={{
                fontSize: '13px',
                color: 'var(--success)',
                fontWeight: 500
              }}>
                Definições guardadas com sucesso
              </span>
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
            onClick={onClose}
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
            onClick={handleSave}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'var(--accent-olive)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Check size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
