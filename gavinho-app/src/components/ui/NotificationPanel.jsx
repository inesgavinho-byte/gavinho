// =====================================================
// NOTIFICATION PANEL - Teams-like notification center
// =====================================================

import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
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
  MoreHorizontal
} from 'lucide-react'
import { useNotifications, NOTIFICATION_TYPES, NOTIFICATION_FILTERS } from '../../contexts/NotificationContext'
import './NotificationPanel.css'

// Get icon for notification type
function getNotificationIcon(type) {
  switch (type) {
    case NOTIFICATION_TYPES.MENTION:
      return AtSign
    case NOTIFICATION_TYPES.MESSAGE:
      return MessageSquare
    case NOTIFICATION_TYPES.TASK:
      return ListTodo
    case NOTIFICATION_TYPES.PROJECT:
      return FolderKanban
    case NOTIFICATION_TYPES.APPROVAL:
      return AlertCircle
    case NOTIFICATION_TYPES.COMMENT:
      return MessageSquare
    default:
      return Bell
  }
}

// Get type badge color
function getTypeBadgeClass(type) {
  switch (type) {
    case NOTIFICATION_TYPES.MENTION:
      return 'badge-mention'
    case NOTIFICATION_TYPES.MESSAGE:
      return 'badge-message'
    case NOTIFICATION_TYPES.TASK:
      return 'badge-task'
    case NOTIFICATION_TYPES.PROJECT:
      return 'badge-project'
    case NOTIFICATION_TYPES.APPROVAL:
      return 'badge-approval'
    default:
      return 'badge-default'
  }
}

// Format relative time
function formatRelativeTime(dateString) {
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

// Notification Item Component
function NotificationItem({ notification, onMarkAsRead, onDelete, onClick }) {
  const Icon = getNotificationIcon(notification.type)
  const senderName = notification.sender?.nome || 'Sistema'
  const initials = getUserInitials(senderName)

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    onClick(notification)
  }

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && <div className="unread-indicator" />}

      {/* Avatar */}
      <div className="notification-avatar">
        {notification.sender?.avatar_url ? (
          <img src={notification.sender.avatar_url} alt={senderName} />
        ) : (
          <div className="avatar-initials">{initials}</div>
        )}
        {/* Type badge overlay */}
        <div className={`notification-type-badge ${getTypeBadgeClass(notification.type)}`}>
          <Icon size={10} />
        </div>
      </div>

      {/* Content */}
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-sender">{senderName}</span>
          <span className="notification-time">{formatRelativeTime(notification.created_at)}</span>
        </div>
        {notification.context?.project && (
          <div className="notification-context">
            {notification.context.project}
          </div>
        )}
        <div className="notification-message">
          {notification.message}
        </div>
        {notification.context?.channel && (
          <div className="notification-channel">
            {notification.context.project && (
              <>
                <span>{notification.context.project}</span>
                <ChevronRight size={12} />
              </>
            )}
            <span>{notification.context.channel}</span>
          </div>
        )}
      </div>

      {/* Actions (on hover) */}
      <div className="notification-actions">
        {!notification.read && (
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(notification.id)
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

  const {
    filteredNotifications,
    unreadCount,
    mentionsCount,
    isLoading,
    isPanelOpen,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    closePanel
  } = useNotifications()

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is on the notification bell button
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

  const handleNotificationClick = useCallback((notification) => {
    if (notification.link) {
      closePanel()
      navigate(notification.link)
    }
  }, [closePanel, navigate])

  if (!isPanelOpen) return null

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
          </div>
          <div className="header-actions">
            <button className="header-btn" title="Opções">
              <MoreHorizontal size={18} />
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
        <div className="notification-list">
          {isLoading ? (
            <div className="notification-loading">
              <div className="loading-spinner" />
              <span>A carregar...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={40} strokeWidth={1.5} />
              <h3>Sem notificações</h3>
              <p>
                {filter === NOTIFICATION_FILTERS.UNREAD
                  ? 'Não tens notificações por ler'
                  : filter === NOTIFICATION_FILTERS.MENTIONS
                    ? 'Não tens menções recentes'
                    : 'Ainda não tens notificações'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
              />
            ))
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
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications()

  return (
    <button
      className={`notification-bell-btn ${isPanelOpen ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
      onClick={togglePanel}
      title={unreadCount > 0 ? `${unreadCount} notificações por ler` : 'Notificações'}
    >
      <Bell size={collapsed ? 18 : 20} />
      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 9 ? '9+' : unreadCount}
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
