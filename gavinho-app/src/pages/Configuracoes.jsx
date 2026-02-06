import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../components/ui/ThemeProvider'
import {
  Settings, User, Bell, Palette, Globe, Shield, Database,
  Mail, Phone, Key, Save, Loader2, Check, X, Moon, Sun,
  Smartphone, Webhook, AlertCircle, Eye, EyeOff, RefreshCw
} from 'lucide-react'

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'notificacoes', label: 'Notificacoes', icon: Bell },
  { id: 'aparencia', label: 'Aparencia', icon: Palette },
  { id: 'integracoes', label: 'Integracoes', icon: Webhook },
  { id: 'seguranca', label: 'Seguranca', icon: Shield }
]

export default function Configuracoes() {
  const { profile, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('perfil')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Perfil state
  const [perfilData, setPerfilData] = useState({
    nome: '',
    email: '',
    telefone: '',
    funcao: '',
    avatar_url: ''
  })

  // Notificacoes state
  const [notificacoes, setNotificacoes] = useState({
    email_novos_projetos: true,
    email_tarefas: true,
    email_resumo_diario: false,
    push_mensagens: true,
    push_alertas: true
  })

  // WhatsApp config state
  const [whatsappConfig, setWhatsappConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    ativo: false
  })
  const [showAuthToken, setShowAuthToken] = useState(false)

  useEffect(() => {
    if (profile) {
      setPerfilData({
        nome: profile.nome || '',
        email: profile.email || user?.email || '',
        telefone: profile.telefone || '',
        funcao: profile.funcao || '',
        avatar_url: profile.avatar_url || ''
      })

      if (profile.configuracoes) {
        setNotificacoes(prev => ({
          ...prev,
          ...profile.configuracoes.notificacoes
        }))
      }
    }

    loadWhatsappConfig()
  }, [profile, user])

  const loadWhatsappConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('ativo', true)
        .maybeSingle()

      if (data) {
        setWhatsappConfig({
          accountSid: data.twilio_account_sid || '',
          authToken: '',
          phoneNumber: data.twilio_phone_number || '',
          ativo: data.ativo
        })
      }
    } catch (err) {
      console.error('Erro ao carregar config WhatsApp:', err)
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSavePerfil = async () => {
    if (!profile?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('utilizadores')
        .update({
          nome: perfilData.nome,
          telefone: perfilData.telefone,
          funcao: perfilData.funcao,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error
      showMessage('Perfil atualizado com sucesso!')
    } catch (err) {
      console.error('Erro ao guardar perfil:', err)
      showMessage('Erro ao guardar perfil', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotificacoes = async () => {
    if (!profile?.id) return

    setSaving(true)
    try {
      // Garantir que configuracoes existe e merge com existente
      const currentConfig = profile.configuracoes || {}
      const newConfig = {
        ...currentConfig,
        notificacoes
      }

      const { error } = await supabase
        .from('utilizadores')
        .update({
          configuracoes: newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) {
        // Se a coluna nao existe, informar o utilizador
        if (error.code === '42703' || error.message?.includes('column')) {
          showMessage('Coluna de configuracoes nao existe. Contacta o administrador.', 'error')
        } else {
          throw error
        }
        return
      }
      showMessage('Preferencias de notificacoes atualizadas!')
    } catch (err) {
      console.error('Erro ao guardar notificacoes:', err)
      showMessage('Erro ao guardar notificacoes', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWhatsapp = async () => {
    if (!whatsappConfig.accountSid || !whatsappConfig.phoneNumber) {
      showMessage('Preenche Account SID e Numero WhatsApp', 'error')
      return
    }

    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('ativo', true)
        .maybeSingle()

      const configData = {
        twilio_account_sid: whatsappConfig.accountSid,
        twilio_phone_number: whatsappConfig.phoneNumber.replace(/\s/g, ''),
        ativo: true,
        updated_at: new Date().toISOString()
      }

      if (whatsappConfig.authToken) {
        configData.twilio_auth_token_encrypted = whatsappConfig.authToken
      }

      if (existing) {
        await supabase
          .from('whatsapp_config')
          .update(configData)
          .eq('id', existing.id)
      } else {
        if (!whatsappConfig.authToken) {
          showMessage('Auth Token e obrigatorio na primeira configuracao', 'error')
          setSaving(false)
          return
        }
        configData.twilio_auth_token_encrypted = whatsappConfig.authToken
        configData.created_at = new Date().toISOString()
        await supabase.from('whatsapp_config').insert(configData)
      }

      setWhatsappConfig(prev => ({ ...prev, authToken: '', ativo: true }))
      showMessage('Configuracao WhatsApp guardada com sucesso!')
    } catch (err) {
      console.error('Erro ao guardar config WhatsApp:', err)
      showMessage('Erro ao guardar configuracao', 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderPerfilTab = () => (
    <div className="flex flex-col gap-lg">
      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Informacoes Pessoais</h3>

        <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label">Nome</label>
            <input
              type="text"
              className="input"
              value={perfilData.nome}
              onChange={(e) => setPerfilData(prev => ({ ...prev, nome: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Funcao</label>
            <input
              type="text"
              className="input"
              value={perfilData.funcao}
              onChange={(e) => setPerfilData(prev => ({ ...prev, funcao: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              value={perfilData.email}
              disabled
              style={{ opacity: 0.6 }}
            />
            <span className="text-muted" style={{ fontSize: '11px' }}>O email nao pode ser alterado</span>
          </div>
          <div className="input-group">
            <label className="input-label">Telefone</label>
            <input
              type="tel"
              className="input"
              placeholder="+351 912 345 678"
              value={perfilData.telefone}
              onChange={(e) => setPerfilData(prev => ({ ...prev, telefone: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSavePerfil} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            Guardar Alteracoes
          </button>
        </div>
      </div>
    </div>
  )

  const renderNotificacoesTab = () => (
    <div className="flex flex-col gap-lg">
      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Notificacoes por Email</h3>

        <div className="flex flex-col gap-md">
          {[
            { key: 'email_novos_projetos', label: 'Novos projetos atribuidos', desc: 'Receber email quando for adicionado a um projeto' },
            { key: 'email_tarefas', label: 'Tarefas atribuidas', desc: 'Receber email quando uma tarefa for atribuida' },
            { key: 'email_resumo_diario', label: 'Resumo diario', desc: 'Receber resumo diario das atividades' }
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--cream)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>{item.desc}</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notificacoes[item.key]}
                  onChange={(e) => setNotificacoes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Notificacoes Push</h3>

        <div className="flex flex-col gap-md">
          {[
            { key: 'push_mensagens', label: 'Mensagens', desc: 'Notificar novas mensagens no chat' },
            { key: 'push_alertas', label: 'Alertas', desc: 'Notificar alertas importantes' }
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--cream)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>{item.desc}</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notificacoes[item.key]}
                  onChange={(e) => setNotificacoes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSaveNotificacoes} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  )

  const renderAparenciaTab = () => (
    <div className="flex flex-col gap-lg">
      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Tema</h3>

        <div style={{
          display: 'flex',
          gap: '16px'
        }}>
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            style={{
              flex: 1,
              padding: '24px',
              border: `2px solid ${theme === 'light' ? 'var(--gold)' : 'var(--stone)'}`,
              borderRadius: 'var(--radius-lg)',
              background: theme === 'light' ? 'var(--cream)' : 'var(--white)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Sun size={32} style={{ color: theme === 'light' ? 'var(--gold)' : 'var(--brown-light)' }} />
            <span style={{ fontWeight: theme === 'light' ? 600 : 400 }}>Claro</span>
            {theme === 'light' && <Check size={16} style={{ color: 'var(--gold)' }} />}
          </button>

          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            style={{
              flex: 1,
              padding: '24px',
              border: `2px solid ${theme === 'dark' ? 'var(--gold)' : 'var(--stone)'}`,
              borderRadius: 'var(--radius-lg)',
              background: theme === 'dark' ? 'var(--cream)' : 'var(--white)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Moon size={32} style={{ color: theme === 'dark' ? 'var(--gold)' : 'var(--brown-light)' }} />
            <span style={{ fontWeight: theme === 'dark' ? 600 : 400 }}>Escuro</span>
            {theme === 'dark' && <Check size={16} style={{ color: 'var(--gold)' }} />}
          </button>
        </div>
      </div>
    </div>
  )

  const renderIntegracoesTab = () => (
    <div className="flex flex-col gap-lg">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Phone size={24} style={{ color: '#25D366' }} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 600 }}>WhatsApp Business (Twilio)</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              {whatsappConfig.ativo ? 'Conectado' : 'Nao configurado'}
            </span>
          </div>
          {whatsappConfig.ativo && (
            <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}>
              Ativo
            </span>
          )}
        </div>

        <div className="flex flex-col gap-md">
          <div className="input-group">
            <label className="input-label">Account SID</label>
            <input
              type="text"
              className="input"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={whatsappConfig.accountSid}
              onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accountSid: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Auth Token {whatsappConfig.ativo && '(deixar vazio para manter)'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showAuthToken ? 'text' : 'password'}
                className="input"
                placeholder={whatsappConfig.ativo ? '••••••••••••••••' : 'Auth Token'}
                value={whatsappConfig.authToken}
                onChange={(e) => setWhatsappConfig(prev => ({ ...prev, authToken: e.target.value }))}
                style={{ fontFamily: 'monospace', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowAuthToken(!showAuthToken)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}
              >
                {showAuthToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Numero WhatsApp (Twilio)</label>
            <input
              type="text"
              className="input"
              placeholder="+14155238886"
              value={whatsappConfig.phoneNumber}
              onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(201, 168, 130, 0.15)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--brown-dark)'
        }}>
          <strong>Webhook URL:</strong>
          <code style={{ display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>
            https://vctcppuvqjstscbzdykn.supabase.co/functions/v1/twilio-webhook
          </code>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSaveWhatsapp} disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            Guardar Configuracao
          </button>
        </div>
      </div>
    </div>
  )

  const renderSegurancaTab = () => (
    <div className="flex flex-col gap-lg">
      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Alterar Palavra-passe</h3>

        <p className="text-muted" style={{ marginBottom: '16px' }}>
          Para alterar a palavra-passe, utiliza a funcao de recuperacao.
        </p>

        <button
          className="btn btn-outline"
          onClick={async () => {
            if (user?.email) {
              await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`
              })
              showMessage('Email de recuperacao enviado!')
            }
          }}
        >
          <Key size={16} />
          Enviar Email de Recuperacao
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontWeight: 600 }}>Sessao</h3>

        <div style={{
          padding: '12px 16px',
          background: 'var(--cream)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 500 }}>Sessao atual</div>
              <div className="text-muted" style={{ fontSize: '12px' }}>
                Iniciada em {new Date().toLocaleDateString('pt-PT')}
              </div>
            </div>
            <span className="badge" style={{ background: 'rgba(122, 158, 122, 0.15)', color: 'var(--success)' }}>
              Ativa
            </span>
          </div>
        </div>

        <button
          className="btn btn-outline"
          style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
        >
          Terminar Sessao
        </button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'perfil': return renderPerfilTab()
      case 'notificacoes': return renderNotificacoesTab()
      case 'aparencia': return renderAparenciaTab()
      case 'integracoes': return renderIntegracoesTab()
      case 'seguranca': return renderSegurancaTab()
      default: return null
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuracoes</h1>
          <p className="page-subtitle">Gere as definicoes da tua conta e da plataforma</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: message.type === 'error' ? 'var(--error)' : 'var(--success)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {message.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-lg)' }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: '8px', height: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: activeTab === tab.id ? 'var(--cream)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--brown-dark)' : 'var(--brown-light)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {renderContent()}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--stone-dark);
          transition: 0.3s;
          border-radius: 26px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--gold);
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
      `}</style>
    </div>
  )
}
