// =====================================================
// WORKSPACE SIDEBAR COMPONENT
// Sidebar with equipas list, channels, search, and actions
// Extracted from Workspace.jsx for better maintainability
// =====================================================

import React from 'react'
import {
  Bell,
  Bookmark,
  Search,
  Volume2,
  VolumeX,
  CloudDownload,
  ChevronRight,
  Star,
  Hash,
  Sun,
  Moon,
  Lock,
  Plus,
  MessageCircle
} from 'lucide-react'
import { useTheme } from '../../context'

// Theme toggle button component (uses hook so must be separate)
function ThemeToggleButton() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--brown-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

/**
 * WorkspaceSidebar - Main sidebar component for the workspace
 *
 * @param {Object} props
 * @param {Array} props.equipas - List of teams
 * @param {Object} props.equipasExpanded - Object tracking which teams are expanded
 * @param {Function} props.toggleEquipa - Function to toggle team expansion
 * @param {Function} props.getEquipaCanais - Function to get channels for a team
 * @param {Object|null} props.canalAtivo - Currently active channel
 * @param {Function} props.selectCanal - Function to select a channel
 * @param {Function} props.isFavoriteChannel - Function to check if channel is favorited
 * @param {Function} props.toggleFavoriteChannel - Function to toggle channel favorite
 * @param {boolean} props.showSearch - Whether search box is visible
 * @param {Function} props.setShowSearch - Toggle search visibility
 * @param {string} props.searchQuery - Current search query
 * @param {Function} props.setSearchQuery - Update search query
 * @param {boolean} props.showActivityLog - Whether activity log is shown
 * @param {Function} props.setShowActivityLog - Toggle activity log
 * @param {boolean} props.showSavedMessages - Whether saved messages panel is shown
 * @param {Function} props.setShowSavedMessages - Toggle saved messages panel
 * @param {boolean} props.soundEnabled - Whether sounds are enabled
 * @param {Function} props.setSoundEnabled - Toggle sound setting
 * @param {Function} props.setShowTeamsImport - Open Teams import modal
 * @param {Function} props.getTotalUnreadCount - Get total unread count
 * @param {Function} props.getUnreadActivityCount - Get unread activity count
 * @param {Array} props.savedMessages - List of saved messages
 * @param {string|null} props.equipaAtiva - ID of currently active team
 */
