import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      if (err.message.includes('Email rate limit exceeded')) {
        setError('Demasiados pedidos. Aguarde alguns minutos.')
      } else {
        setError('Erro ao enviar email. Verifique o endereço.')
      }
    } finally {
      setLoading(false)
    }
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
                Email Enviado
              </h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
                Enviámos um link para <strong>{email}</strong>. 
                Verifique a sua caixa de entrada e clique no link para redefinir a password.
              </p>
              <Link 
                to="/login"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                Voltar ao Login
              </Link>
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
                Recuperar Password
              </h2>
              <p style={{ 
                textAlign: 'center', 
                color: 'var(--brown-light)', 
                fontSize: '14px',
                marginBottom: '24px'
              }}>
                Introduza o seu email para receber um link de recuperação
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
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail 
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
                      type="email"
                      className="input"
                      placeholder="seu.email@gavinhogroup.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ 
                        paddingLeft: '44px',
                        height: '48px',
                        borderRadius: '12px'
                      }}
                    />
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
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      A enviar...
                    </>
                  ) : (
                    'Enviar Link'
                  )}
                </button>

                <Link 
                  to="/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'var(--brown-light)',
                    fontSize: '14px',
                    textDecoration: 'none'
                  }}
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </Link>
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
