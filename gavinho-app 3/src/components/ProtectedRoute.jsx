import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sandy-beach)',
          gap: '16px'
        }}
      >
        <div 
          style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, var(--brown), var(--brown-dark))',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--sandy-beach)'
          }}
        >
          G
        </div>
        <Loader2 
          size={24} 
          style={{ 
            color: 'var(--brown-light)',
            animation: 'spin 1s linear infinite'
          }} 
        />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