const WorkspaceSidebar = ({
  equipas,
  equipasExpanded,
  toggleEquipa,
  getEquipaCanais,
  canalAtivo,
  selectCanal,
  isFavoriteChannel,
  toggleFavoriteChannel,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  showActivityLog,
  setShowActivityLog,
  showSavedMessages,
  setShowSavedMessages,
  soundEnabled,
  setSoundEnabled,
  setShowTeamsImport,
  getTotalUnreadCount,
  getUnreadActivityCount,
  savedMessages,
  equipaAtiva,
  // Private channels
  privateChannels = [],
  onCreatePrivateChannel,
  selectPrivateChannel
}) => {
  return (
    <aside
      role="navigation"
      aria-label="Navegação de equipas e canais"
      style={{
        width: '280px',
        background: 'var(--off-white)',
        borderRight: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)', margin: 0 }}>
            Equipas
          </h2>
          {/* Total unread badge */}
          {getTotalUnreadCount() > 0 && (
            <span style={{
              minWidth: '22px',
              height: '22px',
              borderRadius: '11px',
              background: 'var(--error)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px'
            }}>
              {getTotalUnreadCount()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Activity button */}
          <button
            onClick={() => setShowActivityLog(!showActivityLog)}
            title="Atividade"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: showActivityLog ? 'var(--accent-olive)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: showActivityLog ? 'white' : 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <Bell size={18} />
            {getUnreadActivityCount() > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '8px',
                background: 'var(--error)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px'
              }}>
                {getUnreadActivityCount()}
              </span>
            )}
          </button>
          {/* Saved messages button */}
          <button
            onClick={() => setShowSavedMessages(!showSavedMessages)}
            title="Mensagens guardadas"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: showSavedMessages ? 'var(--accent-olive)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: showSavedMessages ? 'white' : 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <Bookmark size={18} />
            {savedMessages.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--warning)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {savedMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Pesquisar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: showSearch ? 'var(--stone)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Search size={18} />
          </button>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: soundEnabled ? 'var(--accent-olive)' : 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {/* Theme toggle */}
          <ThemeToggleButton />
          {/* Teams Import */}
          <button
            onClick={() => setShowTeamsImport(true)}
            title="Importar do Microsoft Teams"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CloudDownload size={18} />
          </button>
        </div>
      </div>

      {/* Search box */}
      {showSearch && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--stone)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--brown-light)'
            }} />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'var(--white)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Equipas List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {equipas.map(equipa => {
          const equipaCanais = getEquipaCanais(equipa.id)
          const isExpanded = equipasExpanded[equipa.id]
          const totalUnread = equipaCanais.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

          return (
            <div key={equipa.id}>
              {/* Equipa header */}
              <button
                onClick={() => toggleEquipa(equipa.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  background: equipaAtiva === equipa.id ? 'rgba(0,0,0,0.03)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s'
                }}
              >
                <ChevronRight
                  size={14}
                  style={{
                    color: 'var(--brown-light)',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: equipa.cor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {equipa.inicial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--brown)'
                  }}>
                    {equipa.nome}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    {equipaCanais.length} projetos
                  </div>
                </div>
                {totalUnread > 0 && (
                  <span style={{
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '10px',
                    background: 'var(--error)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px'
                  }}>
                    {totalUnread}
                  </span>
                )}
              </button>

              {/* Canais */}
              {isExpanded && (
                <div style={{ paddingLeft: '28px' }}>
                  {equipaCanais
                    .sort((a, b) => {
                      const aFav = isFavoriteChannel(a.id)
                      const bFav = isFavoriteChannel(b.id)
                      if (aFav && !bFav) return -1
                      if (!aFav && bFav) return 1
                      return 0
                    })
                    .map(canal => {
                    const isActive = canalAtivo?.id === canal.id
                    const isFav = isFavoriteChannel(canal.id)
                    return (
                      <div
                        key={canal.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: '8px',
                          marginBottom: '2px'
                        }}
                        className="channel-item"
                      >
                        <button
                          onClick={() => selectCanal(canal)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 8px 8px 12px',
                            background: isActive ? 'var(--stone)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '6px 0 0 6px',
                            transition: 'background 0.15s'
                          }}
                        >
                          {isFav ? (
                            <Star size={16} fill="var(--warning)" style={{ color: 'var(--warning)', flexShrink: 0 }} />
                          ) : (
                            <Hash size={16} style={{ color: isActive ? 'var(--brown)' : 'var(--brown-light)', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: isActive ? 600 : canal.unreadCount > 0 ? 600 : 400,
                              color: isActive ? 'var(--brown)' : 'var(--brown-light)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {canal.codigo}
                            </div>
                          </div>
                          {canal.unreadCount > 0 && (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--accent-olive)',
                              flexShrink: 0
                            }} />
                          )}
                        </button>
                        {/* Favorite star button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavoriteChannel(canal.id)
                          }}
                          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          style={{
                            width: '28px',
                            height: '32px',
                            background: isActive ? 'var(--stone)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: isFav ? 'var(--warning)' : 'var(--brown-light)',
                            opacity: isFav ? 1 : 0,
                            transition: 'opacity 0.15s',
                            borderRadius: '0 6px 6px 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="favorite-btn"
                        >
                          <Star size={14} fill={isFav ? 'var(--warning)' : 'none'} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Private Channels Section */}
        <div style={{ borderTop: '1px solid var(--stone)', marginTop: '8px', paddingTop: '8px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Lock size={14} style={{ color: 'var(--brown-light)' }} />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brown-light)',
                textTransform: 'uppercase'
              }}>
                Conversas Privadas
              </span>
              {privateChannels.length > 0 && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  background: 'var(--stone)',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {privateChannels.length}
                </span>
              )}
            </div>
            <button
              onClick={onCreatePrivateChannel}
              title="Nova conversa privada"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Private Channels List */}
          <div style={{ paddingLeft: '16px' }}>
            {privateChannels.length === 0 ? (
              <div style={{
                padding: '12px 16px',
                fontSize: '12px',
                color: 'var(--brown-light)',
                fontStyle: 'italic'
              }}>
                Sem conversas privadas
              </div>
            ) : (
              privateChannels.map(channel => {
                const isActive = canalAtivo?.id === channel.id
                const isDM = channel.type === 'dm'
                return (
                  <button
                    key={channel.id}
                    onClick={() => selectPrivateChannel?.(channel)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      marginRight: '8px',
                      background: isActive ? 'var(--stone)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                      transition: 'background 0.15s'
                    }}
                  >
                    {isDM ? (
                      <MessageCircle
                        size={16}
                        style={{ color: isActive ? 'var(--brown)' : 'var(--brown-light)', flexShrink: 0 }}
                      />
                    ) : (
                      <Lock
                        size={16}
                        style={{ color: isActive ? 'var(--brown)' : 'var(--brown-light)', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--brown)' : 'var(--brown-light)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {channel.nome}
                      </div>
                      {channel.members?.length > 0 && !isDM && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--brown-light)'
                        }}>
                          {channel.members.length} membros
                        </div>
                      )}
                    </div>
                    {channel.unreadCount > 0 && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent-olive)',
                        flexShrink: 0
                      }} />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default WorkspaceSidebar
