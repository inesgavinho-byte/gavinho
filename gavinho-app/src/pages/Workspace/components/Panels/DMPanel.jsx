// =====================================================
// DM PANEL
// Painel lateral de mensagens diretas
// =====================================================

import { MessageCircle, UserPlus, X } from 'lucide-react'
import { getInitials } from '../../utils/formatters'

export default function DMPanel({
  isOpen,
  onClose,
  directMessages,
  activeDM,
  onSelectDM,
  onNewDM,
  membros,
  showNewDMModal,
  setShowNewDMModal,
  onStartDM
}) {
  if (!isOpen) return null

  return (
    <>
      {/* DM Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px',
        background: 'var(--white)',
        borderLeft: '1px solid var(--stone)',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--brown)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MessageCircle size={20} style={{ color: 'var(--accent-olive)' }} />
            Mensagens Diretas
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowNewDMModal(true)}
              style={{
                padding: '6px',
                borderRadius: '6px',
                background: 'var(--accent-olive)',
                border: 'none',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <UserPlus size={16} />
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
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

        {/* Messages List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {directMessages.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--brown-light)'
            }}>
              <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Sem mensagens diretas</p>
              <button
                onClick={() => setShowNewDMModal(true)}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'var(--accent-olive)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '13px'
                }}
              >
                Iniciar Conversa
              </button>
            </div>
          ) : (
            directMessages.map(dm => (
              <div
                key={dm.id}
                onClick={() => onSelectDM(dm)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--stone)',
                  cursor: 'pointer',
                  background: activeDM?.id === dm.id ? 'var(--cream)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {getInitials(dm.participants[0]?.nome)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--brown)'
                    }}>
                      {dm.participants[0]?.nome}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)'
                    }}>
                      {dm.lastMessage?.content?.substring(0, 30) || 'Nova conversa'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New DM Modal */}
      {showNewDMModal && (
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
          onClick={() => setShowNewDMModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              maxHeight: '500px'
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700 }}>
              Nova Mensagem
            </h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {membros.map(m => (
                <button
                  key={m.id}
                  onClick={() => onStartDM(m)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--blush)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {getInitials(m.nome)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.nome}</div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{m.funcao}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
