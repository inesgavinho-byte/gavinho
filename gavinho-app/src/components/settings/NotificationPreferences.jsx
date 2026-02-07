// =====================================================
// NOTIFICATION PREFERENCES COMPONENT
// Permite aos utilizadores configurar preferências de notificações
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  MessageSquare,
  ListTodo,
  Package,
  AtSign,
  FolderKanban,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import './NotificationPreferences.css'

// Tipos de notificação disponíveis
const NOTIFICATION_TYPES = [
  { id: 'mention', label: 'Menções (@)', icon: AtSign, description: 'Quando alguém te menciona' },
  { id: 'message', label: 'Mensagens', icon: MessageSquare, description: 'Novas mensagens nos canais' },
  { id: 'comment', label: 'Comentários', icon: MessageSquare, description: 'Comentários em atas e documentos' },
  { id: 'task', label: 'Tarefas (Workspace)', icon: ListTodo, description: 'Atualizações de tarefas' },
  { id: 'project', label: 'Projetos', icon: FolderKanban, description: 'Atualizações de projetos' },
  { id: 'tarefa_atribuida', label: 'Tarefas Atribuídas', icon: ListTodo, description: 'Quando te atribuem uma tarefa' },
  { id: 'tarefa_concluida', label: 'Tarefas Concluídas', icon: Check, description: 'Quando uma tarefa é concluída' },
  { id: 'requisicao_nova', label: 'Novas Requisições', icon: Package, description: 'Pedidos de materiais' },
  { id: 'material_aprovado', label: 'Materiais Aprovados', icon: Package, description: 'Aprovações de materiais' },
  { id: 'aprovacao_pendente', label: 'Aprovações Pendentes', icon: AlertCircle, description: 'Itens que aguardam aprovação' }
]

// Opções de frequência de email
const EMAIL_FREQUENCIES = [
  { value: 'realtime', label: 'Tempo real', description: 'Receber email imediatamente' },
  { value: 'hourly', label: 'A cada hora', description: 'Resumo de hora a hora' },
  { value: 'daily', label: 'Diário', description: 'Resumo diário de manhã' },
  { value: 'weekly', label: 'Semanal', description: 'Resumo às segundas-feiras' },
  { value: 'never', label: 'Nunca', description: 'Não receber emails' }
]

