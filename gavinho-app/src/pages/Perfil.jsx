import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { 
  User, Mail, Phone, MapPin, Briefcase, Building2, Calendar, 
  Save, Camera, Shield, Bell, Key, Loader2, CheckCircle, X,
  Euro, CalendarDays, Clock, FileText, Upload, Plus, Check,
  AlertCircle, ChevronDown, ChevronRight, Palmtree, FileCheck,
  Download, Eye, Trash2, Send
} from 'lucide-react'

// Feriados Portugal 2025 (fallback)
const FERIADOS_2025 = [
  { data: '2025-01-01', nome: 'Ano Novo' },
  { data: '2025-04-18', nome: 'Sexta-feira Santa' },
  { data: '2025-04-20', nome: 'Páscoa' },
  { data: '2025-04-25', nome: 'Dia da Liberdade' },
  { data: '2025-05-01', nome: 'Dia do Trabalhador' },
  { data: '2025-06-10', nome: 'Dia de Portugal' },
  { data: '2025-06-19', nome: 'Corpo de Deus' },
  { data: '2025-08-15', nome: 'Assunção de Nossa Senhora' },
  { data: '2025-10-05', nome: 'Implantação da República' },
  { data: '2025-11-01', nome: 'Todos os Santos' },
  { data: '2025-12-01', nome: 'Restauração da Independência' },
  { data: '2025-12-08', nome: 'Imaculada Conceição' },
  { data: '2025-12-25', nome: 'Natal' }
]

