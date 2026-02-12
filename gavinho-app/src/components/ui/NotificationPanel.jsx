// =====================================================
// NOTIFICATION PANEL - Sistema unificado de notificações
// Suporta: Agrupamento, Ações inline, Paginação
// =====================================================

import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  AtSign,
  MessageSquare,
  ListTodo,
  FolderKanban,
  AlertCircle,
  Settings,
  Trash2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Layers,
  List,
  Package,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { useNotifications, NOTIFICATION_TYPES, NOTIFICATION_FILTERS, NOTIFICATION_CONFIG } from '../../contexts/NotificationContext'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import './NotificationPanel.css'

// Get icon component for notification type
function getNotificationIcon(type) {
  switch (type) {
    case 'mention':
    case NOTIFICATION_TYPES.MENTION:
      return AtSign
    case 'message':
    case NOTIFICATION_TYPES.MESSAGE:
      return MessageSquare
    case 'comment':
    case NOTIFICATION_TYPES.COMMENT:
      return MessageSquare
    case 'task':
    case NOTIFICATION_TYPES.TASK:
    case 'tarefa_atribuida':
    case 'tarefa_concluida':
    case 'tarefa_atualizada':
      return ListTodo
    case 'project':
    case NOTIFICATION_TYPES.PROJECT:
      return FolderKanban
    case 'approval':
    case 'aprovacao_pendente':
    case NOTIFICATION_TYPES.APPROVAL:
      return AlertCircle
    case 'requisicao_nova':
    case 'material_aprovado':
    case 'material_rejeitado':
    case 'material_entregue':
      return Package
    default:
      return Bell
  }
}

// Get type badge class
function getTypeBadgeClass(type) {
  switch (type) {
    case 'mention':
      return 'badge-mention'
    case 'message':
    case 'comment':
      return 'badge-message'
    case 'task':
    case 'tarefa_atribuida':
    case 'tarefa_atualizada':
      return 'badge-task'
    case 'tarefa_concluida':
    case 'material_aprovado':
    case 'material_entregue':
      return 'badge-success'
    case 'project':
      return 'badge-project'
    case 'approval':
    case 'aprovacao_pendente':
      return 'badge-approval'
    case 'requisicao_nova':
      return 'badge-requisicao'
    case 'material_rejeitado':
      return 'badge-error'
    default:
      return 'badge-default'
  }
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'Agora'
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60)
    return `${mins}m`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d`
  }

  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

// Get user initials
function getUserInitials(name) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Action Button Component
function ActionButton({ action, onExecute, disabled }) {
  const colorClasses = {
    green: 'action-btn-green',
    red: 'action-btn-red',
    blue: 'action-btn-blue',
    gray: 'action-btn-gray'
  }

  if (action.executada) {
    return (
      <span className="action-executed">
        <Check size={12} /> Executado
      </span>
    )
  }

  return (
    <button
      className={`inline-action-btn ${colorClasses[action.color] || ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onExecute(action.id)
      }}
      disabled={disabled}
      title={action.label}
    >
      {action.label}
    </button>
  )
}

