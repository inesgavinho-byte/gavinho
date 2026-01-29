import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { HardHat, Check, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session, might need to handle the hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        }
      }
    }
    checkSession()
  }, [])

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError('Introduz uma nova password')
      return
    }

    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As passwords não coincidem')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/obra-app')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Erro ao atualizar password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <HardHat size={48} style={{ color: '#6b7280' }} />
          <h1 style={{ margin: '12px 0 4px' }}>Nova Password</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Define a tua nova password</p>
        </div>

        {success ? (
          <>
            <div style={styles.successMessage}>
              <Check size={20} /> Password atualizada com sucesso!
            </div>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 14 }}>
              A redirecionar para o login...
            </p>
          </>
        ) : (
          <>
            <div style={styles.field}>
              <label>Nova Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label>Confirmar Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdatePassword()}
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              onClick={handleUpdatePassword}
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              style={styles.button}
            >
              {loading ? 'A atualizar...' : 'Atualizar Password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#3d4349',
    padding: 20,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  header: {
    textAlign: 'center',
    marginBottom: 24
  },
  field: {
    marginBottom: 16
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #E5E5E5',
    borderRadius: 8,
    fontSize: 16,
    marginTop: 6,
    outline: 'none',
    boxSizing: 'border-box'
  },
  passwordWrapper: {
    position: 'relative'
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: 4,
    marginTop: 3
  },
  button: {
    width: '100%',
    padding: 14,
    background: '#3d4349',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12
  },
  error: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: 8,
    marginBottom: 16
  }
}
