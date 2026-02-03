import { useState, memo } from 'react'
import {
  Hash, Plus, ChevronDown, ChevronRight, Star, Search,
  Settings, Bell, BellOff, Lock, Archive, BarChart3,
  CloudDownload, MessageCircle, Users
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getInitials } from '../../utils/helpers'

const WorkspaceSidebar = memo(function WorkspaceSidebar({
  onShowSearch,
  onShowSettings,
  onShowAnalytics,
  onShowTeamsImport,
  onShowArchivedChannels,
  onShowDMPanel,
  onShowActivityLog
}) {
  const { state, actions, utils, profile } = useWorkspace()
  const {
    equipas, equipaAtiva, equipasExpanded, canalAtivo,
    favoriteChannels, mutedChannels, privateChannels, userStatus
  } = state

  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const getEquipaCanais = (equipaId) => utils.sortedCanais.filter(c => c.equipa === equipaId)

  return (
    <div style={{
      width: '280px',
      background: 'var(--off-white)',
      borderRight: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'var(--olive)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            G
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--charcoal)', fontSize: '15px' }}>
              GAVINHO
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Workspace
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onShowSearch}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
            title="Pesquisar (Ctrl+K)"
          >
            <Search size={18} />
          </button>
          <button
            onClick={onShowSettings}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* User Status */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--stone)' }}>
        <div
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.target.style.background = 'var(--stone-light)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--olive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {getInitials(profile?.nome)}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: userStatus === 'available' ? '#22c55e' :
                         userStatus === 'busy' || userStatus === 'dnd' ? '#ef4444' :
                         userStatus === 'away' ? '#f59e0b' : '#9ca3af',
              border: '2px solid var(--off-white)'
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--charcoal)' }}>
              {profile?.nome || 'Utilizador'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {userStatus === 'available' ? 'Disponível' :
               userStatus === 'busy' ? 'Ocupado' :
               userStatus === 'dnd' ? 'Não incomodar' :
               userStatus === 'away' ? 'Ausente' : 'Disponível'}
            </div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--stone)' }}>
        <button
          onClick={onShowDMPanel}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          <MessageCircle size={16} />
          Mensagens Diretas
        </button>
        <button
          onClick={onShowActivityLog}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          <Bell size={16} />
          Atividade
          {utils.getUnreadActivityCount() > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: '#ef4444',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '10px'
            }}>
              {utils.getUnreadActivityCount()}
            </span>
          )}
        </button>
      </div>

      {/* Teams List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {equipas.map(equipa => (
          <div key={equipa.id} style={{ marginBottom: '4px' }}>
            {/* Team Header */}
            <div
              onClick={() => actions.toggleEquipaExpanded(equipa.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: equipaAtiva === equipa.id ? 'var(--stone-light)' : 'transparent'
              }}
            >
              {equipasExpanded[equipa.id] ? (
                <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
              )}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: equipa.cor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                fontWeight: '700'
              }}>
                {equipa.inicial}
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--charcoal)',
                flex: 1
              }}>
                {equipa.nome}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                {getEquipaCanais(equipa.id).length}
              </span>
            </div>

            {/* Channels */}
            {equipasExpanded[equipa.id] && (
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                {getEquipaCanais(equipa.id).map(canal => (
                  <div
                    key={canal.id}
                    onClick={() => actions.setCanalAtivo(canal)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: canalAtivo?.id === canal.id ? 'var(--olive-light)' : 'transparent',
                      color: canalAtivo?.id === canal.id ? 'var(--olive)' : 'var(--text-secondary)'
                    }}
                  >
                    {favoriteChannels.includes(canal.id) ? (
                      <Star size={14} fill="currentColor" style={{ color: '#f59e0b' }} />
                    ) : (
                      <Hash size={14} />
                    )}
                    <span style={{
                      fontSize: '13px',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {canal.codigo}
                    </span>
                    {mutedChannels.includes(canal.id) && (
                      <BellOff size={12} style={{ color: 'var(--text-secondary)' }} />
                    )}
                    {canal.unreadCount > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px'
                      }}>
                        {canal.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase'
            }}>
              <Lock size={12} />
              Canais Privados
            </div>
            {privateChannels.map(canal => (
              <div
                key={canal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  marginLeft: '20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <Lock size={14} />
                <span style={{ fontSize: '13px' }}>{canal.nome}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <button
          onClick={onShowAnalytics}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
        <button
          onClick={onShowArchivedChannels}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          <Archive size={16} />
          Canais Arquivados
        </button>
        <button
          onClick={onShowTeamsImport}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          <CloudDownload size={16} />
          Importar do Teams
        </button>
      </div>
    </div>
  )
})

export default WorkspaceSidebar