// Notification Item Component
function NotificationItem({ notification, onMarkAsRead, onDelete, onClick, onExecuteAction }) {
  const Icon = getNotificationIcon(notification.type)
  const senderName = notification.sender_nome || notification.sender?.nome || 'Sistema'
  const initials = getUserInitials(senderName)
  const config = notification.config || NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id, notification.origem)
    }
    onClick(notification)
  }

  const hasActions = notification.actions && notification.actions.length > 0

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.urgent ? 'urgent' : ''}`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && <div className="unread-indicator" />}

      {/* Urgent indicator */}
      {notification.urgent && (
        <div className="urgent-indicator" title="Urgente">
          <AlertTriangle size={12} />
        </div>
      )}

      {/* Avatar / Icon */}
      <div className="notification-avatar" style={{ backgroundColor: config.color + '20' }}>
        {notification.sender_avatar ? (
          <img src={notification.sender_avatar} alt={senderName} />
        ) : (
          <div className="avatar-icon" style={{ color: config.color }}>
            {typeof config.icon === 'string' && config.icon.length <= 2 ? (
              <span className="emoji-icon">{config.icon}</span>
            ) : (
              <Icon size={18} />
            )}
          </div>
        )}
        {/* Origin badge */}
        <div className={`notification-origin-badge ${notification.origem}`} title={notification.origem === 'app' ? 'Obras' : 'Workspace'}>
          {notification.origem === 'app' ? <Package size={8} /> : <MessageSquare size={8} />}
        </div>
      </div>

      {/* Content */}
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-sender">{senderName}</span>
          <span className="notification-time">{formatRelativeTime(notification.created_at)}</span>
        </div>

        {notification.title && (
          <div className="notification-title">{notification.title}</div>
        )}

        <div className="notification-message">
          {notification.message}
        </div>

        {/* Context info */}
        {(notification.context?.project || notification.context?.obra_id) && (
          <div className="notification-context">
            {notification.context.project || `Obra ${notification.context.obra_id}`}
          </div>
        )}

        {/* Inline Actions */}
        {hasActions && (
          <div className="notification-inline-actions" onClick={e => e.stopPropagation()}>
            {notification.actions.filter(a => !a.executada).slice(0, 3).map(action => (
              <ActionButton
                key={action.id}
                action={action}
                onExecute={(actionId) => onExecuteAction(notification.id, actionId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions (on hover) */}
      <div className="notification-actions">
        {!notification.read && (
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(notification.id, notification.origem)
            }}
            title="Marcar como lida"
          >
            <Check size={14} />
          </button>
        )}
        <button
          className="action-btn action-delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          title="Remover"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// Grouped Notification Item
function GroupedNotificationItem({ group, onClick }) {
  const config = group.config || NOTIFICATION_CONFIG[group.type] || NOTIFICATION_CONFIG.default
  const Icon = getNotificationIcon(group.type)

  return (
    <div
      className={`notification-item grouped ${!group.all_read ? 'unread' : ''}`}
      onClick={() => onClick(group)}
    >
      {!group.all_read && <div className="unread-indicator" />}

      <div className="notification-avatar" style={{ backgroundColor: config.color + '20' }}>
        <div className="avatar-icon" style={{ color: config.color }}>
          {typeof config.icon === 'string' && config.icon.length <= 2 ? (
            <span className="emoji-icon">{config.icon}</span>
          ) : (
            <Icon size={18} />
          )}
        </div>
        {group.count > 1 && (
          <div className="group-count-badge">{group.count}</div>
        )}
      </div>

      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-sender">{group.title}</span>
          <span className="notification-time">{formatRelativeTime(group.latest_created_at)}</span>
        </div>
        <div className="notification-message">
          {group.message}
        </div>
      </div>

      <ChevronRight size={16} className="group-chevron" />
    </div>
  )
}

// Filter Tab Component
function FilterTab({ label, value, icon: Icon, count, active, onClick }) {
  return (
    <button
      className={`filter-tab ${active ? 'active' : ''}`}
      onClick={() => onClick(value)}
    >
      {Icon && <Icon size={14} />}
      <span>{label}</span>
      {count > 0 && <span className="filter-count">{count}</span>}
    </button>
  )
}

// Main Notification Panel Component
export default function NotificationPanel() {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const listRef = useRef(null)

  const {
    filteredNotifications,
    groupedNotifications,
    unreadCount,
    mentionsCount,
    counts,
    isLoading,
    isLoadingMore,
    hasMore,
    isPanelOpen,
    filter,
    viewMode,
    setFilter,
    markAsRead,
    markAllAsRead,
    executeAction,
    deleteNotification,
    loadMore,
    toggleViewMode,
    closePanel
  } = useNotifications()

  const {
    isSupported: pushSupported,
    isSubscribed: pushEnabled,
    isDenied: pushDenied,
    loading: pushLoading,
    subscribe: enablePush,
    unsubscribe: disablePush
  } = usePushNotifications()

  const handlePushToggle = useCallback(async () => {
    if (pushEnabled) {
      await disablePush()
    } else {
      await enablePush()
    }
  }, [pushEnabled, enablePush, disablePush])

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellButton = document.querySelector('.notification-bell-btn')
        if (bellButton && bellButton.contains(event.target)) {
          return
        }
        closePanel()
      }
    }

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPanelOpen, closePanel])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && isPanelOpen) {
        closePanel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isPanelOpen, closePanel])

  // Infinite scroll
  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = listElement
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
        loadMore()
      }
    }

    listElement.addEventListener('scroll', handleScroll)
    return () => listElement.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, loadMore])

  const handleNotificationClick = useCallback((notification) => {
    if (notification.link) {
      closePanel()
      navigate(notification.link)
    }
  }, [closePanel, navigate])

  const handleGroupClick = useCallback((group) => {
    // Navigate to first notification's link or show expanded view
    if (group.ids && group.ids.length === 1) {
      const notif = filteredNotifications.find(n => n.id === group.ids[0])
      if (notif?.link) {
        closePanel()
        navigate(notif.link)
      }
    } else {
      // For multiple, just filter by type temporarily
      setFilter(NOTIFICATION_FILTERS.ALL)
    }
  }, [closePanel, navigate, filteredNotifications, setFilter])

  if (!isPanelOpen) return null

  const displayNotifications = viewMode === 'grouped' ? groupedNotifications : filteredNotifications

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="notification-backdrop" onClick={closePanel} />

      {/* Panel */}
      <div className="notification-panel" ref={panelRef}>
        {/* Header */}
        <div className="notification-panel-header">
          <div className="header-title">
            <Bell size={20} />
            <h2>Atividade</h2>
            {counts.urgentes > 0 && (
              <span className="urgent-count" title="Urgentes">
                <AlertTriangle size={12} /> {counts.urgentes}
              </span>
            )}
          </div>
          <div className="header-actions">
            {pushSupported && (
              <button
                className={`header-btn ${pushEnabled ? 'active' : ''}`}
                onClick={handlePushToggle}
                disabled={pushLoading || pushDenied}
                title={
                  pushDenied ? 'Push bloqueado pelo browser — altere nas definições'
                  : pushEnabled ? 'Desativar notificações push'
                  : 'Ativar notificações push'
                }
                style={pushEnabled ? { color: 'var(--success)' } : pushDenied ? { opacity: 0.4 } : {}}
              >
                <BellRing size={18} />
              </button>
            )}
            <button
              className={`header-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={toggleViewMode}
              title={viewMode === 'grouped' ? 'Vista lista' : 'Vista agrupada'}
            >
              {viewMode === 'grouped' ? <List size={18} /> : <Layers size={18} />}
            </button>
            <button className="header-btn close-btn" onClick={closePanel} title="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notification-filters">
          <FilterTab
            label="Não lido"
            value={NOTIFICATION_FILTERS.UNREAD}
            count={unreadCount}
            active={filter === NOTIFICATION_FILTERS.UNREAD}
            onClick={setFilter}
          />
          <FilterTab
            label="@Menções"
            value={NOTIFICATION_FILTERS.MENTIONS}
            icon={AtSign}
            count={mentionsCount}
            active={filter === NOTIFICATION_FILTERS.MENTIONS}
            onClick={setFilter}
          />
          <FilterTab
            label="Obras"
            value={NOTIFICATION_FILTERS.APP}
            icon={Package}
            count={counts.app}
            active={filter === NOTIFICATION_FILTERS.APP}
            onClick={setFilter}
          />
          <FilterTab
            label="Todas"
            value={NOTIFICATION_FILTERS.ALL}
            active={filter === NOTIFICATION_FILTERS.ALL}
            onClick={setFilter}
          />
        </div>

        {/* Actions Bar */}
        {unreadCount > 0 && (
          <div className="notification-actions-bar">
            <button className="mark-all-read" onClick={markAllAsRead}>
              <CheckCheck size={14} />
              <span>Marcar tudo como lido</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="notification-list" ref={listRef}>
          {isLoading ? (
            <div className="notification-loading">
              <Loader2 size={24} className="spinner" />
              <span>A carregar...</span>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={40} strokeWidth={1.5} />
              <h3>Sem notificações</h3>
              <p>
                {filter === NOTIFICATION_FILTERS.UNREAD
                  ? 'Não tens notificações por ler'
                  : filter === NOTIFICATION_FILTERS.MENTIONS
                    ? 'Não tens menções recentes'
                    : filter === NOTIFICATION_FILTERS.APP
                      ? 'Não tens notificações de obras'
                      : 'Ainda não tens notificações'}
              </p>
            </div>
          ) : viewMode === 'grouped' ? (
            // Grouped view
            groupedNotifications.map((group) => (
              <GroupedNotificationItem
                key={group.grupo_key}
                group={group}
                onClick={handleGroupClick}
              />
            ))
          ) : (
            // List view
            <>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                  onExecuteAction={executeAction}
                />
              ))}

              {/* Load More */}
              {isLoadingMore && (
                <div className="notification-loading-more">
                  <Loader2 size={16} className="spinner" />
                  <span>A carregar mais...</span>
                </div>
              )}

              {!hasMore && filteredNotifications.length > 10 && (
                <div className="notification-end">
                  <Clock size={14} />
                  <span>Fim do histórico</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="notification-panel-footer">
          <button className="footer-btn" onClick={() => { closePanel(); navigate('/configuracoes'); }}>
            <Settings size={14} />
            <span>Configurações de notificações</span>
          </button>
        </div>
      </div>
    </>
  )
}

// Bell Icon Button Component (exported for Sidebar)
export function NotificationBell({ collapsed = false }) {
  const { unreadCount, counts, togglePanel, isPanelOpen } = useNotifications()

  return (
    <button
      className={`notification-bell-btn ${isPanelOpen ? 'active' : ''} ${collapsed ? 'collapsed' : ''} ${counts?.urgentes > 0 ? 'has-urgent' : ''}`}
      onClick={togglePanel}
      title={unreadCount > 0 ? `${unreadCount} notificações por ler` : 'Notificações'}
    >
      <Bell size={collapsed ? 18 : 20} />
      {unreadCount > 0 && (
        <span className={`notification-badge ${counts?.urgentes > 0 ? 'urgent' : ''}`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {collapsed && (
        <span className="bell-tooltip">
          Notificações {unreadCount > 0 && `(${unreadCount})`}
        </span>
      )}
    </button>
  )
}
