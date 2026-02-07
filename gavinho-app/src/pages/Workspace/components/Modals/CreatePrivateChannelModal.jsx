// =====================================================
// CREATE PRIVATE CHANNEL MODAL
// Modal for creating private/direct message channels
// =====================================================

import { useState } from 'react'
import {
  X, Lock, Users, Search, Check, Plus, UserPlus
} from 'lucide-react'

export default function CreatePrivateChannelModal({
  isOpen,
  onClose,
  membros = [],
  onCreateChannel,
  currentUserId
}) {
  const [channelName, setChannelName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [channelType, setChannelType] = useState('group') // 'group' or 'dm'

  if (!isOpen) return null

  const availableMembers = membros.filter(m =>
    m.id !== currentUserId &&
    (m.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const toggleMember = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id)
      if (isSelected) {
        return prev.filter(m => m.id !== member.id)
      }
      // For DM, only allow 1 member
      if (channelType === 'dm') {
        return [member]
      }
      return [...prev, member]
    })
  }

  const handleCreate = () => {
    if (channelType === 'dm' && selectedMembers.length === 1) {
      onCreateChannel({
        name: `DM - ${selectedMembers[0].nome}`,
        members: selectedMembers.map(m => m.id),
        type: 'dm'
      })
    } else if (channelType === 'group' && channelName.trim() && selectedMembers.length > 0) {
      onCreateChannel({
        name: channelName.trim(),
        members: selectedMembers.map(m => m.id),
        type: 'group'
      })
    }
    handleClose()
  }

  const handleClose = () => {
    setChannelName('')
    setSelectedMembers([])
    setSearchQuery('')
    setChannelType('group')
    onClose()
  }

  const isValid = channelType === 'dm'
    ? selectedMembers.length === 1
    : channelName.trim() && selectedMembers.length > 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-channel-title"
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
              <Lock size={20} />
            </div>
            <div>
              <h2
                id="create-channel-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--brown)'
                }}
              >
                Nova Conversa Privada
              </h2>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--brown-light)'
              }}>
                Criar canal privado ou mensagem direta
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
          {/* Channel Type Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '12px'
            }}>
              Tipo de conversa
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setChannelType('dm')
                  setSelectedMembers([])
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: channelType === 'dm'
                    ? '2px solid var(--accent-olive)'
                    : '1px solid var(--stone)',
                  background: channelType === 'dm'
                    ? 'rgba(128, 128, 90, 0.08)'
                    : 'var(--white)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '4px'
                }}>
                  <UserPlus size={18} style={{ color: 'var(--accent-olive)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
                    Mensagem Direta
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: 'var(--brown-light)'
                }}>
                  Conversa 1-para-1 com uma pessoa
                </p>
              </button>

              <button
                onClick={() => setChannelType('group')}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: channelType === 'group'
                    ? '2px solid var(--accent-olive)'
                    : '1px solid var(--stone)',
                  background: channelType === 'group'
                    ? 'rgba(128, 128, 90, 0.08)'
                    : 'var(--white)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '4px'
                }}>
                  <Users size={18} style={{ color: 'var(--accent-olive)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
                    Grupo Privado
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: 'var(--brown-light)'
                }}>
                  Canal privado com vários membros
                </p>
              </button>
            </div>
          </div>

          {/* Channel Name (only for group) */}
          {channelType === 'group' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brown)',
                marginBottom: '8px'
              }}>
                Nome do canal
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="ex: Projeto Secreto"
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
          )}

          {/* Member Search */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '8px'
            }}>
              {channelType === 'dm' ? 'Escolher pessoa' : 'Adicionar membros'}
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)'
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome ou email..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--cream)',
              borderRadius: '8px'
            }}>
              {selectedMembers.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    background: 'var(--white)',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700
                  }}>
                    {member.nome?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  {member.nome}
                  <button
                    onClick={() => toggleMember(member)}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--stone)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Member List */}
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid var(--stone)',
            borderRadius: '8px'
          }}>
            {availableMembers.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--brown-light)',
                fontSize: '13px'
              }}>
                Nenhum membro encontrado
              </div>
            ) : (
              availableMembers.map(member => {
                const isSelected = selectedMembers.some(m => m.id === member.id)
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      background: isSelected ? 'rgba(128, 128, 90, 0.08)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--stone)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--blush)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brown)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      {member.nome?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--brown)'
                      }}>
                        {member.nome}
                      </div>
                      {member.email && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--brown-light)'
                        }}>
                          {member.email}
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: isSelected ? 'none' : '2px solid var(--stone)',
                      background: isSelected ? 'var(--accent-olive)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={14} style={{ color: 'white' }} />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
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
            onClick={handleCreate}
            disabled={!isValid}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: isValid ? 'var(--accent-olive)' : 'var(--stone)',
              border: 'none',
              cursor: isValid ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={16} />
            Criar {channelType === 'dm' ? 'Conversa' : 'Canal'}
          </button>
        </div>
      </div>
    </div>
  )
}