const TIPOS_AUSENCIA = [
  { value: 'ferias', label: 'Férias', color: '#16a34a' },
  { value: 'doenca', label: 'Doença', color: '#dc2626' },
  { value: 'pessoal', label: 'Assunto Pessoal', color: '#2563eb' },
  { value: 'parentalidade', label: 'Parentalidade', color: '#9333ea' },
  { value: 'luto', label: 'Luto', color: '#525252' },
  { value: 'outro', label: 'Outro', color: '#78716c' }
]

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: '#d97706', bg: '#fef3c7' },
  aprovado: { label: 'Aprovado', color: '#16a34a', bg: '#dcfce7' },
  rejeitado: { label: 'Rejeitado', color: '#dc2626', bg: '#fee2e2' },
  pago: { label: 'Pago', color: '#2563eb', bg: '#dbeafe' }
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Perfil() {
  const { profile, getUserName, getUserInitials, getUserAvatar, refreshProfile } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')
  const fileInputRef = useRef(null)
  
  // Form data
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    morada: '',
    cargo: '',
    departamento: '',
    data_nascimento: ''
  })

  // RH Data
  const [feriados, setFeriados] = useState([])
  const [encerramentos, setEncerramentos] = useState([])
  const [pedidosAusencia, setPedidosAusencia] = useState([])
  const [recibos, setRecibos] = useState([])
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  
  // Modals
  const [showAusenciaModal, setShowAusenciaModal] = useState(false)
  const [showReciboModal, setShowReciboModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Forms
  const [ausenciaForm, setAusenciaForm] = useState({
    tipo: 'ferias',
    data_inicio: '',
    data_fim: '',
    motivo: ''
  })
  const [reciboForm, setReciboForm] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    valor_bruto: '',
    valor_liquido: ''
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        email: profile.email || '',
        telefone: profile.telefone || '',
        morada: profile.morada || '',
        cargo: profile.cargo || '',
        departamento: profile.departamento || '',
        data_nascimento: profile.data_nascimento || ''
      })
      loadRHData()
    }
  }, [profile])

  const loadRHData = async () => {
    try {
      // Carregar feriados
      const { data: feriadosData } = await supabase
        .from('feriados_portugal')
        .select('*')
        .eq('ano', anoAtual)
        .order('data')
      setFeriados(feriadosData || [])

      // Carregar encerramentos
      const { data: encerramnetosData } = await supabase
        .from('encerramentos_empresa')
        .select('*')
        .eq('ano', anoAtual)
        .order('data')
      setEncerramentos(encerramnetosData || [])

      // Carregar pedidos de ausência do utilizador
      const { data: pedidosData } = await supabase
        .from('pedidos_ausencia')
        .select('*')
        .eq('utilizador_id', profile.id)
        .order('created_at', { ascending: false })
      setPedidosAusencia(pedidosData || [])

      // Carregar recibos do utilizador
      const { data: recibosData } = await supabase
        .from('recibos_mensais')
        .select('*')
        .eq('utilizador_id', profile.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
      setRecibos(recibosData || [])
    } catch (err) {
      console.error('Erro ao carregar dados RH:', err)
    }
  }

  // Upload de avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`

      // Upload diretamente na raiz do bucket (sem subpasta)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('Erro', `Erro no upload: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      await supabase
        .from('utilizadores')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      await refreshProfile()
    } catch (err) {
      console.error('Erro ao carregar foto:', err)
      toast.error('Erro', `Erro: ${err.message}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    
    try {
      const { error } = await supabase
        .from('utilizadores')
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          morada: formData.morada || null,
          data_nascimento: formData.data_nascimento || null
        })
        .eq('id', profile.id)

      if (error) throw error
      
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao guardar:', err)
      toast.error('Erro', `Erro ao guardar: ${err.message || 'Verifique as permissões'}`)
    } finally {
      setSaving(false)
    }
  }

  // Submeter pedido de ausência
  const handleSubmitAusencia = async () => {
    if (!ausenciaForm.data_inicio || !ausenciaForm.data_fim) {
      toast.warning('Aviso', 'Preencha as datas')
      return
    }

    try {
      // Calcular dias úteis
      const inicio = new Date(ausenciaForm.data_inicio)
      const fim = new Date(ausenciaForm.data_fim)
      let diasUteis = 0
      const current = new Date(inicio)
      while (current <= fim) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) diasUteis++
        current.setDate(current.getDate() + 1)
      }

      const { error } = await supabase
        .from('pedidos_ausencia')
        .insert({
          utilizador_id: profile.id,
          tipo: ausenciaForm.tipo,
          data_inicio: ausenciaForm.data_inicio,
          data_fim: ausenciaForm.data_fim,
          dias_uteis: diasUteis,
          motivo: ausenciaForm.motivo || null,
          status: 'pendente'
        })

      if (error) throw error

      setShowAusenciaModal(false)
      setAusenciaForm({ tipo: 'ferias', data_inicio: '', data_fim: '', motivo: '' })
      loadRHData()
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro', `Erro ao submeter: ${err.message}`)
    }
  }

  // Submeter recibo
  const handleSubmitRecibo = async () => {
    if (!reciboForm.valor_bruto) {
      toast.warning('Aviso', 'Preencha o valor')
      return
    }

    try {
      const { error } = await supabase
        .from('recibos_mensais')
        .upsert({
          utilizador_id: profile.id,
          ano: reciboForm.ano,
          mes: reciboForm.mes,
          valor_bruto: parseFloat(reciboForm.valor_bruto) || 0,
          valor_liquido: parseFloat(reciboForm.valor_liquido) || 0,
          status: 'pendente'
        }, { onConflict: 'utilizador_id,ano,mes' })

      if (error) throw error

      setShowReciboModal(false)
      setReciboForm({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), valor_bruto: '', valor_liquido: '' })
      loadRHData()
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro', `Erro ao submeter: ${err.message}`)
    }
  }

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'Administrador', color: '#dc2626', bg: '#fee2e2' },
      gestor: { label: 'Gestor', color: '#2563eb', bg: '#dbeafe' },
      tecnico: { label: 'Técnico', color: '#16a34a', bg: '#dcfce7' },
      user: { label: 'Colaborador', color: '#78716c', bg: '#f5f5f4' }
    }
    return roles[role] || roles.user
  }

  const formatDate = (date) => {
    if (!date) return '-'
    // Append T12:00:00 to date-only strings to avoid UTC midnight timezone shift
    const dateStr = typeof date === 'string' && date.length === 10 ? date + 'T12:00:00' : date
    return new Date(dateStr).toLocaleDateString('pt-PT')
  }

  // Calcular resumo de férias
  const calcularResumoFerias = () => {
    const anuais = profile?.dias_ferias_anuais || 22
    
    // Dias usados em pedidos aprovados
    const usadosPedidos = pedidosAusencia
      .filter(p => p.tipo === 'ferias' && p.status === 'aprovado')
      .reduce((sum, p) => sum + (p.dias_uteis || 0), 0)
    
    // Dias de encerramento que contam como férias
    const diasEncerramento = encerramentos
      .filter(e => e.conta_como_ferias)
      .length
    
    // Total usados = pedidos + encerramentos
    const usados = usadosPedidos + diasEncerramento
    
    const pendentes = pedidosAusencia
      .filter(p => p.tipo === 'ferias' && p.status === 'pendente')
      .reduce((sum, p) => sum + (p.dias_uteis || 0), 0)
    
    const disponiveis = anuais - usados
    
    return { anuais, usados, usadosPedidos, diasEncerramento, pendentes, disponiveis }
  }

  const tabs = [
    { id: 'dados', label: 'Dados Pessoais', icon: User },
    { id: 'ferias', label: 'Férias e Ausências', icon: Palmtree },
    { id: 'recibos', label: 'Recibos', icon: Euro },
    { id: 'calendario', label: 'Calendário', icon: CalendarDays },
    { id: 'seguranca', label: 'Segurança', icon: Shield }
  ]

  if (!profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  const roleBadge = getRoleBadge(profile.role)
  const resumoFerias = calcularResumoFerias()
  const isPrestador = profile.tipo_contrato === 'prestador'
  const isRemoto = profile.regime === 'remoto' || profile.regime === 'hibrido'
  const canSubmitRecibos = isRemoto // Equipa remota submete recibos aqui

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar com upload */}
          <div style={{ position: 'relative' }}>
            {uploadingAvatar ? (
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'var(--stone)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Loader2 size={24} className="spin" />
              </div>
            ) : getUserAvatar() ? (
              <img 
                src={getUserAvatar()} 
                alt={getUserName()}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: 700
              }}>
                {getUserInitials()}
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: 0, 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                background: 'var(--brown)', 
                border: '2px solid white',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>{profile.nome}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--brown-light)' }}>{profile.cargo || 'Sem cargo definido'}</span>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: 600,
                background: roleBadge.bg,
                color: roleBadge.color
              }}>
                {roleBadge.label}
              </span>
              {isPrestador && (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 600,
                  background: '#dbeafe',
                  color: '#2563eb'
                }}>
                  Prestador Remoto
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--brown-light)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={14} /> {profile.email}
              </span>
              {profile.departamento && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={14} /> {profile.departamento}
                </span>
              )}
            </div>
          </div>

          {/* Resumo Férias */}
          <div style={{ 
            padding: '16px 20px', 
            background: 'var(--cream)', 
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '140px'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>
              {resumoFerias.disponiveis}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
              dias férias disponíveis
            </div>
            <div style={{ fontSize: '10px', color: 'var(--brown-light)', marginTop: '4px' }}>
              {resumoFerias.usadosPedidos} pedidos + {resumoFerias.diasEncerramento} encerramentos
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '24px',
        background: 'var(--stone)',
        padding: '4px',
        borderRadius: '12px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.id ? 'var(--white)' : 'transparent',
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Dados Pessoais */}
      {activeTab === 'dados' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Dados Pessoais</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Nome Completo
              </label>
              <input 
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Email
              </label>
              <input 
                type="email"
                value={formData.email}
                disabled
                style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--cream)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Telefone
              </label>
              <input 
                type="tel"
                value={formData.telefone}
                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="+351 912 345 678"
                style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Data de Nascimento
              </label>
              <input 
                type="date"
                value={formData.data_nascimento}
                onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
              Morada
            </label>
            <input 
              type="text"
              value={formData.morada}
              onChange={e => setFormData({ ...formData, morada: e.target.value })}
              placeholder="Rua, Código Postal, Cidade"
              style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {saving ? <Loader2 size={16} className="spin" /> : success ? <CheckCircle size={16} /> : <Save size={16} />}
              {saving ? 'A guardar...' : success ? 'Guardado!' : 'Guardar Alterações'}
            </button>
          </div>

          {/* Info Profissional (read-only) */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--stone)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--brown-light)' }}>
              Informação Profissional (gerida pela administração)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>Cargo</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{profile.cargo || '-'}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>Departamento</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{profile.departamento || '-'}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>Data de Entrada</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{formatDate(profile.data_entrada)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Férias e Ausências */}
      {activeTab === 'ferias' && (
        <div>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--brown)' }}>{resumoFerias.anuais}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Dias Anuais</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>{resumoFerias.disponiveis}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Disponíveis</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--info)' }}>{resumoFerias.usadosPedidos}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Férias Pedidas</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px', background: '#fef3c7' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#d97706' }}>{resumoFerias.diasEncerramento}</div>
              <div style={{ fontSize: '12px', color: '#92400e' }}>Encerramentos</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warning)' }}>{resumoFerias.pendentes}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Pendentes</div>
            </div>
          </div>

          {/* Botão novo pedido */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Pedidos de Ausência</h2>
              <button className="btn btn-primary" onClick={() => setShowAusenciaModal(true)}>
                <Plus size={16} /> Novo Pedido
              </button>
            </div>

            {pedidosAusencia.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
                <Palmtree size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Sem pedidos de ausência</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosAusencia.map(p => {
                  const tipoConfig = TIPOS_AUSENCIA.find(t => t.value === p.tipo)
                  const statusConf = STATUS_CONFIG[p.status]
                  return (
                    <div key={p.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      padding: '16px',
                      background: 'var(--cream)',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${tipoConfig?.color || '#78716c'}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{tipoConfig?.label}</span>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '10px', 
                            fontWeight: 600,
                            background: statusConf?.bg,
                            color: statusConf?.color
                          }}>
                            {statusConf?.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                          {formatDate(p.data_inicio)} → {formatDate(p.data_fim)} • {p.dias_uteis} dias úteis
                        </div>
                        {p.motivo && (
                          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                            {p.motivo}
                          </div>
                        )}
                        {p.notas_aprovacao && (
                          <div style={{ fontSize: '12px', color: p.status === 'rejeitado' ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
                            Nota: {p.notas_aprovacao}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', textAlign: 'right' }}>
                        {formatDate(p.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Recibos */}
      {activeTab === 'recibos' && (
        <div>
          {canSubmitRecibos ? (
            <>
              {/* Equipa remota - pode submeter recibos */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>Submissão de Recibos</h2>
                    <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: 0 }}>
                      Submeta o seu recibo mensal para aprovação
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowReciboModal(true)}>
                    <Plus size={16} /> Submeter Recibo
                  </button>
                </div>

                {recibos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>Sem recibos submetidos</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Período</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Valor Bruto</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Valor Líquido</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recibos.map(r => {
                        const statusConf = STATUS_CONFIG[r.status]
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                            <td style={{ padding: '12px' }}>{MESES[r.mes - 1]} {r.ano}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{r.valor_bruto?.toLocaleString('pt-PT')} €</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{r.valor_liquido?.toLocaleString('pt-PT')} €</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 10px', 
                                borderRadius: '10px', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                background: statusConf?.bg,
                                color: statusConf?.color
                              }}>
                                {statusConf?.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>
                              {r.data_pagamento ? formatDate(r.data_pagamento) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Resumo anual */}
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Resumo Anual {anoAtual}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {recibos.filter(r => r.ano === anoAtual && r.status === 'pago').reduce((sum, r) => sum + (r.valor_bruto || 0), 0).toLocaleString('pt-PT')} €
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total Bruto Pago</div>
                  </div>
                  <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {recibos.filter(r => r.ano === anoAtual && r.status === 'pago').reduce((sum, r) => sum + (r.valor_liquido || 0), 0).toLocaleString('pt-PT')} €
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total Líquido Pago</div>
                  </div>
                  <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {recibos.filter(r => r.ano === anoAtual && r.status === 'pago').length}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Recibos Pagos</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Equipa presencial - recibos submetidos pela contabilidade */
            <div className="card">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Recibos de Vencimento</h2>
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
                <Euro size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Os recibos são submetidos pela contabilidade no módulo Recursos Humanos.</p>
                <p style={{ fontSize: '13px' }}>Contacte a equipa de RH para mais informações.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Calendário */}
      {activeTab === 'calendario' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Feriados */}
            <div className="card">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                🇵🇹 Feriados Portugal {anoAtual}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(feriados.length > 0 ? feriados : FERIADOS_2025.map((f, i) => ({ id: i, ...f }))).map(f => (
                  <div key={f.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '10px 12px',
                    background: 'var(--cream)',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <span>{f.nome}</span>
                    <span style={{ color: 'var(--brown-light)' }}>
                      {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Encerramentos */}
            <div className="card">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                🏢 Encerramentos GAVINHO {anoAtual}
              </h2>
              {encerramentos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brown-light)' }}>
                  <Calendar size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px' }}>Sem dias de encerramento definidos</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {encerramentos.map(e => (
                    <div key={e.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: e.conta_como_ferias ? '#fef3c7' : 'var(--cream)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div>
                        <span>{e.descricao || 'Encerramento'}</span>
                        {e.conta_como_ferias && (
                          <span style={{ 
                            marginLeft: '8px',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px', 
                            background: '#fcd34d',
                            color: '#92400e'
                          }}>
                            conta como férias
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--brown-light)' }}>
                        {new Date(e.data + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '16px' }}>
                💡 Dias de encerramento que não sejam feriados nacionais contam como dia de férias.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Segurança */}
      {activeTab === 'seguranca' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Segurança</h2>
          <div style={{ 
            padding: '20px', 
            background: 'var(--cream)', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Key size={24} style={{ color: 'var(--brown-light)' }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>Alteração de Password</div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Para alterar a password, utilize a opção "Esqueci-me da password" no ecrã de login.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Novo Pedido Ausência */}
      {showAusenciaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAusenciaModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Novo Pedido de Ausência</h3>
              <button onClick={() => setShowAusenciaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo de Ausência</label>
                <select
                  value={ausenciaForm.tipo}
                  onChange={e => setAusenciaForm({ ...ausenciaForm, tipo: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                >
                  {TIPOS_AUSENCIA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Início</label>
                  <input
                    type="date"
                    value={ausenciaForm.data_inicio}
                    onChange={e => setAusenciaForm({ ...ausenciaForm, data_inicio: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Fim</label>
                  <input
                    type="date"
                    value={ausenciaForm.data_fim}
                    onChange={e => setAusenciaForm({ ...ausenciaForm, data_fim: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Motivo (opcional)</label>
                <textarea
                  value={ausenciaForm.motivo}
                  onChange={e => setAusenciaForm({ ...ausenciaForm, motivo: e.target.value })}
                  rows={3}
                  placeholder="Descreva o motivo se necessário..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowAusenciaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmitAusencia}>
                <Send size={16} /> Submeter Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Submeter Recibo */}
      {showReciboModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowReciboModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '400px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Submeter Recibo Mensal</h3>
              <button onClick={() => setShowReciboModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Mês</label>
                  <select
                    value={reciboForm.mes}
                    onChange={e => setReciboForm({ ...reciboForm, mes: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                  >
                    {MESES.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Ano</label>
                  <input
                    type="number"
                    value={reciboForm.ano}
                    onChange={e => setReciboForm({ ...reciboForm, ano: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Valor Bruto (€)</label>
                  <input
                    type="number"
                    value={reciboForm.valor_bruto}
                    onChange={e => setReciboForm({ ...reciboForm, valor_bruto: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Valor Líquido (€)</label>
                  <input
                    type="number"
                    value={reciboForm.valor_liquido}
                    onChange={e => setReciboForm({ ...reciboForm, valor_liquido: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowReciboModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmitRecibo}>
                <Send size={16} /> Submeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
