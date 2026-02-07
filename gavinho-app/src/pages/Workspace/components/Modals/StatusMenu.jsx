// =====================================================
// STATUS MENU
// Menu dropdown para alterar estado do utilizador
// =====================================================

import { Moon } from 'lucide-react'
import { USER_STATUS_OPTIONS } from '../../utils/constants'

export default function StatusMenu({
  isOpen,
  onClose,
  userStatus,
  onUpdateStatus,
  onOpenDndSettings
}) {
  if (!isOpen) return null

  const handleStatusClick = (statusId) => {
    onUpdateStatus(statusId)
    onClose()
  }

  const handleDndClick = () => {
    onOpenDndSettings()
    onClose()
  }

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1999
        }}
        onClick={onClose}
      />

      {/* Menu */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: 280,
        background: 'var(--white)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        padding: '8px',
        width: '220px',
        zIndex: 2000
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--brown-light)',
          textTransform: 'uppercase'
        }}>
          Estado
        </div>

        {/* Status Options */}
        {USER_STATUS_OPTIONS.map(status => (
          <button
            key={status.id}
            onClick={() => handleStatusClick(status.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              background: userStatus === status.id ? 'var(--cream)' : 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              textAlign: 'left'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: status.color
            }} />
            <span style={{ fontSize: '13px', color: 'var(--brown)' }}>
              {status.label}
            </span>
          </button>
        ))}

        {/* Divider */}
        <div style={{
          borderTop: '1px solid var(--stone)',
          margin: '8px 0'
        }} />

        {/* DND Button */}
        <button
          onClick={handleDndClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '6px'
          }}
        >
          <Moon size={16} style={{ color: 'var(--brown-light)' }} />
          <span style={{ fontSize: '13px' }}>Não incomodar</span>
        </button>
      </div>
    </>
  )
}
