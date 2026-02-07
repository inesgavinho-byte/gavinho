import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import {
  Settings, Bell, Palette, Shield, Database,
  Save, Loader2, Moon, Sun, Globe, Mail, Lock
} from 'lucide-react'

export default function Configuracoes() {
  const { user } = useAuth()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('geral')
  const [settings, setSettings] = useState({
    // Geral
    idioma: 'pt',
    moeda: 'EUR',
    formato_data: 'DD/MM/YYYY',
    // Notificações
    notif_email: true,
    notif_push: false,
    notif_tarefas: true,
    notif_projetos: true,
    notif_mencoes: true,
    notif_digest: 'diario',
    // Aparência
    tema: 'claro',
    sidebar_compacta: false,
    // Segurança
    two_factor: false
  })

  const sections = [
    { id: 'geral', label: 'Geral', icon: Settings },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'dados', label: 'Dados & Exportação', icon: Database }
  ]

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('utilizadores')
        .update({
          settings: settings
        })
        .eq('id', user?.id)

      if (error) throw error
      toast.success('Configurações guardadas')
    } catch (err) {
      console.error('Erro ao guardar configurações:', err)
      toast.error('Erro', 'Não foi possível guardar as configurações')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return
      const { data } = await supabase
        .from('utilizadores')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (data?.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    }
    loadSettings()
  }, [user?.id])

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Definições da plataforma</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px',
            background: 'var(--brown)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          Guardar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px' }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: '12px', height: 'fit-content' }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                background: activeSection === section.id ? 'var(--cream)' : 'transparent',
                color: activeSection === section.id ? 'var(--brown)' : 'var(--brown-light)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeSection === section.id ? 600 : 400,
                textAlign: 'left'
              }}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ padding: '24px' }}>

          {/* Geral */}
          {activeSection === 'geral' && (
            <div>
              <h3 style={sectionTitle}>Definições Gerais</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SettingRow icon={Globe} label="Idioma" description="Idioma da interface">
                  <select value={settings.idioma} onChange={e => setSettings(p => ({ ...p, idioma: e.target.value }))} style={selectStyle}>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </SettingRow>
                <SettingRow icon={Settings} label="Moeda" description="Moeda predefinida para orçamentos">
                  <select value={settings.moeda} onChange={e => setSettings(p => ({ ...p, moeda: e.target.value }))} style={selectStyle}>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </SettingRow>
                <SettingRow icon={Settings} label="Formato Data" description="Formato de apresentação de datas">
                  <select value={settings.formato_data} onChange={e => setSettings(p => ({ ...p, formato_data: e.target.value }))} style={selectStyle}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </SettingRow>
              </div>
            </div>
          )}

          {/* Notificações */}
          {activeSection === 'notificacoes' && (
            <div>
              <h3 style={sectionTitle}>Notificações</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SettingRow icon={Mail} label="Notificações por Email" description="Receber resumos por email">
                  <ToggleSwitch checked={settings.notif_email} onChange={v => setSettings(p => ({ ...p, notif_email: v }))} />
                </SettingRow>
                <SettingRow icon={Bell} label="Notificações Push" description="Notificações no browser">
                  <ToggleSwitch checked={settings.notif_push} onChange={v => setSettings(p => ({ ...p, notif_push: v }))} />
                </SettingRow>
                <SettingRow icon={Bell} label="Tarefas" description="Notificar sobre novas tarefas e deadlines">
                  <ToggleSwitch checked={settings.notif_tarefas} onChange={v => setSettings(p => ({ ...p, notif_tarefas: v }))} />
                </SettingRow>
                <SettingRow icon={Bell} label="Projetos" description="Atualizações de projetos onde participo">
                  <ToggleSwitch checked={settings.notif_projetos} onChange={v => setSettings(p => ({ ...p, notif_projetos: v }))} />
                </SettingRow>
                <SettingRow icon={Bell} label="Menções" description="Quando sou mencionado num chat ou comentário">
                  <ToggleSwitch checked={settings.notif_mencoes} onChange={v => setSettings(p => ({ ...p, notif_mencoes: v }))} />
                </SettingRow>
                <SettingRow icon={Mail} label="Frequência do Digest" description="Frequência do resumo por email">
                  <select value={settings.notif_digest} onChange={e => setSettings(p => ({ ...p, notif_digest: e.target.value }))} style={selectStyle}>
                    <option value="tempo_real">Tempo Real</option>
                    <option value="hora">Por Hora</option>
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </SettingRow>
              </div>
            </div>
          )}

          {/* Aparência */}
          {activeSection === 'aparencia' && (
            <div>
              <h3 style={sectionTitle}>Aparência</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SettingRow icon={Sun} label="Tema" description="Escolha o tema visual da plataforma">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'claro', label: 'Claro', icon: Sun },
                      { id: 'escuro', label: 'Escuro', icon: Moon }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSettings(p => ({ ...p, tema: t.id }))}
                        style={{
                          padding: '8px 16px',
                          background: settings.tema === t.id ? 'var(--brown)' : 'transparent',
                          color: settings.tema === t.id ? 'white' : 'var(--brown-light)',
                          border: settings.tema === t.id ? 'none' : '1px solid var(--stone)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <t.icon size={14} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow icon={Settings} label="Sidebar Compacta" description="Reduzir a largura da barra lateral">
                  <ToggleSwitch checked={settings.sidebar_compacta} onChange={v => setSettings(p => ({ ...p, sidebar_compacta: v }))} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* Segurança */}
          {activeSection === 'seguranca' && (
            <div>
              <h3 style={sectionTitle}>Segurança</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SettingRow icon={Lock} label="Alterar Password" description="Atualizar a sua palavra-passe">
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(user?.email)
                      if (!error) toast.success('Email de reset enviado')
                      else toast.error('Erro', error.message)
                    }}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--brown)' }}
                  >
                    Enviar Email de Reset
                  </button>
                </SettingRow>
                <SettingRow icon={Shield} label="Autenticação 2 Fatores" description="Adicionar camada extra de segurança">
                  <ToggleSwitch checked={settings.two_factor} onChange={v => setSettings(p => ({ ...p, two_factor: v }))} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* Dados & Exportação */}
          {activeSection === 'dados' && (
            <div>
              <h3 style={sectionTitle}>Dados & Exportação</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SettingRow icon={Database} label="Exportar Dados" description="Descarregar todos os seus dados em formato JSON">
                  <button
                    onClick={() => toast.info('Em breve', 'Funcionalidade de exportação disponível em breve')}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--brown)' }}
                  >
                    Exportar JSON
                  </button>
                </SettingRow>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper components
function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--stone-light, #f0ebe5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <Icon size={18} style={{ color: 'var(--brown-light)', marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>{label}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>{description}</div>
        </div>
      </div>
      <div style={{ flexShrink: 0, marginLeft: '20px' }}>{children}</div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: checked ? 'var(--green, #16a34a)' : 'var(--stone)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </button>
  )
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--brown)',
  marginBottom: '20px',
  paddingBottom: '12px',
  borderBottom: '1px solid var(--stone)'
}

const selectStyle = {
  padding: '6px 12px',
  border: '1px solid var(--stone)',
  borderRadius: '6px',
  fontSize: '13px',
  background: 'var(--cream)',
  color: 'var(--brown)',
  cursor: 'pointer'
}
