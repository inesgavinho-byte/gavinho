// =====================================================
// WEBHOOK SETTINGS MODAL
// Modal for managing webhook integrations
// =====================================================

import { useState } from 'react'
import {
  X, Webhook, Plus, Trash2, Check, AlertCircle, ExternalLink,
  TestTube2, Loader2, Globe, Bell, MessageSquare, FileText, User
} from 'lucide-react'

// Available webhook events
const WEBHOOK_EVENTS = [
  { id: 'message.new', label: 'Nova mensagem', icon: MessageSquare, description: 'Quando uma nova mensagem é publicada' },
  { id: 'message.edit', label: 'Mensagem editada', icon: MessageSquare, description: 'Quando uma mensagem é editada' },
  { id: 'message.delete', label: 'Mensagem apagada', icon: MessageSquare, description: 'Quando uma mensagem é removida' },
  { id: 'member.join', label: 'Membro entrou', icon: User, description: 'Quando um membro entra no canal' },
  { id: 'member.leave', label: 'Membro saiu', icon: User, description: 'Quando um membro sai do canal' },
  { id: 'file.upload', label: 'Ficheiro carregado', icon: FileText, description: 'Quando um ficheiro é partilhado' },
  { id: 'mention', label: 'Menção', icon: Bell, description: 'Quando alguém é mencionado' }
]

export default function WebhookSettingsModal({
  isOpen,
  onClose,
  webhooks = [],
  onAddWebhook,
  onDeleteWebhook,
  onToggleWebhook,
  onTestWebhook,
  channelInfo
}) {
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [selectedEvents, setSelectedEvents] = useState([])
  const [isAdding, setIsAdding] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const isValidUrl = (url) => {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    )
  }

  const handleAdd = () => {
    setError('')

    if (!newUrl.trim()) {
      setError('URL é obrigatório')
      return
    }

    if (!isValidUrl(newUrl)) {
      setError('URL inválido. Deve começar com http:// ou https://')
      return
    }

    if (selectedEvents.length === 0) {
      setError('Selecione pelo menos um evento')
      return
    }

    onAddWebhook({
      url: newUrl.trim(),
      name: newName.trim() || 'Webhook sem nome',
      events: selectedEvents
    })

    // Reset form
    setNewUrl('')
    setNewName('')
    setSelectedEvents([])
    setIsAdding(false)
  }

  const handleTest = async (webhook) => {
    setTestingWebhook(webhook.id)
    setTestResult(null)

    try {
      const result = await onTestWebhook?.(webhook)
      setTestResult({ webhookId: webhook.id, success: true, message: 'Webhook testado com sucesso!' })
    } catch (err) {
      setTestResult({ webhookId: webhook.id, success: false, message: err.message || 'Erro ao testar webhook' })
    } finally {
      setTestingWebhook(null)
    }
  }

  const handleClose = () => {
    setIsAdding(false)
    setNewUrl('')
    setNewName('')
    setSelectedEvents([])
    setError('')
    setTestResult(null)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="webhook-modal-title"
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
          maxWidth: '600px',
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
              <Webhook size={20} />
            </div>
            <div>
              <h2
                id="webhook-modal-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--brown)'
                }}
              >
                Webhooks
              </h2>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--brown-light)'
              }}>
                {channelInfo?.codigo} - Integrações externas
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
          {/* Existing Webhooks */}
          {webhooks.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brown)',
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                Webhooks Configurados ({webhooks.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {webhooks.map(webhook => (
                  <div
                    key={webhook.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--cream)',
                      borderRadius: '10px',
                      border: '1px solid var(--stone)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={16} style={{ color: 'var(--accent-olive)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
                          {webhook.name || 'Webhook'}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: webhook.active ? 'var(--success)' : 'var(--stone)',
                          color: webhook.active ? 'white' : 'var(--brown-light)'
                        }}>
                          {webhook.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleTest(webhook)}
                          disabled={testingWebhook === webhook.id}
                          title="Testar webhook"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            border: '1px solid var(--stone)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--info)'
                          }}
                        >
                          {testingWebhook === webhook.id ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <TestTube2 size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => onToggleWebhook?.(webhook.id)}
                          title={webhook.active ? 'Desativar' : 'Ativar'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            border: '1px solid var(--stone)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: webhook.active ? 'var(--success)' : 'var(--brown-light)'
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteWebhook?.(webhook.id)}
                          title="Remover webhook"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            border: '1px solid var(--stone)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--error)'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)',
                      marginBottom: '8px',
                      wordBreak: 'break-all'
                    }}>
                      {webhook.url}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {webhook.events?.map(eventId => {
                        const event = WEBHOOK_EVENTS.find(e => e.id === eventId)
                        return (
                          <span
                            key={eventId}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--white)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: 'var(--brown)'
                            }}
                          >
                            {event?.label || eventId}
                          </span>
                        )
                      })}
                    </div>

                    {/* Test result */}
                    {testResult?.webhookId === webhook.id && (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: testResult.success ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                        fontSize: '12px',
                        color: testResult.success ? 'var(--success)' : 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                        {testResult.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Webhook Form */}
          {isAdding ? (
            <div style={{
              padding: '20px',
              background: 'var(--off-white)',
              borderRadius: '12px',
              border: '1px solid var(--stone)'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--brown)',
                marginBottom: '16px'
              }}>
                Novo Webhook
              </h3>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brown-light)',
                  marginBottom: '6px'
                }}>
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Slack Notifications"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brown-light)',
                  marginBottom: '6px'
                }}>
                  URL do Webhook *
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Events */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brown-light)',
                  marginBottom: '8px'
                }}>
                  Eventos *
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  {WEBHOOK_EVENTS.map(event => {
                    const isSelected = selectedEvents.includes(event.id)
                    return (
                      <button
                        key={event.id}
                        onClick={() => toggleEvent(event.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--accent-olive)' : '1px solid var(--stone)',
                          background: isSelected ? 'rgba(128, 128, 90, 0.08)' : 'var(--white)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <event.icon size={14} style={{ color: 'var(--brown-light)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--brown)' }}>
                          {event.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(231, 76, 60, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--error)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewUrl('')
                    setNewName('')
                    setSelectedEvents([])
                    setError('')
                  }}
                  style={{
                    padding: '10px 16px',
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
                  onClick={handleAdd}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--accent-olive)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '10px',
                border: '2px dashed var(--stone)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--accent-olive)'
              }}
            >
              <Plus size={18} />
              Adicionar Webhook
            </button>
          )}

          {/* Help Text */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--cream)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--brown-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ExternalLink size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Como funcionam os Webhooks?</strong>
                <p style={{ margin: '8px 0 0 0' }}>
                  Webhooks enviam notificações HTTP POST para o seu URL quando eventos específicos ocorrem.
                  Podem ser usados para integrar com Slack, Discord, Make, Zapier, ou sistemas próprios.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'var(--cream)',
              border: '1px solid var(--stone)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--brown)'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
