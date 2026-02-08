import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Mail, CheckCircle2, ArrowRight } from 'lucide-react'

export default function PortalLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
        }
      })

      if (authError) throw authError
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logo}>GAVINHO</div>
        <div style={styles.subtitle}>Portal Cliente</div>

        {sent ? (
          <div style={styles.sentBlock}>
            <div style={styles.sentIcon}>
              <CheckCircle2 size={32} style={{ color: '#10B981' }} />
            </div>
            <h2 style={{ color: '#2D2B28', fontSize: '20px', margin: '16px 0 8px' }}>
              Email enviado
            </h2>
            <p style={{ color: '#8B8670', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
              Enviámos um link de acesso para <strong>{email}</strong>.
              Verifique a sua caixa de entrada e clique no link para aceder ao portal.
            </p>
            <button onClick={() => setSent(false)} style={styles.btnGhost}>
              Enviar novamente
            </button>
          </div>
        ) : (
          <>
            <p style={styles.description}>
              Introduza o seu email para receber um link de acesso seguro ao portal do seu projecto.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <Mail size={18} style={{ color: '#8B8670', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="o-seu-email@exemplo.com"
                  required
                  style={styles.input}
                />
              </div>

              {error && (
                <div style={styles.error}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={styles.btn}>
                {loading ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>Aceder ao Portal <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div style={styles.footer}>
              <p>Não tem acesso? Contacte a equipa GAVINHO.</p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #FAFAF8 0%, #F0EDE6 100%)',
    padding: '20px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(45, 43, 40, 0.06)',
    textAlign: 'center',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '4px',
    color: '#2D2B28',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#ADAA96',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '32px',
  },
  description: {
    fontSize: '14px',
    color: '#8B8670',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    border: '1px solid #E8E6DF',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#2D2B28',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  btn: {
    padding: '14px 24px',
    background: '#2D2B28',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  btnGhost: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#8B8670',
    border: '1px solid #E8E6DF',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  sentBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sentIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#ECFDF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#ADAA96',
  },
}
