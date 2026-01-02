import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      }
      setChecking(false)
    }
    checkSession()

    // Listen for auth state changes (when user clicks recovery link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setValidSession(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const validatePassword = () => {
    if (password.length < 8) {
      setError('A password deve ter pelo menos 8 caracteres')
      return false
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validatePassword()) return
    
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      if (err.message.includes('same as')) {
        setError('A nova password deve ser diferente da atual')
      } else {
        setError('Erro ao alterar password. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (checking) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sandy-beach)'
        }}
      >
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    )
  }

  // Invalid session
  if (!validSession && !checking) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sandy-beach)',
          padding: '20px'
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div 
            className="card"
            style={{
              padding: '32px',
              borderRadius: '24px',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(184, 138, 138, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <AlertCircle size={32} style={{ color: 'var(--error)' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown)' }}>
              Link Inválido
            </h2>
            <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
              Este link de recuperação expirou ou é inválido. Por favor, solicite um novo link.
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '12px',
                justifyContent: 'center'
              }}
            >
              Solicitar Novo Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sandy-beach)',
        padding: '20px'
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, var(--brown), var(--brown-dark))',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--sandy-beach)'
            }}
          >
            G
          </div>
          <h1 
            style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: 'var(--brown)',
              letterSpacing: '2px',
              marginBottom: '8px'
            }}
          >
            GAVINHO
          </h1>
        </div>

        {/* Card */}
        <div 
          className="card"
          style={{
            padding: '32px',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {success ? (
            /* Success State */
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(122, 158, 122, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}
              >
                <CheckCircle size={32} style={{ color: 'var(--success)' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown)' }}>
                Password Alterada
              </h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
                A sua password foi alterada com sucesso. Será redirecionado para o login...
              </p>
              <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
            </div>
          ) : (
            /* Form State */
            <>
              <h2 
                style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  marginBottom: '8px',
                  textAlign: 'center',
                  color: 'var(--brown)'
                }}
              >
                Nova Password
              </h2>
              <p style={{ 
                textAlign: 'center', 
                color: 'var(--brown-light)', 
                fontSize: '14px',
                marginBottom: '24px'
              }}>
                Introduza a sua nova password
              </p>

              {/* Error Message */}
              {error && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: 'rgba(184, 138, 138, 0.15)',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    color: 'var(--error)',
                    fontSize: '13px'
                  }}
                >
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label 
                    style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 500, 
                      marginBottom: '8px',
                      color: 'var(--brown)'
                    }}
                  >
                    Nova Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '14px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: 'var(--brown-light)'
                      }} 
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      style={{ 
                        paddingLeft: '44px',
                        paddingRight: '44px',
                        height: '48px',
                        borderRadius: '12px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--brown-light)',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label 
                    style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 500, 
                      marginBottom: '8px',
                      color: 'var(--brown)'
                    }}
                  >
                    Confirmar Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '14px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: 'var(--brown-light)'
                      }} 
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Repita a password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ 
                        paddingLeft: '44px',
                        paddingRight: '44px',
                        height: '48px',
                        borderRadius: '12px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--brown-light)',
                        padding: '4px'
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    justifyContent: 'center'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      A guardar...
                    </>
                  ) : (
                    'Alterar Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p 
          style={{ 
            textAlign: 'center', 
            marginTop: '24px', 
            fontSize: '12px', 
            color: 'var(--brown-light)' 
          }}
        >
          Àƒ"šÀ‚© 2024 GAVINHO Group. Design & Build de Luxo.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