export default function NotificationPreferences() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Estado das preferências
  const [preferences, setPreferences] = useState({
    notificacoes_ativadas: true,
    som_ativado: true,
    push_ativado: true,
    email_ativado: true,
    email_frequencia: 'daily',
    email_hora_digest: 9,
    tipos_silenciados: [],
    preferencias_tipo: {},
    dnd_ativado: false,
    dnd_inicio: '22:00',
    dnd_fim: '08:00',
    dnd_dias: [0, 1, 2, 3, 4, 5, 6]
  })

  const [expandedSections, setExpandedSections] = useState({
    general: true,
    types: false,
    email: false,
    dnd: false
  })

  // Carregar preferências
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('preferencias_notificacao')
        .select('*')
        .eq('utilizador_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (data) {
        setPreferences(prev => ({
          ...prev,
          ...data,
          tipos_silenciados: data.tipos_silenciados || [],
          preferencias_tipo: data.preferencias_tipo || {},
          dnd_dias: data.dnd_dias || [0, 1, 2, 3, 4, 5, 6]
        }))
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err)
      setError('Não foi possível carregar as preferências')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Guardar preferências
  const savePreferences = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      setError(null)

      const { error: upsertError } = await supabase
        .from('preferencias_notificacao')
        .upsert({
          utilizador_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'utilizador_id'
        })

      if (upsertError) throw upsertError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao guardar preferências:', err)
      setError('Não foi possível guardar as preferências')
    } finally {
      setSaving(false)
    }
  }

  // Toggle tipo silenciado
  const toggleTipoSilenciado = (tipoId) => {
    setPreferences(prev => {
      const silenciados = prev.tipos_silenciados || []
      const isSilenciado = silenciados.includes(tipoId)

      return {
        ...prev,
        tipos_silenciados: isSilenciado
          ? silenciados.filter(t => t !== tipoId)
          : [...silenciados, tipoId]
      }
    })
  }

  // Toggle dia DND
  const toggleDndDia = (dia) => {
    setPreferences(prev => {
      const dias = prev.dnd_dias || []
      const temDia = dias.includes(dia)

      return {
        ...prev,
        dnd_dias: temDia
          ? dias.filter(d => d !== dia)
          : [...dias, dia].sort()
      }
    })
  }

  // Toggle secção expandida
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (loading) {
    return (
      <div className="notification-prefs-loading">
        <Loader2 size={24} className="spinner" />
        <span>A carregar preferências...</span>
      </div>
    )
  }

  const diasSemana = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' }
  ]

  return (
    <div className="notification-preferences">
      <div className="prefs-header">
        <div className="prefs-title">
          <Bell size={24} />
          <div>
            <h2>Preferências de Notificações</h2>
            <p>Controla como e quando recebes notificações</p>
          </div>
        </div>

        <button
          className={`save-btn ${saving ? 'saving' : ''} ${success ? 'success' : ''}`}
          onClick={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="spinner" />
              A guardar...
            </>
          ) : success ? (
            <>
              <Check size={16} />
              Guardado!
            </>
          ) : (
            'Guardar Alterações'
          )}
        </button>
      </div>

      {error && (
        <div className="prefs-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Secção: Geral */}
      <div className="prefs-section">
        <button className="section-header" onClick={() => toggleSection('general')}>
          <div className="section-title">
            <Bell size={20} />
            <span>Geral</span>
          </div>
          {expandedSections.general ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.general && (
          <div className="section-content">
            <div className="pref-toggle">
              <div className="toggle-info">
                <span className="toggle-label">Notificações ativadas</span>
                <span className="toggle-description">Ativar ou desativar todas as notificações</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.notificacoes_ativadas}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    notificacoes_ativadas: e.target.checked
                  }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="pref-toggle">
              <div className="toggle-info">
                <Volume2 size={18} />
                <div>
                  <span className="toggle-label">Som</span>
                  <span className="toggle-description">Reproduzir som ao receber notificação</span>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.som_ativado}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    som_ativado: e.target.checked
                  }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="pref-toggle">
              <div className="toggle-info">
                <Smartphone size={18} />
                <div>
                  <span className="toggle-label">Notificações Push</span>
                  <span className="toggle-description">Receber notificações no browser/dispositivo</span>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.push_ativado}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    push_ativado: e.target.checked
                  }))}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Secção: Por Tipo */}
      <div className="prefs-section">
        <button className="section-header" onClick={() => toggleSection('types')}>
          <div className="section-title">
            <BellOff size={20} />
            <span>Por Tipo de Notificação</span>
            {preferences.tipos_silenciados?.length > 0 && (
              <span className="badge">{preferences.tipos_silenciados.length} silenciados</span>
            )}
          </div>
          {expandedSections.types ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.types && (
          <div className="section-content">
            <p className="section-description">
              Desativa tipos específicos de notificação que não queres receber.
            </p>

            <div className="types-grid">
              {NOTIFICATION_TYPES.map(tipo => {
                const Icon = tipo.icon
                const isSilenciado = preferences.tipos_silenciados?.includes(tipo.id)

                return (
                  <div
                    key={tipo.id}
                    className={`type-card ${isSilenciado ? 'silenciado' : ''}`}
                    onClick={() => toggleTipoSilenciado(tipo.id)}
                  >
                    <div className="type-icon">
                      <Icon size={20} />
                    </div>
                    <div className="type-info">
                      <span className="type-label">{tipo.label}</span>
                      <span className="type-description">{tipo.description}</span>
                    </div>
                    <div className={`type-status ${isSilenciado ? 'off' : 'on'}`}>
                      {isSilenciado ? <BellOff size={16} /> : <Bell size={16} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Secção: Email */}
      <div className="prefs-section">
        <button className="section-header" onClick={() => toggleSection('email')}>
          <div className="section-title">
            <Mail size={20} />
            <span>Notificações por Email</span>
          </div>
          {expandedSections.email ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.email && (
          <div className="section-content">
            <div className="pref-toggle">
              <div className="toggle-info">
                <Mail size={18} />
                <div>
                  <span className="toggle-label">Receber emails</span>
                  <span className="toggle-description">Ativar notificações por email</span>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.email_ativado}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    email_ativado: e.target.checked
                  }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            {preferences.email_ativado && (
              <>
                <div className="pref-select">
                  <label>Frequência de emails</label>
                  <div className="frequency-options">
                    {EMAIL_FREQUENCIES.map(freq => (
                      <div
                        key={freq.value}
                        className={`frequency-option ${preferences.email_frequencia === freq.value ? 'selected' : ''}`}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          email_frequencia: freq.value
                        }))}
                      >
                        <div className="freq-label">{freq.label}</div>
                        <div className="freq-description">{freq.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {(preferences.email_frequencia === 'daily' || preferences.email_frequencia === 'weekly') && (
                  <div className="pref-select">
                    <label>
                      <Clock size={14} />
                      Hora do resumo
                    </label>
                    <select
                      value={preferences.email_hora_digest}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        email_hora_digest: parseInt(e.target.value)
                      }))}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Secção: Não Perturbar */}
      <div className="prefs-section">
        <button className="section-header" onClick={() => toggleSection('dnd')}>
          <div className="section-title">
            <Moon size={20} />
            <span>Modo Não Perturbar</span>
            {preferences.dnd_ativado && (
              <span className="badge active">Ativo</span>
            )}
          </div>
          {expandedSections.dnd ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.dnd && (
          <div className="section-content">
            <div className="pref-toggle">
              <div className="toggle-info">
                <Moon size={18} />
                <div>
                  <span className="toggle-label">Ativar modo não perturbar</span>
                  <span className="toggle-description">Silenciar notificações em horários específicos</span>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.dnd_ativado}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    dnd_ativado: e.target.checked
                  }))}
                />
                <span className="slider"></span>
              </label>
            </div>

            {preferences.dnd_ativado && (
              <>
                <div className="dnd-schedule">
                  <div className="time-input">
                    <label>Início</label>
                    <input
                      type="time"
                      value={preferences.dnd_inicio}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        dnd_inicio: e.target.value
                      }))}
                    />
                  </div>
                  <span className="time-separator">até</span>
                  <div className="time-input">
                    <label>Fim</label>
                    <input
                      type="time"
                      value={preferences.dnd_fim}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        dnd_fim: e.target.value
                      }))}
                    />
                  </div>
                </div>

                <div className="dnd-days">
                  <label>Dias ativos</label>
                  <div className="days-grid">
                    {diasSemana.map(dia => (
                      <button
                        key={dia.id}
                        className={`day-btn ${preferences.dnd_dias?.includes(dia.id) ? 'active' : ''}`}
                        onClick={() => toggleDndDia(dia.id)}
                      >
                        {dia.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
