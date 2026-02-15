// =====================================================
// OFFLINE INDICATOR — Visual offline/sync state component
// Shows banners, toasts, and header dot for connectivity
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { WifiOff, RefreshCw, Check, AlertTriangle, X, Cloud, CloudOff } from 'lucide-react'

const TOAST_DURATION_SUCCESS = 3000
const TOAST_DURATION_CONFLICT = 5000

export default function OfflineIndicator({
  isOnline,
  pendingCount,
  syncing,
  lastSyncError,
  conflictsResolved,
  onRetry,
  onDismissConflicts
}) {
  const [showSyncSuccess, setShowSyncSuccess] = useState(false)
  const [showConflictToast, setShowConflictToast] = useState(false)
  const prevPendingRef = useRef(pendingCount)
  const prevSyncingRef = useRef(syncing)

  // Show success toast when sync finishes and queue empties
  useEffect(() => {
    if (prevSyncingRef.current && !syncing && pendingCount === 0 && prevPendingRef.current > 0) {
      setShowSyncSuccess(true)
      const timer = setTimeout(() => setShowSyncSuccess(false), TOAST_DURATION_SUCCESS)
      return () => clearTimeout(timer)
    }
    prevSyncingRef.current = syncing
    prevPendingRef.current = pendingCount
  }, [syncing, pendingCount])

  // Show conflict toast
  useEffect(() => {
    if (conflictsResolved && conflictsResolved.length > 0) {
      setShowConflictToast(true)
      const timer = setTimeout(() => {
        setShowConflictToast(false)
        onDismissConflicts?.()
      }, TOAST_DURATION_CONFLICT)
      return () => clearTimeout(timer)
    }
  }, [conflictsResolved])

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div style={indicatorStyles.offlineBanner}>
          <WifiOff size={15} />
          <span>Sem ligação — alterações guardadas localmente</span>
        </div>
      )}

      {/* Sync error banner */}
      {isOnline && lastSyncError && pendingCount > 0 && (
        <div style={indicatorStyles.errorBanner} onClick={onRetry}>
          <AlertTriangle size={14} />
          <span>Falha ao sincronizar — toca para tentar</span>
          <RefreshCw size={14} />
        </div>
      )}

      {/* Syncing banner */}
      {isOnline && syncing && (
        <div style={indicatorStyles.syncingBanner}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span>A sincronizar{pendingCount > 0 ? ` ${pendingCount} ações` : ''}...</span>
        </div>
      )}

      {/* Pending actions banner (not syncing, not error) */}
      {isOnline && !syncing && !lastSyncError && pendingCount > 0 && (
        <div style={indicatorStyles.pendingBanner} onClick={onRetry}>
          <Cloud size={14} />
          <span>{pendingCount} {pendingCount === 1 ? 'ação pendente' : 'ações pendentes'} — toca para sincronizar</span>
        </div>
      )}

      {/* Success toast */}
      {showSyncSuccess && (
        <div style={indicatorStyles.successToast}>
          <Check size={16} />
          <span>Tudo sincronizado</span>
          <button
            style={indicatorStyles.toastCloseBtn}
            onClick={() => setShowSyncSuccess(false)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Conflict toast */}
      {showConflictToast && (
        <div style={indicatorStyles.conflictToast}>
          <AlertTriangle size={16} />
          <span>Algumas alterações foram atualizadas pelo servidor</span>
          <button
            style={indicatorStyles.toastCloseBtn}
            onClick={() => {
              setShowConflictToast(false)
              onDismissConflicts?.()
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Header status dot — use inline in the header.
 * Shows connectivity + sync state at a glance.
 */
export function ConnectionDot({ isOnline, pendingCount, syncing }) {
  let color = '#4CAF50' // green — online, synced
  let pulse = false

  if (!isOnline) {
    color = '#F44336' // red — offline
  } else if (syncing || pendingCount > 0) {
    color = '#FF9800' // orange — pending/syncing
    pulse = true
  }

  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginLeft: 6,
        flexShrink: 0,
        animation: pulse ? 'pulse 1.5s ease-in-out infinite' : 'none'
      }}
    />
  )
}

const indicatorStyles = {
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#fef3c7',
    color: '#92400e',
    fontSize: 13,
    fontWeight: 500,
    zIndex: 50
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    zIndex: 50
  },
  syncingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '6px 16px',
    background: '#dbeafe',
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 500,
    zIndex: 50
  },
  pendingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '6px 16px',
    background: '#dbeafe',
    color: '#1e40af',
    fontSize: 12,
    cursor: 'pointer',
    zIndex: 50
  },
  successToast: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: '#dcfce7',
    color: '#166534',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 1000,
    animation: 'slideDown 0.3s ease'
  },
  conflictToast: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 1000,
    animation: 'slideDown 0.3s ease',
    maxWidth: '90vw'
  },
  toastCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.7
  }
}
