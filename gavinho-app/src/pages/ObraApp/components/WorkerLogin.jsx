// =====================================================
// WORKER LOGIN COMPONENT
// Dual login system: Phone+PIN for workers, Email+Password for management
// =====================================================

import { useState } from 'react'
import { HardHat, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { styles } from '../styles'
import { STORAGE_KEYS } from '../utils'

export default function WorkerLogin({ onLogin }) {
  const [loginType, setLoginType] = useState('phone') // 'phone' or 'email'
  const [telefone, setTelefone] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handlePhoneLogin = async () => {
    if (!telefone.trim() || !pin.trim()) return

    setLoading(true)
    setError('')

    try {
      // Format phone number
      let phone = telefone.replace(/\s/g, '')
      if (!phone.startsWith('+')) {
        phone = '+351' + phone.replace(/^0/, '')
      }

      // Check credentials
      const { data: trabalhador, error: authError } = await supabase
        .from('trabalhadores')
        .select('id, nome, telefone, cargo')
        .eq('telefone', phone)
        .eq('pin', pin)
        .eq('ativo', true)
        .single()

      if (authError || !trabalhador) {
        throw new Error('Telefone ou PIN incorreto')
      }

      // Get assigned obras
      const { data: obrasData, error: obrasError } = await supabase
        .from('trabalhador_obras')
        .select('obra_id, obras(id, codigo, nome)')
        .eq('trabalhador_id', trabalhador.id)

      if (obrasError) throw obrasError

      const obras = obrasData?.map(o => o.obras).filter(Boolean) || []

      if (obras.length === 0) {
        throw new Error('Não tens obras atribuídas')
      }

      // Save to localStorage
      const user = {
        id: trabalhador.id,
        nome: trabalhador.nome,
        telefone: trabalhador.telefone,
        cargo: trabalhador.cargo || 'Equipa',
        tipo: 'trabalhador'
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obras))

      onLogin(user, obras)
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError('')

    try {
      // Use Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (authError) {
        throw new Error(authError.message === 'Invalid login credentials'
          ? 'Email ou password incorretos'
          : authError.message)
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, email, cargo')
        .eq('id', authData.user.id)
        .single()

      // Get all obras (managers can access all)
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })

      if (obrasError) throw obrasError

      const user = {
        id: authData.user.id,
        nome: profile?.nome || authData.user.email.split('@')[0],
        email: authData.user.email,
        cargo: profile?.cargo || 'Gestão',
        tipo: 'gestao'
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obrasData || []))

      onLogin(user, obrasData || [])
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    if (loginType === 'phone') {
      handlePhoneLogin()
    } else {
      handleEmailLogin()
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Introduz o teu email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password'
      })

      if (resetError) throw resetError

      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  // Reset password mode
  if (resetMode) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <HardHat size={48} style={{ color: '#6b7280' }} />
            <h1 style={{ margin: '12px 0 4px' }}>Recuperar Password</h1>
            <p style={{ margin: 0, opacity: 0.7 }}>Vamos enviar um email de recuperação</p>
          </div>

          {resetSent ? (
            <>
              <div style={styles.successMessage}>
                <Check size={20} /> Email enviado! Verifica a tua caixa de entrada.
              </div>
              <button
                onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                style={styles.loginButton}
              >
                Voltar ao Login
              </button>
            </>
          ) : (
            <>
              <div style={styles.loginField}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                  placeholder="email@gavinho.pt"
                  style={styles.loginInput}
                  autoFocus
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button
                onClick={handleResetPassword}
                disabled={loading || !email.trim()}
                style={styles.loginButton}
              >
                {loading ? 'A enviar...' : 'Enviar Email'}
              </button>

              <button
                onClick={() => { setResetMode(false); setError('') }}
                style={{ ...styles.loginButton, background: 'transparent', color: '#666', marginTop: 8 }}
              >
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <HardHat size={48} style={{ color: '#6b7280' }} />
          <h1 style={{ margin: '12px 0 4px' }}>Gavinho Obras</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>App de comunicação da equipa</p>
        </div>

        {/* Login type toggle */}
        <div style={styles.loginToggle}>
          <button
            onClick={() => { setLoginType('phone'); setError('') }}
            style={{
              ...styles.toggleButton,
              ...(loginType === 'phone' ? styles.toggleButtonActive : {})
            }}
          >
            Trabalhador
          </button>
          <button
            onClick={() => { setLoginType('email'); setError('') }}
            style={{
              ...styles.toggleButton,
              ...(loginType === 'email' ? styles.toggleButtonActive : {})
            }}
          >
            Gestão
          </button>
        </div>

        {loginType === 'phone' ? (
          <>
            <div style={styles.loginField}>
              <label>Telemóvel</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="912 345 678"
                style={styles.loginInput}
                autoFocus
              />
            </div>

            <div style={styles.loginField}>
              <label>PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••"
                maxLength={6}
                style={{ ...styles.loginInput, letterSpacing: 8, textAlign: 'center' }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={styles.loginField}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gavinho.pt"
                style={styles.loginInput}
                autoFocus
              />
            </div>

            <div style={styles.loginField}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={styles.loginInput}
              />
            </div>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || (loginType === 'phone' ? (!telefone.trim() || !pin.trim()) : (!email.trim() || !password.trim()))}
          style={styles.loginButton}
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 16 }}>
          {loginType === 'phone'
            ? 'Não tens conta? Fala com o teu encarregado.'
            : (
              <>
                <span>Usa as mesmas credenciais da plataforma web.</span>
                <br />
                <button
                  onClick={() => { setResetMode(true); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#3d4349', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, marginTop: 8 }}
                >
                  Esqueci a password
                </button>
              </>
            )
          }
        </p>
      </div>
    </div>
  )
}
