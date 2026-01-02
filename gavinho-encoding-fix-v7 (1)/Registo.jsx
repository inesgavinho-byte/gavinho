import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function Registo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
    funcao: 'Colaborador'
  })

  const funcoes = [
    'Colaborador',
    'Arquiteto',
    'Designer Interiores',
    'Engenheiro',
    'Project Manager',
    'Diretor de Obra',
    'Administrativo',
    'Outro'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validações
    if (!form.nome.trim() || !form.email.trim() || !form.password) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    if (form.password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('As passwords não coincidem')
      return
    }

    setLoading(true)

    try {
      // 1. Criar utilizador no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nome: form.nome,
            funcao: form.funcao
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email já está registado')
        }
        throw authError
      }

      // 2. Criar registo na tabela utilizadores (ativo = false, pendente aprovação)
      const { error: profileError } = await supabase
        .from('utilizadores')
        .insert([{
          nome: form.nome,
          email: form.email,
          telefone: form.telefone || null,
          funcao: form.funcao,
          departamento: 'Pendente',
          ativo: false, // Pendente aprovação
          data_entrada: new Date().toISOString().split('T')[0],
          auth_id: authData.user?.id || null
        }])

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError)
        // Não falhar completamente - o auth já foi criado
      }

      // 3. Fazer logout imediato (utilizador não pode aceder até ser aprovado)
      await supabase.auth.signOut()

      setSuccess(true)
    } catch (err) {
      console.error('Erro no registo:', err)
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sandy-beach)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={32} style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: 'var(--brown)' }}>Registo Submetido!</h1>
          <p style={{ color: 'var(--brown-light)', marginBottom: '32px', lineHeight: 1.6 }}>
            O seu pedido de registo foi enviado com sucesso.<br />
            Receberá um email quando a sua conta for aprovada pela administração.
          </p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--brown)', color: 'white', borderRadius: '980px', textDecoration: 'none', fontWeight: 500 }}>
            Voltar ao Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sandy-beach)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, var(--brown), var(--brown-dark))', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', fontWeight: 700, color: 'var(--sandy-beach)' }}>
            G
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)', marginBottom: '8px' }}>Criar Conta</h1>
          <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>Preencha os dados para solicitar acesso À  plataforma</p>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--white)', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(184, 138, 138, 0.15)', borderRadius: '10px', marginBottom: '20px', color: 'var(--error)', fontSize: '13px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome Completo *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="O seu nome"
                  style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Telefone */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Telefone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="+351 912 345 678"
                  style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Função */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Função</label>
              <select
                value={form.funcao}
                onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)' }}
              >
                {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  style={{ width: '100%', padding: '12px 44px 12px 44px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Confirmar Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Repetir password"
                  style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <><Loader2 size={18} className="spin" /> A submeter...</> : 'Submeter Pedido de Registo'}
            </button>
          </form>

          {/* Link para login */}
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--brown-light)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--brown)', fontWeight: 500, textDecoration: 'none' }}>
              Fazer Login
            </Link>
          </p>
        </div>

        {/* Info */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--brown-light)' }}>
          Após o registo, a sua conta será analisada pela administração.
        </p>
      </div>
    </div>
  )
}
